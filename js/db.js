// ============================================================
// db.js — Supabase initialization + helpers
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================

function deduplicateClientsList(list) {
  const seen = new Map();
  for (const c of list) {
    const norm = String(c.cnpj || '').replace(/\D/g, '');
    const key  = norm.length === 13 ? '0' + norm : norm;
    if (!key) continue;
    const score = c._updatedAt || c.updatedAt || c.createdAt || 0;
    const prev = seen.get(key);
    if (!prev || score > (prev._updatedAt || prev.updatedAt || prev.createdAt || 0)) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

// A PK da tabela containers é (user_id, container, bl) — em um modelo colaborativo
// (RLS não isola por usuário), dois usuários diferentes importando os mesmos dados
// criam duas linhas distintas para o mesmo container+BL. O app carrega containers de
// TODOS os usuários, então sem essa deduplicação essas linhas aparecem como
// containers duplicados no rastreamento e, se migradas para faturamento juntas,
// dobrariam o cálculo de demurrage do BL. Mesmo padrão de deduplicateClientsList.
function deduplicateTrkList(list) {
  const seen = new Map();
  for (const r of list) {
    const key = String(r.container || '').trim().toUpperCase() + '\x00' + String(r.bl || '').trim().toUpperCase();
    if (!key) continue;
    const score = r._updatedAt || 0;
    const prev = seen.get(key);
    if (!prev || score > (prev._updatedAt || 0)) {
      seen.set(key, r);
    }
  }
  return Array.from(seen.values());
}

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

// ============================================================
// KEY HELPERS — chaves compostas por tipo
// ============================================================
// Para containers: a chave única real é (container, bl).
// Um mesmo número de container pode existir em múltiplos BLs.
const _KEY_FN = {
  bls:     r => String(r.id     || ''),
  trk:     r => String(r.container || '') + '\x00' + String(r.bl || ''),
  clients: r => String(r.id     || r.cnpj || '')
};

// Colunas de primeira classe que vão para o banco (além de user_id, data, updated_at)
const _COLS_FN = {
  bls:     r => ({ id:        String(r.id     || '') }),
  trk:     r => ({ container: String(r.container || ''), bl: String(r.bl || '') }),
  clients: r => ({ id:        String(r.id     || r.cnpj || '') })
};

// onConflict alinhado com a nova PK de containers: (user_id, container, bl)
// bls é COMPARTILHADO (PK só id): qualquer usuário edita qualquer processo,
// independente de quem criou. Por isso o conflito é só por id, sem user_id.
const _CONFLICT = {
  bls:     'id',
  trk:     'user_id,container,bl',
  clients: 'user_id,id'
};

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

  function fatalScreen(title, msg) {
    const el = document.getElementById('dm-loading-overlay') || document.body;
    el.style.display = 'flex';
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#cbd5e1;gap:16px;padding:24px;text-align:center">'
      + '<div class="t" style="font-size:22px;font-weight:700;color:#f87171"></div><div class="m" style="max-width:460px;line-height:1.5"></div>'
      + '<button onclick="location.reload()" style="padding:10px 24px;border-radius:8px;border:none;background:#3b82f6;color:#fff;font-size:14px;cursor:pointer">Tentar novamente</button></div>';
    el.querySelector('.t').textContent = title;
    el.querySelector('.m').textContent = msg;
  }

  // Paginação: PostgREST trunca em 1000 linhas. Um erro em qualquer página
  // ABORTA o carregamento — antes o app seguia com dados parciais em silêncio,
  // e o usuário podia trabalhar (e salvar) sobre uma base incompleta.
  async function fetchAllPages(table, columns) {
    const PAGE = 1000;
    let from = 0;
    const allRows = [];
    while (true) {
      const { data: page, error } = await sb.from(table).select(columns).range(from, from + PAGE - 1);
      if (error) throw new Error(table + ': ' + error.message);
      allRows.push(...(page || []));
      if ((page || []).length < PAGE) break;
      from += PAGE;
    }
    return allRows;
  }

  // Perfil primeiro: usuário inativo não carrega nenhum dado.
  const { data: profile, error: profErr } = await sb.from('usuarios').select('*').eq('id', uid).maybeSingle();
  if (profErr) { fatalScreen('Erro ao carregar perfil', profErr.message); return; }
  if (profile && profile.ativo === false) {
    await sb.auth.signOut().catch(() => {});
    window.location.href = 'index.html?inativo=1';
    return;
  }
  window._dmIsAdmin  = !!profile?.admin;
  window._dmUserData = profile || {};

  let blsAllRows, cliAllRows, trkAllRows, settRes;
  try {
    [blsAllRows, cliAllRows, trkAllRows, settRes] = await Promise.all([
      fetchAllPages('bls',    'id, data'),
      fetchAllPages('clients','id, data, updated_at'),
      fetchAllPages('containers', 'container, bl, data, updated_at'),
      sb.from('settings').select('alert_days').eq('user_id', uid).maybeSingle()
    ]);
  } catch (e) {
    console.error('[DB] carga inicial:', e);
    fatalScreen('Não foi possível carregar os dados', 'O sistema não abre com dados incompletos para evitar gravações sobre uma base parcial. Detalhe: ' + e.message);
    return;
  }

  window._dmStore.bls = blsAllRows.map(r => r.data);

  const _rawTrk = trkAllRows.map(r => ({
    ...r.data,
    container: r.container,
    bl: r.bl !== undefined ? r.bl : (r.data && r.data.bl) || '',
    _updatedAt: r.updated_at || null
  }));
  window._dmStore.trk = deduplicateTrkList(_rawTrk);

  const _rawClients = cliAllRows.map(r => ({
    ...r.data,
    id: r.id || (r.data && r.data.id) || (r.data && r.data.cnpj) || '',
    _updatedAt: r.updated_at || (r.data && r.data.updatedAt) || null
  }));
  window._dmStore.clients = deduplicateClientsList(_rawClients);

  if (settRes && settRes.data) window._dmStore.alertDays = settRes.data.alert_days ?? 5;

  // ── Último upload de containers ────────────────────────────
  window._dmRenderLastUpload = function(isoDate) {
    const badge = document.getElementById('last-upload-badge');
    const timeEl = document.getElementById('last-upload-time');
    if (!badge || !timeEl) return;
    if (!isoDate) { badge.style.display = 'none'; return; }
    try {
      const d = new Date(isoDate);
      const now = new Date();
      const dDate   = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.round((nowDate - dDate) / 86400000);
      const timeStr  = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      let label;
      if (diffDays === 0) {
        const diffMin = Math.round((now - d) / 60000);
        if (diffMin < 2)       label = 'agora mesmo';
        else if (diffMin < 60) label = `há ${diffMin} min`;
        else                   label = `hoje ${timeStr}`;
      } else if (diffDays === 1) {
        label = `ontem ${timeStr}`;
      } else {
        label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + timeStr;
      }
      timeEl.textContent = label;
      badge.style.display = 'flex';
    } catch(e) { badge.style.display = 'none'; }
  };
  if (trkAllRows.length > 0) {
    const maxUpd = trkAllRows.reduce((max, r) => ((r.updated_at || '') > max ? r.updated_at : max), '');
    if (maxUpd) window._dmRenderLastUpload(maxUpd);
  }

  function _toastErr(msg) { if (typeof window.toast === 'function') window.toast(msg, 'error'); }

  const TABLE = { bls: 'bls', trk: 'containers', clients: 'clients' };
  const STORE = { bls: 'bls', trk: 'trk',        clients: 'clients' };

  function _rowFor(type, r) {
    return { ..._COLS_FN[type](r), user_id: uid, data: sanitize(r), updated_at: new Date().toISOString() };
  }

  // Modelo colaborativo: exclusões NÃO filtram por user_id. Antes, apagar um
  // container/cliente criado por outro usuário não removia nada no banco (sem
  // erro) e o registro "ressuscitava" no próximo carregamento.
  async function _deleteKeys(type, keys) {
    if (!keys.length) return null;
    if (type === 'trk') {
      const byBL = new Map();
      keys.forEach(k => { const [c, b] = k.split('\x00'); if (!byBL.has(b || '')) byBL.set(b || '', []); byBL.get(b || '').push(c); });
      for (const [bl, ctrs] of byBL) {
        for (let i = 0; i < ctrs.length; i += 100) {
          const { error } = await sb.from('containers').delete().eq('bl', bl).in('container', ctrs.slice(i, i + 100));
          if (error) return error;
        }
      }
      return null;
    }
    for (let i = 0; i < keys.length; i += 100) {
      const { error } = await sb.from(TABLE[type]).delete().in('id', keys.slice(i, i + 100));
      if (error) return error;
    }
    return null;
  }

  // Upsert em blocos. Para containers/clientes (PK inclui user_id), remove as
  // cópias do mesmo registro gravadas por outros usuários — senão ficava uma
  // versão antiga "fantasma" que voltava ao excluir a atual.
  async function _upsertRows(type, records) {
    const rowMap = new Map();
    records.forEach(r => rowMap.set(_KEY_FN[type](r), _rowFor(type, r)));
    const rows = Array.from(rowMap.values());
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await sb.from(TABLE[type]).upsert(chunk, { onConflict: _CONFLICT[type] });
      if (error) return error;
      if (type === 'trk') {
        const byBL = new Map();
        chunk.forEach(r => { if (!byBL.has(r.bl)) byBL.set(r.bl, []); byBL.get(r.bl).push(r.container); });
        for (const [bl, ctrs] of byBL) {
          await sb.from('containers').delete().eq('bl', bl).in('container', ctrs).neq('user_id', uid);
        }
      } else if (type === 'clients') {
        await sb.from('clients').delete().in('id', chunk.map(r => r.id)).neq('user_id', uid);
      }
    }
    return null;
  }

  // ================= SAVE (full array diff) =================
  // Mutex por tipo: saves concorrentes do mesmo tipo são serializados e o
  // último estado pendente é salvo ao final.
  const _saveLocks   = {};
  const _savePending = {};
  const _saveWaiters = {};

  window._dmFireSave = function(type, newData) {
    _savePending[type] = newData;
    const p = new Promise(res => { (_saveWaiters[type] = _saveWaiters[type] || []).push(res); });
    if (!_saveLocks[type]) { _saveLocks[type] = true; _runSave(type); }
    return p;
  };

  async function _runSave(type) {
    const sKey  = STORE[type];
    const keyFn = _KEY_FN[type];
    const waiters = _saveWaiters[type] || []; _saveWaiters[type] = [];
    let ok = false;
    if (sKey && keyFn) {
      try {
        const newData = _savePending[type];
        delete _savePending[type];
        const oldStore = window._dmStore[sKey] || [];
        const oldMap = new Map(oldStore.map(r => [keyFn(r), JSON.stringify(sanitize(r))]));
        const newKeySet = new Set(newData.map(keyFn));
        const toDeleteKeys = oldStore.filter(r => !newKeySet.has(keyFn(r))).map(keyFn);
        const toUpsert = newData.filter(r => oldMap.get(keyFn(r)) !== JSON.stringify(sanitize(r)));

        const delErr = await _deleteKeys(type, toDeleteKeys);
        const upsErr = delErr ? null : await _upsertRows(type, toUpsert);
        const err = delErr || upsErr;
        if (err) {
          // NÃO atualiza o store: o próximo save recalcula o diff contra o que
          // de fato está no servidor e tenta de novo.
          console.error('[DB-SAVE]', type, err);
          _toastErr('Erro ao salvar no servidor — as alterações NÃO foram gravadas: ' + err.message);
        } else {
          window._dmStore[sKey] = JSON.parse(JSON.stringify(newData));
          ok = true;
        }
      } catch(e) {
        console.error('[DB-SAVE]', e);
        _toastErr('Erro interno ao salvar dados: ' + e.message);
      }
    }
    waiters.forEach(w => w(ok));
    if (_savePending[type] !== undefined) _runSave(type);
    else _saveLocks[type] = false;
  }

  function _storeReplace(sKey, keyFn, data) {
    const store = (window._dmStore[sKey] || []).slice();
    const key = keyFn(data);
    const idx = store.findIndex(r => keyFn(r) === key);
    const copy = JSON.parse(JSON.stringify(data));
    if (idx >= 0) store[idx] = copy; else store.push(copy);
    window._dmStore[sKey] = store;
  }

  // ================= SAVE ONE RECORD =================
  window._dmFireSaveOne = async function(type, id, data) {
    if (!TABLE[type]) return false;
    try {
      const err = await _upsertRows(type, [data]);
      if (err) { console.error('[DB-SAVE-ONE]', err); _toastErr('Erro ao salvar no servidor — alteração NÃO gravada: ' + err.message); return false; }
      _storeReplace(STORE[type], _KEY_FN[type], data);
      return true;
    } catch(e) {
      console.error('[DB-SAVE-ONE]', e); _toastErr('Erro interno ao salvar dados: ' + e.message); return false;
    }
  };

  // ================= DELETE ONE RECORD =================
  // Para containers, id = 'container\x00bl'.
  window._dmFireDelete = async function(type, id) {
    if (!TABLE[type]) return false;
    try {
      const err = await _deleteKeys(type, [String(id)]);
      if (err) { console.error('[DB-DELETE]', err); _toastErr('Erro ao excluir no servidor: ' + err.message); return false; }
      const sKey = STORE[type];
      window._dmStore[sKey] = (window._dmStore[sKey] || []).filter(r => _KEY_FN[type](r) !== String(id));
      return true;
    } catch(e) {
      console.error('[DB-DELETE]', e); _toastErr('Erro ao excluir: ' + e.message); return false;
    }
  };

  // ================= SUBSTITUIÇÃO COMPLETA (backup / checkpoint) =================
  // Ordem segura: 1) grava TODOS os registros do snapshot; 2) só depois remove
  // o que não está no snapshot. Se a gravação falhar, nada é apagado.
  // (Antes: apagava as tabelas e reinseria só o que "mudou" em relação à
  // memória — registros iguais nunca voltavam.)
  window._dmFireReplaceAll = async function(snapshot) {
    const types = ['bls', 'trk', 'clients'];
    for (const t of types) {
      const rows = (snapshot[t] || []).filter(r => _KEY_FN[t](r).replace('\x00', ''));
      const err = await _upsertRows(t, rows);
      if (err) return { ok: false, error: `${t}: ${err.message}` };
    }
    for (const t of types) {
      const keep = new Set((snapshot[t] || []).map(_KEY_FN[t]));
      let existing;
      try {
        existing = t === 'trk'
          ? (await fetchAllPages('containers', 'container, bl')).map(r => r.container + '\x00' + (r.bl || ''))
          : (await fetchAllPages(TABLE[t], 'id')).map(r => String(r.id));
      } catch (e) { return { ok: false, error: e.message }; }
      const err = await _deleteKeys(t, [...new Set(existing.filter(k => !keep.has(k)))]);
      if (err) return { ok: false, error: `${t}: ${err.message}` };
      window._dmStore[STORE[t]] = JSON.parse(JSON.stringify(snapshot[t] || []));
    }
    window._dmStore.clients = deduplicateClientsList(window._dmStore.clients);
    window._dmStore.trk     = deduplicateTrkList(window._dmStore.trk);
    return { ok: true };
  };

  // ================= AUDIT LOG =================
  window._dmFireLog = async function(action, details) {
    try {
      const nome = window._dmUserData?.nome || window._dmUser?.email || uid;
      const { error } = await sb.from('logs').insert({
        user_id: uid, usuario_nome: nome, sessao_id: window._dmSession,
        acao: action, detalhe: sanitize(details || {})
      });
      if (error) console.error('[DB-LOG]', error);
    } catch(e) { console.error('[DB-LOG]', e); }
  };

  // Login registrado uma vez por sessão do navegador.
  try {
    const k = 'dm_login_logged_' + uid;
    if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); window._dmFireLog('login', { email: user.email }); }
  } catch (e) { /* storage indisponível */ }

  // ================= ALERT DAYS =================
  window._dmSaveAlertDays = async function(days) {
    try {
      const { error } = await sb.from('settings').upsert({ user_id: uid, alert_days: days });
      if (error) { console.error('[DB-SETTINGS]', error); _toastErr('Erro ao salvar configuração: ' + error.message); }
      else if (window._dmStore) window._dmStore.alertDays = days;
    } catch(e) { console.error('[DB-SETTINGS]', e); }
  };

  // ================= USUARIOS =================
  window._dmFireLoadUsuarios = async function() {
    const { data, error } = await sb.from('usuarios').select('*').order('nome');
    if (error) { console.error('[DB] loadUsuarios:', error); return []; }
    return (data || []).map(r => ({ ...r, uid: r.id }));
  };

  window._dmFireSaveUsuario = async function(userData) {
    const id = userData.uid || userData.id;
    if (!id) return { ok: false, error: 'id ausente' };
    const row = {
      id, nome: userData.nome || '', email: userData.email || '', cargo: userData.cargo || '',
      admin: !!userData.admin, ativo: userData.ativo !== false
    };
    const { error } = await sb.from('usuarios').upsert(row);
    if (error) { console.error('[DB] saveUsuario:', error); return { ok: false, error: error.message }; }
    return { ok: true };
  };

  // ================= LOGS DE AUDITORIA =================
  window._dmFireLoadLogs = async function(limit) {
    const { data, error } = await sb.from('logs').select('*').order('criado_em', { ascending: false }).limit(limit || 2000);
    if (error) { console.error('[DB] loadLogs:', error); return []; }
    return data || [];
  };

  // ================= CHECKPOINTS =================
  window._dmFireSaveCheckpoint = async function(label, tipo) {
    const payload = {
      bls:     JSON.parse(JSON.stringify(window._dmStore.bls     || [])),
      trk:     JSON.parse(JSON.stringify(window._dmStore.trk     || [])),
      clients: JSON.parse(JSON.stringify(window._dmStore.clients || []))
    };
    const nome = window._dmUserData?.nome || window._dmUser?.email || uid;
    const { data, error } = await sb.from('checkpoints').insert({
      user_id: uid, label: label || '', tipo: tipo || 'manual', criado_por: nome, payload
    }).select('id, label, tipo, criado_por, criado_em').single();
    if (error) { console.error('[DB] saveCheckpoint:', error); return null; }
    return data;
  };

  window._dmFireLoadCheckpoints = async function() {
    const { data, error } = await sb.from('checkpoints')
      .select('id, label, tipo, criado_por, criado_em').order('criado_em', { ascending: false }).limit(50);
    if (error) { console.error('[DB] loadCheckpoints:', error); return []; }
    return data || [];
  };

  window._dmFireRestoreCheckpoint = async function(id) {
    const { data, error } = await sb.from('checkpoints').select('payload, label').eq('id', id).single();
    if (error || !data) return { ok: false, error: error ? error.message : 'checkpoint não encontrado' };
    const res = await window._dmFireReplaceAll(data.payload || {});
    return res.ok ? { ok: true, label: data.label } : res;
  };

  window._dmFireDeleteCheckpoint = async function(id) {
    const { error } = await sb.from('checkpoints').delete().eq('id', id);
    if (error) { console.error('[DB] deleteCheckpoint:', error); return false; }
    return true;
  };

  // ================= LOGOUT =================
  window._dmLogout = async function() {
    try { await window._dmFireLog('logout', {}); } catch (e) {}
    try { sessionStorage.removeItem('dm_login_logged_' + uid); } catch (e) {}
    try { await sb.auth.signOut(); }
    catch(e) { console.error('[DB] logout:', e); window.location.href = 'index.html'; }
  };

  // ================= REALTIME =================
  // Alterações de outros usuários chegam aqui e atualizam o store; init.js
  // recarrega as listas da tela (window._dmOnRemoteChange).
  function _applyRemote(type, payload) {
    const sKey = STORE[type];
    const rec = payload.new && Object.keys(payload.new).length ? payload.new : null;
    const old = payload.old || {};
    let store = (window._dmStore[sKey] || []).slice();
    if (payload.eventType === 'DELETE') {
      const key = type === 'trk' ? (old.container + '\x00' + (old.bl || '')) : String(old.id);
      if (type === 'bls') {
        store = store.filter(r => _KEY_FN[type](r) !== key);
      } else {
        // Containers/clientes podem ter cópias por usuário (PK inclui user_id):
        // a exclusão de UMA cópia não significa que o registro sumiu. Confere.
        const q = type === 'trk'
          ? sb.from('containers').select('container, bl, data, updated_at').eq('container', old.container).eq('bl', old.bl || '')
          : sb.from('clients').select('id, data, updated_at').eq('id', String(old.id));
        q.order('updated_at', { ascending: false }).limit(1).then(({ data, error }) => {
          if (error) return;
          const row = data && data[0];
          if (row) _applyRemote(type, { eventType: 'UPDATE', new: row, old: {} });
          else {
            window._dmStore[sKey] = (window._dmStore[sKey] || []).filter(r => _KEY_FN[type](r) !== key);
            if (typeof window._dmOnRemoteChange === 'function') window._dmOnRemoteChange(type);
          }
        });
        return;
      }
    } else if (rec) {
      let obj = rec.data || {};
      if (type === 'trk') obj = { ...obj, container: rec.container, bl: rec.bl || '', _updatedAt: rec.updated_at };
      if (type === 'clients') obj = { ...obj, id: rec.id, _updatedAt: rec.updated_at };
      const key = _KEY_FN[type](obj);
      const idx = store.findIndex(r => _KEY_FN[type](r) === key);
      if (idx >= 0) store[idx] = obj; else store.push(obj);
    }
    window._dmStore[sKey] = type === 'trk' ? deduplicateTrkList(store) : type === 'clients' ? deduplicateClientsList(store) : store;
    if (typeof window._dmOnRemoteChange === 'function') window._dmOnRemoteChange(type);
  }
  try {
    const ch = sb.channel && sb.channel('dm-sync');
    if (ch) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'bls' },        p => _applyRemote('bls', p))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'containers' }, p => _applyRemote('trk', p))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' },    p => _applyRemote('clients', p))
        .subscribe();
    }
  } catch (e) { console.warn('[DB] realtime indisponível:', e); }

  console.log('[DB] ✓ Supabase inicializado — usuário:', user.email);

  let _waitAttempts = 0;
  function waitForAppReady() {
    if (window._dmOnReady) { window._dmOnReady(); }
    else if (++_waitAttempts > 300) {
      console.error('[DB] Timeout aguardando _dmOnReady — scripts podem ter falhado ao carregar.');
      fatalScreen('Erro ao carregar', 'Alguns scripts não carregaram corretamente. Verifique sua conexão e tente novamente.');
    } else { setTimeout(waitForAppReady, 50); }
  }
  waitForAppReady();
})();
