// ============================================================
// tracking.js — Módulo de Rastreamento de Containers
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Dependências (carregadas antes via <script src>):
//   utils.js   — toast, openModal, closeModal, fmtDate, parseDs
//   rates.js   — getRate, calcUSD, daysBetween
//   billing.js — effectiveROE (acesso via window._dmStore)
// Lê dados via window._dmStore.trk (preenchido por db.js).
// ============================================================

// ============================================================
// TRACKING MODULE
// ============================================================
// ── STORAGE: Containers (Firestore via window._dmStore) ───────────────────
// FIX #2: cópia profunda — mesma razão que load()
function trkLoad() { return JSON.parse(JSON.stringify((window._dmStore && window._dmStore.trk) || [])); }
function trkSave(d) {
  if (window._dmFireSave) window._dmFireSave('trk', d);
  else if (window._dmStore) window._dmStore.trk = d;
}
let trkData = (() => {
  const raw = trkLoad();
  const clean = raw.filter(r => {
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      const ft   = r.freeTime || 21;
      if (used !== null && used <= ft) return false;
    }
    return true;
  });
  if (clean.length < raw.length) trkSave(clean);
  return clean;
})();
let trkImportRaw = null;

function trkParseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0,10);
  if (typeof val === 'number') {
    // Excel serial
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0,10);
  }
  const s = String(val).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m1) {
    const y = m1[3].length === 2 ? '20'+m1[3] : m1[3];
    return `${y}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  }
  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[0];
  return null;
}

function trkFmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d+'T12:00:00');
  return dt.toLocaleDateString('pt-BR');
}

function trkAddDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr+'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

function trkDaysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  return Math.round((new Date(d2+'T12:00:00') - new Date(d1+'T12:00:00')) / 86400000);
}

function trkDaysElapsed(discharge) {
  if (!discharge) return null;
  const today = new Date(); today.setHours(12,0,0,0);
  return Math.round((today - new Date(discharge+'T12:00:00')) / 86400000);
}

function trkStatus(row) {
  const ft = row.freeTime || 21;
  if (row.emptyReturn) {
    // Container devolvido — verificar se gerou demurrage
    const usedDays = trkDaysBetween(row.discharge, row.emptyReturn);
    return usedDays !== null && usedDays > ft ? 'dd_returned' : 'returned';
  }
  // Ainda não devolvido
  const elapsed = trkDaysElapsed(row.discharge);
  if (elapsed === null) return 'none';
  const daysOver = elapsed - ft;
  if (daysOver > 0) return 'dd_open';        // gerando demurrage
  if (daysOver >= -1) return 'grace';         // vence hoje ou amanhã
  return 'free';
}

function trkNk(k) { return String(k).trim().toUpperCase().replace(/\s+/g,'_'); }

function openTrkImport() {
  trkImportRaw = null;
  document.getElementById('trk-import-btn').disabled = true;
  document.getElementById('trk-file-input').value = '';
  document.getElementById('trk-drop-zone').innerHTML = '<div class="drop-icon">⬆️</div><p><strong>Arraste ou selecione uma planilha</strong></p><p>(.xlsx, .xls, .csv)</p>';
  openModal('modal-trk-import');
}

function handleTrkDrop(e) {
  e.preventDefault();
  document.getElementById('trk-drop-zone').classList.remove('drag');
  if (e.dataTransfer.files[0]) processTrkFile(e.dataTransfer.files[0]);
}
function handleTrkFile(e) { if (e.target.files[0]) processTrkFile(e.target.files[0]); }

function processTrkFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array', cellDates:false});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {defval:''});
    trkImportRaw = rows;
    document.getElementById('trk-import-btn').disabled = false;
    document.getElementById('trk-drop-zone').innerHTML = `<div class="drop-icon">✅</div><p><strong>${file.name}</strong></p><p>${rows.length} linha(s) encontrada(s)</p>`;
    toast(`${rows.length} linha(s) lidas.`, 'success');
  };
  reader.readAsArrayBuffer(file);
}

function doTrkImport() {
  if (!trkImportRaw) return;
  const parsed = trkImportRaw.map(row => {
    const n = {};
    Object.entries(row).forEach(([k,v]) => { n[trkNk(k)] = v; });
    const discharge = trkParseDate(n['DISCHARGE_DATE'] || n['DISCHARGE'] || n['DATA_DESCARGA'] || '');
    const freeTime  = parseInt(n['FREE_TIME'] || n['FREE TIME'] || 21) || 21;
    const emptyReturnRaw = trkParseDate(n['EMPTY_RETURN'] || n['EMPTY RETURN'] || n['DEVOLUCAO'] || '');
    // Deadline = discharge + freeTime
    const deadline  = trkParseDate(n['DEADLINE_FREE_TIME'] || n['DEADLINE FREE TIME'] || '') || trkAddDays(discharge, freeTime);
    // Use days = days between discharge and emptyReturn (or elapsed since discharge if no return)
    const useDaysRaw = n['USE_DAYS'] || n['USE DAYS'] || '';
    const useDays = useDaysRaw !== '' ? parseInt(useDaysRaw) : (emptyReturnRaw ? trkDaysBetween(discharge, emptyReturnRaw) : null);
    return {
      container:   String(n['CONTAINER'] || n['CTR'] || '').trim().toUpperCase(),
      bl:          String(n['BL'] || n['B/L'] || n['B_L'] || '').trim(),
      cnee:        String(n['CNEE'] || n['CLIENTE'] || '').trim(),
      type:        String(n['TYPE'] || n['TIPO'] || '').trim(),
      pol:         String(n['POL'] || '').trim(),
      pod:         String(n['POD'] || '').trim(),
      vessel:      String(n['VESSEL'] || n['NAVIO'] || '').trim(),
      discharge,
      deadline,
      emptyReturn: emptyReturnRaw,
      useDays,
      freeTime,
      cnpj:        (s => s.length === 13 ? '0'+s : s)(String(n['CNPJ'] || '').replace(/\D/g,'').trim()),
    };
  });
  let skippedFt = 0;
  const imported = parsed.filter(r => {
    if (!r.container) return false;
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      const ft   = r.freeTime || 21;
      if (used !== null && used <= ft) { skippedFt++; return false; }
    }
    return true;
  });

  let added = 0, updated = 0;
  imported.forEach(imp => {
    const idx = trkData.findIndex(x => x.container === imp.container && x.bl === imp.bl);
    if (idx >= 0) { trkData[idx] = imp; updated++; }
    else { trkData.push(imp); added++; }
  });
  trkSave(trkData);

  // Match imported CNPJs with client registry + update billing BLs
  let clientsLinked = 0;
  let blsModified = false;
  // Group cnpj by BL number (take first valid cnpj per BL)
  const cnpjByBL = {};
  imported.forEach(imp => {
    if (imp.cnpj && imp.cnpj.length === 14 && !cnpjByBL[imp.bl]) {
      cnpjByBL[imp.bl] = imp.cnpj;
    }
  });

  Object.entries(cnpjByBL).forEach(([blNum, cnpj]) => {
    // Update client registry
    const cnee = (imported.find(i => i.bl === blNum) || {}).cnee || '';
    const client = getClientByCnpj(cnpj);
    if (client) {
      syncBLEmails(cnpj, client.emails);
      clientsLinked++;
    } else if (cnee) {
      upsertClient(cnpj, cnee, []);
    }

    // Update CNPJ + email on any existing billing BL with same BL number
    bls.forEach(b => {
      if (b.bl === blNum && !b.cnpj) {
        b.cnpj = cnpj;
        const clientRec = getClientByCnpj(cnpj);
        if (clientRec) {
          if (!b.email) b.email = (clientRec.emails || []).join(', ');
          if (!b.client || b.client === b.cnee) b.client = clientRec.name || b.client;
        }
        blsModified = true;
      }
    });
  });
  // FIX-QUOTA #F: não chama save(bls) aqui — checkAndMigrateBLs pode modificar bls
  // também; fazemos UMA save unificada depois (conteúdo diff vai ignorar se nada mudou)

  closeModal('modal-trk-import');
  const migrated = checkAndMigrateBLs(); // pode adicionar BLs ao array `bls`
  renderTracking();
  // FIX-QUOTA #F: save unificado — 1 write batch para bls (em vez de 2 separados)
  // O diff de conteúdo em _dmFireSave vai ignorar BLs que não mudaram
  if (blsModified || migrated > 0) save(bls);

  let msg = `Importado: ${added} novo(s), ${updated} atualizado(s)${skippedFt > 0 ? `, ${skippedFt} ignorado(s) (devolvidos no free time)` : ''}.`;
  if (migrated > 0) msg += ` ${migrated} BL(s) migrado(s) para Faturamento!`;
  if (clientsLinked > 0) msg += ` ${clientsLinked} CNPJ(s) vinculado(s) a clientes.`;
  toast(msg, 'success');
}

function checkAndMigrateBLs() {
  // Group trkData by BL
  const byBL = {};
  trkData.forEach(r => {
    if (!r.bl) return;
    if (!byBL[r.bl]) byBL[r.bl] = [];
    byBL[r.bl].push(r);
  });

  let migrated = 0;

  Object.entries(byBL).forEach(([blNum, containers]) => {
    // Condition 1: ALL containers must be returned
    const allReturned = containers.every(c => !!c.emptyReturn);
    if (!allReturned) return;

    // Condition 2: at least one container generated demurrage
    const hasDemurrage = containers.some(c => trkStatus(c) === 'dd_returned');
    if (!hasDemurrage) return;

    // Check if already migrated (BL already exists in billing module)
    const alreadyExists = bls.some(b => b.bl === blNum);
    if (alreadyExists) return;

    // Build the BL object for billing module
    const first = containers[0];

    // Resolve CNPJ from any container in this BL
    const cnpjRaw = (containers.find(c => c.cnpj && c.cnpj.length === 14) || {}).cnpj || '';

    // Resolve email and client name from client registry
    let resolvedEmail  = '';
    let resolvedClient = first.cnee || '';
    if (cnpjRaw) {
      const clientRec = getClientByCnpj(cnpjRaw);
      if (clientRec) {
        resolvedEmail  = (clientRec.emails || []).join(', ');
        resolvedClient = clientRec.name  || resolvedClient;
      }
    }

    const blObj = {
      id: uid(),
      bl: blNum,
      vessel: first.vessel || '',
      pol: first.pol || '',
      pod: first.pod || '',
      client: resolvedClient,
      cnee: first.cnee || '',
      cnpj: cnpjRaw,
      phone: '',
      email: resolvedEmail,
      freeTime: first.freeTime || 21,
      roe: null,
      roeManual: false,
      ov1: null,
      ov2: null,
      venc: nextBusinessDay(null),
      docnum: genDocnum(blNum),
      migratedFromTracking: true,
      migratedAt: new Date().toISOString().slice(0,10),
      containers: containers.map(c => ({
        container: c.container,
        type: c.type || '40G1',
        discharge: c.discharge || '',
        emptyReturn: c.emptyReturn || '',
      })),
      createdAt: Date.now(),
    };

    bls.unshift(blObj);
    migrated++;
  });

  // FIX-QUOTA #F: save removido daqui — chamador (doTrkImport) faz save unificado
  return migrated;
}

function renderTracking() {
  const q = (document.getElementById('trk-search')?.value || '').toLowerCase();
  const sf = document.getElementById('trk-filter-status')?.value || 'all';
  const today = new Date(); today.setHours(12,0,0,0);

  // Column filters
  const tfVal = id => (document.getElementById(id)?.value || '').toLowerCase().trim();
  const tf = {
    container: tfVal('tf-container'),
    bl:        tfVal('tf-bl'),
    cnee:      tfVal('tf-cnee'),
    type:      tfVal('tf-type'),
    pol:       tfVal('tf-pol'),
    pod:       tfVal('tf-pod'),
    vessel:    tfVal('tf-vessel'),
    discharge: tfVal('tf-discharge'),
    deadline:  tfVal('tf-deadline'),
    return:    tfVal('tf-return'),
    usedays:   tfVal('tf-usedays'),
    freetime:  tfVal('tf-freetime'),
    dias:      tfVal('tf-dias'),
    status:    tfVal('tf-status'),
  };

  const filtered = trkData.filter(r => {
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      if (used !== null && used <= (r.freeTime || 21)) return false;
    }
    const status = trkStatus(r);
    const elapsed = trkDaysElapsed(r.discharge);
    const ft = r.freeTime || 21;
    const useDays = r.useDays !== null && r.useDays !== undefined
      ? r.useDays
      : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : (elapsed !== null ? elapsed : null));
    const diasCorridos = r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed;

    const matchQ = !q || [r.container,r.bl,r.cnee,r.vessel].join(' ').toLowerCase().includes(q);
    const matchS = sf === 'all' || status === sf;
    const matchCols =
      (!tf.container || (r.container||'').toLowerCase().includes(tf.container)) &&
      (!tf.bl        || (r.bl||'').toLowerCase().includes(tf.bl)) &&
      (!tf.cnee      || (r.cnee||'').toLowerCase().includes(tf.cnee)) &&
      (!tf.type      || (r.type||'').toLowerCase().includes(tf.type)) &&
      (!tf.pol       || (r.pol||'').toLowerCase().includes(tf.pol)) &&
      (!tf.pod       || (r.pod||'').toLowerCase().includes(tf.pod)) &&
      (!tf.vessel    || (r.vessel||'').toLowerCase().includes(tf.vessel)) &&
      (!tf.discharge || trkFmtDate(r.discharge).includes(tf.discharge)) &&
      (!tf.deadline  || trkFmtDate(r.deadline).includes(tf.deadline)) &&
      (!tf.return    || trkFmtDate(r.emptyReturn).includes(tf.return)) &&
      (!tf.usedays   || String(useDays ?? '').includes(tf.usedays)) &&
      (!tf.freetime  || String(ft).includes(tf.freetime)) &&
      (!tf.dias      || String(diasCorridos ?? '').includes(tf.dias)) &&
      (!tf.status    || status === tf.status) &&
      (!tf.migratedat || (() => {
        const mbl = bls.find(x => x.bl === r.bl && x.migratedFromTracking);
        return mbl && mbl.migratedAt ? trkFmtDate(mbl.migratedAt).includes(tf.migratedat) : false;
      })());
    return matchQ && matchS && matchCols;
  });

  // Stats (always over full dataset)
  let nOver=0, nGrace=0, nFree=0;
  // Pre-compute per-BL migration eligibility and status
  const blGroups = {};
  trkData.forEach(r => {
    if (!r.bl) return;
    if (!blGroups[r.bl]) blGroups[r.bl] = [];
    blGroups[r.bl].push(r);
  });
  const blMigrationStatus = {};
  let nReady = 0;
  Object.entries(blGroups).forEach(([blNum, ctrs]) => {
    const allReturned = ctrs.every(c => !!c.emptyReturn);
    const total = ctrs.length;
    const returned = ctrs.filter(c => !!c.emptyReturn).length;
    const hasDemurrage = ctrs.some(c => trkStatus(c) === 'dd_returned');
    const inBilling = bls.some(b => b.bl === blNum);
    blMigrationStatus[blNum] = { allReturned, total, returned, hasDemurrage, inBilling };
    if (allReturned && hasDemurrage && !inBilling) nReady++;
  });

  trkData.forEach(r => {
    const s = trkStatus(r);
    if (s==='dd_open') nOver++;
    else if (s==='grace') nGrace++;
    else if (s==='free') nFree++;
  });
  document.getElementById('ts-total').textContent = trkData.length;
  document.getElementById('ts-over').textContent  = nOver;
  document.getElementById('ts-grace').textContent = nGrace;
  document.getElementById('ts-ready').textContent = nReady;
  updateAlertBadge();

  // Show migrate button if there are ready BLs
  const migrateBtn = document.getElementById('btn-migrate');
  if (migrateBtn) migrateBtn.style.display = nReady > 0 ? '' : 'none';

  const tbody = document.getElementById('trk-body');
  const empty = document.getElementById('trk-empty');
  const table = document.getElementById('trk-table-el');

  if (!filtered.length) {
    table.style.display = 'none';
    empty.style.display = '';
    return;
  }
  table.style.display = '';
  empty.style.display = 'none';

  if (window._trkView === 'bl') {
    tbody.innerHTML = renderTrkGroupedByBL(filtered);
  } else {
    tbody.innerHTML = filtered.map(r => {
    const status = trkStatus(r);
    const elapsed = trkDaysElapsed(r.discharge);
    const ft = r.freeTime || 21;
    const daysOver = elapsed !== null ? elapsed - ft : null;
    const useDays = r.useDays !== null && r.useDays !== undefined
      ? r.useDays
      : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : (elapsed !== null ? elapsed : null));
    const diasCorridos = r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed;
    const rowClass = status === 'dd_open'     ? 'row-dd-open'
      : status === 'dd_returned' ? 'row-dd-returned'
      : status === 'grace'       ? 'row-grace'
      : status === 'free'        ? 'row-free'
      : status === 'returned'    ? 'row-returned'
      : 'row-ok';

    let pillHtml, daysHtml;
    if (status === 'dd_open') {
      pillHtml = `<span class="pill pill-over">⛔ D&D Não devolvido (+${daysOver}d)</span>`;
      daysHtml = `<span class="days-num over">${diasCorridos ?? '—'}</span>`;
    } else if (status === 'dd_returned') {
      pillHtml = `<span class="pill pill-dd-returned">📦 D&D Devolvido</span>`;
      daysHtml = `<span class="days-num over">${diasCorridos ?? '—'}</span>`;
    } else if (status === 'returned') {
      pillHtml = `<span class="pill pill-free">✅ Devolvido</span>`;
      daysHtml = `<span class="days-num free">${diasCorridos ?? '—'}</span>`;
    } else if (status === 'grace') {
      const left = ft - elapsed;
      pillHtml = `<span class="pill pill-grace">⚠️ Atenção (${left <= 0 ? 'hoje' : left+'d'})</span>`;
      daysHtml = `<span class="days-num grace">${diasCorridos ?? '—'}</span>`;
    } else {
      const left = ft - elapsed;
      pillHtml = `<span class="pill pill-free">🟢 ${left}d restantes</span>`;
      daysHtml = `<span class="days-num free">${diasCorridos ?? '—'}</span>`;
    }

    // BL migration badge
    const ms = blMigrationStatus[r.bl];
    let blBadge = '';
    if (ms) {
      if (ms.inBilling) {
        blBadge = `<br><span class="pill pill-free" style="margin-top:3px;font-size:10px;">✔ Faturamento</span>`;
      } else if (ms.allReturned && ms.hasDemurrage) {
        blBadge = `<br><span class="pill pill-grace" style="margin-top:3px;font-size:10px;">⚡ Pronto p/ faturar</span>`;
      } else if (!ms.allReturned) {
        blBadge = `<br><span style="font-size:10px;color:var(--muted);">${ms.returned}/${ms.total} devolvidos</span>`;
      }
    }

    // Migration date — lookup from billing module
    const billedBL = bls.find(x => x.bl === r.bl && (x.migratedFromTracking || x.migratedAt));
    const migratedAtCell = billedBL && billedBL.migratedAt
      ? `<span style="font-size:10px;">${trkFmtDate(billedBL.migratedAt)}</span>`
      : '—';

    return `<tr class="${rowClass}">
      <td style="font-weight:600;white-space:normal;word-break:break-all;">${r.container}</td>
      <td style="text-align:left;white-space:normal;word-break:break-all;font-weight:600;">${r.bl||'—'}${blBadge}</td>
      <td style="text-align:left;overflow:hidden;text-overflow:ellipsis;" title="${r.cnee||''}">${r.cnee||'—'}</td>
      <td>${r.type||'—'}</td>
      <td>${r.pol||'—'}</td>
      <td>${r.pod||'—'}</td>
      <td style="text-align:left">${r.vessel||'—'}</td>
      <td>${trkFmtDate(r.discharge)}</td>
      <td>${trkFmtDate(r.deadline)}</td>
      <td>${trkFmtDate(r.emptyReturn)}</td>
      <td>${useDays !== null ? useDays : '—'}</td>
      <td>${ft}</td>
      <td>${daysHtml}</td>
      <td>${pillHtml}</td>
      <td>${migratedAtCell}</td>
    </tr>`;
  }).join('');
  }
}

function clearTrkFilters() {
  ['tf-container','tf-bl','tf-cnee','tf-type','tf-pol','tf-pod',
   'tf-vessel','tf-discharge','tf-deadline','tf-return',
   'tf-usedays','tf-freetime','tf-dias','tf-migratedat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sel = document.getElementById('tf-status');
  if (sel) sel.value = '';
  renderTracking();
}

function manualMigrate() {
  const migrated = checkAndMigrateBLs();
  if (migrated > 0) {
    renderTracking();
    renderList();
    toast(`${migrated} BL(s) migrado(s) para Faturamento com sucesso!`, 'success');
  } else {
    toast('Nenhum BL novo elegível para migração.', '');
  }
}

function clearTracking() {
  showDoubleConfirmation(
    'Excluir todos os Containers?',
    'Você está prestes a excluir permanentemente TODOS os containers do controle de rastreamento. Todos os dados de tracking, histórico e informações associadas serão removidos.',
    trkData.length,
    () => {
      var qtdExcluida = trkData.length; // FIX #8: captura ANTES de zerar o array
      trkData = [];
      trkSave(trkData);
      renderTracking();
      toast('✓ Controle de containers excluído permanentemente.', '');
      logAuditAction('exclusao_todos_containers', {quantidade: qtdExcluida});
    }
  );
}

function exportTrkReport() {
  if (!trkData.length) { toast('Nenhum dado para exportar.', 'error'); return; }
  const today = new Date(); today.setHours(12,0,0,0);
  const rows = trkData.map(r => {
    const status = trkStatus(r);
    const elapsed = trkDaysElapsed(r.discharge);
    const ft = r.freeTime || 21;
    const useDays = r.useDays !== null && r.useDays !== undefined
      ? r.useDays
      : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : (elapsed !== null ? elapsed : null));
    const diasCorridos = r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed;
    const statusLabel = {dd_open:'D&D Não Devolvido', dd_returned:'D&D Devolvido', returned:'Devolvido', grace:'Atenção', free:'Dentro do Free Time', none:'—'}[status]||'—';
    return {
      'CONTAINER': r.container, 'BL': r.bl, 'CNEE': r.cnee, 'TYPE': r.type,
      'POL': r.pol, 'POD': r.pod, 'VESSEL': r.vessel,
      'DISCHARGE': r.discharge ? trkFmtDate(r.discharge) : '—',
      'DEADLINE FREE TIME': r.deadline ? trkFmtDate(r.deadline) : '—',
      'EMPTY RETURN': r.emptyReturn ? trkFmtDate(r.emptyReturn) : '—',
      'USE DAYS': useDays !== null ? useDays : '—',
      'FREE TIME': ft,
      'DIAS CORRIDOS': diasCorridos !== null ? diasCorridos : '—',
      'STATUS': statusLabel,
    };
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, {origin:'A2'});
  const headers = Object.keys(rows[0]);
  ws['!cols'] = headers.map(h => ({wch: Math.max(h.length, 14)}));
  // Title
  ws['A1'] = {v:'TRANSHIPPING — Controle de Containers em Demurrage', t:'s'};
  ws['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:headers.length-1}}];
  ws['!ref'] = `A1:${XLSX.utils.encode_cell({r:rows.length+1, c:headers.length-1})}`;
  XLSX.utils.book_append_sheet(wb, ws, 'Controle');
  const stamp = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Controle_Containers_${stamp}.xlsx`);
  toast('Relatório exportado!', 'success');
}


