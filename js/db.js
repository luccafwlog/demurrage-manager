// ============================================================
// db.js — Firebase initialization, Firestore helpers
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Este módulo é carregado como <script type="module" src="js/db.js">
// Expõe todos os helpers via window.* para compatibilidade com
// os demais scripts que rodam em escopo global.
// ============================================================

import { initializeApp }      from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
                               from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  getFirestore,
  collection, doc,
  onSnapshot, writeBatch, setDoc, deleteDoc, getDoc,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBWXLvUspGo1rRDSWYJ3rGMRUOGUH6bARI",
  authDomain:        "demurragemanager.firebaseapp.com",
  projectId:         "demurragemanager",
  storageBucket:     "demurragemanager.firebasestorage.app",
  messagingSenderId: "951449004275",
  appId:             "1:951449004275:web:c01cc83d02ba87d9bcaf86"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Persistência offline: mantém último snapshot no IndexedDB quando Firebase indisponível
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('[DB] Offline persistence desativada: múltiplas abas abertas.');
  } else if (err.code === 'unimplemented') {
    console.warn('[DB] Offline persistence não suportada neste browser.');
  }
});

// ── Sanitiza objeto para Firestore: remove undefined, converte NaN → null ──
function sanitize(obj) {
  if (Array.isArray(obj))    return obj.map(sanitize);
  if (obj === null)          return null;
  if (typeof obj !== 'object') {
    if (typeof obj === 'number' && isNaN(obj)) return null;
    return obj === undefined ? null : obj;
  }
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined) continue;          // remove campo undefined
    out[k] = sanitize(v);
  }
  return out;
}

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = 'index.html'; return; }

  const uid         = user.uid;
  const uCol        = (col)     => collection(db, 'users', uid, col);
  const uDoc        = (col, id) => doc(db, 'users', uid, col, String(id));
  const settingsDoc =              doc(db, 'users', uid, 'settings', 'alerts');

  window._dmStore = { bls: [], trk: [], clients: [], alertDays: 5 };

  let blsReady = false, trkReady = false, cliReady = false;

  function checkReady() {
    if (!blsReady || !trkReady || !cliReady) return;
    getDoc(settingsDoc)
      .then(snap => { if (snap.exists()) window._dmStore.alertDays = snap.data().days ?? 5; })
      .catch(() => {})
      .finally(() => { if (window._dmOnReady) window._dmOnReady(); });
  }

  // ── Listeners em tempo real ──────────────────────────────────────────────
  // FIX #6: erros de onSnapshot exibidos visivelmente (nao silenciados no console)
  function _handleSnapshotError(col, err, isReady, markReady) {
    console.error('[DB] ' + col + ':', err);
    if (window.toast) window.toast('\u26a0\ufe0f Erro ao carregar dados (' + col + '): ' + (err.code || err.message) + '. Recarregue a pagina.', 'error');
    if (!isReady) markReady();
  }

  onSnapshot(uCol('bls'), snap => {
    window._dmStore.bls = snap.docs.map(d => d.data());
    if (!blsReady) { blsReady = true; checkReady(); }
    else if (window._dmOnBLsUpdate) window._dmOnBLsUpdate();
  }, err => _handleSnapshotError('bls', err, blsReady, () => { blsReady = true; checkReady(); }));

  onSnapshot(uCol('containers'), snap => {
    window._dmStore.trk = snap.docs.map(d => d.data());
    if (!trkReady) { trkReady = true; checkReady(); }
    else if (window._dmOnTrkUpdate) window._dmOnTrkUpdate();
  }, err => _handleSnapshotError('containers', err, trkReady, () => { trkReady = true; checkReady(); }));

  onSnapshot(uCol('clients'), snap => {
    window._dmStore.clients = snap.docs.map(d => d.data());
    if (!cliReady) { cliReady = true; checkReady(); }
    else if (window._dmOnClientsUpdate) window._dmOnClientsUpdate();
  }, err => _handleSnapshotError('clients', err, cliReady, () => { cliReady = true; checkReady(); }));

  // ── Salvar com diff correto: lê store ANTES de atualizar ────────────────
  window._dmFireSave = function(type, newData) {
    console.log(`[DB-SAVE] Iniciando salvamento de ${type}...`, newData.length || 'N/A', 'registros');

    if (type === 'alertDays') {
      // FIX #14: merge:true preserva campos futuros do documento settings/alerts
      setDoc(settingsDoc, { days: newData }, { merge: true })
        .then(() => {
          console.log('[DB-SAVE] alertDays salvo com sucesso');
        })
        .catch(e => {
          console.error('[DB-SAVE] Erro ao salvar alertDays:', e.code, e.message);
          if (window.toast) window.toast('Erro ao salvar dias de alerta: ' + (e.code || e.message), 'error');
        });
      return;
    }

    const batch = writeBatch(db);
    let deleteCount = 0;
    let setCount = 0;
    let prevStore = null; // FIX #1: para rollback em caso de falha no commit

    if (type === 'bls') {
      const oldStore = window._dmStore.bls;           // snapshot ANTES de atualizar
      const newIds   = new Set(newData.map(b => String(b.id)));
      console.log(`[DB-SAVE] BLs: ${oldStore.length} anterior → ${newData.length} novo`);

      oldStore.forEach(b => {
        if (!newIds.has(String(b.id))) {
          batch.delete(uDoc('bls', b.id));
          deleteCount++;
        }
      });
      newData.forEach(b => {
        batch.set(uDoc('bls', b.id), sanitize(b));
        setCount++;
      });
      prevStore = oldStore; // FIX #1: store atualizado APOS commit (ver .then abaixo)

    } else if (type === 'trk') {
      const oldStore = window._dmStore.trk;
      const newIds   = new Set(newData.map(c => String(c.container)));
      console.log(`[DB-SAVE] Containers: ${oldStore.length} anterior → ${newData.length} novo`);

      oldStore.forEach(c => {
        if (!newIds.has(String(c.container))) {
          batch.delete(uDoc('containers', c.container));
          deleteCount++;
        }
      });
      newData.forEach(c => {
        batch.set(uDoc('containers', c.container), sanitize(c));
        setCount++;
      });
      prevStore = oldStore; // FIX #1: store atualizado APOS commit (ver .then abaixo)

    } else if (type === 'clients') {
      const oldStore = window._dmStore.clients;
      const newIds   = new Set(newData.map(c => String(c.id)));
      console.log(`[DB-SAVE] Clientes: ${oldStore.length} anterior → ${newData.length} novo`);

      oldStore.forEach(c => {
        if (!newIds.has(String(c.id))) {
          batch.delete(uDoc('clients', c.id));
          deleteCount++;
        }
      });
      newData.forEach(c => {
        batch.set(uDoc('clients', c.id), sanitize(c));
        setCount++;
      });
      prevStore = oldStore; // FIX #1: store atualizado APOS commit (ver .then abaixo)
    }

    console.log(`[DB-SAVE] Operações em batch: ${deleteCount} deletes + ${setCount} sets`);
    console.log(`[DB-SAVE] Iniciando batch.commit()...`);

    // Timeout de 10 segundos para evitar que fique pendurado
    let timeoutId = setTimeout(() => {
      console.error(`[DB-SAVE] ✗ TIMEOUT: batch.commit() demorou demais (10s)`);
      if (window.toast) window.toast(`Erro: Timeout ao salvar ${type}. Verifique sua conexão.`, 'error');
    }, 10000);

    batch.commit()
      .then(() => {
        clearTimeout(timeoutId);
        // FIX #2: Atualiza store APENAS após confirmação do Firestore (sem rollback indevido aqui)
        if      (type === 'bls')     window._dmStore.bls     = newData;
        else if (type === 'trk')     window._dmStore.trk     = newData;
        else if (type === 'clients') window._dmStore.clients = newData;
        console.log(`[DB-SAVE] ✓ ${type} salvo com sucesso no Firestore!`);
        // FIX #9: mensagem correta — "salvo", não "deletado"
        if (window.toast) window.toast(`✓ Dados salvos com sucesso!`, 'success');
      })
      .catch(e => {
        clearTimeout(timeoutId);
        console.error(`[DB-SAVE] ✗ Erro ao salvar ${type}:`, e.code, e.message, e);
        // FIX #2: rollback do store ao estado anterior em caso de falha no commit
        if (prevStore !== null) {
          if      (type === 'bls')     window._dmStore.bls     = prevStore;
          else if (type === 'trk')     window._dmStore.trk     = prevStore;
          else if (type === 'clients') window._dmStore.clients = prevStore;
          console.warn('[DB-SAVE] Rollback do store "' + type + '" executado após falha.');
        }
        if (window.toast) window.toast(`Erro ao salvar ${type}: ${e.code || e.message}`, 'error');
      });
  };

  // ── Deletar doc único ────────────────────────────────────────────────────
  // FIX #10: atualiza o store in-memory imediatamente após deleteDoc para que a UI
  // não exiba o registro como existente enquanto o onSnapshot não chega.
  window._dmFireDelete = function(type, id) {
    const colMap   = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const storeKey = { bls: 'bls', trk: 'trk', clients: 'clients' }[type];
    const idKey    = { bls: 'id',  trk: 'container', clients: 'id' }[type];
    // Salvar cópia do item antes de remover (para rollback)
    let prevItem = null;
    let prevIndex = -1;
    if (window._dmStore && storeKey && idKey) {
      const arr = window._dmStore[storeKey] || [];
      prevIndex = arr.findIndex(r => String(r[idKey]) === String(id));
      if (prevIndex !== -1) prevItem = arr[prevIndex];
      // Optimistic update: remove imediatamente
      window._dmStore[storeKey] = arr.filter(r => String(r[idKey]) !== String(id));
    }
    deleteDoc(uDoc(colMap[type] || type, id))
      .catch(e => {
        console.error('[DB] delete:', e);
        // Rollback: restaura o item na posição original se a deleção falhar
        if (prevItem !== null && window._dmStore && storeKey) {
          const arr = window._dmStore[storeKey] || [];
          if (prevIndex >= 0 && prevIndex <= arr.length) {
            arr.splice(prevIndex, 0, prevItem);
          } else {
            arr.push(prevItem);
          }
          window._dmStore[storeKey] = arr;
          window._dmRender && window._dmRender();
        }
        if (window.toast) window.toast('Erro ao excluir — item restaurado', 'error');
      });
  };

  // ── Restaurar backup ─────────────────────────────────────────────────────
  // FIX #5: helper — executa operacoes em batches de 400 (limite Firestore = 500)
  async function _commitInChunks(ops) {
    var CHUNK = 400;
    for (var i = 0; i < ops.length; i += CHUNK) {
      var b = writeBatch(db);
      ops.slice(i, i + CHUNK).forEach(function(fn) { fn(b); });
      await b.commit();
    }
  }

  window._dmFireRestore = async function(bkp) {
    // FIX #4: restore SUBSTITUTIVO — apaga docs existentes antes de inserir backup
    var ops = [];
    // 1) Deletar todos os documentos existentes nas colecoes relevantes
    (window._dmStore.bls     || []).forEach(function(b) { ops.push(function(bt) { bt.delete(uDoc("bls", b.id)); }); });
    (window._dmStore.trk     || []).forEach(function(c) { ops.push(function(bt) { bt.delete(uDoc("containers", c.container)); }); });
    (window._dmStore.clients || []).forEach(function(c) { ops.push(function(bt) { bt.delete(uDoc("clients", c.id)); }); });
    // 2) Inserir dados do backup
    if (bkp.bls)       bkp.bls.forEach(function(b)      { ops.push(function(bt) { bt.set(uDoc("bls", b.id), sanitize(b)); }); });
    if (bkp.tracking)  bkp.tracking.forEach(function(c) { ops.push(function(bt) { bt.set(uDoc("containers", c.container), sanitize(c)); }); });
    if (bkp.clients)   bkp.clients.forEach(function(c)  { ops.push(function(bt) { bt.set(uDoc("clients", c.id), sanitize(c)); }); });
    if (bkp.alertDays) ops.push(function(bt) { bt.set(settingsDoc, { days: bkp.alertDays }); });
    // FIX #5: commit em chunks de 400 ops
    await _commitInChunks(ops);
  };

  // ── Expor db e user para o script não-modular ────────────────────────────
  window._dmDb   = db;
  window._dmUser = user;
  window._dmUid  = uid;

  // ── Log de auditoria no Firestore ─────────────────────────────────────────
  let currentSessionId = null;

  window._dmFireLog = async function(action, detalhe = {}) {
    try {
      const { addDoc, collection: col2, serverTimestamp } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      const sessaoId = currentSessionId;
      await addDoc(col2(db, 'logs'), {
        usuario_id:    uid,
        usuario_nome:  user.displayName || user.email || uid,
        sessao_id:     sessaoId || null,
        acao:          action,
        detalhe:       detalhe,
        criado_em:     serverTimestamp()
      });
    } catch (e) { console.warn('[LOG]', action, e); }
  };

  // ── Registrar início de sessão ────────────────────────────────────────────
  (async () => {
    try {
      const { addDoc, collection: col2, serverTimestamp } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      const ref = await addDoc(col2(db, 'sessoes'), {
        usuario_id:   uid,
        usuario_nome: user.displayName || user.email || uid,
        iniciada_em:  serverTimestamp(),
        encerrada_em: null
      });
      currentSessionId = ref.id;
    } catch(e) { console.warn('[SESSAO]', e); }
  })();

  // ── Verificar se usuário é admin ──────────────────────────────────────────
  // FIX #20: valor padrão seguro ANTES do getDoc resolver, para que código que
  // verifica _dmIsAdmin durante a inicialização não encontre undefined.
  window._dmIsAdmin = false;
  getDoc(doc(db, 'usuarios', uid))
    .then(snap => {
      const data = snap.exists() ? snap.data() : {};
      window._dmIsAdmin = !!data.admin;
      window._dmUserData = data;
      // Mostrar aba Usuários e Configurações apenas para admins
      const tabUsers = document.getElementById('tab-users');
      if (tabUsers && window._dmIsAdmin) tabUsers.style.display = '';
      // Aba Configurações: visível para todos os usuários autenticados
      const tabSettings = document.getElementById('tab-settings');
      if (tabSettings) tabSettings.style.display = '';
      // Atualizar nome do usuário no header
      const nameEl = document.getElementById('header-user-name');
      if (nameEl) nameEl.textContent = data.nome || user.displayName || user.email || 'Usuário';
      // Verificar se usuário está ativo
      if (snap.exists() && data.ativo === false) {
        alert('Sua conta foi desativada. Entre em contato com o administrador.');
        signOut(auth).then(() => { window.location.href = 'index.html'; });
      }
    })
    .catch(() => { window._dmIsAdmin = false; });

  // ── Logout ───────────────────────────────────────────────────────────────
  window.doLogout = async function() {
    if (!confirm('Deseja encerrar a sessão?')) return;

    // Mostrar feedback visual ao usuário
    const logoutBtn = document.querySelector('.header-logout');
    if (logoutBtn) {
      logoutBtn.textContent = '⏳ Encerrando...';
      logoutBtn.style.opacity = '0.5';
      logoutBtn.style.pointerEvents = 'none';
    }

    console.log('[LOGOUT] Iniciando processo de logout...');

    // Função de timeout para evitar que a função fique pendurada
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn('[LOGOUT] Timeout atingido - forçando redirecionamento');
        resolve('timeout');
      }, 5000); // 5 segundos de timeout
    });

    try {
      // 1. Registrar encerramento de sessão (não-bloqueante, timeout de 2s)
      if (currentSessionId && db) {
        try {
          const sessionPromise = (async () => {
            const { updateDoc, doc: docFn, serverTimestamp } =
              await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
            await updateDoc(docFn(db, 'sessoes', currentSessionId), {
              encerrada_em: serverTimestamp()
            });
          })();

          await Promise.race([
            sessionPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
          console.log('[LOGOUT] Encerramento de sessão registrado');
        } catch(e) {
          console.warn('[LOGOUT] Não foi possível registrar encerramento:', e.message);
          // Continua mesmo assim
        }
      }

      // 2. Chamar _dmFireLog (não-bloqueante, timeout de 1.5s)
      if (window._dmFireLog && typeof window._dmFireLog === 'function') {
        try {
          const logPromise = window._dmFireLog('logout', {});
          await Promise.race([
            logPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
          ]);
          console.log('[LOGOUT] Log registrado');
        } catch(e) {
          console.warn('[LOGOUT] Erro ao registrar log:', e.message);
          // Continua mesmo assim
        }
      }

      // 3. CRÍTICO: Fazer logout do Firebase (timeout de 2s)
      console.log('[LOGOUT] Executando signOut...');
      if (auth) {
        const signOutPromise = signOut(auth);
        await Promise.race([
          signOutPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 2000))
        ]);
        console.log('[LOGOUT] SignOut bem-sucedido');
      } else {
        console.warn('[LOGOUT] Auth não está disponível - pulando signOut');
      }

    } catch(error) {
      console.error('[LOGOUT] Erro durante logout:', error.message || error);
      // NÃO mostra alert pois pode bloquear o redirecionamento
    } finally {
      // 4. SEMPRE redirecionar para login
      console.log('[LOGOUT] Redirecionando para login...');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 100);
    }
  };

  // ── Carregar logs para admin ──────────────────────────────────────────────
  window._dmFireLoadLogs = async function(filters = {}) {
    try {
      const { getDocs, collection: col2, query, orderBy, where, limit } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      let q = query(col2(db, 'logs'), orderBy('criado_em', 'desc'), limit(1000));
      if (filters.acao) q = query(col2(db, 'logs'), where('acao','==',filters.acao), orderBy('criado_em','desc'), limit(1000));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ _docId: d.id, id: d.id, ...d.data() }));
    } catch(e) { console.warn('[LOGS]', e); return []; }
  };

  // ── Carregar e salvar usuários (admin) ────────────────────────────────────
  window._dmFireLoadUsuarios = async function() {
    try {
      const { getDocs, collection: col2 } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      const snap = await getDocs(col2(db, 'usuarios'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { return []; }
  };

  window._dmFireSaveUsuario = async function(usuarioData) {
    try {
      const { setDoc: setDoc2, doc: docFn, serverTimestamp } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      const id = usuarioData.uid || usuarioData.id;
      await setDoc2(docFn(db, 'usuarios', id), sanitize({ ...usuarioData, criado_em: serverTimestamp() }), { merge: true });
    } catch(e) { console.error('[USUARIO]', e); }
  };
});
