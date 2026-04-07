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
const _CONFLICT = {
  bls:     'user_id,id',
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

  // FIX: containers agora seleciona a coluna `bl` separada (nova PK composta)
  const [blsRes, cliRes, settRes, profRes] = await Promise.all([
    sb.from('bls').select('id, data'),
    sb.from('clients').select('id, data'),
    sb.from('settings').select('alert_days').eq('user_id', uid).maybeSingle(),
    sb.from('usuarios').select('*').eq('id', uid).maybeSingle()
  ]);

  // FIX: paginação para containers — PostgREST tem max_rows que trunca resultados.
  // Busca em páginas de 1000 até obter todos os registros.
  const trkAllRows = [];
  const TRK_PAGE  = 1000;
  let   trkFrom   = 0;
  let   trkError  = null;
  while (true) {
    const { data: page, error: pageErr } = await sb
      .from('containers')
      .select('container, bl, data, updated_at')
      .range(trkFrom, trkFrom + TRK_PAGE - 1);
    if (pageErr) { trkError = pageErr; break; }
    trkAllRows.push(...(page || []));
    if ((page || []).length < TRK_PAGE) break;
    trkFrom += TRK_PAGE;
  }

  if (blsRes.error) console.error('[DB] bls:', blsRes.error);
  if (trkError)     console.error('[DB] containers:', trkError);
  if (cliRes.error) console.error('[DB] clients:', cliRes.error);

  console.log('[DB] containers carregados:', trkAllRows.length);

  window._dmStore.bls     = (blsRes.data  || []).map(r => r.data);

  // FIX: mescla as colunas de primeira classe (container, bl) com o jsonb data,
  // garantindo que container e bl SEMPRE existem no objeto local.
  window._dmStore.trk = trkAllRows.map(r => ({
    ...r.data,
    container: r.container,
    bl: r.bl !== undefined ? r.bl : (r.data && r.data.bl) || ''
  }));

  // FIX: garante que todo cliente tem um `id` válido ao carregar do banco
  window._dmStore.clients = (cliRes.data || []).map(r => ({
    ...r.data,
    id: r.id || (r.data && r.data.id) || (r.data && r.data.cnpj) || ''
  }));

  if (settRes.data) window._dmStore.alertDays = settRes.data.alert_days ?? 5;

  const profile = profRes.data;
  window._dmIsAdmin  = !!profile?.admin;
  window._dmUserData = profile || {};

  // ── Último upload de containers ────────────────────────────
  window._dmRenderLastUpload = function(isoDate) {
    const badge = document.getElementById('last-upload-badge');
    const timeEl = document.getElementById('last-upload-time');
    if (!badge || !timeEl) return;
    if (!isoDate) { badge.style.display = 'none'; return; }
    try {
      const d = new Date(isoDate);
      const now = new Date();
      const diffMs = now - d;
      const diffH = diffMs / 3600000;
      let label;
      if (diffH < 1) {
        const diffMin = Math.round(diffMs / 60000);
        label = diffMin <= 1 ? 'agora mesmo' : `há ${diffMin} min`;
      } else if (diffH < 24) {
        label = `hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      timeEl.textContent = label;
      badge.style.display = 'flex';
    } catch(e) { badge.style.display = 'none'; }
  };
  // Calcula max updated_at dos containers carregados
  if (trkAllRows.length > 0) {
    const maxUpd = trkAllRows.reduce((max, r) => {
      const t = r.updated_at || '';
      return t > max ? t : max;
    }, '');
    if (maxUpd) window._dmRenderLastUpload(maxUpd);
  }

  // ================= SAVE (full array diff) =================
  window._dmFireSave = function(type, newData) {
    const TABLE = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE = { bls: 'bls', trk: 'trk',        clients: 'clients' };

    const table    = TABLE[type];
    const sKey     = STORE[type];
    const keyFn    = _KEY_FN[type];
    const colsFn   = _COLS_FN[type];
    const conflict = _CONFLICT[type];

    if (!table || !sKey || !keyFn) return;

    // Snapshot imutável do store atual (evita que mutações posteriores ao array
    // do módulo invalidem o diff antes do upsert assíncrono completar)
    const oldStore = JSON.parse(JSON.stringify(window._dmStore[sKey] || []));

    // FIX: deduplicação usa chave composta (container|bl para trk, id para os outros)
    const oldMap = new Map(
      oldStore.map(r => [keyFn(r), JSON.stringify(sanitize(r))])
    );

    const newKeySet = new Set(newData.map(r => keyFn(r)));

    // Registros a deletar: estavam no store antigo mas não estão no novo
    const toDeleteKeys = oldStore
      .filter(r => !newKeySet.has(keyFn(r)))
      .map(r => keyFn(r));

    // Registros a upsert: novos ou com dados diferentes
    const toUpsert = newData.filter(r => {
      const key = keyFn(r);
      return !oldMap.has(key) || oldMap.get(key) !== JSON.stringify(sanitize(r));
    });

    (async () => {
      try {
        // DELETE — usa filtros específicos por tipo para garantir user_id
        if (toDeleteKeys.length > 0) {
          if (type === 'trk') {
            // FIX: containers precisam de delete por (container, bl) — chave composta
            for (const key of toDeleteKeys) {
              const [container, bl] = key.split('\x00');
              const { error: delErr } = await sb.from(table).delete()
                .eq('user_id', uid)
                .eq('container', container)
                .eq('bl', bl);
              if (delErr) console.error('[DB-SAVE] delete container error:', delErr);
            }
          } else {
            // bls e clients têm id simples — delete em batch
            const idCol = type === 'bls' ? 'id' : 'id';
            const ids = toDeleteKeys;
            const { error: delErr } = await sb.from(table).delete()
              .eq('user_id', uid)
              .in(idCol, ids);
            if (delErr) console.error('[DB-SAVE] delete error:', delErr);
          }
        }

        // UPSERT
        if (toUpsert.length > 0) {
          // FIX: rowMap usa chave composta para evitar duplicatas no batch
          const rowMap = new Map();
          for (const r of toUpsert) {
            const key = keyFn(r);
            rowMap.set(key, {
              ...colsFn(r),         // colunas de primeira classe (container+bl, ou id)
              user_id: uid,
              data: sanitize(r),
              updated_at: new Date().toISOString()
            });
          }
          const rows = Array.from(rowMap.values());
          const CHUNK = 50;
          for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK);
            const { error: upsErr } = await sb.from(table).upsert(chunk, { onConflict: conflict });
            if (upsErr) { console.error('[DB-SAVE] upsert error (chunk ' + i + '):', upsErr); break; }
          }
        }

        // FIX: armazena cópia profunda — NUNCA a referência direta.
        // Se _dmStore[sKey] === newData (mesma referência), mutações futuras
        // no array do módulo já refletem em oldStore, tornando o diff sempre
        // vazio e impedindo saves subsequentes.
        window._dmStore[sKey] = JSON.parse(JSON.stringify(newData));
      } catch(e) {
        console.error('[DB-SAVE]', e);
      }
    })();
  };

  // ================= SAVE ONE RECORD =================
  window._dmFireSaveOne = function(type, id, data) {
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };

    const table    = TABLE[type];
    const sKey     = STORE[type];
    const keyFn    = _KEY_FN[type];
    const colsFn   = _COLS_FN[type];
    const conflict = _CONFLICT[type];
    if (!table) return;

    (async () => {
      try {
        const row = {
          ...colsFn(data),       // colunas de primeira classe
          user_id: uid,
          data: sanitize(data),
          updated_at: new Date().toISOString()
        };
        const { error } = await sb.from(table).upsert(row, { onConflict: conflict });
        if (error) { console.error('[DB-SAVE-ONE]', error); return; }

        // Atualiza store local com cópia profunda (evita referência compartilhada)
        const store   = JSON.parse(JSON.stringify(window._dmStore[sKey] || []));
        const key     = keyFn(data);
        const idx     = store.findIndex(r => keyFn(r) === key);
        const dataCopy = JSON.parse(JSON.stringify(data));
        if (idx >= 0) store[idx] = dataCopy;
        else store.push(dataCopy);
        window._dmStore[sKey] = store;
      } catch(e) {
        console.error('[DB-SAVE-ONE]', e);
      }
    })();
  };

  // ================= DELETE ONE RECORD =================
  window._dmFireDelete = function(type, id) {
    const TABLE  = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const STORE  = { bls: 'bls', trk: 'trk',        clients: 'clients' };
    const IDKEY  = { bls: 'id',  trk: null,          clients: 'id'     };

    const table = TABLE[type];
    const sKey  = STORE[type];
    if (!table) return;

    (async () => {
      try {
        if (type === 'trk') {
          // FIX: para containers, id deve ser 'container\x00bl'
          const [container, bl] = String(id).split('\x00');
          const { error } = await sb.from(table).delete()
            .eq('user_id', uid)
            .eq('container', container)
            .eq('bl', bl !== undefined ? bl : '');
          if (error) { console.error('[DB-DELETE] container:', error); return; }
          if (sKey && window._dmStore[sKey]) {
            window._dmStore[sKey] = window._dmStore[sKey].filter(r =>
              !(String(r.container) === container && String(r.bl || '') === (bl || ''))
            );
          }
        } else {
          const idKey = IDKEY[type];
          const { error } = await sb.from(table).delete()
            .eq('user_id', uid)
            .eq(idKey, String(id));
          if (error) { console.error('[DB-DELETE]', error); return; }
          if (sKey && window._dmStore[sKey]) {
            window._dmStore[sKey] = window._dmStore[sKey].filter(r => String(r[idKey]) !== String(id));
          }
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

  // ================= CHECKPOINTS =================
  window._dmFireSaveCheckpoint = async function(label, tipo) {
    try {
      const payload = {
        bls:     JSON.parse(JSON.stringify(window._dmStore.bls     || [])),
        trk:     JSON.parse(JSON.stringify(window._dmStore.trk     || [])),
        clients: JSON.parse(JSON.stringify(window._dmStore.clients || []))
      };
      const nome = window._dmUserData?.nome || window._dmUser?.email || uid;
      const { data, error } = await sb.from('checkpoints').insert({
        user_id:     uid,
        label:       label || '',
        tipo:        tipo  || 'manual',
        criado_por:  nome,
        payload:     payload
      }).select('id, label, tipo, criado_por, criado_em').single();
      if (error) { console.error('[DB] saveCheckpoint:', error); return null; }
      return data;
    } catch(e) {
      console.error('[DB] saveCheckpoint:', e);
      return null;
    }
  };

  window._dmFireLoadCheckpoints = async function() {
    try {
      const { data, error } = await sb
        .from('checkpoints')
        .select('id, label, tipo, criado_por, criado_em')
        .order('criado_em', { ascending: false })
        .limit(50);
      if (error) { console.error('[DB] loadCheckpoints:', error); return []; }
      return data || [];
    } catch(e) {
      console.error('[DB] loadCheckpoints:', e);
      return [];
    }
  };

  window._dmFireRestoreCheckpoint = async function(id) {
    try {
      const { data, error } = await sb
        .from('checkpoints')
        .select('payload, label')
        .eq('id', id)
        .single();
      if (error || !data) { console.error('[DB] restoreCheckpoint fetch:', error); return false; }

      const payload = data.payload || {};
      // Limpa tabelas existentes
      await Promise.all([
        sb.from('bls').delete().eq('user_id', uid),
        sb.from('containers').delete().eq('user_id', uid),
        sb.from('clients').delete().eq('user_id', uid)
      ]);

      // Restaura BLs
      if (payload.bls?.length) {
        const rows = payload.bls.map(r => ({ id: String(r.id||''), user_id: uid, data: sanitize(r), updated_at: new Date().toISOString() }));
        for (let i = 0; i < rows.length; i += 50) {
          const { error: e } = await sb.from('bls').upsert(rows.slice(i, i+50), { onConflict: 'user_id,id' });
          if (e) { console.error('[DB] restore bls chunk:', e); return false; }
        }
      }

      // Restaura containers
      if (payload.trk?.length) {
        const rows = payload.trk.map(r => ({ container: String(r.container||''), bl: String(r.bl||''), user_id: uid, data: sanitize(r), updated_at: new Date().toISOString() }));
        for (let i = 0; i < rows.length; i += 50) {
          const { error: e } = await sb.from('containers').upsert(rows.slice(i, i+50), { onConflict: 'user_id,container,bl' });
          if (e) { console.error('[DB] restore containers chunk:', e); return false; }
        }
      }

      // Restaura clientes
      if (payload.clients?.length) {
        const rows = payload.clients.map(r => ({ id: String(r.id||r.cnpj||''), user_id: uid, data: sanitize(r), updated_at: new Date().toISOString() }));
        for (let i = 0; i < rows.length; i += 50) {
          const { error: e } = await sb.from('clients').upsert(rows.slice(i, i+50), { onConflict: 'user_id,id' });
          if (e) { console.error('[DB] restore clients chunk:', e); return false; }
        }
      }

      // Atualiza store em memória
      window._dmStore.bls     = JSON.parse(JSON.stringify(payload.bls     || []));
      window._dmStore.trk     = JSON.parse(JSON.stringify(payload.trk     || []));
      window._dmStore.clients = JSON.parse(JSON.stringify(payload.clients || []));

      return data.label || true;
    } catch(e) {
      console.error('[DB] restoreCheckpoint:', e);
      return false;
    }
  };

  window._dmFireDeleteCheckpoint = async function(id) {
    try {
      const { error } = await sb.from('checkpoints').delete().eq('id', id);
      if (error) { console.error('[DB] deleteCheckpoint:', error); return false; }
      return true;
    } catch(e) {
      console.error('[DB] deleteCheckpoint:', e);
      return false;
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
