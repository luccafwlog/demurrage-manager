// ============================================================
// db.js — Supabase initialization + helpers
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Requer: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js">
//         carregado em app.html ANTES deste script.
// Expõe todos os helpers via window.* para compatibilidade com
// os demais scripts que rodam em escopo global.
// ============================================================

// ──────────────────────────────────────────────────────────────
// CONFIGURAÇÃO — preencha com seus valores do Supabase Dashboard
// Settings → API → "Project URL"  e  "anon public" key
// ──────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'COLE_AQUI_A_PROJECT_URL';
const SUPABASE_ANON = 'COLE_AQUI_A_ANON_KEY';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 10 } }
});

// ── Sanitiza objeto: remove undefined, converte NaN → null ───────────────
function sanitize(obj) {
  if (Array.isArray(obj))      return obj.map(sanitize);
  if (obj === null)            return null;
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

// ── Inicialização async ───────────────────────────────────────────────────
(async function init() {

  // 1. Verifica sessão atual
  const { data: { session }, error: sessErr } = await sb.auth.getSession();
  if (sessErr || !session) { window.location.href = 'index.html'; return; }

  const user = session.user;
  const uid  = user.id;

  // 2. Redireciona ao fazer logout em qualquer aba
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = 'index.html';
  });

  // 3. Expõe referências globais imediatamente
  window._dmDb      = sb;
  window._dmUser    = user;
  window._dmUid     = uid;
  window._dmStore   = { bls: [], trk: [], clients: [], alertDays: 5 };
  window._dmIsAdmin = false;
  window._dmSession = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  // 4. Carrega dados iniciais em paralelo
  const [blsRes, trkRes, cliRes, settRes, profRes] = await Promise.all([
    sb.from('bls').select('id, data').eq('user_id', uid),
    sb.from('containers').select('container, data').eq('user_id', uid),
    sb.from('clients').select('id, data').eq('user_id', uid),
    sb.from('settings').select('alert_days').eq('user_id', uid).maybeSingle(),
    sb.from('usuarios').select('*').eq('id', uid).maybeSingle()
  ]);

  if (blsRes.error)  console.error('[DB] bls:',       blsRes.error);
  if (trkRes.error)  console.error('[DB] containers:', trkRes.error);
  if (cliRes.error)  console.error('[DB] clients:',   cliRes.error);

  window._dmStore.bls     = (blsRes.data  || []).map(r => r.data);
  window._dmStore.trk     = (trkRes.data  || []).map(r => r.data);
  window._dmStore.clients = (cliRes.data  || []).map(r => r.data);
  if (settRes.data) window._dmStore.alertDays = settRes.data.alert_days ?? 5;

  // 5. Perfil do usuário
  const profile      = profRes.data;
  window._dmIsAdmin  = !!profile?.admin;
  window._dmUserData = profile || {};

  if (profile && profile.ativo === false) {
    alert('Sua conta foi desativada. Entre em contato com o administrador.');
    await sb.auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  // Auto-cria perfil no primeiro login
  if (!profile) {
    await sb.from('usuarios').upsert({
      id: uid, email: user.email,
      nome: user.email?.split('@')[0] || 'Usuário',
      admin: false, ativo: true
    });
    window._dmUserData = { id: uid, email: user.email, admin: false, ativo: true };
  }

  const nameEl = document.getElementById('header-user-name');
  if (nameEl) nameEl.textContent = profile?.nome || user.email || 'Usuário';
  const tabSettings = document.getElementById('tab-settings');
  if (tabSettings) tabSettings.style.display = '';

  // ── Funções de persistência ──────────────────────────────────────────────

  window._dmFireSave = function(type, newData) {
    if (type === 'alertDays') {
      sb.from('settings').upsert({ user_id: uid, alert_days: newData })
        .then(({ error }) => {
          if (error) console.error('[DB-SAVE] alertDays:', error);
          else { window._dmStore.alertDays = newData; }
        });
      return;
    }
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: 'container',   clients: 'id'     };
    const table  = TABLE[type]; const sKey = STORE[type]; const idKey = IDKEY[type];
    if (!table) { console.warn('[DB-SAVE] tipo desconhecido:', type); return; }

    const oldStore = window._dmStore[sKey] || [];
    const oldMap   = new Map(oldStore.map(r => [String(r[idKey]), JSON.stringify(sanitize(r))]));
    const newIds   = new Set(newData.map(r => String(r[idKey])));
    const toDelete = oldStore.filter(r => !newIds.has(String(r[idKey]))).map(r => String(r[idKey]));
    const toUpsert = newData.filter(r => {
      const key = String(r[idKey]);
      return !oldMap.has(key) || oldMap.get(key) !== JSON.stringify(sanitize(r));
    });

    if (toDelete.length === 0 && toUpsert.length === 0) {
      console.log('[DB-SAVE] ✓ 0 writes — nenhuma alteração.'); return;
    }
    console.log('[DB-SAVE]', type, '—', toDelete.length, 'deletes +', toUpsert.length, 'upserts');
    const prevStore = [...oldStore];

    (async () => {
      try {
        if (toDelete.length > 0) {
          const { error } = await sb.from(table).delete().eq('user_id', uid).in(idKey, toDelete);
          if (error) throw error;
        }
        if (toUpsert.length > 0) {
          const rows = toUpsert.map(r => ({ [idKey]: String(r[idKey]), user_id: uid, data: sanitize(r) }));
          const { error } = await sb.from(table).upsert(rows);
          if (error) throw error;
        }
        window._dmStore[sKey] = newData;
        console.log('[DB-SAVE] ✓', type, 'salvo');
        if (window.toast) window.toast('✓ Dados salvos!', 'success');
      } catch(e) {
        console.error('[DB-SAVE] ✗', type, e);
        window._dmStore[sKey] = prevStore;
        if (window.toast) window.toast('Erro ao salvar: ' + (e.message || e), 'error');
      }
    })();
  };

  window._dmFireSaveOne = function(type, id, data) {
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: 'container',   clients: 'id'     };
    const table  = TABLE[type] || type; const sKey = STORE[type]; const idKey = IDKEY[type];
    const clean  = sanitize(data);

    if (window._dmStore && sKey && idKey) {
      const arr = window._dmStore[sKey] || [];
      const idx = arr.findIndex(r => String(r[idKey]) === String(id));
      if (idx >= 0) arr[idx] = clean; else arr.push(clean);
    }

    sb.from(table).upsert({ [idKey]: String(id), user_id: uid, data: clean })
      .then(({ error }) => {
        if (error) {
          console.error('[DB-SAVE-ONE] ✗', type, id, error);
          if (window.toast) window.toast('Erro ao salvar: ' + error.message, 'error');
        } else {
          console.log('[DB-SAVE-ONE] ✓', type + '/' + id, '(1 write)');
        }
      });
  };

  window._dmFireDelete = function(type, id) {
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: 'container',   clients: 'id'     };
    const table  = TABLE[type] || type; const sKey = STORE[type]; const idKey = IDKEY[type];
    let prevItem = null, prevIndex = -1;
    if (window._dmStore && sKey && idKey) {
      const arr = window._dmStore[sKey] || [];
      prevIndex = arr.findIndex(r => String(r[idKey]) === String(id));
      if (prevIndex !== -1) prevItem = arr[prevIndex];
      window._dmStore[sKey] = arr.filter(r => String(r[idKey]) !== String(id));
    }
    sb.from(table).delete().eq('user_id', uid).eq(idKey, String(id))
      .then(({ error }) => {
        if (error) {
          console.error('[DB-DELETE] ✗', type, id, error);
          if (prevItem !== null && window._dmStore && sKey) {
            const arr = window._dmStore[sKey] || [];
            if (prevIndex >= 0) arr.splice(prevIndex, 0, prevItem); else arr.push(prevItem);
          }
          if (window.toast) window.toast('Erro ao excluir — item restaurado', 'error');
        }
      });
  };

  window._dmFireRestore = async function(bkp) {
    await sb.from('bls').delete().eq('user_id', uid);
    await sb.from('containers').delete().eq('user_id', uid);
    await sb.from('clients').delete().eq('user_id', uid);
    const toRows = (arr, k) => arr.map(r => ({ [k]: String(r[k]), user_id: uid, data: sanitize(r) }));
    if (bkp.bls?.length)      await sb.from('bls').insert(toRows(bkp.bls, 'id'));
    if (bkp.tracking?.length) await sb.from('containers').insert(toRows(bkp.tracking, 'container'));
    if (bkp.clients?.length)  await sb.from('clients').insert(toRows(bkp.clients, 'id'));
    if (bkp.alertDays)        await sb.from('settings').upsert({ user_id: uid, alert_days: bkp.alertDays });
  };

  window._dmFireLog = async function(action, detalhe = {}) {
    try {
      const { error } = await sb.from('logs').insert({
        user_id: uid, usuario_nome: window._dmUserData?.nome || user.email || uid,
        sessao_id: window._dmSession || null, acao: action, detalhe
      });
      if (error) console.warn('[LOG]', action, error);
    } catch(e) { console.warn('[LOG]', action, e); }
  };

  window._dmFireLoadLogs = async function(filters = {}) {
    try {
      let q = sb.from('logs').select('*').order('criado_em', { ascending: false }).limit(200);
      if (filters.acao) q = q.eq('acao', filters.acao);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(r => ({ _docId: r.id, ...r }));
    } catch(e) { console.warn('[LOGS]', e); return []; }
  };

  window._dmFireDeleteLogs = async function(ids) {
    if (!ids?.length) return 0;
    const { error, count } = await sb.from('logs').delete({ count: 'exact' }).in('id', ids);
    if (error) throw error;
    return count || ids.length;
  };

  window._dmFireLoadUsuarios = async function() {
    try {
      const { data, error } = await sb.from('usuarios').select('*').order('criado_em');
      if (error) throw error;
      return data || [];
    } catch(e) { console.error('[USUARIOS]', e); return []; }
  };

  window._dmFireSaveUsuario = async function(usuarioData) {
    try {
      const id = usuarioData.uid || usuarioData.id;
      if (!id) { console.error('[USUARIO] id ausente'); return false; }
      const { error } = await sb.from('usuarios').upsert({
        id, nome: usuarioData.nome, email: usuarioData.email, cargo: usuarioData.cargo,
        admin: !!usuarioData.admin, ativo: usuarioData.ativo !== false
      });
      if (error) throw error;
      return true;
    } catch(e) { console.error('[USUARIO]', e); return false; }
  };

  window.doLogout = async function() {
    if (!confirm('Deseja encerrar a sessão?')) return;
    const btn = document.querySelector('.header-logout');
    if (btn) { btn.textContent = '⏳ Encerrando...'; btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
    try { if (window._dmFireLog) await window._dmFireLog('logout', {}); } catch(_) {}
    await sb.auth.signOut();
    window.location.href = 'index.html';
  };

  // ── Real-time subscriptions ───────────────────────────────────────────────
  function _applyRT(storeKey, idKey, payload, callback) {
    const { eventType, new: row, old } = payload;
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const d = row.data; const key = String(d[idKey]);
      const arr = window._dmStore[storeKey] || [];
      const idx = arr.findIndex(r => String(r[idKey]) === key);
      if (idx >= 0) arr[idx] = d; else arr.push(d);
    } else if (eventType === 'DELETE') {
      const key = String(old[idKey]);
      window._dmStore[storeKey] = (window._dmStore[storeKey] || []).filter(r => String(r[idKey]) !== key);
    }
    if (callback) callback();
  }

  sb.channel('dm-bls')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bls' },
      p => _applyRT('bls', 'id', p, window._dmOnBLsUpdate))
    .subscribe(s => console.log('[RT] bls:', s));

  sb.channel('dm-containers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'containers' },
      p => _applyRT('trk', 'container', p, window._dmOnTrkUpdate))
    .subscribe(s => console.log('[RT] containers:', s));

  sb.channel('dm-clients')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' },
      p => _applyRT('clients', 'id', p, window._dmOnClientsUpdate))
    .subscribe(s => console.log('[RT] clients:', s));

  console.log('[DB] ✓ Supabase inicializado. Chamando _dmOnReady...');
  if (window._dmOnReady) window._dmOnReady();

})();
