// ============================================================
// users.js — Módulo Admin: Usuários e Log de Auditoria
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Dependências (carregadas antes via <script src>):
//   utils.js   — toast, openModal, closeModal
// Requer window._dmIsAdmin, window._dmFireLoadUsuarios,
//         window._dmFireLoadLogs, window._dmFireSaveUsuario
// ============================================================

// USUARIOS MODULE
// ============================================================

// In-memory cache for users module
let _usrList = [];
let _logList = [];
let _logPage = 0;
const LOG_PER_PAGE = 50;
let _editingUserId = null;

async function renderUsers() {
  if (!window._dmIsAdmin) {
    const usersEl = document.getElementById('mod-users');
    if (usersEl) usersEl.innerHTML = '<div style="padding:60px;text-align:center;color:var(--muted);">⛔ Acesso restrito a administradores.</div>';
    return;
  }
  // Load users
  if (window._dmFireLoadUsuarios) {
    _usrList = await window._dmFireLoadUsuarios() || [];
  }
  // Load logs
  if (window._dmFireLoadLogs) {
    _logList = await window._dmFireLoadLogs() || [];
  }
  _logPage = 0;
  _renderUserTable();
  _renderLogTable();
  _updateUsrKPIs();
}

function _updateUsrKPIs() {
  const today = new Date().toISOString().slice(0,10);
  const activeUsers = _usrList.filter(u => u.ativo !== false).length;
  const sessionsToday = _logList.filter(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    return d.toISOString().slice(0,10) === today && l.acao === 'login';
  }).length;
  const el1 = document.getElementById('usr-kpi-total');
  const el2 = document.getElementById('usr-kpi-sessions');
  const el3 = document.getElementById('usr-kpi-logs');
  if (el1) el1.textContent = activeUsers;
  if (el2) el2.textContent = sessionsToday;
  if (el3) el3.textContent = _logList.length;
}

function _renderUserTable() {
  const tbody = document.getElementById('usr-body');
  if (!tbody) return;
  if (!_usrList.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">Nenhum usuário encontrado. Clique em "+ Novo Usuário".</td></tr>';
    return;
  }
  tbody.innerHTML = _usrList.map(u => {
    const criadoEm = u.criado_em?.toDate ? u.criado_em.toDate().toLocaleDateString('pt-BR') : (u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '—');
    const adminBadge = u.admin ? '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">ADMIN</span>' : '—';
    const ativoBadge = u.ativo !== false ? '<span style="color:#10b981;font-weight:700;">✔ Ativo</span>' : '<span style="color:#ef4444;font-weight:700;">✗ Inativo</span>';
    return `<tr>
      <td style="font-weight:600">${u.nome||'—'}</td>
      <td style="font-size:12px;color:var(--muted)">${u.email||'—'}</td>
      <td>${u.cargo||'—'}</td>
      <td style="text-align:center">${adminBadge}</td>
      <td style="text-align:center">${ativoBadge}</td>
      <td style="font-size:12px">${criadoEm}</td>
      <td style="text-align:center">
        <button class="act-btn edit" onclick="openEditUser('${u.uid||u.id}')" style="padding:4px 10px;font-size:12px;">Editar</button>
      </td>
    </tr>`;
  }).join('');
}

function _getFilteredLogs() {
  const qUser   = (document.getElementById('log-filter-user')?.value  || '').toLowerCase();
  const qAction = document.getElementById('log-filter-action')?.value || '';
  const qFrom   = document.getElementById('log-filter-from')?.value   || '';
  const qTo     = document.getElementById('log-filter-to')?.value     || '';
  return _logList.filter(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    const dStr = d.toISOString().slice(0,10);
    if (qUser   && !(l.usuario_nome||'').toLowerCase().includes(qUser)) return false;
    if (qAction && l.acao !== qAction) return false;
    if (qFrom   && dStr < qFrom) return false;
    if (qTo     && dStr > qTo)   return false;
    return true;
  });
}

function _renderLogTable() {
  const tbody = document.getElementById('log-body');
  if (!tbody) return;
  const filtered = _getFilteredLogs();
  const total = filtered.length;
  const start = _logPage * LOG_PER_PAGE;
  const page = filtered.slice(start, start + LOG_PER_PAGE);

  const countLabel = document.getElementById('log-count-label');
  const pageLabel  = document.getElementById('log-page-label');
  const prevBtn    = document.getElementById('log-prev-btn');
  const nextBtn    = document.getElementById('log-next-btn');
  if (countLabel) countLabel.textContent = `${total} registro(s)`;
  const totalPages = Math.max(1, Math.ceil(total / LOG_PER_PAGE));
  if (pageLabel) pageLabel.textContent = `Página ${_logPage+1} de ${totalPages}`;
  if (prevBtn) prevBtn.disabled = _logPage === 0;
  if (nextBtn) nextBtn.disabled = _logPage >= totalPages - 1;

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px;">Nenhum log encontrado.</td></tr>';
    return;
  }

  const actionColors = {
    login:              '#dcfce7;color:#15803d',
    logout:             '#f3f4f6;color:#6b7280',
    criacao_bl:         '#dbeafe;color:#1d4ed8',
    edicao_bl:          '#e0e7ff;color:#4338ca',
    exclusao_bl:        '#fee2e2;color:#dc2626',
    marcacao_pagamento: '#d1fae5;color:#065f46',
    marcacao_fatura:    '#fef3c7;color:#92400e',
    abertura_disputa:   '#fed7aa;color:#c2410c',
    resolucao_disputa:  '#dcfce7;color:#15803d',
    edicao_cliente:     '#e0e7ff;color:#4338ca',
    envio_email:        '#dbeafe;color:#1e40af',
    importacao_planilha:'#f0fdf4;color:#166534',
    exportacao_relatorio:'#f0fdf4;color:#166534',
  };

  tbody.innerHTML = page.map(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    const dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    const style = actionColors[l.acao] || '#f9fafb;color:#374151';
    const actionBadge = `<span style="background:${style};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">${l.acao||'?'}</span>`;
    let detalhe = '';
    try {
      const d2 = l.detalhe || {};
      const parts = [];
      if (d2.bl) parts.push(`BL: ${d2.bl}`);
      if (d2.blId) parts.push(`ID: ${d2.blId}`);
      if (d2.total != null) parts.push(`Total: R$ ${Number(d2.total).toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
      if (d2.hasDiscount) parts.push('com desconto');
      if (d2.hasDispute) parts.push('em disputa');
      detalhe = parts.join(' · ') || JSON.stringify(d2);
    } catch(e) { detalhe = '—'; }
    return `<tr>
      <td style="font-size:12px;white-space:nowrap">${dateStr}</td>
      <td style="font-size:12px;font-weight:500">${l.usuario_nome||'—'}</td>
      <td>${actionBadge}</td>
      <td style="font-size:11px;color:var(--muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${detalhe}</td>
    </tr>`;
  }).join('');
}

function renderLogs() {
  _logPage = 0;
  _renderLogTable();
}

function logPage(dir) {
  const filtered = _getFilteredLogs();
  const totalPages = Math.max(1, Math.ceil(filtered.length / LOG_PER_PAGE));
  _logPage = Math.max(0, Math.min(_logPage + dir, totalPages - 1));
  _renderLogTable();
}

function clearLogFilters() {
  ['log-filter-user','log-filter-action','log-filter-from','log-filter-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderLogs();
}

function openNewUser() {
  _editingUserId = null;
  document.getElementById('modal-user-title').textContent = 'Novo Usuário';
  document.getElementById('save-user-label').textContent  = 'Criar';
  document.getElementById('fu-nome').value  = '';
  document.getElementById('fu-email').value = '';
  document.getElementById('fu-cargo').value = '';
  document.getElementById('fu-admin').checked = false;
  document.getElementById('fu-ativo').checked = true;
  openModal('modal-user');
}

function openEditUser(uid2) {
  const u = _usrList.find(x => (x.uid||x.id) === uid2);
  if (!u) return;
  _editingUserId = uid2;
  document.getElementById('modal-user-title').textContent = 'Editar Usuário';
  document.getElementById('save-user-label').textContent  = 'Atualizar';
  document.getElementById('fu-nome').value  = u.nome  || '';
  document.getElementById('fu-email').value = u.email || '';
  document.getElementById('fu-cargo').value = u.cargo || '';
  document.getElementById('fu-admin').checked = !!u.admin;
  document.getElementById('fu-ativo').checked = u.ativo !== false;
  openModal('modal-user');
}

async function saveUser() {
  const nome  = document.getElementById('fu-nome').value.trim();
  const email = document.getElementById('fu-email').value.trim();
  const cargo = document.getElementById('fu-cargo').value.trim();
  const admin = document.getElementById('fu-admin').checked;
  const ativo = document.getElementById('fu-ativo').checked;

  if (!nome)  { toast('Nome é obrigatório.', 'error'); return; }
  if (!email) { toast('E-mail é obrigatório.', 'error'); return; }

  const data = { nome, email, cargo, admin, ativo };
  if (_editingUserId) data.uid = _editingUserId;

  if (window._dmFireSaveUsuario) {
    const ok = await window._dmFireSaveUsuario(data);
    if (ok) {
      toast(_editingUserId ? 'Usuário atualizado!' : 'Usuário salvo!', 'success');
      logAuditAction('edicao_usuario', { uid: _editingUserId, nome, email });
      closeModal('modal-user');
      await renderUsers();
    } else {
      toast('Erro ao salvar usuário no Firebase.', 'error');
    }
  } else {
    toast('Firebase não disponível.', 'error');
  }
}

function exportLogsCSV() {
  const filtered = _getFilteredLogs();
  if (!filtered.length) { toast('Nenhum log para exportar.', 'error'); return; }
  const header = ['DATA/HORA','USUÁRIO','AÇÃO','DETALHE'];
  const rows = filtered.map(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    const dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
    let detalhe = '';
    try { detalhe = JSON.stringify(l.detalhe||{}); } catch(e) {}
    return [dateStr, l.usuario_nome||'', l.acao||'', detalhe];
  });
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `auditoria_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('CSV exportado!', 'success');
  logAuditAction('exportacao_relatorio', {tipo:'logs_auditoria', registros: filtered.length});
}

function confirmClearOldLogs() {
  const cutoff = prompt('Limpar logs mais antigos que quantos dias? (ex: 90)');
  if (!cutoff || isNaN(Number(cutoff))) return;
  const dias = parseInt(cutoff);

  const cutDate = new Date(Date.now() - dias * 86400000);
  const toDelete = _logList.filter(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    return d < cutDate;
  });

  if (!toDelete.length) {
    toast('Nenhum log encontrado para o período informado.');
    return;
  }

  showDoubleConfirmation(
    'Excluir Logs Antigos?',
    `Você está prestes a excluir permanentemente todos os logs anteriores a ${dias} dias. Estes registros de auditoria não poderão ser recuperados.`,
    toDelete.length,
    () => {
      // FIX-QUOTA #J: deleta logs em batches de 400 (limite Firestore = 500)
      // Antes: N deletes sequenciais. Agora: ceil(N/400) batch commits.
      if (window._dmDb && window._dmFireLog) {
        (async () => {
          const { writeBatch, doc: docFn } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
          let deleted = 0;
          const CHUNK = 400;
          const docsToDelete = toDelete.filter(l => l._docId);
          for (let i = 0; i < docsToDelete.length; i += CHUNK) {
            const batch = writeBatch(window._dmDb);
            docsToDelete.slice(i, i + CHUNK).forEach(l => {
              batch.delete(docFn(window._dmDb, 'logs', l._docId));
            });
            try {
              await batch.commit();
              deleted += Math.min(CHUNK, docsToDelete.length - i);
            } catch(e) { console.error('[LOGS-DELETE]', e); }
          }
          toast(`✓ ${deleted} log(s) excluído(s) permanentemente.`, 'success');
          logAuditAction('limpeza_logs', { diasCutoff: dias, deletados: deleted });
          await renderUsers();
        })();
      } else {
        toast('Firebase não disponível para exclusão.', 'error');
      }
    }
  );
}

