// ============================================================
// init.js — Inicialização da aplicação, Dashboard, Configurações
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Ponto de entrada principal da aplicação.
// Dependências: todos os módulos anteriores devem ser carregados.
// window._dmOnReady() é chamado pelo db.js após Supabase carregar.
// ============================================================

// ============================================================
// INIT
// ============================================================
// FIX #3: migracoes movidas para window._dmOnReady() — veja abaixo
// (executavam sobre bls=[] antes do Supabase carregar os dados)
document.addEventListener('click', e => {
  const dd = document.getElementById('cons-dropdown');
  const inp = document.getElementById('cons-search');
  if (dd && inp && !dd.contains(e.target) && e.target !== inp) dd.style.display = 'none';
});
document.addEventListener('keydown', e => {
  if (e.key==='Escape') ['modal-bl','modal-import','modal-editval','modal-rates','modal-trk-import','modal-consolidated','modal-client','modal-alert-email','modal-alert-panel','modal-trk-clear','modal-bil-clear'].forEach(id=>closeModal(id));
});
document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if(e.target===ov) ov.classList.remove('open'); });
});

// ── NORMALIZECNPJ ──────────────────────────────────────────────────────────
function normalizeCnpj(cnpj) {
  const d = String(cnpj||'').replace(/\D/g,'');
  return d.length === 13 ? '0' + d : d;
}
function getClientByCnpj(cnpj) {
  const norm = normalizeCnpj(cnpj);
  return clients.find(c => normalizeCnpj(c.cnpj) === norm) || null;
}

// ── SWITCH MODULE (dashboard + users + settings) ───────────────────────────
function switchModule(mod) {
  // 'users' foi integrado em Configurações — redireciona automaticamente
  if (mod === 'users') {
    switchModule('settings');
    setTimeout(function() {
      var btn = document.querySelector('.cfg-subtab[onclick*="cfg-users"]');
      if (btn) switchCfgPane(btn, 'cfg-users');
    }, 50);
    return;
  }
  ['dashboard','billing','tracking','clients','settings'].forEach(m => {
    const el = document.getElementById('mod-'+m);
    if (el) el.style.display = mod === m ? '' : 'none';
    const tab = document.getElementById('tab-'+m);
    if (tab) tab.classList.toggle('active', mod === m);
  });
  if (mod === 'tracking')  renderTracking();
  if (mod === 'clients')   renderClients();
  if (mod === 'dashboard') renderDashboard();
  if (mod === 'settings')  initCfgModule();
  // Limpa filtro sem-email ao sair da aba de Clientes
  if (mod !== 'clients' && window._cliFilterSemEmail) {
    window._cliFilterSemEmail = false;
    const badge = document.getElementById('cli-filter-badge');
    if (badge) badge.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════════════
// MELHORIA #1 — ALERTAS VISUAIS PARA CONTAINERS CRÍTICOS
// ══════════════════════════════════════════════════════════════════
function applyContainerAlerts() {
  if (!Array.isArray(trkData)) return;
  trkData.forEach(r => {
    const rowEl = document.querySelector(`tr[data-trk-id="${r.id}"]`);
    if (!rowEl) return;
    rowEl.classList.remove('row-alert-medium','row-alert-high');
    const existing = rowEl.querySelector('.badge-overdue');
    if (existing) existing.remove();

    const ft = r.freeTime || 21;
    const elapsed = trkDaysElapsed(r.discharge);
    if (elapsed === null || r.emptyReturn) return;

    const daysOver = elapsed - ft;
    if (daysOver <= 0) return;

    if (daysOver > 10) {
      rowEl.classList.add('row-alert-high');
      const badge = document.createElement('span');
      badge.className = 'badge-overdue high';
      badge.textContent = `🔴 ${daysOver}d`;
      const firstTd = rowEl.querySelector('td');
      if (firstTd) firstTd.appendChild(badge);
    } else if (daysOver > 5) {
      rowEl.classList.add('row-alert-medium');
      const badge = document.createElement('span');
      badge.className = 'badge-overdue medium';
      badge.textContent = `⚠️ ${daysOver}d`;
      const firstTd = rowEl.querySelector('td');
      if (firstTd) firstTd.appendChild(badge);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// MELHORIA #4 — HISTÓRICO DE MODIFICAÇÕES (ACCOUNTABILITY)
// ══════════════════════════════════════════════════════════════════
async function logModification(collection, docId, action, details) {
  // Registra no log de auditoria Supabase via _dmFireLog
  if (window._dmFireLog) {
    await window._dmFireLog(action, { collection, docId, ...(details || {}) });
  }
}

async function showModificationHistory(collection, docId, label) {
  // Exibe logs de auditoria do Supabase filtrados pelo docId
  try {
    const logs = window._dmFireLoadLogs ? await window._dmFireLoadLogs() : [];
    const relevant = logs.filter(l => {
      const d = l.detalhe || {};
      return d.docId === docId || d.blId === docId || d.bl === label;
    });
    const sorted = relevant.slice(0, 20);

    let html = `<div style="padding:4px 0 16px;font-size:13px;font-weight:600;color:var(--muted);">Histórico de alterações em <strong style="color:var(--text);">${label}</strong></div>`;
    html += `<ul class="mod-hist-list">`;

    if (sorted.length === 0) {
      html += `<li class="mod-hist-empty">Nenhuma modificação registrada ainda.</li>`;
    } else {
      const icons = { status_changed:'🔄', amount_updated:'💰', created:'✨', paid:'✅', billed:'📄', default:'✏️' };
      sorted.forEach((m) => {
        const icon = icons[m.acao] || icons.default;
        const when = m.criado_em ? new Date(m.criado_em).toLocaleString('pt-BR') : '—';
        const det  = m.detalhe && Object.keys(m.detalhe).length
          ? Object.entries(m.detalhe).map(([k,v])=>`${k}: <strong>${v}</strong>`).join(' · ') : '';
        html += `<li class="mod-hist-item">
          <div class="mod-hist-dot">${icon}</div>
          <div class="mod-hist-body">
            <div class="mod-hist-action">${(m.acao||'').replace(/_/g,' ')}</div>
            <div class="mod-hist-meta">por <strong>${m.usuario_nome||'—'}</strong> · ${when}</div>
            ${det ? `<div class="mod-hist-meta" style="margin-top:3px;">${det}</div>` : ''}
          </div>
        </li>`;
      });
    }
    html += `</ul>`;

    showGenericModal('Histórico de Modificações', html, '540px');
  } catch(e) {
    showGenericModal('Erro', 'Não foi possível carregar o histórico: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// NOVA ABA — CONFIGURAÇÕES
// ══════════════════════════════════════════════════════════════════
function switchCfgPane(btn, paneId) {
  document.querySelectorAll('.cfg-subtab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cfg-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const pane = document.getElementById(paneId);
  if (pane) pane.classList.add('active');

  if (paneId === 'cfg-taxas')  renderCfgRates();
  if (paneId === 'cfg-users')  { if (typeof renderUsers === 'function') renderUsers(); }
  if (paneId === 'cfg-sistema') renderCfgSistema();
  if (paneId === 'cfg-backup') renderCheckpointList();
}

function initCfgModule() {
  // Versão dinâmica a partir da meta tag de deploy
  const deployMeta = document.querySelector('meta[name="deploy-date"]');
  if (deployMeta) {
    const d = new Date(deployMeta.getAttribute('content'));
    if (!isNaN(d.getTime())) {
      const ver = 'v' + d.getFullYear() + '.' +
        String(d.getMonth()+1).padStart(2,'0') + '.' +
        String(d.getDate()).padStart(2,'0') + '-' +
        String(d.getHours()).padStart(2,'0') + 'h' +
        String(d.getMinutes()).padStart(2,'0');
      const cfgVer = document.getElementById('cfg-version');
      if (cfgVer) cfgVer.textContent = ver;
      document.getElementById('cfg-deploy-date').textContent = d.toLocaleString('pt-BR');
    }
  } else {
    document.getElementById('cfg-deploy-date').textContent = new Date().toLocaleDateString('pt-BR');
  }
  // Usuário atual — mostra nome completo (userData.nome) ou e-mail como fallback
  const u = window._dmUser;
  const ud = window._dmUserData;
  const displayName = (ud && ud.nome) ? ud.nome : (u ? (u.email || u.id) : '—');
  document.getElementById('cfg-current-user').textContent = displayName
    + ((ud && ud.cargo) ? ` · ${ud.cargo}` : '');
  // Exibir aba de usuários só para admin
  const isAdmin = window._dmIsAdmin || false;
  document.querySelector('[onclick*="cfg-users"]').style.display = isAdmin ? '' : 'none';

  renderCfgRates();
}

// ── TAXAS EDITÁVEIS ────────────────────────────────────────────────
function renderCfgRates() {
  const tbody = document.getElementById('cfg-rates-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  (window._cfgRates || RATES).forEach((rate, idx) => {
    const p1Str = rate.p1 ? `${rate.p1.range[0]}–${rate.p1.range[1] === Infinity ? '∞' : rate.p1.range[1]}` : '—';
    tbody.innerHTML += `<tr>
      <td><strong>${rate.type}</strong></td>
      <td><input type="number" id="cfg-r-ft-${idx}" value="${rate.freeUntil}" min="0" max="60" style="width:70px;"></td>
      <td style="color:var(--muted);font-size:12px;">${p1Str}</td>
      <td><input type="number" id="cfg-r-p1-${idx}" value="${rate.p1 ? rate.p1.usd : ''}" min="0" step="1"></td>
      <td><input type="number" id="cfg-r-p2-${idx}" value="${rate.p2 ? rate.p2.usd : ''}" min="0" step="1"></td>
      <td><button class="btn btn-primary btn-sm" onclick="saveCfgRate(${idx})">💾 Salvar</button></td>
    </tr>`;
  });
}

async function saveCfgRate(idx) {
  const rates = window._cfgRates || RATES;
  const rate  = rates[idx];
  const ft    = parseInt(document.getElementById(`cfg-r-ft-${idx}`)?.value) || rate.freeUntil;
  const p1usd = parseFloat(document.getElementById(`cfg-r-p1-${idx}`)?.value) || (rate.p1 ? rate.p1.usd : 0);
  const p2usd = parseFloat(document.getElementById(`cfg-r-p2-${idx}`)?.value) || (rate.p2 ? rate.p2.usd : 0);

  // Atualiza na memória
  rate.freeUntil = ft;
  if (rate.p1) rate.p1.usd = p1usd;
  if (rate.p2) rate.p2.usd = p2usd;

  // Persiste no localStorage (sem dependência de tabela extra)
  try {
    const allRates = (window._cfgRates || RATES).map(r => ({
      type: r.type,
      freeUntil: r.freeUntil,
      p1usd: r.p1 ? r.p1.usd : null,
      p1from: r.p1 ? r.p1.range[0] : null,
      p2usd: r.p2 ? r.p2.usd : null
    }));
    localStorage.setItem('dm_rates_v2', JSON.stringify(allRates));
    toast('Taxa "' + rate.type + '" salva com sucesso!', 'success');
    renderCfgRates();
  } catch(e) {
    toast('Erro ao salvar taxa: ' + e.message, 'error');
  }
}

function loadCfgRatesFromFirestore() {
  // Carrega taxas customizadas do localStorage
  try {
    const saved = JSON.parse(localStorage.getItem('dm_rates_v2') || 'null');
    if (!saved || !Array.isArray(saved)) return;
    saved.forEach(s => {
      const r = RATES.find(r => r.type === s.type);
      if (!r) return;
      if (s.freeUntil != null) r.freeUntil = s.freeUntil;
      if (r.p1 && s.p1usd  != null) r.p1.usd = s.p1usd;
      if (r.p2 && s.p2usd  != null) r.p2.usd = s.p2usd;
    });
  } catch(e) { /* usar rates padrão */ }
}

// ── USUÁRIOS — delegado ao módulo users.js via renderUsers() ─────

// ── BACKUP ────────────────────────────────────────────────────────
async function cfgExportBackupJSON() {
  toast('Preparando backup...', 'info');
  try {
    // Usa dados em memória (já carregados do Supabase)
    const backup = {
      version: '2.0',
      backend: 'supabase',
      exportedAt: new Date().toISOString(),
      exportedBy: window._dmUser?.email || '?',
      alertDays: getAlertDays(),
      data: {
        bls:      window._dmStore?.bls      || bls      || [],
        tracking: window._dmStore?.trk      || trkData  || [],
        clients:  window._dmStore?.clients  || clients  || []
      }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `demurrage-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado com sucesso!', 'success');
    logAuditAction('exportacao_relatorio', { tipo: 'backup_json' });
  } catch(e) {
    toast('Erro ao exportar: ' + e.message, 'error');
  }
}

function cfgExportContainersCSV() {
  if (!Array.isArray(trkData) || trkData.length === 0) {
    toast('Nenhum container para exportar', 'error'); return;
  }
  const cols = ['Container','Tipo','Navio','POL','POD','Cliente','CNPJ','Descarga','FreeTime','Status','D&D Over','Devolvido'];
  const rows = trkData.map(r => [
    r.container, r.type, r.vessel, r.pol, r.pod, r.client, r.cnpj,
    r.discharge ? new Date(r.discharge).toLocaleDateString('pt-BR') : '',
    r.freeTime || 21,
    r.status || '',
    r.emptyReturn ? '' : Math.max(0, (trkDaysElapsed(r.discharge)||0) - (r.freeTime||21)),
    r.emptyReturn ? new Date(r.emptyReturn).toLocaleDateString('pt-BR') : ''
  ]);
  const csv = [cols, ...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `containers-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado com sucesso!', 'success');
}

async function cfgImportBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('⚠️ Isso irá SUBSTITUIR os dados atuais pelo backup selecionado.\n\nTem certeza que deseja continuar?')) {
    event.target.value = ''; return;
  }
  toast('Importando backup...', 'info');
  try {
    const text   = await file.text();
    const backup = JSON.parse(text);
    if (!backup.data) throw new Error('Formato de backup inválido');

    const blsData      = backup.data.bls      || [];
    const trackingData = backup.data.tracking || backup.data.trk || [];
    const clientsData  = backup.data.clients  || [];

    if (window._dmFireRestore) {
      await window._dmFireRestore(backup);
    }

    // Restaura usando _dmFireSave para cada coleção
    if (window._dmFireSave) {
      if (blsData.length)      window._dmFireSave('bls',     blsData);
      if (trackingData.length) window._dmFireSave('trk',     trackingData);
      if (clientsData.length)  window._dmFireSave('clients', clientsData);
    }

    if (backup.alertDays) {
      if (window._dmSaveAlertDays) window._dmSaveAlertDays(backup.alertDays);
      if (window._dmStore) window._dmStore.alertDays = backup.alertDays;
    }

    toast('Backup restaurado! Recarregando...', 'success');
    setTimeout(() => location.reload(), 1800);
  } catch(e) {
    toast('Erro ao importar: ' + e.message, 'error');
  }
  event.target.value = '';
}

// ── SISTEMA ───────────────────────────────────────────────────────
function renderCfgSistema() {
  try {
    const _bls     = window._dmStore?.bls     || bls      || [];
    const _trk     = window._dmStore?.trk     || trkData  || [];
    const _clients = window._dmStore?.clients || clients  || [];
    const total    = _bls.length + _trk.length + _clients.length;

    // Contagem básica
    const el = document.getElementById('cfg-db-count');
    if (el) el.textContent = `${total} registros (${_bls.length} BLs · ${_trk.length} containers · ${_clients.length} clientes)`;

    // Estatísticas detalhadas de BLs
    const nPagos    = _bls.filter(b => b.paid).length;
    const nFaturados = _bls.filter(b => b.billed && !b.paid).length;
    const nPendentes = _bls.filter(b => !b.billed && !b.paid).length;

    // Containers ativos (sem emptyReturn = ainda em sobretaxa)
    const nContAtivos = _trk.filter(r => !r.emptyReturn && r.discharge).length;

    // Inject stats into pane
    const statsEl = document.getElementById('cfg-db-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-top:12px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;">
            <div style="font-size:20px;font-weight:800;color:#166534;">${nPagos}</div>
            <div style="font-size:11px;color:#166534;margin-top:2px;">BLs Pagos</div>
          </div>
          <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:10px 14px;">
            <div style="font-size:20px;font-weight:800;color:#1e40af;">${nFaturados}</div>
            <div style="font-size:11px;color:#1e40af;margin-top:2px;">BLs Faturados</div>
          </div>
          <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:10px 14px;">
            <div style="font-size:20px;font-weight:800;color:#854d0e;">${nPendentes}</div>
            <div style="font-size:11px;color:#854d0e;margin-top:2px;">BLs Pendentes</div>
          </div>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;">
            <div style="font-size:20px;font-weight:800;color:#9a3412;">${nContAtivos}</div>
            <div style="font-size:11px;color:#9a3412;margin-top:2px;">Containers em D&D</div>
          </div>
          <div style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;padding:10px 14px;">
            <div style="font-size:20px;font-weight:800;color:#374151;">${_clients.length}</div>
            <div style="font-size:11px;color:#374151;margin-top:2px;">Clientes</div>
          </div>
        </div>`;
    }
  } catch(e) { /* ignore */ }
}

function cfgClearCache() {
  if (confirm('Limpar cache local (localStorage/sessionStorage)?')) {
    try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
    toast('Cache limpo com sucesso!', 'success');
  }
}
function cfgReloadRates() { loadCfgRatesFromFirestore(); renderCfgRates(); toast('Taxas recarregadas!', 'success'); }
function cfgShowAuditLog() { switchModule('settings'); setTimeout(function(){ var btn=document.querySelector('.cfg-subtab[onclick*="cfg-users"]'); if(btn) switchCfgPane(btn,'cfg-users'); },50); }

// ── CHECKPOINTS ───────────────────────────────────────────────────────────

async function renderCheckpointList() {
  const container = document.getElementById('checkpoint-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">⏳ Carregando checkpoints...</div>';
  if (!window._dmFireLoadCheckpoints) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">Função não disponível.</div>';
    return;
  }
  const list = await window._dmFireLoadCheckpoints();
  if (!list.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px;">Nenhum checkpoint encontrado.<br>Crie um abaixo para salvar o estado atual dos dados.</div>';
    return;
  }
  container.innerHTML = list.map(cp => {
    const d = cp.criado_em ? new Date(cp.criado_em) : new Date(0);
    const dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const tipoBadge = cp.tipo === 'auto'
      ? '<span style="background:#f3f4f6;color:#6b7280;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;">AUTO</span>'
      : '<span style="background:#ede9fe;color:#7c3aed;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;">MANUAL</span>';
    return `<div class="checkpoint-item" data-id="${cp.id}">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;margin-bottom:2px;">${cp.label || '(sem rótulo)'} ${tipoBadge}</div>
        <div style="font-size:11px;color:var(--muted);">${dateStr} · por ${cp.criado_por || '—'}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button onclick="restoreCheckpoint('${cp.id}','${(cp.label||'').replace(/'/g,'\\\'')}')" class="act-btn edit" style="font-size:11px;padding:4px 10px;">↩ Restaurar</button>
        <button onclick="deleteCheckpoint('${cp.id}')" class="act-btn" style="font-size:11px;padding:4px 8px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;">✕</button>
      </div>
    </div>`;
  }).join('');
}

async function createCheckpoint(tipo) {
  const label = tipo === 'manual'
    ? prompt('Rótulo para este checkpoint (ex: "Antes de importação de março"):')
    : ('Auto – ' + new Date().toLocaleString('pt-BR'));
  if (tipo === 'manual' && label === null) return; // cancelled
  const btn = document.getElementById('btn-create-checkpoint');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }
  try {
    const result = await window._dmFireSaveCheckpoint(label || '', tipo || 'manual');
    if (result) {
      toast('✓ Checkpoint "' + (label || result.id.slice(0,8)) + '" criado!', 'success');
      logAuditAction('criacao_checkpoint', { label: label || '', tipo: tipo || 'manual', checkpoint_id: result.id });
      await renderCheckpointList();
    } else {
      toast('Erro ao criar checkpoint.', 'error');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '+ Criar Checkpoint'; }
  }
}

async function restoreCheckpoint(id, label) {
  showDoubleConfirmation(
    'Restaurar Checkpoint?',
    `Todos os dados atuais (BLs, containers, clientes) serão substituídos pelo estado salvo em "${label || id.slice(0,8)}". Esta ação não pode ser desfeita.`,
    null,
    async () => {
      const el = document.getElementById('checkpoint-list');
      if (el) el.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">⏳ Restaurando dados...</div>';
      try {
        const result = await window._dmFireRestoreCheckpoint(id);
        if (result) {
          toast('✓ Dados restaurados do checkpoint "' + (label || id.slice(0,8)) + '"!', 'success');
          logAuditAction('restauracao_checkpoint', { checkpoint_id: id, label: label || '' });
          // Recarrega a UI completa
          if (typeof renderTracking === 'function') renderTracking();
          if (typeof renderBilling === 'function') renderBilling();
          if (typeof renderClients === 'function') renderClients();
          await renderCheckpointList();
        } else {
          toast('Erro ao restaurar checkpoint.', 'error');
          await renderCheckpointList();
        }
      } catch(e) {
        console.error('[CHECKPOINT] restore error:', e);
        toast('Erro ao restaurar: ' + (e.message || e), 'error');
        await renderCheckpointList();
      }
    }
  );
}

async function deleteCheckpoint(id) {
  if (!confirm('Excluir este checkpoint permanentemente?')) return;
  if (window._dmFireDeleteCheckpoint) {
    const ok = await window._dmFireDeleteCheckpoint(id);
    if (ok) { toast('Checkpoint excluído.', 'success'); await renderCheckpointList(); }
    else toast('Erro ao excluir checkpoint.', 'error');
  }
}

// Auto-checkpoint diário gerenciado pelo Supabase pg_cron (02:59 UTC = 23:59 BRT)
// Nenhuma lógica de agendamento necessária no frontend.

// ── ALERT SYSTEM ──────────────────────────────────────────────────────────
// ── STORAGE: Alert days (Firestore via window._dmStore) ───────────────────
function getAlertDays() {
  return (window._dmStore && window._dmStore.alertDays) || 5;
}
function saveAlertDays() {
  const v = parseInt(document.getElementById('alert-days-input')?.value) || 5;
  if (window._dmStore) window._dmStore.alertDays = v;
  // Persiste no Supabase via função dedicada
  if (window._dmSaveAlertDays) window._dmSaveAlertDays(v);
}

function computeAlerts() {
  const alertDays = getAlertDays();
  const alerts = [];
  trkData.forEach(r => {
    if (r.emptyReturn) return;
    const ft      = r.freeTime || 21;
    const elapsed = trkDaysElapsed(r.discharge);
    if (elapsed === null) return;
    const daysLeft = ft - elapsed;
    if (daysLeft < 0)               alerts.push({ row: r, category: 'over',  daysLeft: 0,  daysOver: -daysLeft });
    else if (daysLeft === 0)        alerts.push({ row: r, category: 'today', daysLeft: 0,  daysOver: 0 });
    else if (daysLeft <= alertDays) alerts.push({ row: r, category: 'warn',  daysLeft,     daysOver: 0 });
  });
  return alerts;
}

function groupAlertsByCnee(alerts) {
  const groups = {};
  alerts.forEach(a => {
    const key = a.row.cnpj || a.row.cnee || '—';
    if (!groups[key]) {
      const client = a.row.cnpj ? getClientByCnpj(a.row.cnpj) : null;
      groups[key] = {
        cnpj:   a.row.cnpj || '',
        name:   (client && client.name) || a.row.cnee || a.row.cnpj || '—',
        emails: a.row.cnpj ? getEmailsForBL(a.row) : [],
        items:  []
      };
    }
    groups[key].items.push(a);
  });
  return groups;
}

function alertPillHTML(a) {
  if (a.category === 'over')  return `<span class="alert-pill-over">⛔ ${a.daysOver}d em D&D</span>`;
  if (a.category === 'today') return `<span class="alert-pill-today">🔴 Vence HOJE</span>`;
  if (a.category === 'warn')  return `<span class="alert-pill-warn">⚠️ Vence em ${a.daysLeft}d</span>`;
  return '';
}

function toggleAlertPanel() { openAlertPanel(); }

function openAlertPanel() {
  const inp = document.getElementById('alert-days-input');
  if (inp) inp.value = getAlertDays();
  openModal('modal-alert-panel');
  renderAlertPanel();
}

function renderAlertPanel() {
  const alerts  = computeAlerts();
  const groups  = groupAlertsByCnee(alerts);
  const badge   = document.getElementById('alert-toolbar-badge');
  const cbadge  = document.getElementById('alert-count-badge');
  const list    = document.getElementById('alert-list');
  if (!list) return;
  const total = alerts.length;
  if (badge)  { badge.textContent  = total; badge.style.display  = total > 0 ? '' : 'none'; }
  if (cbadge) { cbadge.textContent = total; }
  const panelBadge = document.getElementById('alert-panel-badge-count');
  if (panelBadge) panelBadge.textContent = total > 0
    ? `${total} container${total>1?'s':''} em situação de alerta`
    : 'Nenhum container em alerta';

  if (!total) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px;">✅ Nenhum container em situação de alerta no momento.</div>`;
    return;
  }

  const catOrder = { over:0, today:1, warn:2 };
  list.innerHTML = Object.values(groups).map(g => {
    const sorted = [...g.items].sort((a,b) => catOrder[a.category] - catOrder[b.category]);
    const rows = sorted.map(a => `
      <div class="alert-row">
        <span style="font-weight:600;color:var(--navy);min-width:120px;">${a.row.container}</span>
        <span style="color:var(--muted);font-size:11px;min-width:90px;">${a.row.bl||'—'}</span>
        <span style="color:var(--muted);font-size:11px;flex:1;">${trkFmtDate(a.row.discharge)} → deadline ${trkFmtDate(a.row.deadline)}</span>
        ${alertPillHTML(a)}
      </div>`).join('');

    const emailBadge = g.emails.length
      ? `<span style="color:#059669;font-size:11px;">✉️ ${g.emails.join(', ')}</span>`
      : `<span style="color:#dc2626;font-size:11px;">⚠ sem e-mail</span>`;

    const ov = g.items.filter(a=>a.category==='over').length;
    const td = g.items.filter(a=>a.category==='today').length;
    const wn = g.items.filter(a=>a.category==='warn').length;
    const summary = [
      ov ? `<span style="color:#dc2626">${ov} em D&D</span>` : '',
      td ? `<span style="color:#c05621">${td} vence hoje</span>` : '',
      wn ? `<span style="color:#b45309">${wn} a vencer</span>` : '',
    ].filter(Boolean).join(' · ');

    const safeKey = encodeURIComponent(g.cnpj || g.name);
    return `<div class="alert-group">
      <div class="alert-group-header">
        <div>
          ${g.name}
          ${g.cnpj ? `<span style="color:var(--muted);font-size:11px;margin-left:6px;font-weight:400;">${formatCnpj(g.cnpj)}</span>` : ''}
          <span style="margin-left:10px;font-weight:400;">${summary}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${emailBadge}
          ${g.emails.length ? `<button class="btn btn-sm btn-outline" onclick="openAlertEmailForKey('${safeKey}')" style="font-size:11px;padding:3px 10px;">✉️ E-mail</button>` : ''}
        </div>
      </div>
      <div>${rows}</div>
    </div>`;
  }).join('');
}

function updateAlertBadge() {
  const alerts = computeAlerts();
  const badge  = document.getElementById('alert-toolbar-badge');
  if (badge) { badge.textContent = alerts.length; badge.style.display = alerts.length > 0 ? '' : 'none'; }
  const panel = document.getElementById('modal-alert-panel');
  if (panel && panel.classList.contains('open')) renderAlertPanel();
}

function buildAlertEmailBody(g) {
  const firstName = (g.name||'').split(' ')[0] || 'Prezado(a)';
  const alertDays = getAlertDays();
  const catOrder  = { over:0, today:1, warn:2 };
  const sorted    = [...g.items].sort((a,b) => catOrder[a.category] - catOrder[b.category]);
  const hasUrgent = sorted.some(a => a.category === 'over' || a.category === 'today');
  const lines = sorted.map(a => {
    const dl = trkFmtDate(a.row.deadline);
    if (a.category === 'over')  return `  ${a.row.container}  |  BL: ${a.row.bl||'—'}  |  ⛔ FREE TIME ENCERRADO há ${a.daysOver} dia(s)  |  Deadline: ${dl}`;
    if (a.category === 'today') return `  ${a.row.container}  |  BL: ${a.row.bl||'—'}  |  🔴 FREE TIME VENCE HOJE  |  Deadline: ${dl}`;
    if (a.category === 'warn')  return `  ${a.row.container}  |  BL: ${a.row.bl||'—'}  |  ⚠️ Faltam ${a.daysLeft} dia(s) para o free time  |  Deadline: ${dl}`;
    return '';
  }).filter(Boolean).join('\n');
  const intro = hasUrgent
    ? `Comunicamos que os containers abaixo já ultrapassaram ou atingiram o limite do free time.\nPor favor, providencie a devolução imediata para evitar cobranças adicionais de sobreestadia.`
    : `Informamos que os containers abaixo estão próximos do vencimento do free time (janela de ${alertDays} dias).\nRecomendamos providenciar a devolução antecipada para evitar cobranças de sobreestadia.`;
  return `Prezado(a) ${firstName},\n\n${intro}\n\nCONTAINERS EM ALERTA:\n\n${lines}\n\nEm caso de dúvidas, entre em contato conosco.\n\nAtenciosamente,\nTRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.\nCNPJ: 06.352.972/0001-21`;
}

function openAlertEmailForKey(encodedKey) {
  const key    = decodeURIComponent(encodedKey);
  const alerts = computeAlerts();
  const groups = groupAlertsByCnee(alerts);
  const g      = groups[key];
  if (!g || !g.emails.length) { toast('Nenhum e-mail cadastrado para este cliente.', 'error'); return; }
  const body    = buildAlertEmailBody(g);
  const subject = encodeURIComponent(`Alerta de Free Time — ${g.name} — ${g.items.length} container(s)`);
  const to      = encodeURIComponent(g.emails.join(', '));
  window.location.href = `mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${encodeURIComponent(body)}`;
}

function openAlertEmailModal() {
  const alerts   = computeAlerts();
  const groups   = groupAlertsByCnee(alerts);
  const listEl   = document.getElementById('alert-email-list');
  const countEl  = document.getElementById('alert-email-count');
  const eligible = Object.values(groups).filter(g =>
    g.emails.length > 0 &&
    g.items.some(a => a.category === 'over' || a.category === 'today' || a.category === 'warn')
  );
  if (countEl) countEl.textContent = eligible.length;
  window._alertEligible = eligible;
  const sendBtn = document.getElementById('alert-send-all-btn');
  if (sendBtn) sendBtn.disabled = !eligible.length;
  if (!listEl) return;
  if (!eligible.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:48px;color:var(--muted);font-size:13px;">Nenhum cliente com e-mail cadastrado e containers com alerta ativo.</div>`;
    openModal('modal-alert-email'); return;
  }
  listEl.innerHTML = eligible.map((g, idx) => {
    const body = buildAlertEmailBody(g);
    const ov = g.items.filter(a=>a.category==='over').length;
    const td = g.items.filter(a=>a.category==='today').length;
    const wn = g.items.filter(a=>a.category==='warn').length;
    const pills = [
      ov ? `<span class="alert-pill-over">${ov} em D&D</span>` : '',
      td ? `<span class="alert-pill-today">${td} hoje</span>` : '',
      wn ? `<span class="alert-pill-warn">${wn} a vencer</span>` : '',
    ].filter(Boolean).join(' ');
    return `<div class="alert-email-item">
      <div class="alert-email-header" onclick="toggleAlertEmailPreview(${idx})">
        <div>
          <div class="alert-email-cname">${g.name}${g.cnpj?` <span style="font-weight:400;font-size:11px;color:var(--muted);">${formatCnpj(g.cnpj)}</span>`:''}</div>
          <div class="alert-email-meta">✉️ ${g.emails.join(', ')} &nbsp;·&nbsp; ${g.items.length} container(s) &nbsp;·&nbsp; ${pills}</div>
        </div>
        <span style="font-size:18px;color:var(--muted);" id="alert-arrow-${idx}">▸</span>
      </div>
      <div class="alert-email-body" id="alert-body-${idx}">
        <div class="alert-email-preview">${body}</div>
        <button class="btn btn-sm btn-primary" onclick="sendAlertEmailFor(${idx})" style="font-size:12px;">✉️ Abrir este e-mail</button>
      </div>
    </div>`;
  }).join('');
  openModal('modal-alert-email');
}

function toggleAlertEmailPreview(idx) {
  const body  = document.getElementById(`alert-body-${idx}`);
  const arrow = document.getElementById(`alert-arrow-${idx}`);
  if (!body) return;
  const open = body.classList.toggle('open');
  if (arrow) arrow.textContent = open ? '▾' : '▸';
}
function sendAlertEmailFor(idx) {
  const eligible = window._alertEligible || [];
  const g = eligible[idx];
  if (!g) return;
  const body    = buildAlertEmailBody(g);
  const subject = encodeURIComponent(`Alerta de Free Time — ${g.name} — ${g.items.length} container(s)`);
  const to      = encodeURIComponent(g.emails.join(', '));
  window.open(`mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${encodeURIComponent(body)}`);
}
function sendAllAlertEmails() {
  const eligible = window._alertEligible || [];
  if (!eligible.length) return;
  eligible.forEach((g, i) => {
    setTimeout(() => {
      const body    = buildAlertEmailBody(g);
      const subject = encodeURIComponent(`Alerta de Free Time — ${g.name} — ${g.items.length} container(s)`);
      const to      = encodeURIComponent(g.emails.join(', '));
      window.open(`mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${encodeURIComponent(body)}`);
    }, i * 600);
  });
  closeModal('modal-alert-email');
  toast(`${eligible.length} e-mail(s) disparado(s)!`, 'success');
}

// ── CONSOLIDATED EMAIL ─────────────────────────────────────────────────────
// Multi-select state
const _consSelected = new Set();

function toggleConsSelection(cnpj, el) {
  if (_consSelected.has(cnpj)) {
    _consSelected.delete(cnpj);
    el.classList.remove('selected');
    el.querySelector('.cons-checkbox').checked = false;
  } else {
    _consSelected.add(cnpj);
    el.classList.add('selected');
    el.querySelector('.cons-checkbox').checked = true;
  }
  _updateConsFooter();
}

function _updateConsFooter() {
  const n     = _consSelected.size;
  const countEl  = document.getElementById('cons-selected-count');
  const multiBtn = document.getElementById('cons-multi-send-btn');
  const sendBtn  = document.getElementById('cons-send-btn');
  const pdfBtn   = document.getElementById('cons-pdf-btn');

  if (countEl) {
    countEl.style.display = n > 0 ? '' : 'none';
    countEl.textContent   = `${n} selecionado${n!==1?'s':''}`;
  }
  if (multiBtn) multiBtn.style.display = n > 1 ? '' : 'none';
  if (multiBtn) multiBtn.disabled      = n < 1;

  // Single selection: enable single email + PDF
  const singleCnpj = _consSelected.size === 1 ? [..._consSelected][0] : null;
  const cnpjHidden = document.getElementById('cons-cnpj-hidden');
  if (cnpjHidden) cnpjHidden.value = singleCnpj || '';
  if (sendBtn) sendBtn.disabled = !singleCnpj;
  if (pdfBtn)  pdfBtn.disabled  = !singleCnpj;
}

function agingLabel(bls) {
  // Find oldest unpaid billed invoice
  const billedDays = bls
    .filter(b => b.billed && !b.paid && b.billedAt)
    .map(b => Math.floor((Date.now() - new Date(b.billedAt).getTime()) / 86400000));
  if (!billedDays.length) return '';
  const max = Math.max(...billedDays);
  if (max >= 30) return `<span class="cons-aging-badge cons-aging-late">📅 ${max}d sem pagamento</span>`;
  if (max >= 15) return `<span class="cons-aging-badge cons-aging-warn">📅 ${max}d sem pagamento</span>`;
  return `<span class="cons-aging-badge cons-aging-ok">📅 ${max}d</span>`;
}

function renderConsClientList(query) {
  const listEl = document.getElementById('cons-client-list');
  if (!listEl) return;
  const rawL   = (query || '').toLowerCase().trim();
  const digits = rawL.replace(/\D/g,'');
  let entries = Object.entries(_consMap);
  if (rawL) {
    entries = entries.filter(([cnpj, info]) => {
      if (digits.length >= 2 && normalizeCnpj(cnpj).includes(digits)) return true;
      if (info.name.toLowerCase().includes(rawL)) return true;
      if (formatCnpj(cnpj).includes(rawL)) return true;
      return false;
    });
  }
  entries.sort((a, b) => b[1].bls.length - a[1].bls.length);

  if (!entries.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;">
      ${rawL ? 'Nenhum cliente encontrado para "' + query + '"' : 'Nenhuma fatura em aberto com CNPJ cadastrado.'}
    </div>`;
    return;
  }

  listEl.innerHTML = entries.map(([cnpj, info]) => {
    const count    = info.bls.length;
    const noEmail  = !info.emails.length;
    const isActive = _consSelected.has(cnpj);
    const aging    = agingLabel(info.bls);
    const safeId   = 'cr-' + cnpj.replace(/\D/g,'');
    return `<div id="${safeId}" class="cons-row${isActive?' selected':''}" onclick="toggleConsSelection('${cnpj}', this)">
      <input type="checkbox" class="cons-checkbox" ${isActive?'checked':''} onclick="event.stopPropagation();toggleConsSelection('${cnpj}',this.closest('.cons-row'))">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;color:var(--navy);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${info.name}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;">
          ${formatCnpj(cnpj)} &nbsp;·&nbsp;
          <strong style="color:${count>0?'#dc2626':'var(--muted)'};">${count}</strong>
          fatura${count!==1?'s':''} em aberto
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        ${aging}
        ${noEmail ? '<span style="font-size:11px;color:#dc2626;white-space:nowrap;">⚠ sem e-mail</span>'
                  : '<span style="font-size:11px;color:#059669;white-space:nowrap;">✉️</span>'}
      </div>
    </div>`;
  }).join('');
}

function sendMultipleEmails() {
  if (!_consSelected.size) return;
  const cnpjs = [..._consSelected];
  cnpjs.forEach((cnpj, i) => {
    setTimeout(() => {
      const info      = _consMap[cnpj] || {};
      if (!info.emails?.length) return;
      const unpaid    = (info.bls||[]).filter(b => !b.paid);
      if (!unpaid.length) return;
      const nome      = info.name || cnpj;
      const firstName = nome.split(' ')[0];
      const to        = encodeURIComponent(info.emails.join(', '));
      let grand = 0;
      const linhas = unpaid.map(b => {
        const roe = (b.paid||b.billed)&&b.frozenRoe!=null ? b.frozenRoe : effectiveROE(b);
        let total = 0;
        (b.containers||[]).forEach(c => {
          const dc = daysBetween(c.discharge, c.emptyReturn);
          if (dc !== null) total += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
        });
        if ((b.paid||b.billed)&&b.frozenTotal!=null) total = b.frozenTotal;
        grand += total;
        const docnum = b.docnum || genDocnum(b.bl);
        const venc   = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
        const fmt    = total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        return `  ${docnum}  |  BL: ${b.bl}  |  R$ ${fmt}  |  Venc: ${venc}`;
      }).join('\n');
      const grandFmt = grand.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      const subject  = encodeURIComponent(`Cobranças de Demurrage — ${nome} — ${unpaid.length} fatura${unpaid.length>1?'s':''}`);
      const body     = encodeURIComponent(`Prezado(a) ${firstName},\n\nEncaminhamos o resumo das faturas de Sobreestadia em aberto para ${nome} (CNPJ: ${formatCnpj(cnpj)}):\n\n${linhas}\n\n─────────────────────────────────────\nTOTAL GERAL: R$ ${grandFmt}\n─────────────────────────────────────\n\nPIX — Chave CNPJ: 06.352.972/0001-21\nBanco: ITAÚ | Agência: 0870 - Praia do Canto | CC: 37293-5\n\nAtenciosamente,\nTRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.\nCNPJ: 06.352.972/0001-21`);
      window.open(`mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${body}`);
    }, i * 700);
  });
  closeModal('modal-consolidated');
  toast(`Disparando ${cnpjs.length} cobrança${cnpjs.length>1?'s':''}...`, 'success');
}


// ── DISPARAR TODAS AS COBRANÇAS ────────────────────────────────────────────
function dispararTodasCobranças() {
  _rebuildConsMap();
  const eligible = Object.entries(_consMap).filter(([cnpj, info]) =>
    info.emails.length > 0 && info.bls.some(b => !b.paid)
  );
  if (!eligible.length) { toast('Nenhum cliente com e-mail cadastrado e faturas em aberto.', 'error'); return; }
  if (!confirm(`Disparar cobranças para ${eligible.length} cliente${eligible.length !== 1 ? 's' : ''}?\n\nSerá aberto um e-mail para cada cliente com faturas pendentes.`)) return;
  eligible.forEach(([cnpj, info], i) => {
    setTimeout(() => {
      const unpaid    = info.bls.filter(b => !b.paid);
      if (!unpaid.length) return;
      const nome      = info.name || cnpj;
      const firstName = nome.split(' ')[0];
      const to        = encodeURIComponent(info.emails.join(', '));
      let grand = 0;
      const linhas = unpaid.map(b => {
        const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : effectiveROE(b);
        let total = 0;
        (b.containers || []).forEach(c => {
          const dc = daysBetween(c.discharge, c.emptyReturn);
          if (dc !== null) total += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
        });
        if ((b.paid || b.billed) && b.frozenTotal != null) total = b.frozenTotal;
        grand += total;
        const docnum = b.docnum || genDocnum(b.bl);
        const venc   = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
        const ctrs   = (b.containers||[]).map(c=>c.container).join(', ');
        const fmt    = total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        return `  ${docnum}  |  BL: ${b.bl}  |  ${ctrs}  |  R$ ${fmt}  |  Venc: ${venc}`;
      }).join('\n');
      const grandFmt = grand.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      const subject  = encodeURIComponent(`Cobranças de Demurrage — ${nome} — ${unpaid.length} fatura${unpaid.length>1?'s':''}`);
      const body     = encodeURIComponent(`Prezado(a) ${firstName},\n\nEncaminhamos o resumo das faturas de Sobreestadia em aberto para ${nome} (CNPJ: ${formatCnpj(cnpj)}):\n\n${linhas}\n\n─────────────────────────────────────\nTOTAL GERAL: R$ ${grandFmt}\n─────────────────────────────────────\n\nPIX — Chave CNPJ: 06.352.972/0001-21\nBanco: ITAÚ | Agência: 0870 - Praia do Canto | CC: 37293-5\n\nAtenciosamente,\nTRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.\nCNPJ: 06.352.972/0001-21`);
      window.open(`mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${body}`);
    }, i * 700);
  });
  toast(`Disparando ${eligible.length} cobrança${eligible.length>1?'s':''}...`, 'success');
}

// ── CLIENTS EXPORT ─────────────────────────────────────────────────────────
function exportClientsReport() {
  if (!clients.length) { toast('Nenhum cliente para exportar.', 'error'); return; }
  const sorted = [...clients].sort((a,b) => (a.name||a.cnpj||'').localeCompare(b.name||b.cnpj||'', 'pt-BR'));
  const rows = sorted.map(c => {
    const unpaid = bls.filter(b => b.cnpj && normalizeCnpj(b.cnpj) === normalizeCnpj(c.cnpj) && !b.paid);
    let totalAberto = 0;
    unpaid.forEach(b => {
      const roe = (b.billed && b.frozenRoe != null) ? b.frozenRoe : effectiveROE(b);
      let tot = b.frozenTotal != null && b.billed ? b.frozenTotal : 0;
      if (!tot) (b.containers||[]).forEach(ct => {
        const dc = daysBetween(ct.discharge, ct.emptyReturn);
        if (dc !== null) tot += calcUSD(dc, getRateForBL(b, ct.type), b.ov1||null, b.ov2||null).totalUSD * roe;
      });
      totalAberto += tot;
    });
    return {
      'RAZÃO SOCIAL': c.name||'—', 'CNPJ': formatCnpj(c.cnpj),
      'E-MAILS': (c.emails||[]).join('; ')||'—', 'TELEFONE': c.phone||'—',
      'BLs EM ABERTO': unpaid.length,
      'TOTAL EM ABERTO (R$)': totalAberto > 0 ? totalAberto.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—',
      'CADASTRADO EM': c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '—',
    };
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, {origin:'A2'});
  ws['!cols'] = Object.keys(rows[0]).map(h => ({wch: Math.max(h.length+2, 20)}));
  ws['A1'] = {v:'TRANSHIPPING — Cadastro de Clientes', t:'s'};
  ws['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:Object.keys(rows[0]).length-1}}];
  ws['!ref'] = `A1:${XLSX.utils.encode_cell({r:rows.length+1, c:Object.keys(rows[0]).length-1})}`;
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, `Clientes_Transhipping_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Planilha exportada!', 'success');
}

// ── RENDER DASHBOARD ───────────────────────────────────────────────────────
function renderDashboard() {
  const now = new Date();
  const h   = now.getHours();
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const dateStr = now.toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const greetEl = document.getElementById('dk-greeting');
  const dateEl  = document.getElementById('dk-date');
  if (greetEl) greetEl.textContent = greet + ' 👋';
  if (dateEl)  dateEl.textContent  = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const totalBLs  = bls.length;
  const pendentes = bls.filter(b => b.billed && !b.paid).length;
  const pagos     = bls.filter(b => b.paid).length;
  let totalAberto   = 0;
  let totalFaturado = 0;
  let totalDisputa  = 0;

  bls.filter(b => !b.paid).forEach(b => {
    const roe = (b.billed && b.frozenRoe != null) ? b.frozenRoe : effectiveROE(b);
    let tot = b.frozenTotal != null && b.billed ? b.frozenTotal : 0;
    if (!tot) (b.containers||[]).forEach(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      if (dc !== null) tot += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
    });
    totalAberto += tot;

    // Count faturado and not paid
    if (b.billed && !b.paid) {
      totalFaturado += tot;
    }

    // Count em disputa
    if (b.dispute && b.dispute.open) {
      totalDisputa += tot;
    }
  });

  document.getElementById('dk-total-bls').textContent  = totalBLs;
  document.getElementById('dk-pendentes').textContent  = pendentes;
  document.getElementById('dk-pagos').textContent      = pagos;
  const totalStr = 'R$ ' + totalAberto.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const totalEl  = document.getElementById('dk-total-aberto');
  if (totalEl) {
    totalEl.textContent = totalStr;
    // Auto-shrink font for very large values
    const len = totalStr.length;
    totalEl.style.fontSize = len > 16 ? '15px' : len > 13 ? '17px' : '20px';
  }

  // KPI cards — Faturado e Em Disputa
  const faturadoStr = 'R$ ' + totalFaturado.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const disputaStr  = 'R$ ' + totalDisputa.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const faturadoEl  = document.getElementById('dk-total-faturado');
  const disputaEl   = document.getElementById('dk-total-disputa');
  if (faturadoEl) faturadoEl.textContent = faturadoStr;
  if (disputaEl)  disputaEl.textContent  = disputaStr;

  const alertDays = getAlertDays();
  let nDD=0, nAlerta=0, nLivres=0, nDD30=0;
  trkData.forEach(r => {
    if (r.emptyReturn) return;
    const ft = r.freeTime || 21;
    const elapsed = trkDaysElapsed(r.discharge);
    if (elapsed === null) return;
    const daysLeft = ft - elapsed;
    if (daysLeft < 0) { nDD++; if ((-daysLeft) > 30) nDD30++; }
    else if (daysLeft <= alertDays) nAlerta++;
    else nLivres++;
  });
  document.getElementById('dk-ctrs-total').textContent  = trkData.length;
  document.getElementById('dk-ctrs-dd').textContent     = nDD;
  document.getElementById('dk-ctrs-alerta').textContent = nAlerta;
  document.getElementById('dk-ctrs-livres').textContent = nLivres;
  const dd30Sub = document.getElementById('dk-dd30-sub');
  if (dd30Sub) dd30Sub.textContent = nDD30 > 0 ? `⚡ ${nDD30} há mais de 30 dias` : '';

  const alerts = computeAlerts();
  const alertSub = document.getElementById('dqa-alert-sub');
  if (alertSub) {
    if (!alerts.length) alertSub.textContent = 'Nenhum container em alerta';
    else {
      const nOver = alerts.filter(a=>a.category==='over').length;
      const nWarn = alerts.filter(a=>a.category==='warn'||a.category==='today').length;
      const parts = [];
      if (nOver) parts.push(`${nOver} em D&D`);
      if (nWarn) parts.push(`${nWarn} a vencer`);
      alertSub.textContent = parts.join(' · ');
    }
  }

  const byClient = {};
  bls.filter(b => !b.paid).forEach(b => {
    const key  = b.cnpj || (b.client||'').trim().toUpperCase() || '—';
    const name = (() => {
      if (b.cnpj) { const cl = getClientByCnpj(b.cnpj); return (cl&&cl.name)||b.client||b.cnpj; }
      return b.client || '—';
    })();
    if (!byClient[key]) byClient[key] = { name, total:0, count:0 };
    const roe = (b.billed && b.frozenRoe != null) ? b.frozenRoe : effectiveROE(b);
    let tot = b.frozenTotal != null && b.billed ? b.frozenTotal : 0;
    if (!tot) (b.containers||[]).forEach(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      if (dc !== null) tot += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
    });
    byClient[key].total += tot; byClient[key].count++;
  });
  const topClientes = Object.values(byClient).sort((a,b)=>b.total-a.total).slice(0,10);
  const topEl = document.getElementById('dk-top-clientes');
  if (topEl) {
    if (!topClientes.length) { topEl.innerHTML = '<div class="dash-panel-empty">Nenhuma fatura em aberto.</div>'; }
    else {
      topEl.innerHTML = topClientes.map((c,i) => {
        const valFmt = c.total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        return `<div class="dash-panel-row">
          <span class="dash-panel-rank">${i+1}</span>
          <span class="dash-panel-name" title="${c.name}">${c.name}</span>
          <span class="dash-panel-badge" style="background:#fee2e2;color:#b91c1c;">${c.count} BL${c.count>1?'s':''}</span>
          <span class="dash-panel-val" style="color:#b91c1c;">R$&nbsp;${valFmt}</span>
        </div>`;
      }).join('');
    }
  }

  const ddList = trkData.filter(r => {
    if (r.emptyReturn) return false;
    const elapsed = trkDaysElapsed(r.discharge);
    return elapsed !== null && elapsed > (r.freeTime||21);
  }).sort((a,b) => (trkDaysElapsed(b.discharge)-(b.freeTime||21)) - (trkDaysElapsed(a.discharge)-(a.freeTime||21))).slice(0,10);
  const ddEl = document.getElementById('dk-dd-list');
  if (ddEl) {
    if (!ddList.length) { ddEl.innerHTML = '<div class="dash-panel-empty">✅ Nenhum container em demurrage.</div>'; }
    else {
      ddEl.innerHTML = ddList.map(r => {
        const over = trkDaysElapsed(r.discharge) - (r.freeTime||21);
        const col  = over > 30 ? '#b91c1c' : over > 14 ? '#dc2626' : '#ef4444';
        return `<div class="dash-panel-row">
          <span class="dash-panel-name"><strong>${r.container}</strong></span>
          <span style="font-size:11px;color:var(--muted);flex-shrink:0;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.cnee||''}">${r.cnee||'—'}</span>
          <span class="dash-panel-badge" style="background:#fee2e2;color:${col};font-weight:700;">+${over}d</span>
        </div>`;
      }).join('');
    }
  }
  renderTodoList();
}
function filterClientsSemEmail() {
  window._cliFilterSemEmail = true;
  switchModule('clients');
  setTimeout(() => {
    const badge = document.getElementById('cli-filter-badge');
    if (badge) badge.style.display = 'flex';
    renderClients();
  }, 80);
}
function clearClientFilter() {
  window._cliFilterSemEmail = false;
  const badge = document.getElementById('cli-filter-badge');
  if (badge) badge.style.display = 'none';
  renderClients();
}


// ── BILLING SUB-TABS ──────────────────────────────────────────────────────
let activeBillingSubTab = 'faturados';

function setBillingSubTab(tab) {
  activeBillingSubTab = tab;

  // Toggle active class on sub-tabs
  ['faturados','pagos'].forEach(t => {
    const el = document.getElementById('subtab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });

  // Show/hide sub-filters
  const sfFat  = document.getElementById('subfilters-faturados');
  const sfPago = document.getElementById('subfilters-pagos');
  if (sfFat)  sfFat.style.display  = tab === 'faturados' ? 'flex' : 'none';
  if (sfPago) sfPago.style.display = tab === 'pagos'     ? 'flex' : 'none';

  // Reset filter to the appropriate default
  if (tab === 'faturados') setFilter('all');
  else                     setFilter('paid');
}

function updateBillingBadges() {
  const nFat  = bls.filter(b => !b.paid).length;
  const nPago = bls.filter(b => !!b.paid).length;
  const bFat  = document.getElementById('badge-faturados');
  const bPago = document.getElementById('badge-pagos');
  if (bFat)  bFat.textContent  = nFat  || '';
  if (bPago) bPago.textContent = nPago || '';
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 1: "O QUE FAZER AGORA"
// ══════════════════════════════════════════════════════════════════
function renderTodoList() {
  const el = document.getElementById('dash-todo-list');
  if (!el) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const items = [];

  // ── Containers em D&D há mais de 30 dias ──────────────────────
  const dd30 = trkData.filter(r => {
    if (r.emptyReturn) return false;
    const e = trkDaysElapsed(r.discharge);
    return e !== null && e - (r.freeTime||21) > 30;
  });
  if (dd30.length) {
    items.push({
      level: 'urgent', icon: '⛔',
      title: `${dd30.length} container${dd30.length>1?'s':''} em D&D há mais de 30 dias`,
      sub: 'Ação urgente: acionar cliente ou providenciar devolução imediata',
      action: () => { switchModule('tracking'); openAlertPanel(); }
    });
  }

  // ── Alertas de free time ────────────────────────────────────────
  const alerts = computeAlerts();
  const todayAlerts = alerts.filter(a => a.category === 'today');
  const warnAlerts  = alerts.filter(a => a.category === 'warn');
  if (todayAlerts.length) {
    items.push({
      level: 'urgent', icon: '🔔',
      title: `${todayAlerts.length} container${todayAlerts.length>1?'s':''} com free time vencendo hoje`,
      sub: 'Enviar alerta ao cliente antes que entre em D&D',
      action: () => { switchModule('tracking'); openAlertPanel(); }
    });
  }
  if (warnAlerts.length) {
    items.push({
      level: 'warn', icon: '⏰',
      title: `${warnAlerts.length} container${warnAlerts.length>1?'s':''} a vencer em breve`,
      sub: `Janela de ${getAlertDays()} dias — alertar consignatários`,
      action: () => { switchModule('tracking'); openAlertPanel(); }
    });
  }

  // ── BLs prontos para migrar para faturamento ───────────────────
  const readyToMigrate = trkData.filter(r => {
    if (!r.emptyReturn || !r.discharge) return false;
    const used = trkDaysBetween(r.discharge, r.emptyReturn);
    return used !== null && used > (r.freeTime||21);
  });
  const blsInBilling = new Set(bls.map(b => b.bl));
  const notYetBilled = readyToMigrate.filter(r => !blsInBilling.has(r.bl));
  if (notYetBilled.length) {
    const uniqueBLs = [...new Set(notYetBilled.map(r => r.bl))];
    items.push({
      level: 'info', icon: '📋',
      title: `${uniqueBLs.length} BL${uniqueBLs.length>1?'s':''} com D&D pronto${uniqueBLs.length>1?'s':''} para faturar`,
      sub: 'Containers devolvidos com demurrage — migrar para faturamento',
      action: () => { switchModule('tracking'); }
    });
  }

  // ── Clientes sem e-mail (com faturas em aberto) ────────────────
  _rebuildConsMap();
  const semEmail = Object.values(_consMap).filter(c => !c.emails.length).length;
  if (semEmail) {
    items.push({
      level: 'info', icon: '📭',
      title: `${semEmail} cliente${semEmail>1?'s':''} com faturas em aberto sem e-mail`,
      sub: 'Cobranças automáticas não funcionam sem e-mail cadastrado',
      action: () => { filterClientsSemEmail(); }
    });
  }

  if (!items.length) {
    el.innerHTML = '<div class="todo-empty">✅ Tudo em dia! Nenhuma ação urgente no momento.</div>';
    return;
  }

  // Sort: urgent first
  const order = { urgent: 0, warn: 1, info: 2 };
  items.sort((a,b) => order[a.level] - order[b.level]);

  el.innerHTML = items.slice(0,6).map((item, i) => `
    <div class="todo-item todo-item-${item.level}" onclick="window._todoActions[${i}]()" style="cursor:pointer;">
      <span class="todo-icon">${item.icon}</span>
      <div class="todo-text">
        <div class="todo-title">${item.title}</div>
        <div class="todo-sub">${item.sub}</div>
      </div>
      <span class="todo-action">Resolver →</span>
    </div>`).join('');

  // Store actions
  window._todoActions = items.slice(0,6).map(i => i.action);
}

// ══════════════════════════════════════════════════════════════════
// FEATURE 2: BACKUP / RESTORE
// ══════════════════════════════════════════════════════════════════
function backupData() {
  const data = {
    version:   '1.0',
    exportedAt: new Date().toISOString(),
    bls:      load(),
    tracking: trkLoad(),
    clients:  cliLoad(),
    // FIX #13: alertDays incluído no backup para ser restaurado corretamente
    alertDays: getAlertDays(),
  };
  const json  = JSON.stringify(data, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href      = url;
  a.download  = `DemurrageManager_Backup_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Backup exportado: ${data.bls.length} BLs, ${data.tracking.length} containers, ${data.clients.length} clientes.`, 'success');
}

function restoreData() {
  const input = document.createElement('input');
  input.type  = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.bls && !data.tracking && !data.clients) {
          toast('Arquivo inválido — não é um backup do Demurrage Manager.', 'error');
          return;
        }
        const msg = `Restaurar backup de ${data.exportedAt ? new Date(data.exportedAt).toLocaleString('pt-BR') : 'data desconhecida'}?\n\n` +
          `• ${(data.bls||[]).length} BLs\n` +
          `• ${(data.tracking||[]).length} containers\n` +
          `• ${(data.clients||[]).length} clientes\n\n` +
          `ATENÇÃO: os dados atuais serão SUBSTITUÍDOS por este backup.`;
        if (!confirm(msg)) return;
        if (window._dmFireRestore) {
          window._dmFireRestore(data).then(() => {
            toast('Backup restaurado! Recarregando...', 'success');
            setTimeout(() => location.reload(), 1200);
          }).catch(err => toast('Erro ao restaurar: ' + err.message, 'error'));
        } else {
          toast('Supabase não inicializado. Aguarde e tente novamente.', 'error');
        }
      } catch(err) {
        toast('Erro ao ler arquivo: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

// ══════════════════════════════════════════════════════════════════
// FEATURE 3: VALIDAÇÃO DE CNPJ
// ══════════════════════════════════════════════════════════════════
function validarCNPJ(cnpj) {
  const d = String(cnpj||'').replace(/\D/g,'').padStart(14,'0').slice(0,14);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (d, n) => {
    let sum = 0, pos = n - 7;
    for (let i = n; i >= 1; i--) {
      sum += parseInt(d.charAt(n-i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(d,12) === parseInt(d.charAt(12)) && calc(d,13) === parseInt(d.charAt(13));
}

function checkCnpjField(inputEl) {
  const raw = inputEl.value.replace(/\D/g,'');
  if (!raw) { inputEl.style.borderColor = ''; return; }
  const padded = raw.padStart(14,'0').slice(0,14);
  if (padded.length === 14) {
    const valid = validarCNPJ(padded);
    inputEl.style.borderColor = valid ? '#16a34a' : '#dc2626';
    inputEl.title = valid ? '✅ CNPJ válido' : '❌ CNPJ inválido — verifique os dígitos';
  }
}


// ── TRACKING VIEW TOGGLE ──────────────────────────────────────────────────
window._trkView     = 'container'; // 'container' | 'bl'
window._trkExpanded = new Set();   // expanded BL keys

function toggleTrkView() {
  window._trkView = window._trkView === 'container' ? 'bl' : 'container';
  const btn = document.getElementById('btn-trk-view-toggle');
  if (btn) {
    btn.textContent = window._trkView === 'bl' ? '☰ Visão por Container' : '🗂 Visão por BL';
    btn.classList.toggle('trk-view-btn-active', window._trkView === 'bl');
  }
  window._trkExpanded.clear();
  _updateTrkTableHeader();
  renderTracking();
}

function _updateTrkTableHeader() {
  const thead = document.getElementById('trk-thead');
  const colgroup = document.getElementById('trk-colgroup');
  if (!thead || !colgroup) return;
  if (window._trkView === 'bl') {
    // BL view: 8 meaningful columns
    colgroup.innerHTML = `
      <col style="width:14%"> <!-- BL -->
      <col style="width:18%"> <!-- CNEE -->
      <col style="width:12%"> <!-- NAVIO -->
      <col style="width:8%">  <!-- ROTA -->
      <col style="width:7%">  <!-- QTDE -->
      <col style="width:9%">  <!-- DESCARGA -->
      <col style="width:9%">  <!-- DEADLINE -->
      <col style="width:23%"> <!-- STATUS -->
    `;
    thead.innerHTML = `
      <tr>
        <th>BL</th>
        <th>CNEE</th>
        <th>NAVIO</th>
        <th>ROTA</th>
        <th style="text-align:center;">CTRS</th>
        <th>DESCARGA</th>
        <th>DEADLINE</th>
        <th>STATUS</th>
      </tr>
      <tr class="trk-filter-row">
        <th><input type="text" id="tf-bl"     placeholder="filtrar..." oninput="renderTracking()"></th>
        <th><input type="text" id="tf-cnee"   placeholder="filtrar..." oninput="renderTracking()"></th>
        <th><input type="text" id="tf-vessel" placeholder="filtrar..." oninput="renderTracking()"></th>
        <th></th>
        <th></th>
        <th><input type="text" id="tf-discharge" placeholder="DD/MM..." oninput="renderTracking()"></th>
        <th><input type="text" id="tf-deadline"  placeholder="DD/MM..." oninput="renderTracking()"></th>
        <th>
          <select id="tf-status" onchange="renderTracking()" style="font-size:10px;">
            <option value="">todos</option>
            <option value="dd_open">D&D n/dev</option>
            <option value="dd_returned">D&D dev</option>
            <option value="returned">devolvido</option>
            <option value="grace">atenção</option>
          </select>
        </th>
      </tr>
    `;
  } else {
    // Container view: restore original 15-column header
    colgroup.innerHTML = `
      <col style="width:8%">
      <col style="width:10%">
      <col style="width:11%">
      <col style="width:4%">
      <col style="width:3%">
      <col style="width:3%">
      <col style="width:8%">
      <col style="width:6%">
      <col style="width:6%">
      <col style="width:6%">
      <col style="width:4%">
      <col style="width:4%">
      <col style="width:4%">
      <col style="width:11%">
      <col style="width:7%">
    `;
    thead.innerHTML = `
      <tr>
        <th>CONTAINER</th><th>BL</th><th>CNEE</th><th>TIPO</th>
        <th>POL</th><th>POD</th><th>NAVIO</th>
        <th>DESCARGA</th><th>DEADLINE</th><th>DEVOLUÇÃO</th>
        <th>USE DAYS</th><th>FREE TIME</th><th>DIAS</th><th>STATUS</th>
        <th>ENVIADO EM</th>
      </tr>
      <tr class="trk-filter-row">
        <th><input type="text" id="tf-container" placeholder="filtrar..." oninput="renderTracking()"></th>
        <th><input type="text" id="tf-bl"        placeholder="filtrar..." oninput="renderTracking()"></th>
        <th><input type="text" id="tf-cnee"      placeholder="filtrar..." oninput="renderTracking()"></th>
        <th><input type="text" id="tf-type"      placeholder="tipo..."    oninput="renderTracking()"></th>
        <th><input type="text" id="tf-pol"       placeholder="..."        oninput="renderTracking()"></th>
        <th><input type="text" id="tf-pod"       placeholder="..."        oninput="renderTracking()"></th>
        <th><input type="text" id="tf-vessel"    placeholder="filtrar..." oninput="renderTracking()"></th>
        <th><input type="text" id="tf-discharge" placeholder="DD/MM..."   oninput="renderTracking()"></th>
        <th><input type="text" id="tf-deadline"  placeholder="DD/MM..."   oninput="renderTracking()"></th>
        <th><input type="text" id="tf-return"    placeholder="DD/MM..."   oninput="renderTracking()"></th>
        <th><input type="text" id="tf-usedays"   placeholder="..."        oninput="renderTracking()"></th>
        <th><input type="text" id="tf-freetime"  placeholder="..."        oninput="renderTracking()"></th>
        <th><input type="text" id="tf-dias"      placeholder="..."        oninput="renderTracking()"></th>
        <th>
          <select id="tf-status" onchange="renderTracking()" style="font-size:10px;">
            <option value="">todos</option>
            <option value="dd_open">D&D n/dev</option>
            <option value="dd_returned">D&D dev</option>
            <option value="returned">devolvido</option>
            <option value="grace">atenção</option>
          </select>
        </th>
        <th><input type="text" id="tf-migratedat" placeholder="DD/MM..." oninput="renderTracking()"></th>
      </tr>
    `;
  }
}

function toggleBlGroup(key) {
  if (window._trkExpanded.has(key)) window._trkExpanded.delete(key);
  else window._trkExpanded.add(key);
  renderTracking();
}

function renderTrkGroupedByBL(filtered) {
  // Group by BL (+ vessel to distinguish same BL different vessels)
  const groups = new Map();
  filtered.forEach(r => {
    const key = (r.bl || '—') + '||' + (r.vessel || '');
    if (!groups.has(key)) {
      groups.set(key, { bl: r.bl||'—', vessel: r.vessel||'—', cnee: r.cnee||'—', pol: r.pol||'—', pod: r.pod||'—', ctrs: [] });
    }
    groups.get(key).ctrs.push(r);
  });

  return [...groups.entries()].map(([key, g]) => {
    const ctrs    = g.ctrs;
    const isExp   = window._trkExpanded.has(key);
    const safeKey = key.replace(/'/g, "\'");

    // Aggregate status counts
    const nDD    = ctrs.filter(r => trkStatus(r) === 'dd_open').length;
    const nAlert = ctrs.filter(r => trkStatus(r) === 'grace').length;
    const nRetDD = ctrs.filter(r => trkStatus(r) === 'dd_returned').length;
    const nOk    = ctrs.filter(r => { const s=trkStatus(r); return s==='returned'||s==='free'; }).length;
    const maxOver = Math.max(0, ...ctrs.map(r => {
      if (r.emptyReturn) return 0;
      const e = trkDaysElapsed(r.discharge);
      return e !== null ? e - (r.freeTime||21) : 0;
    }));

    // Earliest discharge and latest deadline across containers
    const discharges = ctrs.map(r => r.discharge).filter(Boolean).sort();
    const deadlines  = ctrs.map(r => r.deadline).filter(Boolean).sort();
    const earliestDischarge = discharges[0] ? trkFmtDate(discharges[0]) : '—';
    const latestDeadline    = deadlines[deadlines.length-1] ? trkFmtDate(deadlines[deadlines.length-1]) : '—';

    // Row background by urgency
    const bg = nDD > 0 ? '#fff5f5' : nAlert > 0 ? '#fffdf0' : '#fafcff';
    const borderColor = nDD > 0 ? '#fca5a5' : nAlert > 0 ? '#fcd34d' : '#dbeafe';

    // Status pills
    const pills = [
      nDD    ? `<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">⛔ ${nDD} em D&D${maxOver>0?' +'+maxOver+'d':''}</span>` : '',
      nAlert ? `<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">⚠️ ${nAlert} atenção</span>` : '',
      nRetDD ? `<span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">📦 ${nRetDD} dev c/D&D</span>` : '',
      nOk    ? `<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">✅ ${nOk} ok</span>` : '',
    ].filter(Boolean).join(' ');

    // ── BL summary row (8 cols matching new thead) ──
    const arrow = isExp ? '▾' : '▸';
    const summaryRow = `<tr class="bl-group-row bl-group-header" onclick="toggleBlGroup('${safeKey}')"
        style="background:${bg};cursor:pointer;border-left:3px solid ${borderColor};">
      <td style="padding:10px 12px;border-top:2px solid var(--border);">
        <span style="font-weight:700;color:var(--navy);font-size:13px;">${arrow} ${g.bl}</span>
      </td>
      <td style="padding:10px 8px;border-top:2px solid var(--border);">
        <span style="font-size:12px;color:#374151;font-weight:500;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${g.cnee}">${g.cnee}</span>
      </td>
      <td style="padding:10px 8px;font-size:12px;color:var(--muted);border-top:2px solid var(--border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${g.vessel}">${g.vessel}</td>
      <td style="padding:10px 8px;font-size:11px;color:var(--muted);border-top:2px solid var(--border);white-space:nowrap;">${g.pol||'—'} → ${g.pod||'—'}</td>
      <td style="padding:10px 8px;text-align:center;border-top:2px solid var(--border);">
        <span style="background:var(--navy);color:white;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:700;">${ctrs.length}</span>
      </td>
      <td style="padding:10px 8px;font-size:12px;color:var(--muted);border-top:2px solid var(--border);">${earliestDischarge}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--muted);border-top:2px solid var(--border);">${latestDeadline}</td>
      <td style="padding:10px 12px;border-top:2px solid var(--border);">${pills}</td>
    </tr>`;

    if (!isExp) return summaryRow;

    // ── Child rows: 8-col container detail ──
    const childRows = ctrs.map(r => {
      const status = trkStatus(r);
      const elapsed = trkDaysElapsed(r.discharge);
      const ft = r.freeTime || 21;
      const daysOver = elapsed !== null ? elapsed - ft : null;
      const useDays = r.useDays !== null && r.useDays !== undefined
        ? r.useDays
        : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed);
      const diasCorridos = r.emptyReturn
        ? trkDaysBetween(r.discharge, r.emptyReturn)
        : elapsed;

      const over = daysOver !== null && daysOver > 0;
      const daysHtml = diasCorridos !== null
        ? `<span style="font-weight:${over?'700':'400'};color:${over?'#dc2626':'inherit'}">${diasCorridos}d${over?' (+'+daysOver+'d)':''}</span>`
        : '—';

      const statusMap = {
        dd_open:     `<span style="background:#fee2e2;color:#b91c1c;padding:1px 7px;border-radius:99px;font-size:11px;font-weight:700;white-space:nowrap;">⛔ D&D</span>`,
        dd_returned: `<span style="background:#ede9fe;color:#7c3aed;padding:1px 7px;border-radius:99px;font-size:11px;white-space:nowrap;">📦 Dev c/D&D</span>`,
        returned:    `<span style="background:#dcfce7;color:#16a34a;padding:1px 7px;border-radius:99px;font-size:11px;white-space:nowrap;">✅ Devolvido</span>`,
        grace:       `<span style="background:#fef3c7;color:#b45309;padding:1px 7px;border-radius:99px;font-size:11px;white-space:nowrap;">⚠️ Atenção (${ft - elapsed}d)</span>`,
        free:        `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 7px;border-radius:99px;font-size:11px;white-space:nowrap;">🟢 Free (${ft - elapsed}d)</span>`,
        none:        '—'
      };
      const pillHtml = statusMap[status] || '—';

      const devol = r.emptyReturn ? trkFmtDate(r.emptyReturn) : (useDays !== null ? `${useDays}d usados` : '—');

      return `<tr style="background:#f7faff;border-left:3px solid #bfdbfe;">
        <td style="padding:7px 12px;padding-left:24px;font-weight:600;font-size:12px;color:var(--navy);">${r.container} <span style="font-size:10px;color:var(--muted);font-weight:400;">${r.type||''}</span></td>
        <td style="font-size:11px;color:var(--muted);padding:7px 8px;">—</td>
        <td style="font-size:11px;color:var(--muted);padding:7px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.vessel||''}">${r.vessel||'—'}</td>
        <td style="font-size:11px;color:var(--muted);padding:7px 8px;">${r.pol||'—'} → ${r.pod||'—'}</td>
        <td style="padding:7px 8px;text-align:center;font-size:11px;color:var(--muted);">—</td>
        <td style="font-size:12px;padding:7px 8px;">${trkFmtDate(r.discharge)}</td>
        <td style="font-size:12px;padding:7px 8px;">${trkFmtDate(r.deadline)}<br><span style="font-size:10px;color:var(--muted);">dev: ${devol}</span></td>
        <td style="padding:7px 8px;">${daysHtml} &nbsp; ${pillHtml}</td>
      </tr>`;
    }).join('');

    return summaryRow + childRows;
  }).join('');
}


// INIT — chamado pelo db.js após Supabase carregar os dados
// See: window._dmOnReady()
window._dmOnReady = function() {
  // ── Reload all global arrays from Firestore ──
  bls = load();              // ← critical: reatribui bls com dados do Supabase

  // FIX-QUOTA: Todas as migrações de startup em UMA passagem, com 1 save consolidado
  // (antes: _backfillVenc + migrateDotcnum + backfillMigratedAt = até 3 saves separados)
  (function runStartupMigrations() {
    let changed = false;

    // 1) backfill venc
    bls.forEach(b => { if (!b.venc) { b.venc = nextBusinessDay(null); changed = true; } });

    // 2) backfill docnum
    bls.forEach(b => { if (!b.docnum) { b.docnum = genDocnum(b.bl); changed = true; } });

    // 3) backfill migratedAt
    bls.forEach(b => {
      if (b.migratedFromTracking && !b.migratedAt) {
        b.migratedAt = b.createdAt
          ? new Date(b.createdAt).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        changed = true;
      }
    });

    // Um único save para todas as migrações (0 writes se nada precisar de backfill)
    if (changed) save(bls);
  })();
  const rawTrk = trkLoad();
  const cleanTrk = rawTrk.filter(r => {
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      const ft = r.freeTime || 21;
      if (used !== null && used <= ft) return false;
    }
    return true;
  });
  if (cleanTrk.length < rawTrk.length) trkSave(cleanTrk);
  trkData = cleanTrk;
  clients = cliLoad();
  renderList();
  renderRateTable();
  loadPTAX();
  renderTracking();
  updateAlertBadge();
  // MELHORIA #1: aplicar alertas visuais nos containers críticos
  setTimeout(applyContainerAlerts, 500);
  // Carrega taxas customizadas do localStorage
  loadCfgRatesFromFirestore();
  switchModule('dashboard');
  // Exibe nome do usuário no header (nome completo ou e-mail como fallback)
  (function() {
    const userData = window._dmUserData;
    const authUser = window._dmUser;
    const displayName = (userData && userData.nome) ? userData.nome
      : (authUser && authUser.email) ? authUser.email
      : '';
    const el = document.getElementById('header-user-name');
    if (el && displayName) el.textContent = displayName;
  })();
  // Hide loading overlay
  const overlay = document.getElementById('dm-loading-overlay');
  if (overlay) overlay.style.display = 'none';

  // Auto-checkpoint diário gerenciado pelo pg_cron no Supabase (23:59 BRT)

  // FIX-QUOTA #H: flag anti-cascata para evitar loop onSnapshot → trkSave → onSnapshot
  var _trkSaving = false;
  window._dmOnTrkUpdate = function() {
    if (_trkSaving) return; // Ignora callbacks causados pelo nosso próprio save
    // FIX #7: aplica filtro de containers devolvidos dentro do free time
    // (mesmo filtro do carregamento inicial em _dmOnReady)
    var raw7 = trkLoad();
    var clean7 = raw7.filter(function(r) {
      if (r.emptyReturn && r.discharge) {
        var used = trkDaysBetween(r.discharge, r.emptyReturn);
        var ft   = r.freeTime || 21;
        if (used !== null && used <= ft) return false;
      }
      return true;
    });
    if (clean7.length < raw7.length) {
      _trkSaving = true;
      trkSave(clean7);
      setTimeout(function() { _trkSaving = false; }, 2000);
    }
    trkData = clean7;
    renderTracking();
    updateAlertBadge();
  };
  window._dmOnClientsUpdate = function() {
    clients = cliLoad();
    renderClients();
  };
};
