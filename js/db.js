// ============================================================
// db.js — Supabase initialization + helpers
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================

const SUPABASE_URL  = 'https://vcdivphwlspsymgibfri.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZGl2cGh3bHNwc3ltZ2liZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Njg5MzEsImV4cCI6MjA5MDQ0NDkzMX0.0N-l_n323GievbiG5Nh2C6Wd3npTe4fbpxnzTYex0Jo';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 10 } }
});

// (sanitize igual — mantido)
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

  // 🔥 ALTERAÇÃO 1 — REMOVIDO filtro user_id
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

  // ================= SAVE =================
  window._dmFireSave = function(type, newData) {

    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: 'container',   clients: 'id'     };

    const table  = TABLE[type];
    const sKey   = STORE[type];
    const idKey  = IDKEY[type];

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

        // 🔥 ALTERAÇÃO 2 — remove user_id do delete
        if (toDelete.length > 0) {
          await sb.from(table).delete().in(idKey, toDelete);
        }

        // 🔥 ALTERAÇÃO 3 — adiciona updated_at
        if (toUpsert.length > 0) {
          const rows = toUpsert.map(r => ({
            [idKey]: String(r[idKey]),
            user_id: uid,
            data: sanitize(r),
            updated_at: new Date().toISOString()
          }));

          await sb.from(table).upsert(rows);
        }

        window._dmStore[sKey] = newData;

      } catch(e) {
        console.error('[DB-SAVE]', e);
      }
    })();
  };

  // 🔥 ALTERAÇÃO 4 — delete sem user_id
  window._dmFireDelete = function(type, id) {
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: 'container',   clients: 'id'     };

    const table = TABLE[type];
    const idKey = IDKEY[type];

    sb.from(table).delete().eq(idKey, String(id));
  };

  // 🔥 ALTERAÇÃO 5 — restore global
  window._dmFireRestore = async function(bkp) {
    await sb.from('bls').delete().neq('id', '');
    await sb.from('containers').delete().neq('container', '');
    await sb.from('clients').delete().neq('id', '');
  };

  console.log('[DB] ✓ Modo colaborativo ativo (mínimas alterações)');
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
