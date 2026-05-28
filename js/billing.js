// ============================================================
// billing.js — Módulo de Faturamento (BLs / D&D)
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Dependências (carregadas antes via <script src>):
//   utils.js  — toast, openModal, closeModal, uid, fmtBRL
//   rates.js  — RATES, getRate, getRateForBL, calcUSD, daysBetween
// Lê dados via window._dmStore (preenchido por db.js).
// ============================================================

// ============================================================
// PTAX — Banco Central do Brasil  |  ROE = PTAX venda × 1,065
// ============================================================
let ptaxState = { ptax: null, roe: null, date: null, loading: false, error: null, source: null };

function fmtBCBDate(dt) {
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const y = dt.getFullYear();
  return `${m}-${d}-${y}`;
}

async function loadPTAX() {
  ptaxState = { ptax: null, roe: null, date: null, loading: true, error: null, source: null };
  renderPTAXBadge();

  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 10);

    // Endpoint CotacaoDolarPeriodo — 1 única chamada, range de 10 dias,
    // traz sempre a PTAX mais recente divulgada. Aspas codificadas (%27).
    const startDate = fmtBCBDate(from);
    const endDate   = fmtBCBDate(today);
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial=%27${startDate}%27&@dataFinalCotacao=%27${endDate}%27&$top=1&$orderby=dataHoraCotacao%20desc&$format=json&$select=cotacaoVenda,dataHoraCotacao`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const json = await resp.json();

    if (json.value && json.value.length > 0 && json.value[0].cotacaoVenda) {
      const ptax = parseFloat(json.value[0].cotacaoVenda);
      const roe  = parseFloat((ptax * 1.065).toFixed(4));
      // Data extraída da resposta (ex: "2026-03-23 13:08:11.223" → "2026-03-23")
      const dateStr = (json.value[0].dataHoraCotacao || '').slice(0, 10);
      ptaxState = { ptax, roe, date: dateStr, loading: false, error: null, source: 'BCB' };
      renderPTAXBadge();
      applyPTAXGlobal();
      return;
    }
    throw new Error('Sem cotações no período retornado pelo BCB');
  } catch(e) {
    console.error('[PTAX] Erro ao consultar BCB:', e);
    ptaxState = { ptax: null, roe: null, date: null, loading: false, error: 'PTAX indisponível no BCB. Aguarde e tente novamente.', source: null };
    renderPTAXBadge();
  }
}

function renderPTAXBadge() {
  const el = document.getElementById('ptax-badge');
  if (!el) return;
  if (ptaxState.loading) {
    el.innerHTML = `<span class="ptax-loading">⟳ Consultando PTAX no Banco Central...</span>`;
    return;
  }
  if (ptaxState.error || !ptaxState.ptax) {
    el.innerHTML = `
      <span class="ptax-error">⚠ ${ptaxState.error||'PTAX indisponível'}
        <button class="ptax-retry" onclick="loadPTAX()">↻ Tentar novamente</button>
      </span>
      <span class="ptax-manual-sep"></span>
      <span class="ptax-manual-area">
        <span class="ptax-manual-label">Inserir PTAX manualmente:</span>
        <input class="ptax-manual-input" id="ptax-manual-val" type="number" step="0.0001" min="1" placeholder="ex: 5.8200"
          onkeydown="if(event.key==='Enter') applyPTAXManual()"
          title="Digite a PTAX Venda divulgada pelo BCB">
        <button class="ptax-manual-btn" onclick="applyPTAXManual()">✓ Aplicar</button>
      </span>`;
    return;
  }
  const srcLabel = document.getElementById('ptax-src-label');
  const isManual = ptaxState.source === 'MANUAL';
  if (srcLabel) srcLabel.textContent = isManual ? 'Inserido manualmente' : 'Fonte: Banco Central do Brasil';
  const fmtD = ptaxState.date ? new Date(ptaxState.date+'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const manualTag = isManual
    ? `<span class="ptax-manual-tag" title="Valor inserido manualmente — não consultado no BCB">manual</span>`
    : '';
  el.innerHTML = `
    <span class="ptax-pill">
      <span class="ptax-label">PTAX Venda</span>
      <span class="ptax-val">R$ ${ptaxState.ptax.toFixed(4).replace('.',',')}${manualTag}</span>
      <span class="ptax-sep">→ PTAX × 1,065 =</span>
      <span class="ptax-roe-label">ROE</span>
      <span class="ptax-roe-val">R$ ${ptaxState.roe.toFixed(4).replace('.',',')}</span>
      <span class="ptax-date">(${fmtD})</span>
      <button class="ptax-refresh" onclick="loadPTAX()" title="Recarregar do Banco Central">↻</button>
    </span>`;
}

// Aplica PTAX inserida manualmente pelo usuário (plano B quando BCB está indisponível)
function applyPTAXManual() {
  const input = document.getElementById('ptax-manual-val');
  if (!input) return;
  const ptax = parseFloat(input.value);
  if (!ptax || ptax < 1 || ptax > 20) {
    input.focus();
    input.style.borderColor = '#ef4444';
    setTimeout(() => { input.style.borderColor = ''; }, 1500);
    return;
  }
  const roe = parseFloat((ptax * 1.065).toFixed(4));
  const today = new Date().toISOString().slice(0, 10);
  ptaxState = { ptax, roe, date: today, loading: false, error: null, source: 'MANUAL' };
  renderPTAXBadge();
  applyPTAXGlobal();
}

// Aplica ROE automático nos BLs sem ROE manual
// FIX-QUOTA #K: ZERO writes aqui. effectiveROE(b) já retorna ptaxState.roe em runtime
// para BLs sem roeManual — persistir b.roe no Firestore é totalmente redundante e causava
// save(bls) em TODA sessão (explosion de writes logo após o PTAX do BCB carregar).
// Apenas re-renderiza para refletir o novo ROE na tela.
function applyPTAXGlobal() {
  if (!ptaxState.roe) return;
  renderList();
}

// ROE efetivo para um BL: manual > PTAX oficial do BCB
function effectiveROE(b) {
  if (b.roeManual && b.roe) return b.roe;
  if (ptaxState.roe) return ptaxState.roe;
  return null; // sem PTAX disponível — não usa valor aproximado
}

// ============================================================
// STORAGE
// ============================================================
// ── STORAGE: BLs (Firestore via window._dmStore) ──────────────────────────
// FIX #2: retorna cópia profunda para que o diff em _dmFireSave compare
// oldStore (referência ao store) vs newData (cópia local modificada) corretamente.
function load() {
  const raw = JSON.parse(JSON.stringify((window._dmStore && window._dmStore.bls) || []));
  // Backfill: BLs faturados antes de firstBilledAt existir só têm billedAt.
  // Garante que firstBilledAt sempre reflita a data de emissão conhecida mais antiga.
  raw.forEach(b => {
    if (!b.firstBilledAt && b.billedAt) b.firstBilledAt = b.billedAt;
  });
  return raw;
}
function save(b) {
  // NÃO atualiza _dmStore aqui — _dmFireSave faz o diff correto e atualiza o store
  if (window._dmFireSave) window._dmFireSave('bls', b);
  else if (window._dmStore) window._dmStore.bls = b; // fallback se Firebase não inicializou
}
// FIX-QUOTA #G: salva apenas 1 BL (1 write, sem diff de toda a coleção)
function saveOne(bl) {
  if (window._dmFireSaveOne) window._dmFireSaveOne('bls', bl.id, bl);
  else save(bls); // fallback para save completo
}
function deleteBLById(id) {
  if (window._dmFireDelete) window._dmFireDelete('bls', id);
}

let bls = load();
let activeFilter = 'all';
let showOnlyWithDiscount = false;
let showOnlyWithDispute = false;

function setFilter(f) {
  activeFilter = f;
  ['all','all-pendentes','paid'].forEach(k => {
    const el = document.getElementById('filter-'+k);
    // Ambos filter-all e filter-all-pendentes representam o filtro 'all'
    const active = (k === 'all-pendentes') ? f === 'all' : k === f;
    if (el) el.style.fontWeight  = active ? '700' : '400';
    if (el) el.style.borderColor = active ? 'var(--navy)' : '';
    if (el) el.style.color       = active ? 'var(--navy)' : '';
  });
  // Quando "Todos" é selecionado, desmarca filtros adicionais automaticamente
  if (f === 'all') {
    if (showOnlyWithDiscount) {
      showOnlyWithDiscount = false;
      document.querySelectorAll('#filter-discount-btn, #filter-discount-btn-paid, #filter-discount-btn-pendentes').forEach(btn => {
        btn.style.fontWeight = '400'; btn.style.borderColor = ''; btn.style.color = ''; btn.style.background = '';
      });
    }
    if (showOnlyWithDispute) {
      showOnlyWithDispute = false;
      document.querySelectorAll('#filter-dispute-btn, #filter-dispute-btn-paid, #filter-dispute-btn-pendentes').forEach(btn => {
        btn.style.fontWeight = '400'; btn.style.borderColor = ''; btn.style.color = ''; btn.style.background = '';
      });
    }
  }
  renderList();
}

function toggleDiscountFilter() {
  showOnlyWithDiscount = !showOnlyWithDiscount;
  const btns = document.querySelectorAll('#filter-discount-btn, #filter-discount-btn-paid, #filter-discount-btn-pendentes');
  btns.forEach(btn => {
    if (showOnlyWithDiscount) {
      btn.style.fontWeight = '700';
      btn.style.borderColor = 'var(--blue)';
      btn.style.color = 'var(--blue)';
      btn.style.background = 'rgba(30, 64, 175, 0.05)';
    } else {
      btn.style.fontWeight = '400';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.background = '';
    }
  });
  renderList();
}

function toggleDisputeFilter() {
  showOnlyWithDispute = !showOnlyWithDispute;
  const btns = document.querySelectorAll('#filter-dispute-btn, #filter-dispute-btn-paid, #filter-dispute-btn-pendentes');
  btns.forEach(btn => {
    if (showOnlyWithDispute) {
      btn.style.fontWeight = '700';
      btn.style.borderColor = '#f59e0b';
      btn.style.color = '#f59e0b';
      btn.style.background = 'rgba(245, 158, 11, 0.05)';
    } else {
      btn.style.fontWeight = '400';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.background = '';
    }
  });
  renderList();
}
// _backfillVenc was removed — startup migration consolidated into
// runStartupMigrations() in init.js (FIX-QUOTA: single save instead of multiple)
let editingId = null, currentBL = null, currentType = null, ovTotal = null, ovRoe = null, importData = null, currentDocnum = null;

// ============================================================
// UTILS
// ============================================================
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }

function genDocnum(blStr) {
  // FIX: hash com 9000 slots causava colisões (confirmado no DB: DEM-2026-1454 duplicado).
  // Novo formato: DEM-YYYY-<4 chars base36 do timestamp><3 chars do hash do BL>
  // O componente de timestamp garante unicidade mesmo com hash colidente.
  const year = new Date().getFullYear();
  const ts   = Date.now().toString(36).slice(-4).toUpperCase();
  let hash   = 0;
  const s    = String(blStr || '').toUpperCase();
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  const suffix = (Math.abs(hash) % 1000).toString().padStart(3, '0');
  return `DEM-${year}-${ts}${suffix}`;
}
function toast(msg, t='') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast show '+t;
  setTimeout(()=>el.classList.remove('show'), 3000);
}
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Modal genérico reutilizável (para histórico e outras funcionalidades)
function showGenericModal(title, html, width) {
  let m = document.getElementById('generic-modal-overlay');
  if (!m) {
    m = document.createElement('div');
    m.id = 'generic-modal-overlay';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    m.innerHTML = `<div id="generic-modal-box" style="background:white;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--border);background:#f9fafb;">
        <h3 id="generic-modal-title" style="font-size:15px;font-weight:700;margin:0;color:var(--text);"></h3>
        <button onclick="document.getElementById('generic-modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted);line-height:1;padding:4px;">×</button>
      </div>
      <div id="generic-modal-body" style="padding:22px;overflow-y:auto;flex:1;"></div>
    </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  }
  document.getElementById('generic-modal-title').textContent = title;
  document.getElementById('generic-modal-body').innerHTML = html;
  document.getElementById('generic-modal-box').style.width = width || '520px';
  m.style.display = 'flex';
}
function fmtDate(s) { return s ? new Date(s+'T12:00:00').toLocaleDateString('pt-BR') : ''; }

// Retorna a data em que todos os containers do BL foram devolvidos
// (máximo dos emptyReturn), ou null se algum container ainda não foi devolvido.
function computeReadyAt(b) {
  const ctrs = (b.containers || []).filter(c => c.discharge);
  if (!ctrs.length) return null;
  if (!ctrs.every(c => !!c.emptyReturn)) return null;
  return ctrs.reduce((max, c) => (c.emptyReturn > max ? c.emptyReturn : max), ctrs[0].emptyReturn);
}

// Limpa os filtros de data de uma sub-aba específica
function clearDateFilter(tab) {
  const f = document.getElementById('date-from-' + tab);
  const t = document.getElementById('date-to-'   + tab);
  if (f) f.value = '';
  if (t) t.value = '';
  const btn = document.getElementById('clear-date-btn-' + tab);
  if (btn) btn.style.display = 'none';
  renderList();
}
function fmtBRL(v) { return 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function parseDs(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v==='number') { const d=new Date((v-25569)*86400000); return d.toISOString().slice(0,10); }
  const p=String(v).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (p) { const y=p[3].length===2?'20'+p[3]:p[3]; return `${y}-${p[2].padStart(2,'0')}-${p[1].padStart(2,'0')}`; }
  const iso=String(v).match(/(\d{4})-(\d{2})-(\d{2})/); return iso?iso[0]:'';
}
function nk(k) { return String(k).trim().toUpperCase().replace(/[\s\/\-]+/g,'_'); }
function longDate() { return new Date().toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

// Next business day (skip weekends; Mon if Fri)
function nextBusinessDay(fromDate) {
  const d = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  d.setDate(d.getDate() + 1);
  // Skip Saturday (6) -> Monday
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  // Skip Sunday (0) -> Monday
  else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Fill venc field with auto value (next business day from today)
function autoFillVenc() {
  const field = document.getElementById('f-venc');
  if (!field.value) {
    field.value = nextBusinessDay(null);
  }
}


function blTotal(b, roeOv) {
  const roe = roeOv ?? effectiveROE(b);
  let t = 0;
  (b.containers||[]).forEach(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
    t += calc.totalUSD * roe;
  });
  // Apply discount if present
  if (b.discount && b.discount.value > 0) {
    if (b.discount.mode === 'percent') {
      t = t * (1 - b.discount.value / 100);
    } else {
      t = Math.max(0, t - b.discount.value);
    }
  }
  return t;
}

// Retorna o total em USD do BL (sem conversão ROE)
// Desconto percentual aplicado; desconto fixo em BRL ignorado para USD
function blTotalUSD(b) {
  let t = 0;
  (b.containers||[]).forEach(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
    t += calc.totalUSD;
  });
  if (b.discount && b.discount.value > 0 && b.discount.mode === 'percent') {
    t = t * (1 - b.discount.value / 100);
  }
  return t;
}

// ============================================================
// BILLING KPI DASHBOARD
// Calcula e exibe cards reativos ao conjunto filtrado atual
// ============================================================
function updateBillingKPIs(filtered) {
  let totalUSD = 0, totalBRL = 0, totalContainers = 0;
  filtered.forEach(b => {
    totalUSD       += blTotalUSD(b);
    totalBRL       += blTotal(b, null);
    totalContainers += (b.containers || []).length;
  });
  const fmtUSD = v => '$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set('kpi-usd',        fmtUSD(totalUSD));
  set('kpi-brl',        fmtBRL(totalBRL));
  set('kpi-bls',        filtered.length);
  set('kpi-containers', totalContainers);
}

// ============================================================
// DISCOUNT PREVIEW & CALCULATION
// ============================================================
function updateDiscountPreview() {
  const type = document.getElementById('f-discount-type').value;
  const value = parseFloat(document.getElementById('f-discount-value').value) || 0;
  const mode = document.getElementById('f-discount-mode').value;
  const previewEl = document.getElementById('discount-preview');

  if (!type || value <= 0) {
    previewEl.style.display = 'none';
    return;
  }

  previewEl.style.display = 'block';
  const modeLabel = mode === 'percent' ? '%' : 'R$';
  const typeLabel = {
    'comercial': 'Desconto comercial',
    'datas': 'Ajuste de datas',
    'cortesia': 'Cortesia',
    'acordo': 'Acordo de pagamento',
    'erro': 'Erro operacional'
  }[type] || type;

  previewEl.textContent = `${typeLabel} • ${value}${modeLabel}`;
}

function attachDiscountListeners() {
  ['f-discount-type', 'f-discount-value', 'f-discount-mode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateDiscountPreview);
    if (el) el.addEventListener('input', updateDiscountPreview);
  });
  updateDiscountPreview();
}

// ============================================================
// AUDIT LOGGING
// ============================================================
// FIX-QUOTA #E: só loga ações críticas no Firestore (evita writes por edições rotineiras)
// Ações de alta frequência (edicao_bl, criacao_bl, exportacao_relatorio) vão apenas ao console.
const _AUDIT_FIRESTORE_ACTIONS = new Set([
  // BLs
  'exclusao_bl', 'exclusao_todos_bls', 'exclusao_em_massa_bls',
  'marcacao_pagamento', 'marcacao_fatura',
  'envio_email', 'importacao_planilha',
  // Containers
  'exclusao_todos_containers', 'exclusao_em_massa_containers',
  // Usuários e sistema
  'edicao_usuario', 'limpeza_logs',
  // Backup / checkpoints
  'criacao_checkpoint', 'restauracao_checkpoint',
  // Sessão
  'login', 'logout'
]);
function logAuditAction(action, details = {}) {
  console.log('[AUDIT]', action, details);
  if (window._dmFireLog && _AUDIT_FIRESTORE_ACTIONS.has(action)) {
    window._dmFireLog(action, details);
  }
}

function wrapWithAuditLog(action, fn) {
  return function(...args) {
    logAuditAction(action, {args: args});
    return fn.apply(this, args);
  };
}

function toggleDisputeDetails() {
  const checkbox = document.getElementById('f-dispute-open');
  const details = document.getElementById('dispute-details');
  if (checkbox && details) {
    details.style.display = checkbox.checked ? 'block' : 'none';
  }
}

// ============================================================
// RATE TABLE RENDER
// ============================================================
function renderRateTable() {
  const el = document.getElementById('rate-table-body');
  let html = `<thead><tr><th>País</th><th>Tipo</th><th>Período</th><th>Dias</th><th>Taxa Diária</th><th>Nota</th></tr></thead><tbody>`;
  RATES.forEach((r, i) => {
    const showCountry = i === 0;
    const showNote = i === 0;
    html += `
      <tr>
        ${showCountry?`<td rowspan="${RATES.length*3}" style="font-weight:700;vertical-align:middle;text-align:center">BRASIL</td>`:''}
        <td rowspan="3" style="font-weight:600;vertical-align:middle">${r.type}</td>
        <td><span class="rbadge free">FREE</span></td>
        <td>01 – ${r.freeUntil}</td>
        <td style="color:var(--green);font-weight:600">FREE</td>
        ${showNote?`<td rowspan="${RATES.length*3}" style="vertical-align:middle;font-size:12px;color:var(--muted)">DIAS CORRIDOS</td>`:''}
      </tr>
      <tr>
        <td><span class="rbadge p1">1º Período</span></td>
        <td>${r.p1.range[0]} – ${r.p1.range[1]}</td>
        <td style="font-weight:600">USD ${r.p1.usd}</td>
      </tr>
      <tr style="border-bottom:2px solid var(--border)">
        <td><span class="rbadge p2">2º Período</span></td>
        <td>${r.p2.range[0]}+</td>
        <td style="font-weight:600;color:var(--red)">USD ${r.p2.usd}</td>
      </tr>`;
  });
  el.innerHTML = html + '</tbody>';
}

// ============================================================
// LIST
// ============================================================
function renderList() {
  const q = (document.getElementById('search-input').value||'').toLowerCase();
  const filtered = bls.filter(b => {
    const matchQ = !q || (b.bl+' '+b.client+' '+(b.containers||[]).map(c=>c.container).join(' ')).toLowerCase().includes(q);
    // Sub-tab scope
    const inPend = !b.billed && !b.paid;
    const inFat  = !!b.billed && !b.paid;
    const inPago = !!b.paid;
    const inScope = activeBillingSubTab === 'pendentes' ? inPend
                  : activeBillingSubTab === 'faturados' ? inFat
                  : inPago;
    const matchF = inScope && (
      activeFilter === 'all'
      || (activeFilter === 'paid' && !!b.paid)
    );
    // Apply discount filter if active
    const matchDiscount = !showOnlyWithDiscount || (b.discount && b.discount.value > 0);
    // Apply dispute filter if active
    const matchDispute = !showOnlyWithDispute || (b.dispute && b.dispute.open);
    // Apply date range filter (field depends on active sub-tab)
    const dfrom = document.getElementById('date-from-' + activeBillingSubTab)?.value || '';
    const dto   = document.getElementById('date-to-'   + activeBillingSubTab)?.value || '';
    const dateField = activeBillingSubTab === 'pendentes' ? computeReadyAt(b)
                    : activeBillingSubTab === 'faturados' ? (b.firstBilledAt || b.billedAt || '')
                    : (b.paidAt || '');
    const matchDate = (!dfrom && !dto) || (
      (!dfrom || (dateField && dateField >= dfrom)) &&
      (!dto   || (dateField && dateField <= dto))
    );
    return matchQ && matchF && matchDiscount && matchDispute && matchDate;
  });
  // Atualiza visibilidade do botão "Limpar datas"
  const _dfrom = document.getElementById('date-from-' + activeBillingSubTab)?.value || '';
  const _dto   = document.getElementById('date-to-'   + activeBillingSubTab)?.value || '';
  const _clearBtn = document.getElementById('clear-date-btn-' + activeBillingSubTab);
  if (_clearBtn) _clearBtn.style.display = (_dfrom || _dto) ? '' : 'none';
  updateBillingBadges();
  updateBillingKPIs(filtered);
  document.getElementById('results-count').textContent = `${filtered.length} resultado(s) encontrado(s)`;
  const list = document.getElementById('bl-list');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Nenhum BL encontrado. Importe uma planilha ou crie um novo BL.</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(b => {
    const ctrs = b.containers||[];
    // Only containers that generated demurrage
    const billableCtrs = ctrs.filter(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      return calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD > 0;
    });
    const tot = blTotal(b, null);
    const totStr = tot > 0 ? ` · Total: ${fmtBRL(tot)}` : '';
    const tags = billableCtrs.slice(0,3).map(c=>`<span class="container-tag">${c.container}${c.type?' ('+c.type+')':''}</span>`).join('');
    const more = billableCtrs.length>3?`<span style="font-size:11px;color:var(--muted)">+${billableCtrs.length-3}</span>`:'';
    const isPaid   = !!b.paid;
    const isBilled = !!b.billed;
    const paidBadge   = isPaid   ? `<span class="paid-badge">✔ PAGO</span><span class="paid-date">${fmtDate(b.paidAt)}</span>` : '';
    // Aging: days since billedAt for unpaid billed invoices
    const agingDays = (!isPaid && isBilled && b.billedAt)
      ? Math.floor((Date.now() - new Date(b.billedAt).getTime()) / 86400000)
      : null;
    const agingBadge = agingDays !== null
      ? `<span class="aging-badge ${agingDays>=30?'aging-late':agingDays>=15?'aging-warn':'aging-ok'}">${agingDays}d sem pagamento</span>`
      : '';
    const isConsolidated = !!(b.consolidatedDocnum || (typeof isConsolidatedDocnum === 'function' && isConsolidatedDocnum(b.docnum)));
    const billedBadge = isBilled ? `<span class="paid-badge" style="background:#dbeafe;color:#1e40af;margin-left:4px;">📄 FATURADO</span>` : '';
    const consolidatedBadge = isConsolidated ? `<span class="paid-badge" style="background:#ede9fe;color:#5b21b6;margin-left:4px;" title="Faz parte da fatura consolidada ${b.consolidatedDocnum || b.docnum}">🔗 CONSOLIDADA</span>` : '';
    const discountBadge = (b.discount && b.discount.value > 0) ? `<span class="badge-desc">DESC</span>` : '';
    const isDisputed = (b.dispute && b.dispute.open);
    const disputeBadge = isDisputed ? `<span class="badge-dispute">⚠️ DISPUTA</span>` : '';
    const paidLabel   = isPaid   ? '✔ Pago'     : '○ Pago';
    const paidClass   = isPaid   ? 'paid'        : 'unpaid';
    const billedLabel = isBilled ? '📄 Faturado' : '○ Faturado';
    const billedClass = isBilled ? 'billed'      : 'unbilled';
    // Date chip: exibe a data relevante para a sub-aba ativa
    const _readyAt = computeReadyAt(b);
    const dateChip = activeBillingSubTab === 'pendentes' && _readyAt
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#92400e;background:#fef3c7;border:1px solid #fde68a;padding:2px 8px;border-radius:20px;margin-top:4px;">📅 Pronto p/ faturar: ${fmtDate(_readyAt)}</span>`
      : activeBillingSubTab === 'faturados' && (b.firstBilledAt || b.billedAt)
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#1e40af;background:#dbeafe;border:1px solid #bfdbfe;padding:2px 8px;border-radius:20px;margin-top:4px;">📄 1ª emissão: ${fmtDate(b.firstBilledAt || b.billedAt)}${b.billedAt && b.billedAt !== (b.firstBilledAt || b.billedAt) ? ` · Última: ${fmtDate(b.billedAt)}` : ''}</span>`
      : activeBillingSubTab === 'pagos' && b.paidAt
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#166534;background:#dcfce7;border:1px solid #bbf7d0;padding:2px 8px;border-radius:20px;margin-top:4px;">✅ Pago em: ${fmtDate(b.paidAt)}</span>`
      : '';
    return `<div class="bl-card${isPaid?' is-paid':''}${isBilled?' is-paid':''}${isDisputed?' is-disputed':''}">
      <span class="bl-badge">BL</span>
      <div class="bl-info">
        <div class="bl-number">${b.bl}${paidBadge}${discountBadge}${disputeBadge}${billedBadge}${consolidatedBadge}${agingBadge}</div>
        <div class="bl-client">${b.client||'—'}</div>
        <div class="bl-meta"><span>${billableCtrs.length} contêiner(es) c/ demurrage${ctrs.length > billableCtrs.length ? ` (${ctrs.length} total)` : ""}${totStr}</span>${tags}${more}${dateChip}</div>
      </div>
      <div class="bl-actions">
        <div class="bl-action-group bl-action-status">
          <button class="act-btn ${paidClass}" onclick="togglePaid('${b.id}')" title="${isPaid ? 'Desmarcar pagamento' : 'Marcar como pago'}">${paidLabel}</button>
          <button class="act-btn ${billedClass}" onclick="toggleBilled('${b.id}')" title="${isBilled ? 'Desmarcar fatura' : 'Marcar como faturado'}">${billedLabel}</button>
        </div>
        <div class="bl-action-divider"></div>
        <div class="bl-action-group bl-action-docs">
          <button class="act-btn invoice" onclick="${isConsolidated ? `openConsolidatedInvoiceForBL('${b.id}')` : `viewDoc('${b.id}','invoice')`}" title="${isConsolidated ? 'Visualizar Fatura Consolidada' : 'Visualizar Fatura'}">${isConsolidated ? '🔗 Fatura' : '📄 Fatura'}</button>
          <button class="act-btn receipt${isPaid ? '' : ' receipt-locked'}"
            onclick="viewDoc('${b.id}','receipt')"
            title="${isPaid ? 'Visualizar Recibo' : 'Recibo disponível apenas para faturas pagas'}"
            ${isPaid ? '' : 'style="opacity:0.38;cursor:not-allowed;"'}
          >🧾 Recibo</button>
        </div>
        <div class="bl-action-divider"></div>
        <div class="bl-action-group bl-action-meta">
          <button class="act-btn edit" onclick="openEditBL('${b.id}')" title="Editar BL">✏️</button>
          <button class="act-btn del" onclick="deleteBL('${b.id}')" aria-label="Excluir BL ${b.blNum||b.id}" title="Excluir BL">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// BL FORM
// ============================================================
function openNewBL() {
  editingId=null;
  document.getElementById('modal-bl-title').textContent='Novo BL';
  document.getElementById('save-btn-label').textContent='Criar BL';
  clearForm(); addContainerRow(); openModal('modal-bl');
  // Attach discount preview listeners
  attachDiscountListeners();
  // Attach dispute listeners
  const disputeCheckbox = document.getElementById('f-dispute-open');
  if (disputeCheckbox) disputeCheckbox.addEventListener('change', toggleDisputeDetails);
  toggleDisputeDetails();
}
function openEditBL(id) {
  const b = bls.find(x=>x.id===id); if(!b) return;
  if (b.paid) {
    alert('Esta fatura está marcada como PAGA.\nDesmarque como paga para editar os dados do BL.');
    return;
  }
  if (b.billed) {
    alert('Esta fatura está marcada como FATURADA.\nDesmarque como faturada para editar os dados do BL.');
    return;
  }
  editingId=id;
  document.getElementById('modal-bl-title').textContent='Editar BL';
  document.getElementById('save-btn-label').textContent='Atualizar';
  fillForm(b); openModal('modal-bl');
  // Attach discount preview listeners
  attachDiscountListeners();
  // Attach dispute listeners
  const disputeCheckbox = document.getElementById('f-dispute-open');
  if (disputeCheckbox) disputeCheckbox.addEventListener('change', toggleDisputeDetails);
  toggleDisputeDetails();
}
function clearForm() {
  ['f-bl','f-vessel','f-pol','f-pod','f-client','f-cnpj','f-phone','f-email','f-docnum'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-freetime').value=21;
  document.getElementById('f-roe').value='';
  document.getElementById('f-usd1').value=''; document.getElementById('f-usd1-hint').textContent='';
  document.getElementById('f-usd2').value=''; document.getElementById('f-usd2-hint').textContent='';
  document.getElementById('f-venc').value = nextBusinessDay(null);
  document.getElementById('f-docdate').value = new Date().toISOString().slice(0,10);
  document.getElementById('f-discount-type').value='';
  document.getElementById('f-discount-value').value='';
  document.getElementById('f-discount-mode').value='fixed';
  document.getElementById('f-discount-justification').value='';
  document.getElementById('f-discount-approver').value='';
  document.getElementById('discount-preview').style.display='none';
  document.getElementById('f-dispute-open').checked=false;
  document.getElementById('f-dispute-subject').value='';
  document.getElementById('f-dispute-reason').value='';
  document.getElementById('f-dispute-status').value='aberto';
  document.getElementById('f-dispute-notes').value='';
  document.getElementById('dispute-details').style.display='none';
  document.getElementById('containers-body').innerHTML='';
}
function fillForm(b) {
  document.getElementById('f-bl').value=b.bl||'';
  document.getElementById('f-vessel').value=b.vessel||'';
  document.getElementById('f-pol').value=b.pol||'';
  document.getElementById('f-pod').value=b.pod||'';
  document.getElementById('f-client').value=b.client||'';
  document.getElementById('f-cnpj').value=b.cnpj||'';
  document.getElementById('f-phone').value=b.phone||'';
  document.getElementById('f-email').value=b.email||'';
  document.getElementById('f-freetime').value=b.freeTime??21;
  document.getElementById('f-roe').value=b.roeManual ? b.roe : '';
  document.getElementById('f-usd1').value=b.ov1||'';
  document.getElementById('f-usd2').value=b.ov2||'';
  document.getElementById('f-venc').value = b.venc || nextBusinessDay(null);
  document.getElementById('f-docdate').value = b.docDate || new Date().toISOString().slice(0,10);
  document.getElementById('f-docnum').value=b.docnum||'';
  // Fill discount fields
  if (b.discount) {
    document.getElementById('f-discount-type').value=b.discount.type||'';
    document.getElementById('f-discount-value').value=b.discount.value||'';
    document.getElementById('f-discount-mode').value=b.discount.mode||'fixed';
    document.getElementById('f-discount-justification').value=b.discount.justification||'';
    document.getElementById('f-discount-approver').value=b.discount.approver||'';
  } else {
    document.getElementById('f-discount-type').value='';
    document.getElementById('f-discount-value').value='';
    document.getElementById('f-discount-mode').value='fixed';
    document.getElementById('f-discount-justification').value='';
    document.getElementById('f-discount-approver').value='';
  }
  // Fill dispute fields
  if (b.dispute && b.dispute.open) {
    document.getElementById('f-dispute-open').checked=true;
    document.getElementById('f-dispute-subject').value=b.dispute.subject||'';
    document.getElementById('f-dispute-reason').value=b.dispute.reason||'';
    document.getElementById('f-dispute-status').value=b.dispute.status||'aberto';
    document.getElementById('f-dispute-notes').value=b.dispute.notes||'';
  } else {
    document.getElementById('f-dispute-open').checked=false;
    document.getElementById('f-dispute-subject').value='';
    document.getElementById('f-dispute-reason').value='';
    document.getElementById('f-dispute-status').value='aberto';
    document.getElementById('f-dispute-notes').value='';
  }
  document.getElementById('containers-body').innerHTML='';
  (b.containers||[]).forEach(c=>addContainerRow(c));
}

function addContainerRow(c={}) {
  const tbody = document.getElementById('containers-body');
  const tr = document.createElement('tr');
  const rid = uid();
  tr.dataset.rid = rid;
  const types = [
    '20G1','22G1','20GP','20HC',           // 20 pés GP/HC
    '40G1','42G1','40GP','40HC','45G1',    // 40/45 pés GP/HC
    '20FR','20OT',                          // 20 pés FR/OT
    '40FR','40OT',                          // 40 pés FR/OT
    '20R1','20RF',                          // 20 pés Reefer
    '40R1','40RF','45R1',                   // 40/45 pés Reefer
  ];
  tr.innerHTML = `
    <td><input type="text" value="${c.container||''}" placeholder="FFAU0000000" style="width:130px" oninput="updateRow(this)"></td>
    <td><select style="width:80px" onchange="updateRow(this)">${types.map(t=>`<option value="${t}"${c.type===t?' selected':''}>${t}</option>`).join('')}</select></td>
    <td><input type="date" value="${c.discharge||''}" style="width:140px" onchange="updateRow(this)"></td>
    <td><input type="date" value="${c.emptyReturn||''}" style="width:140px" onchange="updateRow(this)"></td>
    <td class="calc-cell" data-dc>—</td>
    <td class="calc-cell" data-p1>—</td>
    <td class="calc-cell" data-p2>—</td>
    <td><button class="remove-row" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
  updateRow(tr.querySelector('input'));
}

function updateRow(el) {
  const tr = el.closest('tr');
  const ins = tr.querySelectorAll('input,select');
  const type = ins[1].value;
  const discharge = ins[2].value;
  const emptyReturn = ins[3].value;
  const dc = daysBetween(discharge, emptyReturn);
  const rate = getRate(type);
  const calc = calcUSD(dc, rate, null, null);

  const dcCell = tr.querySelector('[data-dc]');
  const p1Cell = tr.querySelector('[data-p1]');
  const p2Cell = tr.querySelector('[data-p2]');

  if (dcCell) { dcCell.textContent = dc > 0 ? dc+'d' : '—'; dcCell.className = 'calc-cell'+(dc > rate.freeUntil?' active':''); }
  if (p1Cell) { p1Cell.textContent = calc.diasP1 > 0 ? calc.diasP1+'d @ $'+calc.usdP1 : '—'; p1Cell.className = 'calc-cell'+(calc.diasP1 > 0?' active':''); }
  if (p2Cell) { p2Cell.textContent = calc.diasP2 > 0 ? calc.diasP2+'d @ $'+calc.usdP2 : '—'; p2Cell.className = 'calc-cell'+(calc.diasP2 > 0?' active':''); }

  // update hints from first row type
  const firstRow = document.querySelector('#containers-body tr');
  if (tr === firstRow && rate) {
    document.getElementById('f-usd1-hint').textContent = `Tabela: USD ${rate.p1.usd}/dia (dias ${rate.p1.range[0]}–${rate.p1.range[1]})`;
    document.getElementById('f-usd2-hint').textContent = `Tabela: USD ${rate.p2.usd}/dia (dias ${rate.p2.range[0]}+)`;
  }
}

function readContainers() {
  return Array.from(document.querySelectorAll('#containers-body tr')).map(tr => {
    const ins = tr.querySelectorAll('input,select');
    return { container: ins[0].value.trim().toUpperCase(), type: ins[1].value, discharge: ins[2].value, emptyReturn: ins[3].value };
  }).filter(c => c.container);
}

function saveBL() {
  const bl = document.getElementById('f-bl').value.trim();
  const vessel = document.getElementById('f-vessel').value.trim();
  if (!bl||!vessel) { toast('BL e Navio são obrigatórios','error'); return; }
  const cnpjVal = (s => s.length === 13 ? '0'+s : s)(document.getElementById('f-cnpj').value.replace(/\D/g,'').trim());
  if (cnpjVal && !validarCNPJ(cnpjVal)) {
    if (!confirm('O CNPJ informado parece inválido. Deseja salvar mesmo assim?')) return;
  }
  // Collect discount fields
  const discountType = document.getElementById('f-discount-type').value;
  const discountValue = parseFloat(document.getElementById('f-discount-value').value)||0;
  const discountMode = document.getElementById('f-discount-mode').value;
  const discountJustification = document.getElementById('f-discount-justification').value.trim();
  const discountApprover = document.getElementById('f-discount-approver').value.trim();

  const discount = (discountType && discountValue > 0) ? {
    type: discountType,
    value: discountValue,
    mode: discountMode,
    justification: discountJustification,
    approver: discountApprover,
    appliedAt: new Date().toISOString().slice(0,10)
  } : null;

  // Collect dispute fields
  const disputeOpen = document.getElementById('f-dispute-open').checked;
  const disputeSubject = document.getElementById('f-dispute-subject').value.trim();
  if (disputeOpen && !disputeSubject) {
    toast('O campo "Assunto do E-mail" é obrigatório para registrar uma disputa.', 'error');
    document.getElementById('f-dispute-subject').focus();
    return;
  }
  const dispute = disputeOpen ? {
    open: true,
    subject: disputeSubject,
    reason: document.getElementById('f-dispute-reason').value,
    status: document.getElementById('f-dispute-status').value,
    notes: document.getElementById('f-dispute-notes').value.trim(),
    openedAt: new Date().toISOString().slice(0,10),
    historico: []
  } : null;

  const obj = {
    id: editingId||uid(), bl, vessel,
    pol: document.getElementById('f-pol').value.trim(),
    pod: document.getElementById('f-pod').value.trim(),
    client: document.getElementById('f-client').value.trim(),
    cnpj: (s => s.length === 13 ? '0'+s : s)(document.getElementById('f-cnpj').value.replace(/\D/g,'').trim()),
    phone: document.getElementById('f-phone').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    freeTime: parseInt(document.getElementById('f-freetime').value)||21,
    roe: parseFloat(document.getElementById('f-roe').value)||null,
    roeManual: !!parseFloat(document.getElementById('f-roe').value),
    ov1: parseFloat(document.getElementById('f-usd1').value)||null,
    ov2: parseFloat(document.getElementById('f-usd2').value)||null,
    venc: document.getElementById('f-venc').value || nextBusinessDay(null),
    docDate: document.getElementById('f-docdate').value || new Date().toISOString().slice(0,10),
    docnum: (()=>{
      const manual = document.getElementById('f-docnum').value.trim();
      if (manual) return manual;
      // editing: preserve existing docnum
      if (editingId) return bls.find(x=>x.id===editingId)?.docnum || genDocnum(bl);
      // new BL: generate from BL number
      return genDocnum(bl);
    })(),
    containers: readContainers(),
    discount: discount,
    dispute: dispute,
    createdAt: editingId?(bls.find(x=>x.id===editingId)?.createdAt||Date.now()):Date.now(),
  };
  // Computa readyAt (data em que todos os containers foram devolvidos)
  obj.readyAt = computeReadyAt(obj);
  if (editingId) {
    const i=bls.findIndex(x=>x.id===editingId);
    bls[i]=obj;
    logAuditAction('edicao_bl', {blId: obj.id, bl: obj.bl, hasDiscount: !!obj.discount, hasDispute: obj.dispute?.open});
    toast('BL atualizado!','success');
  } else {
    bls.unshift(obj);
    logAuditAction('criacao_bl', {blId: obj.id, bl: obj.bl, hasDiscount: !!obj.discount});
    toast('BL criado!','success');
  }
  // FIX-QUOTA #G: salva apenas o BL criado/editado (1 write)
  saveOne(obj);
  // Auto-register client in client registry if CNPJ provided
  if (obj.cnpj) autoRegisterClient(obj.cnpj, obj.client, obj.email);
  closeModal('modal-bl'); renderList();
}

function exportReport() {
  if (!bls.length) { toast('Nenhum BL para exportar.', 'error'); return; }

  const NAVY = '1A2744', GOLD = 'F59E0B', WHITE = 'FFFFFFFF', GRAY = 'F3F4F6', GRAY2 = 'E5E7EB';

  // ── Build rows ──────────────────────────────────────────────
  const rows = [];
  bls.forEach(b => {
    const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : effectiveROE(b);
    const frozenTotal = (b.paid || b.billed) && b.frozenTotal != null ? b.frozenTotal : null;
    let blBRL = 0;

    // Only containers that generated demurrage
    const billable = (b.containers || []).filter(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      return calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD > 0;
    });

    if (!billable.length) return; // skip BLs with no demurrage at all

    billable.forEach((c, idx) => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
      const brl = calc.totalUSD * roe;
      blBRL += brl;

      // For frozen totals, distribute proportionally across containers
      const totalBRL = frozenTotal !== null
        ? (idx === billable.length - 1
            ? parseFloat((frozenTotal - (blBRL - brl)).toFixed(2))
            : parseFloat(brl.toFixed(2)))
        : parseFloat(brl.toFixed(2));

      // Calculate discount for this BL if present
      let discountAmt = 0;
      if (b.discount && b.discount.value > 0) {
        if (b.discount.mode === 'percent') {
          discountAmt = totalBRL * (b.discount.value / 100);
        } else {
          discountAmt = b.discount.value;
        }
      }
      const totalBRLWithDiscount = Math.max(0, totalBRL - discountAmt);

      rows.push({
        'Nº FATURA':      b.docnum || genDocnum(b.bl),
        'BL':             b.bl,
        'NAVIO/VIAGEM':   b.vessel || '—',
        'POL':            b.pol || '—',
        'POD':            b.pod || '—',
        'CNEE':           b.client || '—',
        'CNPJ':           b.cnpj || '—',
        'CONTAINER':      c.container,
        'TIPO':           c.type || '—',
        'DESCARGA':       c.discharge ? new Date(c.discharge+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'DEVOLUÇÃO':      c.emptyReturn ? new Date(c.emptyReturn+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'DIAS CORRIDOS':  dc,
        'FREE TIME':      b.freeTime ?? 21,
        'DIAS COBRÁVEIS': Math.max(0, dc - (b.freeTime ?? 21)),
        'DIAS 1º PER.':   calc.diasP1,
        'USD/DIA P1':     calc.usdP1,
        'DIAS 2º PER.':   calc.diasP2,
        'USD/DIA P2':     calc.usdP2,
        'TOTAL USD':      parseFloat(calc.totalUSD.toFixed(2)),
        'ROE':            parseFloat(roe.toFixed(4)),
        'TOTAL BRL':      totalBRL,
        'DESCONTO':       b.discount && b.discount.value > 0 ? `${b.discount.value}${b.discount.mode === 'percent' ? '%' : 'R$'}` : '—',
        'VALOR DESCONTO': parseFloat(discountAmt.toFixed(2)),
        'TOTAL FINAL':    parseFloat(totalBRLWithDiscount.toFixed(2)),
        'VENCIMENTO':       b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'STATUS':           b.paid ? 'PAGO' : b.billed ? 'FATURADO' : 'PENDENTE',
        'DISPUTA':          b.dispute && b.dispute.open ? b.dispute.status.toUpperCase() : '—',
        '1º FATURAMENTO':   (b.firstBilledAt || b.billedAt) ? new Date((b.firstBilledAt || b.billedAt)+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'ÚLT. FATURAMENTO': b.billedAt ? new Date(b.billedAt+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'DATA PAGAMENTO':   b.paid && b.paidAt ? new Date(b.paidAt+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'VALOR PAGO (BRL)': b.paid ? parseFloat(totalBRLWithDiscount.toFixed(2)) : '—',
      });
    });
  });

  // ── Create workbook ──────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { origin: 'A3' });

  const headers = Object.keys(rows[0]);
  const ncols = headers.length;
  const nrows = rows.length;

  // Column widths
  const colWidths = {
    'Nº FATURA':14,'BL':20,'NAVIO/VIAGEM':22,'POL':10,'POD':10,
    'CNEE':36,'CNPJ':18,'CONTAINER':14,'TIPO':7,
    'DESCARGA':12,'DEVOLUÇÃO':12,'DIAS CORRIDOS':10,'FREE TIME':8,
    'DIAS COBRÁVEIS':10,'DIAS 1º PER.':9,'USD/DIA P1':9,
    'DIAS 2º PER.':9,'USD/DIA P2':9,'TOTAL USD':11,'ROE':9,
    'TOTAL BRL':13,'DESCONTO':12,'VALOR DESCONTO':14,'TOTAL FINAL':14,'VENCIMENTO':12,
    'STATUS':12,'DISPUTA':12,'1º FATURAMENTO':16,'ÚLT. FATURAMENTO':16,'DATA PAGAMENTO':16,'VALOR PAGO (BRL)':16,
  };
  ws['!cols'] = headers.map(h => ({ wch: colWidths[h] || 12 }));

  // Helper to set cell style
  function sc(ws, addr, val, style) {
    if (!ws[addr]) ws[addr] = {};
    ws[addr].v = val;
    ws[addr].s = style;
    if (typeof val === 'number') ws[addr].t = 'n';
    else ws[addr].t = 's';
  }

  const styleTitle = { font:{bold:true,sz:13,color:{rgb:WHITE}}, fill:{fgColor:{rgb:NAVY}}, alignment:{horizontal:'center',vertical:'center'} };
  const styleSubtitle = { font:{sz:9,italic:true,color:{rgb:'374151'}}, fill:{fgColor:{rgb:'FEF3C7'}}, alignment:{horizontal:'center'} };
  const styleHdrReq = { font:{bold:true,sz:10,color:{rgb:WHITE}}, fill:{fgColor:{rgb:NAVY}}, alignment:{horizontal:'center',vertical:'center'}, border:{bottom:{style:'thin',color:{rgb:'E5E7EB'}}} };
  const styleHdrOpt = { font:{bold:true,sz:10,color:{rgb:WHITE}}, fill:{fgColor:{rgb:'374151'}}, alignment:{horizontal:'center',vertical:'center'} };
  const styleCellEven = { font:{sz:10}, fill:{fgColor:{rgb:'F0F4FF'}}, alignment:{horizontal:'center',vertical:'center'} };
  const styleCellOdd  = { font:{sz:10}, fill:{fgColor:{rgb:WHITE}},    alignment:{horizontal:'center',vertical:'center'} };
  const styleCellBRL  = (even) => ({ font:{bold:true,sz:10,color:{rgb:'15803D'}}, fill:{fgColor:{rgb: even ? 'F0FFF4' : WHITE}}, alignment:{horizontal:'right',vertical:'center'},
    numFmt: '#,##0.00' });
  const styleCellUSD  = (even) => ({ font:{sz:10,color:{rgb:'1E40AF'}}, fill:{fgColor:{rgb: even ? 'EFF6FF' : WHITE}}, alignment:{horizontal:'right',vertical:'center'},
    numFmt: '#,##0.00' });
  const styleCellROE  = (even) => ({ font:{sz:10,color:{rgb:'92400E'}}, fill:{fgColor:{rgb: even ? 'FFFBEB' : WHITE}}, alignment:{horizontal:'center',vertical:'center'},
    numFmt: '#,##0.0000' });

  // Title row (A1 merged)
  const lastColLetter = XLSX.utils.encode_col(ncols - 1);
  sc(ws, 'A1', 'TRANSHIPPING AGENCIAMENTO MARÍTIMO — Relatório de Demurrage', styleTitle);
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s:{r:0,c:0}, e:{r:0,c:ncols-1} });

  // Subtitle row (A2)
  const today = new Date().toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
  sc(ws, 'A2', `Gerado em ${cap(today)}  ·  ${bls.length} BL(s)  ·  ${rows.length} container(es)`, styleSubtitle);
  ws['!merges'].push({ s:{r:1,c:0}, e:{r:1,c:ncols-1} });

  // Style header row (row 3 = index 2)
  const optCols = new Set(['ROE','FREE TIME']);
  headers.forEach((h, ci) => {
    const addr = XLSX.utils.encode_cell({r:2, c:ci});
    ws[addr] = { v: h, t:'s', s: optCols.has(h) ? styleHdrOpt : styleHdrReq };
  });

  // Style data rows
  const brlCols = new Set(['TOTAL BRL']);
  const usdCols = new Set(['TOTAL USD','USD/DIA P1','USD/DIA P2']);
  const roeCols = new Set(['ROE']);
  rows.forEach((row, ri) => {
    const even = ri % 2 === 0;
    headers.forEach((h, ci) => {
      const addr = XLSX.utils.encode_cell({r: ri+3, c: ci});
      if (!ws[addr]) return;
      if (brlCols.has(h)) ws[addr].s = styleCellBRL(even);
      else if (usdCols.has(h)) ws[addr].s = styleCellUSD(even);
      else if (roeCols.has(h)) ws[addr].s = styleCellROE(even);
      else ws[addr].s = even ? styleCellEven : styleCellOdd;
    });
  });

  // Totals row
  const totRow = nrows + 3;
  const totStyle = { font:{bold:true,sz:10,color:{rgb:WHITE}}, fill:{fgColor:{rgb:NAVY}}, alignment:{horizontal:'center'} };
  const totBRLStyle = { font:{bold:true,sz:11,color:{rgb:'000000'}}, fill:{fgColor:{rgb:GOLD}}, alignment:{horizontal:'right'}, numFmt:'#,##0.00' };
  const totUSDStyle = { font:{bold:true,sz:11,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1E40AF'}}, alignment:{horizontal:'right'}, numFmt:'#,##0.00' };

  headers.forEach((h, ci) => {
    const addr = XLSX.utils.encode_cell({r: totRow, c: ci});
    if (h === 'CNEE') { ws[addr] = {v:'TOTAL GERAL', t:'s', s:totStyle}; }
    else if (h === 'TOTAL USD') {
      const totalUSD = rows.reduce((a,r) => a + (r['TOTAL USD']||0), 0);
      ws[addr] = {v: parseFloat(totalUSD.toFixed(2)), t:'n', s:totUSDStyle};
    }
    else if (h === 'TOTAL BRL') {
      const totalBRL = rows.reduce((a,r) => a + (r['TOTAL BRL']||0), 0);
      ws[addr] = {v: parseFloat(totalBRL.toFixed(2)), t:'n', s:totBRLStyle};
    }
    else { ws[addr] = {v:'', t:'s', s:totStyle}; }
  });

  ws['!ref'] = `A1:${XLSX.utils.encode_cell({r: totRow, c: ncols-1})}`;
  ws['!rows'] = [{hpt:28},{hpt:16},{hpt:24}];

  XLSX.utils.book_append_sheet(wb, ws, 'Demurrage');

  // File name
  const stamp = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Relatorio_Demurrage_${stamp}.xlsx`, {bookType:'xlsx', cellStyles:true});
  toast('Relatório exportado com sucesso!', 'success');
  logAuditAction('exportacao_relatorio', { tipo: 'relatorio_bls', registros: bls.length });
}

function togglePaid(id) {
  const b = bls.find(x => x.id === id);
  if (!b) return;
  if (b.paid) {
    if (!confirm('Desmarcar esta fatura como paga?\n\nOs valores congelados serão liberados para edição novamente.')) return;
    b.paid = false;
    b.paidAt = null;
    b.frozenRoe = null;
    b.frozenTotal = null;
    toast('Fatura desmarcada. Valores liberados para edição.', '');
    saveOne(b);
    renderList();
  } else {
    // Abre popup solicitando a data de pagamento
    showPaymentModal(b);
  }
}

// ── Modal de Registro de Pagamento ──────────────────────────────────────────
function showPaymentModal(b) {
  const today = new Date().toISOString().slice(0, 10);

  // Se já está Faturado, usa os valores congelados no momento do Faturado;
  // caso contrário, calcula os valores correntes (congelamento acontece agora).
  const isBilled  = !!b.billed;
  const roe   = (isBilled && b.frozenRoe   != null) ? b.frozenRoe   : effectiveROE(b);
  const total = (isBilled && b.frozenTotal != null) ? b.frozenTotal : blTotal(b, null);

  const totalFmt = (total != null)
    ? 'R$ ' + total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})
    : '—';
  const roeFmt = (roe != null)
    ? 'R$ ' + roe.toLocaleString('pt-BR', {minimumFractionDigits: 4, maximumFractionDigits: 4})
    : '—';

  // Remove overlay anterior se existir
  const existing = document.getElementById('payment-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'payment-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9100;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.28);width:420px;max-width:100%;animation:fadeIn .15s ease;">
      <div style="padding:18px 22px;border-bottom:1px solid #e5e7eb;background:#f9fafb;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">💳</span>
        <h3 style="font-size:15px;font-weight:700;margin:0;color:#111827;">Registrar Pagamento</h3>
      </div>
      <div style="padding:22px 22px 18px;">
        <div style="margin-bottom:14px;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">BL / Referência</div>
          <div style="font-size:17px;font-weight:700;color:#111827;">${b.bl || b.id}</div>
          ${b.client ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${b.client}</div>` : ''}
        </div>

        <div style="background:${isBilled ? '#f0fdf4' : '#fffbeb'};border:1px solid ${isBilled ? '#bbf7d0' : '#fde68a'};border-radius:10px;padding:14px 16px;margin-bottom:18px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${isBilled ? '#166534' : '#92400e'};margin-bottom:10px;">
            ${isBilled ? '📄 Valores congelados na emissão da fatura' : '⚡ Valores calculados agora (BL ainda não faturado)'}
          </div>
          <div style="display:flex;gap:24px;">
            <div>
              <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">ROE (USD/BRL)</div>
              <div style="font-size:13px;font-weight:600;color:#374151;">${roeFmt}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">Total a Pagar</div>
              <div style="font-size:18px;font-weight:800;color:${isBilled ? '#166534' : '#92400e'};">${totalFmt}</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom:20px;">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Data do Pagamento <span style="color:#ef4444;">*</span></label>
          <input type="date" id="payment-date-input" value="${today}"
            style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;color:#111827;">
        </div>

        <div style="display:flex;gap:10px;">
          <button id="payment-confirm-btn"
            style="flex:1;padding:11px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s;"
            onmouseover="this.style.background='#16a34a'" onmouseout="this.style.background='#22c55e'">
            ✔ Confirmar Pagamento
          </button>
          <button onclick="document.getElementById('payment-modal-overlay').remove()"
            style="padding:11px 18px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:14px;cursor:pointer;">
            Cancelar
          </button>
        </div>
      </div>
    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  document.getElementById('payment-confirm-btn').addEventListener('click', () => {
    const payDate = document.getElementById('payment-date-input').value;
    if (!payDate) { toast('Selecione uma data de pagamento.', 'error'); return; }

    b.paid       = true;
    b.paidAt     = payDate;
    b.frozenRoe   = roe;
    b.frozenTotal = total;

    logAuditAction('marcacao_pagamento', {blId: b.id, bl: b.bl, total: total, paidAt: payDate});
    toast('Fatura marcada como paga! Valores congelados. ✔', 'success');
    overlay.remove();
    // FIX-QUOTA #G: apenas 1 write (documento modificado)
    saveOne(b);
    renderList();
  });
}

// ── Confirmação Dupla Segura ──────────────────────────────────────────────
window._pendingConfirmation = null;

function showDoubleConfirmation(title, message, itemCount, onConfirm) {
  const modal = document.createElement('div');
  modal.id = 'double-confirm-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white; border-radius: 8px; padding: 24px;
    max-width: 450px; width: 90%; box-shadow: 0 20px 25px rgba(0,0,0,0.15);
  `;

  dialog.innerHTML = `
    <h2 style="margin: 0 0 12px 0; color: #dc2626; font-size: 18px;">⚠️ ${title}</h2>
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 14px; line-height: 1.5;">
      ${message}
    </p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
      <p style="margin: 0; color: #7f1d1d; font-size: 13px;">
        <strong>Quantidade:</strong> ${itemCount}
      </p>
      <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 13px;">
        <strong>Ação irreversível:</strong> Após confirmar, não há como recuperar estes dados.
      </p>
    </div>
    <label style="display: block; margin-bottom: 16px;">
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">
        Digite <strong style="color: #dc2626;">DELETAR</strong> para confirmar:
      </div>
      <input type="text" id="confirm-input" placeholder="Digite DELETAR"
        style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb;
        border-radius: 6px; font-size: 14px; box-sizing: border-box;"
        autocomplete="off">
    </label>
    <div style="display: flex; gap: 8px;">
      <button onclick="document.getElementById('double-confirm-modal').remove()"
        style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;
        background: white; color: #374151; font-weight: 600; cursor: pointer; font-size: 14px;">
        ✕ Cancelar
      </button>
      <button id="confirm-btn" disabled
        style="flex: 1; padding: 10px; border: none; border-radius: 6px;
        background: #fecaca; color: #7f1d1d; font-weight: 600; cursor: not-allowed;
        font-size: 14px; opacity: 0.5;">
        🗑️ Deletar Permanentemente
      </button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  const input = document.getElementById('confirm-input');
  const btn = document.getElementById('confirm-btn');

  input.addEventListener('input', () => {
    const isValid = input.value === 'DELETAR';
    btn.disabled = !isValid;
    btn.style.opacity = isValid ? '1' : '0.5';
    btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    btn.style.background = isValid ? '#dc2626' : '#fecaca';
    btn.style.color = isValid ? 'white' : '#7f1d1d';
  });

  btn.addEventListener('click', () => {
    if (input.value === 'DELETAR') {
      modal.remove();
      onConfirm();
    }
  });

  input.focus();
}

// ── MODAL LIMPAR BLs (Limpar Tudo + Exclusão em Massa) ─────────────────────
let _bilBulkPreview = [];

function clearAllBLs() {
  _openBilClearModal();
}

function _openBilClearModal() {
  _bilBulkPreview = [];
  const countEl = document.getElementById('bil-clear-all-count');
  if (countEl) countEl.textContent = bls.length;
  const confirmBtn = document.getElementById('bil-bulk-confirm-btn');
  if (confirmBtn) confirmBtn.disabled = true;
  const preview = document.getElementById('bil-bulk-preview');
  if (preview) preview.innerHTML = '';
  const fileInput = document.getElementById('bil-bulk-file-input');
  if (fileInput) fileInput.value = '';
  _switchBilClearTab('bil-tab-clear-all');
  openModal('modal-bil-clear');
}

function _switchBilClearTab(tabId) {
  ['bil-tab-clear-all', 'bil-tab-clear-bulk'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  ['bil-pane-clear-all', 'bil-pane-clear-bulk'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add('active');
  const paneId = tabId === 'bil-tab-clear-all' ? 'bil-pane-clear-all' : 'bil-pane-clear-bulk';
  const pane = document.getElementById(paneId);
  if (pane) pane.style.display = '';
}

function _execBilClearAll() {
  closeModal('modal-bil-clear');
  showDoubleConfirmation(
    'Excluir todos os BLs?',
    'Você está prestes a excluir permanentemente TODOS os BLs armazenados no sistema. Esta ação não pode ser desfeita.',
    bls.length,
    () => {
      const qty = bls.length;
      bls = [];
      save(bls);
      renderList();
      toast('✓ Todos os BLs foram excluídos permanentemente.', '');
      logAuditAction('exclusao_todos_bls', { quantidade: qty });
    }
  );
}

function downloadBilBulkDeleteTemplate() {
  if (typeof XLSX === 'undefined') { toast('Biblioteca XLSX não carregada.', 'error'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['BL'],
    ['HLCSSA3260012345'],
    ['MEDUA1234567'],
    ['EVERU9876543']
  ]);
  ws['!cols'] = [{ wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, 'BLs para Excluir');
  XLSX.writeFile(wb, 'modelo_exclusao_bls.xlsx');
}

function handleBilBulkDeleteFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!rows.length) { toast('Planilha vazia.', 'error'); return; }

      // Encontra coluna BL (case-insensitive)
      const header = (rows[0] || []).map(c => String(c || '').trim().toUpperCase());
      const blColIdx = header.indexOf('BL');
      if (blColIdx === -1) { toast('Coluna "BL" não encontrada na planilha.', 'error'); return; }

      const blNums = rows.slice(1)
        .map(r => String(r[blColIdx] || '').trim())
        .filter(v => v.length > 0);

      if (!blNums.length) { toast('Nenhum BL encontrado na planilha.', 'error'); return; }
      _validateBilBulkDelete(blNums);
    } catch(err) {
      toast('Erro ao ler planilha: ' + err.message, 'error');
    }
  };
  reader.readAsBinaryString(file);
}

function _validateBilBulkDelete(blNums) {
  const preview = document.getElementById('bil-bulk-preview');
  const confirmBtn = document.getElementById('bil-bulk-confirm-btn');

  // Normaliza para uppercase para comparação
  const blNumsNorm = blNums.map(n => n.toUpperCase());

  // Encontra BLs correspondentes (pelo campo bl, case-insensitive)
  const found = [];
  const notFound = [];
  blNumsNorm.forEach(num => {
    const match = bls.find(b => b.bl && b.bl.toUpperCase() === num);
    if (match) found.push(match);
    else notFound.push(num);
  });

  _bilBulkPreview = found;

  let html = '';
  if (found.length) {
    html += `<div style="margin-bottom:12px;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
      <div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:8px;">✓ ${found.length} BL(s) encontrado(s) — serão excluídos</div>
      <div style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">
        ${found.map(b => {
          const statusBadge = b.paid
            ? '<span style="background:#dcfce7;color:#166534;font-size:10px;font-weight:600;padding:1px 6px;border-radius:20px;">PAGO</span>'
            : b.billed
            ? '<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:600;padding:1px 6px;border-radius:20px;">FATURADO</span>'
            : '<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:600;padding:1px 6px;border-radius:20px;">PENDENTE</span>';
          return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid #fee2e2;">
            <span style="font-weight:600;font-family:monospace;">${b.bl || '—'}</span>
            ${statusBadge}
            <span style="color:#6b7280;font-size:11px;">${b.client || ''}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }
  if (notFound.length) {
    html += `<div style="margin-bottom:12px;padding:12px 14px;background:#f9fafb;border:1px solid #d1d5db;border-radius:8px;">
      <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:8px;">✗ ${notFound.length} BL(s) não encontrado(s) na planilha</div>
      <div style="font-size:11px;color:#9ca3af;font-family:monospace;">${notFound.join(', ')}</div>
    </div>`;
  }

  if (preview) preview.innerHTML = html || '<div style="font-size:13px;color:#6b7280;text-align:center;padding:16px;">Nenhum resultado.</div>';
  if (confirmBtn) confirmBtn.disabled = found.length === 0;
}

function executeBilBulkDelete() {
  if (!_bilBulkPreview.length) return;
  const ids = new Set(_bilBulkPreview.map(b => b.id));
  const blNums = _bilBulkPreview.map(b => b.bl);
  const snapshot = JSON.parse(JSON.stringify(bls));

  closeModal('modal-bil-clear');
  showDoubleConfirmation(
    `Excluir ${ids.size} BL(s)?`,
    `Confirme para excluir permanentemente os BLs selecionados. Esta ação não pode ser desfeita.`,
    ids.size,
    async () => {
      try {
        bls = bls.filter(b => !ids.has(b.id));
        save(bls);
        renderList();
        toast(`✓ ${ids.size} BL(s) excluído(s) com sucesso.`, 'success');
        logAuditAction('exclusao_em_massa_bls', {
          quantidade: ids.size,
          bls: blNums
        });
      } catch(err) {
        console.error('[BIL-BULK-DELETE]', err);
        bls = snapshot;
        save(bls);
        renderList();
        toast('Erro ao excluir BLs. Dados restaurados.', 'error');
      }
    }
  );
}

function toggleBilled(id) {
  const b = bls.find(x => x.id === id);
  if (!b) return;
  if (b.billed) {
    // Caso especial: BL pertence a uma fatura CONSOLIDADA (docnum DEMC- compartilhado).
    // Desfazer apenas este BL deixaria o grupo inconsistente, então desfaz o grupo INTEIRO.
    const consDocnum = b.consolidatedDocnum
      || (typeof isConsolidatedDocnum === 'function' && isConsolidatedDocnum(b.docnum) ? b.docnum : null);
    if (consDocnum) {
      const group = bls.filter(x =>
        x.consolidatedDocnum === consDocnum
        || (x.docnum === consDocnum && (typeof isConsolidatedDocnum === 'function' && isConsolidatedDocnum(x.docnum)))
      );
      if (!confirm(
        `Esta fatura é CONSOLIDADA (${consDocnum}) e cobre ${group.length} BLs.\n\n` +
        `Desmarcar irá desfazer a fatura para TODOS os ${group.length} BLs do grupo.\n` +
        `Deseja continuar?`
      )) return;
      const newVenc = nextBusinessDay(null);
      group.forEach(g => {
        if (!g.firstBilledAt && g.billedAt) g.firstBilledAt = g.billedAt;
        g.billed = false;
        g.billedAt = null;
        g.frozenRoe = null;
        g.frozenTotal = null;
        g.venc = newVenc;
        // Restaura docnum individual (gera novo a partir do BL).
        g.docnum = genDocnum(g.bl);
        // Limpa metadados do grupo consolidado.
        delete g.consolidatedDocnum;
        delete g.consolidatedGroupId;
        delete g.consolidatedAt;
        delete g.consolidatedTotal;
        delete g.consolidatedBLIds;
        saveOne(g);
      });
      logAuditAction('reversao_fatura_consolidada', {
        docnum: consDocnum, qtd: group.length, blIds: group.map(g => g.id), newVenc
      });
      renderList();
      toast(`Fatura consolidada ${consDocnum} desfeita (${group.length} BLs). 📅`, '');
      return;
    }
    if (!confirm('Desmarcar esta fatura como "Faturado"?\nAs informações serão descongeladas.')) return;
    // Backfill: garante que firstBilledAt existe ANTES de zerar billedAt.
    // Cobre BLs que foram faturados antes desta funcionalidade existir.
    if (!b.firstBilledAt && b.billedAt) b.firstBilledAt = b.billedAt;
    b.billed = false;
    b.billedAt = null;   // limpa último faturamento; firstBilledAt permanece intacto
    b.frozenRoe = null;
    b.frozenTotal = null;
    // Recalcula vencimento: próximo dia útil a partir de hoje (regra de negócio)
    const newVenc = nextBusinessDay(null);
    b.venc = newVenc;
    logAuditAction('reversao_fatura', {blId: id, bl: b.bl, newVenc: newVenc});
    toast(`Status "Faturado" removido. Novo vencimento: ${newVenc.split('-').reverse().join('/')} 📅`, '');
  } else {
    const roe = effectiveROE(b);
    const total = blTotal(b, null);
    const today = new Date().toISOString().slice(0,10);
    b.billed = true;
    b.billedAt = today;                          // data do ÚLTIMO faturamento (sempre atualiza)
    if (!b.firstBilledAt) b.firstBilledAt = today; // data do 1º faturamento (só define uma vez)
    b.frozenRoe = roe;
    b.frozenTotal = total;
    logAuditAction('marcacao_fatura', {blId: id, bl: b.bl, total: total, firstBilledAt: b.firstBilledAt});
    toast('Fatura marcada como Faturada! Valores congelados. 📄', 'success');
  }
  // FIX-QUOTA #G: apenas 1 write (documento modificado)
  saveOne(b);
  renderList();
}

function deleteBL(id) {
  if (!confirm('Excluir este BL?')) return;
  const bl = bls.find(x=>x.id===id);
  logAuditAction('exclusao_bl', {blId: id, bl: bl?.bl});
  bls = bls.filter(x=>x.id!==id);
  // FIX-QUOTA #G: deleta apenas o doc específico (1 delete) em vez de diff de toda a coleção
  deleteBLById(id);
  renderList();
  toast('BL excluído.');
}

// ============================================================
// IMPORT
// ============================================================
function openImport() {
  importData=null;
  document.getElementById('import-btn').disabled=true;
  document.getElementById('file-input').value='';
  document.getElementById('drop-zone').innerHTML=`<div class="drop-icon">⬆️</div><p><strong>Arraste ou selecione uma planilha</strong></p><p>(.xlsx, .xls, .csv)</p>`;
  openModal('modal-import');
}
function handleDrop(e) { e.preventDefault(); document.getElementById('drop-zone').classList.remove('drag'); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }
function handleFileInput(e) { if(e.target.files[0]) processFile(e.target.files[0]); }
function processFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    importData=rows;
    document.getElementById('import-btn').disabled=false;
    document.getElementById('drop-zone').innerHTML=`<div class="drop-icon">✅</div><p><strong>${file.name}</strong></p><p>${rows.length} linha(s) encontrada(s)</p>`;
    toast(`${rows.length} linha(s) lidas.`,'success');
  };
  reader.readAsArrayBuffer(file);
}
function doImport() {
  if(!importData) return;
  const grouped = {};
  importData.forEach(row => {
    const n = {}; Object.entries(row).forEach(([k,v])=>{ n[nk(k)]=v; });
    const blNum = String(n['BL']||n['B_L']||'').trim(); if(!blNum) return;
    if (!grouped[blNum]) {
      grouped[blNum] = { id:uid(), bl:blNum, vessel:String(n['VESSEL']||n['NAVIO']||'').trim(), pol:String(n['POL']||'').trim(), pod:String(n['POD']||'').trim(), client:String(n['CNEE']||n['CLIENTE']||'').trim(), cnpj:(s => s.length === 13 ? '0'+s : s)(String(n['CNPJ']||'').replace(/\D/g,'').trim()), phone:String(n['PHONE']||n['TELEFONE']||'').trim(), email:String(n['EMAIL']||n['E_MAIL']||'').trim(), freeTime:parseInt(n['FREE_TIME']||n['FREETIME']||21)||21, roe:parseFloat(n['ROE'])||null, ov1:null, ov2:null, venc:parseDs(n['VENCIMENTO']||n['VENC']||'')||nextBusinessDay(null), docnum:String(n['DOCNUM']||'').trim()||genDocnum(blNum), containers:[], createdAt:Date.now() };
    }
    const container = String(n['CONTAINER']||n['CTR']||'').trim().toUpperCase();
    if (container) grouped[blNum].containers.push({ container, type:String(n['TYPE']||n['TIPO']||'40G1').trim(), discharge:parseDs(n['DISCHARGE']||n['DESCARGA']||''), emptyReturn:parseDs(n['EMPTY_RETURN']||n['EMPTY RETURN']||n['RETORNO']||'') });
  });
  let added=0, updated=0;
  Object.values(grouped).forEach(imp => {
    imp.readyAt = computeReadyAt(imp);
    const i=bls.findIndex(x=>x.bl===imp.bl);
    if(i>=0){bls[i]={...bls[i],...imp};updated++;}else{bls.unshift(imp);added++;}
  });
  save(bls); closeModal('modal-import'); renderList();
  toast(`Importado: ${added} novo(s), ${updated} atualizado(s).`,'success');
  logAuditAction('importacao_planilha', { adicionados: added, atualizados: updated });
}

// ============================================================
// DOCUMENT
// ============================================================
function viewDoc(id, type) {
  const b=bls.find(x=>x.id===id); if(!b) return;
  // ── Regra de negócio: recibo apenas para faturas PAGAS ──────
  if (type === 'receipt' && !b.paid) {
    toast('Recibo disponível apenas para faturas pagas.', 'error');
    return;
  }
  currentBL=b; currentType=type; ovTotal=null; ovRoe=null;
  // Show/hide email button based on BL email or client registry
  const emailBtn = document.getElementById('email-btn');
  if (emailBtn) emailBtn.style.display = getEmailsForBL(b).length > 0 ? '' : 'none';
  // Show/hide edit button based on paid status
  setTimeout(() => {
    const btn = document.getElementById('edit-val-btn');
    if (btn) {
      if (b.paid || b.billed) {
        btn.textContent = '🔒 Valores Congelados';
        btn.style.color = b.billed ? 'var(--navy)' : 'var(--green)';
        btn.style.borderColor = b.billed ? '#93c5fd' : '#bbf7d0';
        btn.style.cursor = 'default';
      } else {
        btn.textContent = '✏️ Editar Valor';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.cursor = '';
      }
    }
  }, 0);
  renderDoc(b,type);
  document.getElementById('app').style.display='none';
  document.getElementById('doc-view').classList.add('active');
  window.scrollTo(0,0);
}
function printDoc() {
  if (currentBL) {
    const docnum = currentDocnum || currentBL.docnum || ('DEM-' + new Date().getFullYear() + '-0000');
    const primeiroNome = (currentBL.client || '').trim().split(/\s+/)[0] || 'CLIENTE';
    const bl = currentBL.bl || 'BL';
    const tipo = currentType === 'invoice' ? 'FATURA DEMURRAGE' : 'RECIBO DEMURRAGE';
    const nomeArquivo = `${docnum} ${tipo} ${primeiroNome} ${bl}`;
    const oldTitle = document.title;
    document.title = nomeArquivo;
    window.print();
    setTimeout(() => { document.title = oldTitle; }, 1000);
  } else {
    window.print();
  }
}

// ── PIX BRCode (EMV) payload builder ──────────────────────────────────────
function pixCRC16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function pixTLV(id, value) {
  return id + String(value.length).padStart(2, '0') + value;
}

function buildPixPayload(chavePix, nomeBeneficiario, cidade, valor, txid) {
  // Remove non-alphanumeric from name/city (PIX spec)
  const nome = nomeBeneficiario.substring(0, 25).replace(/[^A-Za-z0-9 ]/g, '').trim();
  const cid  = cidade.substring(0, 15).replace(/[^A-Za-z0-9 ]/g, '').trim();
  const chave = chavePix.replace(/[^0-9]/g, ''); // only digits for CNPJ
  const tid = (txid || '').replace(/[^A-Za-z0-9]/g, '').substring(0, 35) || '***';

  // GUI = br.gov.bcb.pix, KEY = chave, TXID = tid
  const merchantAccountInfo =
    pixTLV('00', 'br.gov.bcb.pix') +
    pixTLV('01', chave) +
    pixTLV('05', tid);  // txid

  const valorStr = valor > 0 ? valor.toFixed(2) : '';

  let payload =
    pixTLV('00', '01') +                          // payload format indicator
    pixTLV('26', merchantAccountInfo) +            // merchant account info
    pixTLV('52', '0000') +                         // MCC
    pixTLV('53', '986') +                          // BRL
    (valorStr ? pixTLV('54', valorStr) : '') +     // transaction amount
    pixTLV('58', 'BR') +                           // country
    pixTLV('59', nome) +                            // merchant name
    pixTLV('60', cid) +                             // merchant city
    pixTLV('62', pixTLV('05', tid)) +              // additional data
    '6304';                                         // CRC placeholder

  return payload + pixCRC16(payload);
}

function sendInvoiceEmail() {
  if (!currentBL) return;
  const b = currentBL;
  const docnum = currentDocnum || b.docnum || genDocnum(b.bl);
  const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : effectiveROE(b);

  // Calc total
  let totalBRL = 0;
  (b.containers || []).forEach(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
    totalBRL += calc.totalUSD * roe;
  });
  if ((b.paid || b.billed) && b.frozenTotal != null) totalBRL = b.frozenTotal;

  const to = encodeURIComponent(getEmailsForBL(b).join(', ') || b.email || '');
  const subject = encodeURIComponent(`${docnum} - Fatura de Demurrage - BL ${b.bl}`);

  const vencFmt = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const totalFmt = totalBRL.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

  const body = encodeURIComponent(
`Prezado(a) ${(b.client||'').split(' ')[0] || 'Cliente'},

Encaminhamos em anexo a Fatura de Sobreestadia de Container referente ao BL abaixo:

  Nº Fatura : ${docnum}
  BL         : ${b.bl}
  Navio/Voy  : ${b.vessel || '—'}
  Container(s): ${(b.containers||[]).filter(c => { const dc = daysBetween(c.discharge, c.emptyReturn); return calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD > 0; }).map(c=>c.container).join(', ')}
  Total      : R$ ${totalFmt}
  Vencimento : ${vencFmt}

Para pagamento via PIX, utilize a chave: 06.352.972/0001-21 (CNPJ)


Atenciosamente,
TRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.
CNPJ: 06.352.972/0001-21`
  );

  logAuditAction('envio_email', { bl: b.bl, blId: b.id, docnum });
  window.location.href = `mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${body}`;
}

function closeDoc() {
  document.getElementById('doc-view').classList.remove('active');
  document.getElementById('app').style.display='';
  currentBL=null; ovTotal=null; ovRoe=null;
}
function openEditValue() {
  if(!currentBL) return;
  if (currentBL.paid) {
    alert('Esta fatura está marcada como PAGA.\nOs valores estão congelados e não podem ser alterados.\nDesmarque como paga para editar.');
    return;
  }
  if (currentBL.billed) {
    alert('Esta fatura está marcada como FATURADA.\nOs valores estão congelados e não podem ser alterados.\nDesmarque como faturada para editar.');
    return;
  }
  document.getElementById('edit-val-input').value=(ovTotal!==null?ovTotal:blTotal(currentBL,ovRoe)).toFixed(2);
  document.getElementById('edit-roe-input').value=ovRoe!==null?ovRoe:(currentBL.roe||effectiveROE(currentBL)||'');
  openModal('modal-editval');
}
function applyEditVal() {
  ovTotal=parseFloat(document.getElementById('edit-val-input').value)||0;
  ovRoe=parseFloat(document.getElementById('edit-roe-input').value)||null;
  closeModal('modal-editval');
  if(currentBL&&currentType) renderDoc(currentBL,currentType);
}

function renderDoc(b, type) {
  const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : (ovRoe!==null?ovRoe:effectiveROE(b));
  if (!roe) {
    alert('⚠ PTAX não disponível.\n\nNão é possível gerar o documento sem a PTAX oficial do Banco Central.\n\nAguarde o carregamento da cotação ou clique em "↻ Tentar novamente" no topo da tela.');
    return;
  }
  const docnum = b.docnum || genDocnum(b.bl);
  currentDocnum = docnum;
  const isInv = type==='invoice';
  let totalBRL = 0;

  const rows = (b.containers||[]).map(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
    const brl = calc.totalUSD * roe;
    totalBRL += brl;
    return {c, calc, brl};
  }).filter(({calc}) => calc.totalUSD > 0);

  if ((b.paid || b.billed) && b.frozenTotal != null) totalBRL = b.frozenTotal;
  else if (ovTotal !== null) totalBRL = ovTotal;

  // ── Apply discount (only when not frozen — frozen already includes it) ──
  const subtotalBRL = totalBRL;
  let discountAmt = 0;
  const hasDiscount = b.discount && b.discount.value > 0 && !((b.paid || b.billed) && b.frozenTotal != null) && ovTotal === null;
  if (hasDiscount) {
    if (b.discount.mode === 'percent') {
      discountAmt = subtotalBRL * (b.discount.value / 100);
    } else {
      discountAmt = b.discount.value;
    }
    totalBRL = Math.max(0, subtotalBRL - discountAmt);
  }

  // Pré-gera payload PIX para uso no template HTML (copia e cola) e no QR Code
  const pixPayload = isInv
    ? buildPixPayload('06352972000121', 'TRANSHIPPING AGENC MARITIMO', 'VIT', parseFloat(totalBRL.toFixed(2)), docnum)
    : '';

  const colspan = isInv ? 8 : 7;
  const colsI = `<th>CONTAINER</th><th>TIPO</th><th>DIAS 1º PER.</th><th>USD/Dia</th><th>DIAS 2º PER.</th><th>USD/Dia</th><th>DESCARGA</th><th>RETORNO</th><th>LÍQUIDO</th>`;
  const colsR = `<th>CONTAINER</th><th>TIPO</th><th>DIAS 1º PER.</th><th>USD/Dia</th><th>DIAS 2º PER.</th><th>USD/Dia</th><th>DESCARGA</th><th>LÍQUIDO</th>`;

  const rowsHTML = rows.map(({c,calc,brl}) => `
    <tr>
      <td>${c.container}</td>
      <td>${c.type||'—'}</td>
      <td>${calc.diasP1||0}</td>
      <td>${calc.usdP1.toFixed(2)}</td>
      <td>${calc.diasP2||0}</td>
      <td>${calc.usdP2.toFixed(2)}</td>
      <td>${fmtDate(c.discharge)}</td>
      ${isInv?`<td>${fmtDate(c.emptyReturn)}</td>`:''}
      <td style="font-weight:600">${fmtBRL(brl)}</td>
    </tr>`).join('');

  const totalCols = isInv ? 9 : 8;
  // Garante vencimento — apenas atribui no objeto local (b já é referência a bls[idx])
  // FIX-QUOTA #K: sem write aqui. renderDoc é puro — só lê/renderiza.
  // Startup migration garante venc em todos os BLs antes de qualquer renderização.
  if (!b.venc) b.venc = nextBusinessDay(null);
  const vencRow = isInv ? `<tr class="inv-venc-row"><td colspan="${totalCols-1}" style="text-align:right;padding:7px 12px;font-weight:600">VENCIMENTO DIA</td><td class="inv-venc-highlight">${fmtDate(b.venc)||'—'}</td></tr>` : '';

  document.getElementById('doc-content').innerHTML = `
  <div class="invoice">
    <div class="inv-header">
      <div class="inv-logo-area">
        <img src="data:image/png;base64,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" alt="Transhipping" style="height:56px;width:auto;object-fit:contain;">
      </div>
      <div class="inv-num">Nº ${docnum}</div>
    </div>
    <div class="inv-title">${isInv?'FATURA DE SOBREESTADIA DE CONTAINER':'RECIBO'}</div>
    <hr class="inv-hr">
    <div class="inv-row"><span class="inv-lbl">Cliente:</span><span class="inv-val">${b.client||'—'}${b.cnpj?'<br>CNPJ: '+b.cnpj:''}</span></div>
    <hr class="inv-hr-light">
    <div class="inv-row"><span class="inv-lbl">BL</span><span class="inv-val">${b.bl}</span></div>
    <div class="inv-row"><span class="inv-lbl">Container(s)</span><span class="inv-val">${rows.map(({c})=>c.container).join(', ')}</span></div>
    <div class="inv-row"><span class="inv-lbl">Navio/Voy:</span><span class="inv-val">${b.vessel||'—'}</span></div>
    <div class="inv-row"><span class="inv-lbl">From:</span><span class="inv-val">${b.pol||'—'}</span></div>
    <div class="inv-row"><span class="inv-lbl">To:</span><span class="inv-val">${b.pod||'—'}</span></div>

    <div style="display:flex;justify-content:flex-end;margin-bottom:0;">
      <div class="roe-box" style="min-width:160px;"><span>ROE</span><span>${roe.toFixed(4).replace('.',',')}</span></div>
    </div>
    <table class="inv-tbl">
      <thead><tr>${isInv?colsI:colsR}</tr></thead>
      <tbody>
        ${rowsHTML}
        ${hasDiscount ? `
        <tr class="inv-total-row" style="opacity:.7;">
          <td colspan="${totalCols-1}" class="inv-total-lbl">SUBTOTAL:</td>
          <td class="inv-total-val">${fmtBRL(subtotalBRL)}</td>
        </tr>
        <tr style="background:#f0fdf4;">
          <td colspan="${totalCols-1}" style="text-align:right;padding:6px 12px;font-weight:600;color:#15803d;">
            DESCONTO (${b.discount.mode === 'percent' ? b.discount.value + '%' : 'R$ ' + b.discount.value.toLocaleString('pt-BR',{minimumFractionDigits:2})}):
          </td>
          <td style="padding:6px 12px;font-weight:700;color:#15803d;text-align:right;">- ${fmtBRL(discountAmt)}</td>
        </tr>` : ''}
        <tr class="inv-total-row">
          <td colspan="${totalCols-1}" class="inv-total-lbl">${hasDiscount ? 'TOTAL FINAL:' : 'TOTAL:'}</td>
          <td class="inv-total-val">${fmtBRL(totalBRL)}</td>
        </tr>
        ${vencRow}
      </tbody>
    </table>
    ${isInv ? `<div class="inv-pix">
      <div class="inv-pix-qr" id="pix-qr-${docnum}"></div>
      <div class="inv-pix-info">
        <strong>Pagamento via PIX</strong>
        Escaneie o QR Code ao lado ou utilize o código Pix Copia e Cola abaixo para realizar o pagamento.<br>
        Valor da fatura: <strong>${fmtBRL(totalBRL)}</strong>
        <div class="inv-pix-copiacola">
          <span class="inv-pix-copiacola-label">Pix Copia e Cola</span>
          <span class="inv-pix-copiacola-code">${pixPayload}</span>
        </div>
      </div>
    </div>` : ''}
    <div class="inv-date">Vitória, ${cap(b.docDate ? new Date(b.docDate+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : longDate())}</div>
  </div>`;

  // Generate PIX QR Code only for invoices (reuses pixPayload already built above)
  if (isInv) {
    setTimeout(() => {
      const qrEl = document.getElementById('pix-qr-' + docnum);
      if (qrEl && typeof QRCode !== 'undefined') {
        qrEl.innerHTML = '';
        new QRCode(qrEl, {
          text: pixPayload,
          width: 100,
          height: 100,
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }, 100);
  }
}

