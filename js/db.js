// ============================================================
// db.js — Supabase initialization + helpers
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================

const SUPABASE_URL  = 'https://vcdivphwlspsymgibfri.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZGl2cGh3bHNwc3ltZ2liZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Njg5MzEsImV4cCI6MjA5MDQ0NDkzMX0.0N-l_n323GievbiG5Nh2C6Wd3npTe4fbpxnzTYex0Jo';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 10 } }
});

function sanitize(obj) {
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj === null) return null;
  if (typeof obj !== 'object') {
    if (typeof obj === 'number' && isNaN(obj)) return null;
    return obj === undefined ? null : obj;
  }
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined) continue;
    out[k] = sanitize(v);
  }
  return out;
}

(async function init() {

  const { data: { session }, error: sessErr } = await sb.auth.getSession();
  if (sessErr || !session) { window.location.href = 'index.html'; return; }

  const user = session.user;
  const uid  = user.id;

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = 'index.html';
  });

  window._dmDb      = sb;
  window._dmUser    = user;
  window._dmUid     = uid;
  window._dmStore   = { bls: [], trk: [], clients: [], alertDays: 5 };
  window._dmIsAdmin = false;
  window._dmSession = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  const [blsRes, trkRes, cliRes, settRes, profRes] = await Promise.all([
    sb.from('bls').select('id, data'),
    sb.from('containers').select('container, data'),
    sb.from('clients').select('id, data'),
    sb.from('settings').select('alert_days').eq('user_id', uid).maybeSingle(),
    sb.from('usuarios').select('*').eq('id', uid).maybeSingle()
  ]);

  if (blsRes.error) console.error('[DB] bls:', blsRes.error);
  if (trkRes.error) console.error('[DB] containers:', trkRes.error);
  if (cliRes.error) console.error('[DB] clients:', cliRes.error);

  window._dmStore.bls     = (blsRes.data  || []).map(r => r.data);
  window._dmStore.trk     = (trkRes.data  || []).map(r => r.data);
  window._dmStore.clients = (cliRes.data  || []).map(r => r.data);

  if (settRes.data) window._dmStore.alertDays = settRes.data.alert_days ?? 5;

  const profile = profRes.data;
  window._dmIsAdmin  = !!profile?.admin;
  window._dmUserData = profile || {};

  // ================= SAVE (full array diff) =================
  window._dmFireSave = function(type, newData) {
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: 'container',   clients: 'id'     };

    const table  = TABLE[type];
    const sKey   = STORE[type];
    const idKey  = IDKEY[type];

    // Ignore unknown types (e.g. legacy 'alertDays' calls)
    if (!table || !sKey || !idKey) return;

    const oldStore = window._dmStore[sKey] || [];

    const oldMap = new Map(
      oldStore.map(r => [String(r[idKey]), JSON.stringify(sanitize(r))])
    );

    const newIds = new Set(newData.map(r => String(r[idKey])));

    const toDelete = oldStore
      .filter(r => !newIds.has(String(r[idKey])))
      .map(r => String(r[idKey]));

    const toUpsert = newData.filter(r => {
      const key = String(r[idKey]);
      return !oldMap.has(key) ||
             oldMap.get(key) !== JSON.stringify(sanitize(r));
    });

    (async () => {
      try {
        if (toDelete.length > 0) {
          const { error: delErr } = await sb.from(table).delete().in(idKey, toDelete);
          if (delErr) console.error('[DB-SAVE] delete error:', delErr);
        }

        if (toUpsert.length > 0) {
          const rows = toUpsert.map(r => ({
            [idKey]: String(r[idKey]),
            user_id: uid,
            data: sanitize(r),
            updated_at: new Date().toISOString()
          }));
          const { error: upsErr } = await sb.from(table).upsert(rows);
          if (upsErr) console.error('[DB-SAVE] upsert error:', upsErr);
        }

        window._dmStore[sKey] = newData;
      } catch(e) {
        console.error('[DB-SAVE]', e);
      }
    })();
  };

  // ================= SAVE ONE RECORD =================
  window._dmFireSaveOne = function(type, id, data) {
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: 'container',   clients: 'id'     };

    const table = TABLE[type];
    const sKey  = STORE[type];
    const idKey = IDKEY[type];
    if (!table) return;

    (async () => {
      try {
        const row = {
          [idKey]: String(id),
          user_id: uid,
          data: sanitize(data),
          updated_at: new Date().toISOString()
        };
        const { error } = await sb.from(table).upsert(row);
        if (error) { console.error('[DB-SAVE-ONE]', error); return; }

        // Update local store
        const store = window._dmStore[sKey] || [];
        const idx   = store.findIndex(r => String(r[idKey]) === String(id));
        if (idx >= 0) store[idx] = data;
        else store.push(data);
      } catch(e) {
        console.error('[DB-SAVE-ONE]', e);
      }
    })();
  };

  // ================= DELETE ONE RECORD =================
  window._dmFireDelete = function(type, id) {
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: 'container',   clients: 'id'     };

    const table = TABLE[type];
    const sKey  = STORE[type];
    const idKey = IDKEY[type];
    if (!table) return;

    (async () => {
      try {
        const { error } = await sb.from(table).delete().eq(idKey, String(id));
        if (error) { console.error('[DB-DELETE]', error); return; }

        // Update local store
        if (sKey && window._dmStore[sKey]) {
          window._dmStore[sKey] = window._dmStore[sKey].filter(r => String(r[idKey]) !== String(id));
        }
      } catch(e) {
        console.error('[DB-DELETE]', e);
      }
    })();
  };

  // ================= RESTORE (limpa tudo) =================
  window._dmFireRestore = async function(bkp) {
    await sb.from('bls').delete().neq('id', '');
    await sb.from('containers').delete().neq('container', '');
    await sb.from('clients').delete().neq('id', '');
  };

  // ================= AUDIT LOG =================
  window._dmFireLog = async function(action, details) {
    try {
      const nome = window._dmUserData?.nome || window._dmUser?.email || uid;
      const { error } = await sb.from('logs').insert({
        user_id:       uid,
        usuario_nome:  nome,
        sessao_id:     window._dmSession,
        acao:          action,
        detalhe:       sanitize(details || {})
      });
      if (error) console.error('[DB-LOG]', error);
    } catch(e) {
      console.error('[DB-LOG]', e);
    }
  };

  // ================= ALERT DAYS =================
  window._dmSaveAlertDays = async function(days) {
    try {
      const { error } = await sb.from('settings').upsert({ user_id: uid, alert_days: days });
      if (error) console.error('[DB-SETTINGS]', error);
      else if (window._dmStore) window._dmStore.alertDays = days;
    } catch(e) {
      console.error('[DB-SETTINGS]', e);
    }
  };

  // ================= USUARIOS =================
  window._dmFireLoadUsuarios = async function() {
    try {
      const { data, error } = await sb.from('usuarios').select('*').order('nome');
      if (error) { console.error('[DB] loadUsuarios:', error); return []; }
      return (data || []).map(r => ({ ...r, uid: r.id }));
    } catch(e) {
      console.error('[DB] loadUsuarios:', e);
      return [];
    }
  };

  window._dmFireSaveUsuario = async function(userData) {
    try {
      if (!userData.uid && !userData.id) {
        console.error('[DB] saveUsuario: id ausente');
        return false;
      }
      const row = {
        id:    userData.uid || userData.id,
        nome:  userData.nome  || '',
        email: userData.email || '',
        cargo: userData.cargo || '',
        admin: !!userData.admin,
        ativo: userData.ativo !== false
      };
      const { error } = await sb.from('usuarios').upsert(row);
      if (error) { console.error('[DB] saveUsuario:', error); return false; }
      return true;
    } catch(e) {
      console.error('[DB] saveUsuario:', e);
      return false;
    }
  };

  // ================= LOGS DE AUDITORIA =================
  window._dmFireLoadLogs = async function() {
    try {
      const { data, error } = await sb
        .from('logs')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(500);
      if (error) { console.error('[DB] loadLogs:', error); return []; }
      return data || [];
    } catch(e) {
      console.error('[DB] loadLogs:', e);
      return [];
    }
  };

  window._dmFireDeleteLogs = async function(ids) {
    try {
      if (!ids || !ids.length) return 0;
      const { error } = await sb.from('logs').delete().in('id', ids);
      if (error) { console.error('[DB] deleteLogs:', error); return 0; }
      return ids.length;
    } catch(e) {
      console.error('[DB] deleteLogs:', e);
      return 0;
    }
  };

  // ================= LOGOUT =================
  window._dmLogout = async function() {
    try {
      await sb.auth.signOut();
    } catch(e) {
      console.error('[DB] logout:', e);
      window.location.href = 'index.html';
    }
  };

  console.log('[DB] ✓ Supabase inicializado — usuário:', user.email);

  // Aguarda o app estar pronto e inicializa a UI
  function waitForAppReady() {
    if (window._dmOnReady) {
      console.log('[DB] Chamando _dmOnReady...');
      window._dmOnReady();
    } else {
      setTimeout(waitForAppReady, 50);
    }
  }

  waitForAppReady();
})();
