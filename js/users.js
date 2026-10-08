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
    // Mostra aviso no pane correto (cfg-users), não no mod-users legado
    const pane = document.getElementById('cfg-users');
    if (pane) pane.innerHTML = '<div style="padding:60px;text-align:center;color:var(--muted);font-size:15px;">⛔ Acesso restrito a administradores.</div>';
    return;
  }
  // Mostra indicador de carregamento nos tbodies
  const usrBody = document.getElementById('usr-body');
  const logBody = document.getElementById('log-body');
  if (usrBody) usrBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:20px;">⏳ Carregando usuários...</td></tr>';
  if (logBody) logBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">⏳ Carregando logs...</td></tr>';

  // Load users
  if (window._dmFireLoadUsuarios) {
    _usrList = await window._dmFireLoadUsuarios() || [];
  }
  // Load logs (aumenta limite para 1000)
  if (window._dmFireLoadLogs) {
    _logList = await window._dmFireLoadLogs() || [];
  }
  _logPage = 0;
  _renderUserTable();
  _renderLogTable();
  _updateUsrKPIs();
}

function _updateUsrKPIs() {
  const today = todayISO();
  const activeUsers = _usrList.filter(u => u.ativo !== false).length;
  const sessionsToday = _logList.filter(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    return isoLocal(d) === today && l.acao === 'login';
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
      <td style="font-weight:600">${esc(u.nome||'—')}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(u.email||'—')}</td>
      <td>${esc(u.cargo||'—')}</td>
      <td style="text-align:center">${adminBadge}</td>
      <td style="text-align:center">${ativoBadge}</td>
      <td style="font-size:12px">${criadoEm}</td>
      <td style="text-align:center">
        <button class="act-btn edit" onclick="openEditUser('${escJs(u.uid||u.id)}')" style="padding:4px 10px;font-size:12px;">Editar</button>
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
    const dStr = isoLocal(d);
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
    login:                       '#dcfce7;color:#15803d',
    logout:                      '#f3f4f6;color:#6b7280',
    criacao_bl:                  '#dbeafe;color:#1d4ed8',
    edicao_bl:                   '#e0e7ff;color:#4338ca',
    criacao_fatura_complementar: '#fef3c7;color:#92400e',
    exclusao_bl:                 '#fee2e2;color:#dc2626',
    exclusao_todos_bls:          '#fee2e2;color:#991b1b',
    exclusao_em_massa_bls:       '#fee2e2;color:#b91c1c',
    exclusao_todos_containers:   '#fecaca;color:#dc2626',
    exclusao_em_massa_containers:'#fee2e2;color:#b91c1c',
    marcacao_pagamento:          '#d1fae5;color:#065f46',
    marcacao_fatura:             '#fef3c7;color:#92400e',
    abertura_disputa:            '#fed7aa;color:#c2410c',
    resolucao_disputa:           '#dcfce7;color:#15803d',
    edicao_cliente:              '#e0e7ff;color:#4338ca',
    edicao_usuario:              '#e0e7ff;color:#6d28d9',
    envio_email:                 '#dbeafe;color:#1e40af',
    importacao_planilha:         '#f0fdf4;color:#166534',
    exportacao_relatorio:        '#f0fdf4;color:#166534',
    limpeza_logs:                '#fef9c3;color:#854d0e',
    criacao_checkpoint:          '#f3e8ff;color:#7c3aed',
    restauracao_checkpoint:      '#ede9fe;color:#5b21b6',
  };

  const actionLabels = {
    login:                       'login',
    logout:                      'logout',
    criacao_bl:                  'criação BL',
    edicao_bl:                   'edição BL',
    criacao_fatura_complementar: 'fatura complementar',
    exclusao_bl:                 'exclusão BL',
    exclusao_todos_bls:          'excluiu todos BLs',
    exclusao_em_massa_bls:       'exclusão em massa (BLs)',
    exclusao_todos_containers:   'excluiu containers',
    exclusao_em_massa_containers:'exclusão em massa (containers)',
    marcacao_pagamento:          'pagamento',
    marcacao_fatura:             'faturado',
    abertura_disputa:            'disputa aberta',
    resolucao_disputa:           'disputa resolvida',
    edicao_cliente:              'edição cliente',
    edicao_usuario:              'edição usuário',
    envio_email:                 'e-mail enviado',
    importacao_planilha:         'importação',
    exportacao_relatorio:        'exportação',
    limpeza_logs:                'limpeza logs',
    criacao_checkpoint:          'checkpoint criado',
    restauracao_checkpoint:      'checkpoint restaurado',
  };

  tbody.innerHTML = page.map(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    const dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    const style = actionColors[l.acao] || '#f9fafb;color:#374151';
    const label = actionLabels[l.acao] || (l.acao || '?');
    const actionBadge = `<span style="background:${style};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">${esc(label)}</span>`;
    let detalhe = '';
    try {
      const d2 = l.detalhe || {};
      const parts = [];
      // BL-related
      if (d2.bl)              parts.push(`BL: ${d2.bl}`);
      if (d2.blId)            parts.push(`ID: ${d2.blId}`);
      if (d2.total != null)   parts.push(`Total: R$ ${Number(d2.total).toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
      if (d2.hasDiscount)     parts.push('com desconto');
      if (d2.hasDispute)      parts.push('em disputa');
      // Container-related
      if (d2.quantidade != null) parts.push(`${d2.quantidade} container(s)`);
      if (Array.isArray(d2.containers) && d2.containers.length)
        parts.push(d2.containers.slice(0,5).join(', ') + (d2.containers.length > 5 ? ` +${d2.containers.length-5}` : ''));
      if (d2.bls_afetados != null) parts.push(`${d2.bls_afetados} BL(s) afetado(s)`);
      // Checkpoint-related
      if (d2.label)           parts.push(`"${d2.label}"`);
      if (d2.checkpoint_id)   parts.push(`ID: ${String(d2.checkpoint_id).slice(0,8)}…`);
      // User-related
      if (d2.nome)            parts.push(`Usuário: ${d2.nome}`);
      if (d2.email && !d2.bl) parts.push(d2.email);
      // Log cleanup
      if (d2.diasCutoff)      parts.push(`>${d2.diasCutoff} dias`);
      if (d2.deletados != null) parts.push(`${d2.deletados} excluído(s)`);
      // Fallback
      detalhe = parts.join(' · ') || JSON.stringify(d2);
    } catch(e) { detalhe = '—'; }
    return `<tr>
      <td style="font-size:12px;white-space:nowrap">${dateStr}</td>
      <td style="font-size:12px;font-weight:500">${esc(l.usuario_nome||'—')}</td>
      <td>${actionBadge}</td>
      <td style="font-size:11px;color:var(--muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(detalhe)}">${esc(detalhe)}</td>
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
  const email = document.getElementById('fu-email').value.trim().toLowerCase();
  const cargo = document.getElementById('fu-cargo').value.trim();
  const admin = document.getElementById('fu-admin').checked;
  const ativo = document.getElementById('fu-ativo').checked;

  if (!nome)  { toast('Nome é obrigatório.', 'error'); return; }
  if (!email) { toast('E-mail é obrigatório.', 'error'); return; }

  let id = _editingUserId;
  if (!id) {
    // O perfil precisa do id da conta de acesso (Supabase Auth). Contas são
    // criadas no painel do Supabase (Authentication → Users → Invite); aqui
    // vinculamos o perfil a uma conta existente pelo e-mail já cadastrado.
    const existing = _usrList.find(u => (u.email || '').toLowerCase() === email);
    if (existing) { id = existing.uid || existing.id; }
    else {
      alert('Para criar um usuário:\n\n1. No painel do Supabase, vá em Authentication → Users → "Invite user" e convide ' + email + '.\n2. O perfil é criado automaticamente no convite (ativo, sem admin) e aparece nesta lista — recarregue a página e ajuste nome, cargo e permissões.\n\nO perfil não pode ser criado antes da conta de acesso existir.');
      return;
    }
  }
  if (id === window._dmUid && (!admin || !ativo)) {
    toast('Você não pode remover o próprio acesso de admin ou se desativar.', 'error'); return;
  }
  const res = await window._dmFireSaveUsuario({ uid: id, nome, email, cargo, admin, ativo });
  if (res && res.ok) {
    toast(_editingUserId ? 'Usuário atualizado!' : 'Perfil vinculado!', 'success');
    logAuditAction('edicao_usuario', { uid: id, nome, email, admin, ativo });
    closeModal('modal-user');
    await renderUsers();
  } else {
    toast('Erro ao salvar usuário: ' + ((res && res.error) || 'desconhecido') + ' (a permissão é verificada no servidor — só administradores alteram perfis).', 'error');
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
  a.href = url; a.download = `auditoria_${todayISO()}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('CSV exportado!', 'success');
  logAuditAction('exportacao_relatorio', {tipo:'logs_auditoria', registros: filtered.length});
}

function confirmClearOldLogs() {
  // A auditoria é somente-inclusão (garantido por política no banco): os
  // registros não podem ser apagados pelo app, nem por administradores.
  alert('Os logs de auditoria são imutáveis e não podem ser excluídos pelo sistema.\n\nSe precisar de retenção (ex.: apagar após 5 anos), ela deve ser feita por rotina no banco de dados.');
}
