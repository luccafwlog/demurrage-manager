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
  else {
    console.warn('[TRK] _dmFireSave indisponível — salvando apenas localmente');
    if (window._dmStore) window._dmStore.trk = d;
  }
}
// FIX-QUOTA #I: removido trkSave do IIFE de inicialização — era perigoso pois
// rodava no parse do módulo (antes da auth). O filtro de containers devolvidos
// no free time é aplicado em _dmOnReady (init.js) após dados carregarem.
let trkData = (() => {
  const raw = trkLoad();
  const clean = raw.filter(r => {
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      const ft   = trkFreeTime(r);
      if (used !== null && used <= ft) return false;
    }
    return true;
  });
  // NÃO chama trkSave aqui — store vazio neste momento; filtro real no _dmOnReady
  return clean;
})();
let trkImportRaw = null;

function trkParseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isoLocal(val);
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
  const ft = trkFreeTime(row);
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
  // "Atenção" = mesma janela dos alertas do painel (Configurações → dias de alerta).
  const alertDays = (typeof getAlertDays === 'function') ? getAlertDays() : 5;
  if (-daysOver <= alertDays) return 'grace';
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

    // Validação: CNPJ obrigatório em todas as linhas
    const semCnpj = rows.filter(row => {
      const n = {};
      Object.entries(row).forEach(([k,v]) => { n[trkNk(k)] = v; });
      const raw = String(n['CNPJ'] || '').replace(/\D/g,'').trim();
      const cnpj = raw.length === 13 ? '0' + raw : raw;
      return cnpj.length !== 14;
    });

    if (semCnpj.length > 0) {
      trkImportRaw = null;
      document.getElementById('trk-import-btn').disabled = true;
      document.getElementById('trk-drop-zone').innerHTML = `
        <div class="drop-icon">❌</div>
        <p><strong>${esc(file.name)}</strong></p>
        <p>${rows.length} linha(s) encontrada(s) — <span style="color:#dc2626;font-weight:700;">${semCnpj.length} sem CNPJ válido</span></p>
        <p style="color:#dc2626;font-size:12px;margin-top:4px;">Preencha o CNPJ (14 dígitos) de todos os containers e importe novamente.</p>`;
      toast(`${semCnpj.length} container(s) sem CNPJ válido. Corrija a planilha.`, 'error');
      return;
    }

    trkImportRaw = rows;
    document.getElementById('trk-import-btn').disabled = false;
    document.getElementById('trk-drop-zone').innerHTML = `<div class="drop-icon">✅</div><p><strong>${esc(file.name)}</strong></p><p>${rows.length} linha(s) encontrada(s) — todos os CNPJs OK</p>`;
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
    const type      = String(n['TYPE'] || n['TIPO'] || '').trim();
    const ftRaw     = parseInt(n['FREE_TIME'] || n['FREE TIME'], 10);
    // Sem FREE TIME na planilha: padrão da tabela para o tipo (reefer = 10d).
    const freeTime  = !isNaN(ftRaw) && ftRaw >= 0 ? ftRaw : getRate(type).freeUntil;
    const emptyReturnRaw = trkParseDate(n['EMPTY_RETURN'] || n['EMPTY RETURN'] || n['DEVOLUCAO'] || '');
    // Deadline = discharge + freeTime
    const deadline  = trkParseDate(n['DEADLINE_FREE_TIME'] || n['DEADLINE FREE TIME'] || '') || trkAddDays(discharge, freeTime);
    // Use days = days between discharge and emptyReturn (or elapsed since discharge if no return)
    const useDaysRaw = n['USE_DAYS'] || n['USE DAYS'] || '';
    const useDays = useDaysRaw !== '' ? parseInt(useDaysRaw) : (emptyReturnRaw ? trkDaysBetween(discharge, emptyReturnRaw) : null);
    return {
      container:   String(n['CONTAINER'] || n['CTR'] || '').trim().toUpperCase(),
      bl:          String(n['BL'] || n['B/L'] || n['B_L'] || '').trim().toUpperCase(),
      cnee:        String(n['CNEE'] || n['CLIENTE'] || '').trim(),
      type,
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
      const ft   = trkFreeTime(r);
      // Só ignora se for NOVO (não existe ainda no sistema).
      // Containers já cadastrados sempre recebem a atualização da data de devolução,
      // mesmo que a devolução tenha ocorrido dentro do free time.
      const alreadyExists = trkData.some(x => x.container === r.container && x.bl === r.bl);
      if (used !== null && used <= ft && !alreadyExists) { skippedFt++; return false; }
    }
    return true;
  });

  let added = 0, updated = 0;
  imported.forEach(imp => {
    const idx = trkData.findIndex(x => x.container === imp.container && x.bl === imp.bl);
    if (idx >= 0) { trkData[idx] = { ...trkData[idx], ...imp }; updated++; }
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

  // FIX: acumula novos clientes e syncs de email — aplica em batch para evitar
  // N saves concorrentes (mesmo padrão que causou ERR_INSUFFICIENT_RESOURCES nos clientes)
  const newClientsToAdd = []; // { cnpj, cnee } — clientes que precisam ser criados
  const emailSyncs = new Map(); // cnpj → emails[] — syncs a aplicar nos BLs

  Object.entries(cnpjByBL).forEach(([blNum, cnpj]) => {
    const cnee = (imported.find(i => i.bl === blNum) || {}).cnee || '';
    const client = getClientByCnpj(cnpj);
    if (client) {
      if (client.emails && client.emails.length > 0) emailSyncs.set(cnpj, client.emails);
      clientsLinked++;
    } else if (cnee) {
      newClientsToAdd.push({ cnpj, cnee });
    }

    // Update CNPJ + email on any existing billing BL with same BL number
    bls.forEach(b => {
      if (b.bl === blNum && !b.cnpj && !b.complementOf) {
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

  // Batch: aplica syncs de email nos BLs (sem save individual por CNPJ)
  if (emailSyncs.size > 0) {
    emailSyncs.forEach((emails, cnpj) => {
      bls.forEach(b => {
        if (normalizeCnpj(b.cnpj) === cnpj && !b.email) {
          b.email = emails.join(', ');
          blsModified = true;
        }
      });
    });
  }

  // Batch: cria clientes novos e salva UMA vez
  if (newClientsToAdd.length > 0) {
    newClientsToAdd.forEach(({ cnpj, cnee }) => {
      const norm = normalizeCnpj(cnpj);
      if (!clients.find(c => normalizeCnpj(c.cnpj) === norm)) {
        clients.unshift({ id: uid(), cnpj: norm, name: cnee, emails: [], createdAt: Date.now() });
      }
    });
    cliSave(clients);
  }
  // FIX-QUOTA #F: não chama save(bls) aqui — checkAndMigrateBLs pode modificar bls
  // também; fazemos UMA save unificada depois (conteúdo diff vai ignorar se nada mudou)

  closeModal('modal-trk-import');
  const { newBLs, updatedContainers } = checkAndMigrateBLs();
  renderTracking();
  // Save unificado: 1 write batch para bls (diff ignora BLs inalterados)
  if (blsModified || newBLs > 0 || updatedContainers > 0) save(bls);
  // Atualiza o indicador de último upload na barra PTAX
  if (window._dmRenderLastUpload) window._dmRenderLastUpload(new Date().toISOString());

  let msg = `Importado: ${added} novo(s), ${updated} atualizado(s)${skippedFt > 0 ? `, ${skippedFt} ignorado(s) (novos containers devolvidos no free time)` : ''}.`;
  if (newBLs > 0) msg += ` ${newBLs} BL(s) migrado(s) para Faturamento!`;
  if (updatedContainers > 0) msg += ` ${updatedContainers} BL(s) com containers atualizados.`;
  if (clientsLinked > 0) msg += ` ${clientsLinked} CNPJ(s) vinculado(s) a clientes.`;
  toast(msg, 'success');
}

// Free time do BL migrado: só fixa um valor quando todos os containers têm o
// mesmo free time e ele difere do padrão do tipo (negociado). Caso contrário
// fica null e cada container usa o padrão da tabela do seu tipo.
function blFreeTimeFromContainers(containers) {
  const fts = [...new Set(containers.map(trkFreeTime))];
  if (fts.length !== 1) return null;
  const allDefault = containers.every(c => getRate(c.type).freeUntil === fts[0]);
  return allDefault ? null : fts[0];
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
  let updatedContainers = 0; // BLs já existentes cujos containers foram atualizados

  Object.entries(byBL).forEach(([blNum, containers]) => {
    // Condition 1: ALL containers must be returned
    const allReturned = containers.every(c => !!c.emptyReturn);
    if (!allReturned) return;

    // Condition 2: at least one container generated demurrage
    const hasDemurrage = containers.some(c => trkStatus(c) === 'dd_returned');
    if (!hasDemurrage) return;

    // Check if already migrated (BL already exists in billing module)
    // Fatura complementar tem o mesmo nº de BL mas não é o processo migrado.
    const existingBL = bls.find(b => String(b.bl||'').toUpperCase() === String(blNum).toUpperCase() && !b.complementOf);
    if (existingBL) {
      // FIX: atualiza lista de containers do BL já migrado se novos foram adicionados
      // (reimportação com containers adicionais deve refletir no faturamento)
      // Não sobrescreve BL emitido nem containers corrigidos manualmente no BL.
      if (!existingBL.paid && !existingBL.billed && !existingBL.containersEditedManually) {
        const freshContainers = containers.map(c => ({
          container:   c.container,
          type:        c.type || '40G1',
          discharge:   c.discharge || '',
          emptyReturn: c.emptyReturn || '',
        }));
        if (JSON.stringify(existingBL.containers) !== JSON.stringify(freshContainers)) {
          existingBL.containers = freshContainers;
          updatedContainers++;
        }
      }
      return;
    }

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
      freeTime: blFreeTimeFromContainers(containers),
      roe: null,
      roeManual: false,
      ov1: null,
      ov2: null,
      venc: nextBusinessDay(null),
      docnum: genDocnum(blNum),
      migratedFromTracking: true,
      migratedAt: todayISO(),
      readyAt: containers.reduce((m, c) => (c.emptyReturn > m ? c.emptyReturn : m), ''),
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
  return { newBLs: migrated, updatedContainers };
}

// ============================================================
// TRACKING KPI DASHBOARD
// Calcula e exibe cards reativos ao conjunto filtrado atual
// ============================================================

// Calcula o valor USD estimado de D&D de uma linha de tracking
function trkRowUSD(r) {
  const elapsed = trkDaysElapsed(r.discharge);
  const dc = r.emptyReturn
    ? trkDaysBetween(r.discharge, r.emptyReturn)
    : (elapsed !== null ? elapsed : null);
  if (dc === null || dc <= 0) return 0;
  // Reutiliza getRateForBL passando objeto com freeTime do container
  const rate = (typeof getRateForBL === 'function')
    ? getRateForBL({ freeTime: r.freeTime || null }, r.type)
    : (typeof getRate === 'function' ? getRate(r.type) : null);
  if (!rate) return 0;
  return calcUSD(dc, rate, null, null).totalUSD;
}

// Atualiza todos os KPI cards da tela de Controle de Containers
function updateTrkKPIs(filtered) {
  let nOver = 0, nGrace = 0, totalUSD = 0;
  const uniqueBLs = new Set();
  filtered.forEach(r => {
    const st = trkStatus(r);
    if (st === 'dd_open')     nOver++;
    else if (st === 'grace')  nGrace++;
    // Acumula USD para containers com D&D (aberto ou devolvido)
    if (st === 'dd_open' || st === 'dd_returned') totalUSD += trkRowUSD(r);
    if (r.bl) uniqueBLs.add(r.bl);
  });
  const fmtUSD = v => '$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set('ts-total', filtered.length);
  set('ts-over',  nOver);
  set('ts-grace', nGrace);
  set('ts-bls',   uniqueBLs.size);
  set('ts-usd',   fmtUSD(totalUSD));
}

function renderTracking() {
  // Ensure table header matches current view, but only rebuild it when the view
  // actually changed — rebuilding on every keystroke wiped the filter inputs
  // (including the value just typed) before it could be read below.
  if (typeof _updateTrkTableHeader === 'function' && window._trkHeaderView !== window._trkView) {
    _updateTrkTableHeader();
    window._trkHeaderView = window._trkView;
  }
  const q = (document.getElementById('trk-search')?.value || '').toLowerCase();
  const sf = document.getElementById('trk-filter-status')?.value || 'all';
  const today = new Date(); today.setHours(12,0,0,0);

  // Column filters
  const tfVal = id => (document.getElementById(id)?.value || '').toLowerCase().trim();
  const tf = {
    container: tfVal('tf-container'),
    bl:        tfVal('tf-bl'),
    cnee:      tfVal('tf-cnee'),
    cnpj:      tfVal('tf-cnpj'),
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
    migratedat: tfVal('tf-migratedat'),
  };

  const filtered = trkData.filter(r => {
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      if (used !== null && used <= (trkFreeTime(r))) return false;
    }
    const status = trkStatus(r);
    const elapsed = trkDaysElapsed(r.discharge);
    const ft = trkFreeTime(r);
    const useDays = r.useDays !== null && r.useDays !== undefined
      ? r.useDays
      : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : (elapsed !== null ? elapsed : null));
    const diasCorridos = r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed;

    const matchQ = !q || [r.container,r.bl,r.cnee,r.vessel,r.cnpj].join(' ').toLowerCase().includes(q);
    const matchS = sf === 'all' || status === sf;
    const matchCols =
      (!tf.container || (r.container||'').toLowerCase().includes(tf.container)) &&
      (!tf.bl        || (r.bl||'').toLowerCase().includes(tf.bl)) &&
      (!tf.cnee      || (r.cnee||'').toLowerCase().includes(tf.cnee)) &&
      (!tf.cnpj      || (r.cnpj||'').replace(/\D/g,'').includes(tf.cnpj.replace(/\D/g,''))) &&
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
    const matchSemCnpj = !window._trkFilterSemCnpj || !r.cnpj || r.cnpj.length !== 14;
    return matchQ && matchS && matchCols && matchSemCnpj;
  });

  // ── KPI Dashboard — stats derivados do dataset FILTRADO ──────────────────
  updateTrkKPIs(filtered);

  // ── nReady — indicador de migração (sempre sobre dataset global) ──────────
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
    const ft = trkFreeTime(r);
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
        blBadge = `<br><span style="font-size:10px;color:var(--muted);">${esc(ms.returned)}/${esc(ms.total)} devolvidos</span>`;
      }
    }

    // Migration date — lookup from billing module
    const billedBL = bls.find(x => x.bl === r.bl && (x.migratedFromTracking || x.migratedAt));
    const migratedAtCell = billedBL && billedBL.migratedAt
      ? `<span style="font-size:10px;">${trkFmtDate(billedBL.migratedAt)}</span>`
      : '—';

    const safeKey = encodeURIComponent(r.container + '|' + (r.bl||''));
    const cnpjDisplay = r.cnpj && r.cnpj.length === 14
      ? `<span style="font-family:monospace;font-size:10px;color:var(--muted);">${formatCnpj(r.cnpj)}</span>`
      : `<span style="color:#dc2626;font-size:10px;" title="CNPJ não vinculado">—</span>`;
    return `<tr class="${rowClass}">
      <td style="font-weight:600;white-space:normal;word-break:break-all;">${esc(r.container)}</td>
      <td style="text-align:left;white-space:normal;word-break:break-all;font-weight:600;">${esc(r.bl||'—')}${blBadge}</td>
      <td style="text-align:left;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.cnee||'')}">${esc(r.cnee||'—')}</td>
      <td>${cnpjDisplay}</td>
      <td>${trkFmtDate(r.emptyReturn)}</td>
      <td>${useDays !== null ? useDays : '—'}</td>
      <td>${ft}</td>
      <td>${daysHtml}</td>
      <td>${pillHtml}</td>
      <td>${migratedAtCell}</td>
      <td style="white-space:nowrap;">
        <button class="act-btn edit" onclick="openEditContainer('${escJs(safeKey)}')" style="padding:3px 8px;font-size:11px;" title="Editar">✏️</button>
        <button class="act-btn del"  onclick="confirmDeleteContainer('${escJs(safeKey)}')" style="padding:3px 8px;font-size:11px;" title="Excluir">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  }
}

// ── EDITAR CONTAINER ──────────────────────────────────────────────────────
function openEditContainer(safeKey) {
  const key = decodeURIComponent(safeKey);
  const [container, bl] = key.split('|');
  const r = trkData.find(x => x.container === container && (x.bl||'') === (bl||''));
  if (!r) { if(typeof toast==='function') toast('Container não encontrado.','error'); return; }
  window._editingTrkKey = key;

  document.getElementById('te-container').value   = r.container || '';
  document.getElementById('te-bl').value          = r.bl || '';
  document.getElementById('te-cnee').value        = r.cnee || '';
  document.getElementById('te-cnpj').value        = r.cnpj ? formatCnpj(r.cnpj) : '';
  document.getElementById('te-type').value        = r.type || '';
  document.getElementById('te-freetime').value    = trkFreeTime(r);
  document.getElementById('te-pol').value         = r.pol || '';
  document.getElementById('te-pod').value         = r.pod || '';
  document.getElementById('te-vessel').value      = r.vessel || '';
  document.getElementById('te-discharge').value   = r.discharge || '';
  document.getElementById('te-emptyreturn').value = r.emptyReturn || '';

  // Verifica se existe fatura vinculada
  const linkedBL = bls.find(b => b.bl === r.bl && !b.complementOf);
  const warnEl = document.getElementById('te-billing-warn');
  if (warnEl) warnEl.style.display = linkedBL ? '' : 'none';

  openModal('modal-trk-edit');
}

function saveEditContainer() {
  const key = window._editingTrkKey;
  if (!key) return;
  const [oldContainer, oldBL] = key.split('|');
  const idx = trkData.findIndex(x => x.container === oldContainer && (x.bl||'') === (oldBL||''));
  if (idx < 0) { if(typeof toast==='function') toast('Container não encontrado.','error'); return; }

  const newContainer  = document.getElementById('te-container').value.trim().toUpperCase();
  const newBL         = document.getElementById('te-bl').value.trim().toUpperCase();
  const newCnee       = document.getElementById('te-cnee').value.trim();
  const newCnpjRaw    = document.getElementById('te-cnpj').value.replace(/\D/g,'');
  const newCnpj       = newCnpjRaw.length === 13 ? '0'+newCnpjRaw : newCnpjRaw;
  const newType       = document.getElementById('te-type').value.trim();
  const ftIn = parseInt(document.getElementById('te-freetime').value, 10);
  const newFreeTime   = !isNaN(ftIn) && ftIn >= 0 ? ftIn : getRate(document.getElementById('te-type').value.trim()).freeUntil;
  const newPol        = document.getElementById('te-pol').value.trim();
  const newPod        = document.getElementById('te-pod').value.trim();
  const newVessel     = document.getElementById('te-vessel').value.trim();
  const newDischarge  = document.getElementById('te-discharge').value;
  const newEmptyRet   = document.getElementById('te-emptyreturn').value;

  if (!newContainer || !newBL) { if(typeof toast==='function') toast('Container e BL são obrigatórios.','error'); return; }

  // Recalcula deadline
  const newDeadline = trkAddDays(newDischarge, newFreeTime);

  // Atualiza trkData
  trkData[idx] = { ...trkData[idx],
    container: newContainer, bl: newBL, cnee: newCnee, cnpj: newCnpj,
    type: newType, freeTime: newFreeTime, pol: newPol, pod: newPod,
    vessel: newVessel, discharge: newDischarge, emptyReturn: newEmptyRet,
    deadline: newDeadline,
  };
  trkSave(trkData);

  // Atualiza o container correspondente no BL de faturamento (se existir e não estiver congelado)
  const linkedBL = bls.find(b => b.bl === oldBL && !b.complementOf);
  if (linkedBL && !linkedBL.billed && !linkedBL.paid) {
    const cIdx = (linkedBL.containers||[]).findIndex(c => c.container === oldContainer);
    if (cIdx >= 0) {
      linkedBL.containers[cIdx] = {
        ...linkedBL.containers[cIdx],
        container:   newContainer,
        type:        newType,
        discharge:   newDischarge,
        emptyReturn: newEmptyRet,
      };
      // Renomear o BL só é seguro se ele não tiver outros containers no rastreamento.
      if (newBL !== oldBL) {
        const others = trkData.filter(x => (x.bl||'') === oldBL);
        if (!others.length) linkedBL.bl = newBL;
        else linkedBL.containers.splice(cIdx, 1);
      }
      if (typeof save === 'function') save(bls);
    }
  }

  closeModal('modal-trk-edit');
  renderTracking();
  if (typeof toast==='function') toast('✓ Container atualizado!', 'success');
  if (typeof logAuditAction==='function') logAuditAction('edicao_container', { container: newContainer, bl: newBL });
}

function confirmDeleteContainer(safeKey) {
  const key = decodeURIComponent(safeKey);
  const [container, bl] = key.split('|');
  const r = trkData.find(x => x.container === container && (x.bl||'') === (bl||''));
  if (!r) return;

  const linkedBL = bls.find(b => b.bl === r.bl && !b.complementOf);
  const billedWarn = linkedBL && (linkedBL.billed || linkedBL.paid) ? '\n\nAtenção: o BL vinculado já foi faturado (congelado). O container será removido do rastreamento mas NÃO da fatura.' : '';
  const msg = `Excluir container "${container}" do BL "${bl||'—'}"?${billedWarn}\n\nEsta ação não pode ser desfeita.`;
  if (!confirm(msg)) return;

  // Remove do trkData
  trkData = trkData.filter(x => !(x.container === container && (x.bl||'') === (bl||'')));
  trkSave(trkData);

  // Remove do BL de faturamento se existir e não estiver congelado
  if (linkedBL && !linkedBL.billed && !linkedBL.paid) {
    linkedBL.containers = (linkedBL.containers||[]).filter(c => c.container !== container);
    if (typeof save === 'function') save(bls);
  }

  renderTracking();
  if (typeof toast==='function') toast(`Container "${container}" excluído.`, 'success');
  if (typeof logAuditAction==='function') logAuditAction('exclusao_container', { container, bl });
}

function toggleTrkSemCnpj() {
  window._trkFilterSemCnpj = !window._trkFilterSemCnpj;
  const btn = document.getElementById('trk-btn-sem-cnpj');
  if (btn) btn.classList.toggle('active', window._trkFilterSemCnpj);
  renderTracking();
}

function clearTrkFilters() {
  ['tf-container','tf-bl','tf-cnee','tf-cnpj','tf-type','tf-pol','tf-pod',
   'tf-vessel','tf-discharge','tf-deadline','tf-return',
   'tf-usedays','tf-freetime','tf-dias','tf-migratedat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sel = document.getElementById('tf-status');
  if (sel) sel.value = '';
  // Reset top-bar filters
  const searchEl = document.getElementById('trk-search');
  if (searchEl) searchEl.value = '';
  const statusEl = document.getElementById('trk-filter-status');
  if (statusEl) statusEl.value = 'all';
  // Reset Sem CNPJ toggle
  window._trkFilterSemCnpj = false;
  const semCnpjBtn = document.getElementById('trk-btn-sem-cnpj');
  if (semCnpjBtn) semCnpjBtn.classList.remove('active');
  renderTracking();
}

function manualMigrate() {
  // checkAndMigrateBLs devolve { newBLs, updatedContainers } — antes era
  // comparado com "> 0" como número e os BLs migrados nunca eram salvos.
  const { newBLs, updatedContainers } = checkAndMigrateBLs();
  if (newBLs > 0 || updatedContainers > 0) {
    save(bls);
    renderTracking();
    renderList();
    logAuditAction('migracao_faturamento', { novos: newBLs, atualizados: updatedContainers });
    toast(`${newBLs} BL(s) migrado(s) para Faturamento${updatedContainers ? `, ${updatedContainers} atualizado(s)` : ''}.`, 'success');
  } else {
    toast('Nenhum BL novo elegível para migração.', '');
  }
}

function clearTracking() {
  if (!requireAdmin('excluir containers em massa')) return;
  // Abre o modal unificado de limpeza / exclusão em massa
  _openClearModal();
}

// ============================================================
// MODAL DE LIMPEZA / EXCLUSÃO EM MASSA
// ============================================================
let _bulkDeletePreview = []; // containers validados prontos para excluir

function _openClearModal() {
  _bulkDeletePreview = [];
  const fileInput = document.getElementById('trk-bulk-file-input');
  if (fileInput) fileInput.value = '';
  const previewEl = document.getElementById('trk-bulk-preview');
  if (previewEl) previewEl.innerHTML = '';
  const confirmBtn = document.getElementById('trk-bulk-confirm-btn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = '🗑️ Confirmar Exclusão'; }
  const countEl = document.getElementById('clear-all-count');
  if (countEl) countEl.textContent = trkData.length;
  _switchClearTab('tab-clear-all');
  openModal('modal-trk-clear');
}

function _switchClearTab(tabId) {
  ['tab-clear-all','tab-clear-bulk'].forEach(t => {
    const el = document.getElementById(t);
    if (el) el.classList.toggle('active', t === tabId);
  });
  const paneMap = {'tab-clear-all':'pane-clear-all','tab-clear-bulk':'pane-clear-bulk'};
  Object.entries(paneMap).forEach(([tab, pane]) => {
    const el = document.getElementById(pane);
    if (el) el.style.display = tab === tabId ? '' : 'none';
  });
}

function _execClearAll() {
  if (!requireAdmin('excluir todos os containers')) return;
  closeModal('modal-trk-clear');
  showDoubleConfirmation(
    'Excluir TODOS os Containers?',
    'Você está prestes a excluir permanentemente TODOS os containers do controle de rastreamento. Esta ação é irreversível.',
    trkData.length,
    () => {
      const qtd = trkData.length;
      trkData = [];
      trkSave(trkData);
      renderTracking();
      toast(`✓ ${qtd} container(s) excluído(s) permanentemente.`, '');
      logAuditAction('exclusao_todos_containers', {quantidade: qtd});
    }
  );
}

// ── Download do modelo de planilha ──────────────────────────
function downloadBulkDeleteTemplate() {
  const wb = XLSX.utils.book_new();
  const data = [
    ['CONTAINER',    'BL'],
    ['ABCU1234567',  'HLCSSA3260012345'],
    ['MSCU9876543',  'MEDUA1234567'],
    ['TCKU0011223',  'EVERU9876543'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch: 22}, {wch: 22}];
  XLSX.utils.book_append_sheet(wb, ws, 'Exclusao');
  XLSX.writeFile(wb, 'modelo_exclusao_containers.xlsx');
  toast('Modelo baixado! Preencha com os containers e BLs, depois faça o upload.', 'success');
}

// ── Processar planilha de exclusão ─────────────────────────
function handleBulkDeleteFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const previewEl = document.getElementById('trk-bulk-preview');
  if (previewEl) previewEl.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;">⏳ Processando planilha...</div>';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, {type:'binary'});
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});

      const header = (rows[0] || []).map(h => String(h).trim().toUpperCase());

      // Localiza coluna CONTAINER
      const contIdx = header.findIndex(h =>
        h === 'CONTAINER' || h === 'CONT' || h === 'CONTAINER NO' || h === 'CONTAINER NUMBER'
      );
      if (contIdx === -1) {
        if (previewEl) previewEl.innerHTML = '<div style="padding:12px;background:#fee2e2;border-radius:8px;color:#b91c1c;font-size:13px;">❌ Coluna "CONTAINER" não encontrada. Baixe o modelo padrão.</div>';
        return;
      }

      // Localiza coluna BL (obrigatória)
      const blIdx = header.findIndex(h => h === 'BL' || h === 'B/L' || h === 'BILL OF LADING');
      if (blIdx === -1) {
        if (previewEl) previewEl.innerHTML = '<div style="padding:12px;background:#fee2e2;border-radius:8px;color:#b91c1c;font-size:13px;">❌ Coluna "BL" não encontrada. A planilha deve ter as colunas <strong>CONTAINER</strong> e <strong>BL</strong>. Baixe o modelo padrão.</div>';
        return;
      }

      const seen  = new Set();
      const pairs = [];
      for (let i = 1; i < rows.length; i++) {
        const cont = String(rows[i][contIdx] || '').trim().toUpperCase();
        const bl   = String(rows[i][blIdx]   || '').trim();
        if (!cont || !bl) continue;
        const key = cont + '\x00' + bl;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ container: cont, bl });
      }

      if (!pairs.length) {
        if (previewEl) previewEl.innerHTML = '<div style="padding:12px;background:#fee2e2;border-radius:8px;color:#b91c1c;font-size:13px;">❌ Nenhum par CONTAINER + BL válido encontrado na planilha.</div>';
        return;
      }

      _validateBulkDelete(pairs);
    } catch(err) {
      toast('Erro ao ler planilha: ' + err.message, 'error');
      if (previewEl) previewEl.innerHTML = '<div style="padding:12px;background:#fee2e2;border-radius:8px;color:#b91c1c;font-size:13px;">❌ Erro ao ler arquivo: ' + err.message + '</div>';
    }
  };
  reader.readAsBinaryString(file);
}

function _validateBulkDelete(pairs) {
  // pairs = [{container: 'ABCU1234567', bl: 'HLCSSA326...'}, ...]
  const found    = [];
  const notFound = [];

  pairs.forEach(({ container, bl }) => {
    // Match exato por (container, bl) — evita excluir o mesmo container de BL errado
    const match = trkData.find(r =>
      String(r.container || '').toUpperCase() === container &&
      String(r.bl || '').trim() === bl.trim()
    );
    if (match) found.push(match);
    else notFound.push(`${container} / ${bl}`);
  });

  _bulkDeletePreview = found;

  const previewEl  = document.getElementById('trk-bulk-preview');
  const confirmBtn = document.getElementById('trk-bulk-confirm-btn');
  if (!previewEl) return;

  let html = '';

  if (found.length) {
    const stLabel = {dd_open:'⛔ D&D Ativo',dd_returned:'📦 D&D Dev.',returned:'✅ Dev.',grace:'⚠️ Atenção',free:'🟢 Free Time',none:'—'};
    html += `<div style="margin-bottom:10px;padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;">
      <div style="font-size:13px;font-weight:700;color:#c2410c;margin-bottom:8px;">⚠️ ${found.length} container(s) encontrado(s) — serão excluídos:</div>
      <div style="max-height:220px;overflow-y:auto;border-radius:6px;overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:480px;">
          <thead><tr style="background:#fef3c7;text-align:left;">
            <th style="padding:5px 8px;border-bottom:1px solid #fde68a;">Container</th>
            <th style="padding:5px 8px;border-bottom:1px solid #fde68a;">BL</th>
            <th style="padding:5px 8px;border-bottom:1px solid #fde68a;">CNEE</th>
            <th style="padding:5px 8px;border-bottom:1px solid #fde68a;">Status</th>
            <th style="padding:5px 8px;border-bottom:1px solid #fde68a;">Descarga</th>
          </tr></thead>
          <tbody>${found.map(r => `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:5px 8px;font-weight:700;">${esc(r.container||'—')}</td>
            <td style="padding:5px 8px;color:#6b7280;font-size:11px;">${esc(r.bl||'—')}</td>
            <td style="padding:5px 8px;color:#6b7280;font-size:11px;">${esc(r.cnee||r.client||'—')}</td>
            <td style="padding:5px 8px;">${stLabel[trkStatus(r)]||trkStatus(r)}</td>
            <td style="padding:5px 8px;color:#6b7280;font-size:11px;">${r.discharge ? trkFmtDate(r.discharge) : '—'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
  }

  if (notFound.length) {
    html += `<div style="padding:12px 14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;color:#b91c1c;margin-bottom:4px;">❌ ${notFound.length} par(es) não encontrado(s) — serão ignorados:</div>
      <div style="font-size:12px;color:#7f1d1d;word-break:break-all;line-height:1.8;">${notFound.join(' · ')}</div>
    </div>`;
  }

  if (!found.length && !notFound.length) {
    html = '<div style="padding:12px;color:#6b7280;font-size:13px;">Nenhum dado válido encontrado.</div>';
  }

  previewEl.innerHTML = html;

  if (confirmBtn) {
    confirmBtn.disabled = found.length === 0;
    confirmBtn.textContent = found.length ? `🗑️ Excluir ${found.length} container(s)` : '🗑️ Confirmar Exclusão';
  }
}

// ── Executar exclusão em massa com pseudo-rollback ──────────
async function executeBulkDelete() {
  if (!_bulkDeletePreview.length) return;

  const confirmBtn = document.getElementById('trk-bulk-confirm-btn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = '⏳ Excluindo...'; }

  const snapshot  = JSON.parse(JSON.stringify(trkData));
  const toDelete  = [..._bulkDeletePreview];
  const deleteSet = new Set(toDelete.map(r => `${String(r.container||'').toUpperCase()}\x00${r.bl||''}`));

  try {
    trkData = trkData.filter(r =>
      !deleteSet.has(`${String(r.container||'').toUpperCase()}\x00${r.bl||''}`)
    );
    trkSave(trkData);

    const containers = [...new Set(toDelete.map(r => r.container))];
    logAuditAction('exclusao_em_massa_containers', {
      quantidade:   toDelete.length,
      containers:   containers.slice(0, 50),
      bls_afetados: [...new Set(toDelete.map(r => r.bl).filter(Boolean))]
    });

    toast(`✓ ${toDelete.length} container(s) excluído(s) com sucesso!`, 'success');
    closeModal('modal-trk-clear');
    renderTracking();
    _bulkDeletePreview = [];
  } catch(err) {
    // Rollback lógico
    trkData = snapshot;
    trkSave(trkData);
    renderTracking();
    toast('Erro durante exclusão: ' + err.message + '. Dados restaurados.', 'error');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = `🗑️ Excluir ${toDelete.length} container(s)`;
    }
  }
}

function exportTrkReport() {
  if (!trkData.length) { toast('Nenhum dado para exportar.', 'error'); return; }
  const today = new Date(); today.setHours(12,0,0,0);
  const rows = trkData.map(r => {
    const status = trkStatus(r);
    const elapsed = trkDaysElapsed(r.discharge);
    const ft = trkFreeTime(r);
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
  const stamp = todayISO();
  XLSX.writeFile(wb, `Controle_Containers_${stamp}.xlsx`);
  toast('Relatório exportado!', 'success');
}

function exportCoscoReport() {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // Build a lookup map from BL number → billing record
  const blMap = {};
  if (typeof bls !== 'undefined' && Array.isArray(bls)) {
    bls.forEach(b => { if (b.bl && !b.complementOf) blMap[b.bl] = b; });
  }

  // Pre-compute raw USD total per BL (needed for proportional fixed-discount allocation)
  const blRawUSDMap = {};
  trkData.forEach(r => {
    const status = trkStatus(r);
    if (status !== 'dd_open' && status !== 'dd_returned') return;
    const ft = trkFreeTime(r);
    const dc = r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : trkDaysElapsed(r.discharge);
    if (!dc || dc <= ft) return;
    const rate = getRateForBL({ freeTime: ft }, r.type);
    const calc = calcUSD(dc, rate, null, null);
    if (calc.totalUSD <= 0) return;
    blRawUSDMap[r.bl] = (blRawUSDMap[r.bl] || 0) + calc.totalUSD;
  });

  const receivedRows = [];   // invoiced (billedAt set)
  const pendingRows  = [];   // not yet invoiced

  trkData.forEach(r => {
    const status = trkStatus(r);
    if (status !== 'dd_open' && status !== 'dd_returned') return;

    const ft = trkFreeTime(r);
    const dc = r.emptyReturn
      ? trkDaysBetween(r.discharge, r.emptyReturn)
      : trkDaysElapsed(r.discharge);

    if (!dc || dc <= ft) return;

    const rate    = getRateForBL({ freeTime: ft }, r.type);
    const calc    = calcUSD(dc, rate, null, null);
    if (calc.totalUSD <= 0) return;

    const excess   = Math.max(0, dc - ft);
    const rawUSD   = calc.totalUSD;
    const blRec    = blMap[r.bl];
    const isInvoiced = blRec && (blRec.billedAt || blRec.paid);

    // Compute per-container discount and after-discount total
    let discountDisplay = '';
    let finalUSD = rawUSD;

    if (isInvoiced && blRec.discount && blRec.discount.value > 0) {
      const d = blRec.discount;
      if (d.mode === 'percent') {
        // Same % applies to each container
        finalUSD = rawUSD * (1 - d.value / 100);
        discountDisplay = `${d.value}%`;
      } else {
        // Fixed BRL discount: distribute proportionally by USD share, then convert to USD
        const blRawUSD = blRawUSDMap[r.bl] || rawUSD;
        const share = rawUSD / blRawUSD;
        const discountBRL = d.value * share;
        const roe = (typeof effectiveROE === 'function') ? effectiveROE(blRec) : 1;
        const discountUSD = roe > 0 ? discountBRL / roe : 0;
        finalUSD = Math.max(0, rawUSD - discountUSD);
        discountDisplay = `$ ${discountUSD.toFixed(2)}`;
      }
    }

    const totalUSD = parseFloat(finalUSD.toFixed(2));

    const base = {
      'Container':    r.container || '—',
      'BL':           r.bl || '—',
      'Consignee':    r.cnee || '—',
      'TYPE':         r.type || '—',
      'POL':          r.pol || '—',
      'POD':          r.pod || '—',
      'VESSEL':       r.vessel || '—',
      'DISCHARGE':    r.discharge ? trkFmtDate(r.discharge) : '—',
      'EMPTY RETURN': r.emptyReturn ? trkFmtDate(r.emptyReturn) : '—',
      'USE DAYS':     dc,
      'EXCESS':       excess,
      'TOTAL USD':    totalUSD,
    };

    if (isInvoiced) {
      receivedRows.push({ ...base, 'DISCOUNT': discountDisplay, 'TOTAL USD': totalUSD });
    } else {
      pendingRows.push(base);
    }
  });

  if (!receivedRows.length && !pendingRows.length) {
    toast('Nenhum container em demurrage para exportar.', 'error');
    return;
  }

  const NAVY = '1A2744', WHITE = 'FFFFFFFF', LIGHT = 'F3F4F6';
  const wb = XLSX.utils.book_new();

  function buildSheet(rows, title, hasDiscount) {
    if (!rows.length) {
      // Empty placeholder sheet
      const ws = XLSX.utils.aoa_to_sheet([[title], ['Nenhum registro.']]);
      ws['A1'].s = { font: { bold: true, color: { rgb: WHITE }, sz: 12 }, fill: { fgColor: { rgb: NAVY } }, alignment: { horizontal: 'center', vertical: 'center' } };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
      return ws;
    }

    // Column order: put DISCOUNT before TOTAL USD for received sheet
    const colOrder = hasDiscount
      ? ['Container','BL','Consignee','TYPE','POL','POD','VESSEL','DISCHARGE','EMPTY RETURN','USE DAYS','EXCESS','DISCOUNT','TOTAL USD']
      : ['Container','BL','Consignee','TYPE','POL','POD','VESSEL','DISCHARGE','EMPTY RETURN','USE DAYS','EXCESS','TOTAL USD'];

    const colWidths = {
      'Container': 13, 'BL': 18, 'Consignee': 35, 'TYPE': 7,
      'POL': 10, 'POD': 10, 'VESSEL': 22, 'DISCHARGE': 13,
      'EMPTY RETURN': 14, 'USE DAYS': 10, 'EXCESS': 9,
      'DISCOUNT': 10, 'TOTAL USD': 13,
    };

    // Build ordered rows
    const orderedRows = rows.map(r => {
      const obj = {};
      colOrder.forEach(c => { obj[c] = r[c] !== undefined ? r[c] : ''; });
      return obj;
    });

    let grandTotal = 0;
    rows.forEach(r => { grandTotal += r['TOTAL USD'] || 0; });

    const totalsRow = {};
    colOrder.forEach(c => { totalsRow[c] = ''; });
    totalsRow['Container'] = 'TOTAL';
    totalsRow['TOTAL USD'] = parseFloat(grandTotal.toFixed(2));
    const allRows = [...orderedRows, totalsRow];

    const ws = XLSX.utils.json_to_sheet(allRows, { origin: 'A2', header: colOrder });
    const ncols = colOrder.length;
    const nrows = allRows.length;

    ws['!cols'] = colOrder.map(h => ({ wch: colWidths[h] || 12 }));

    // Title row
    ws['A1'] = { v: title, t: 's', s: {
      font: { bold: true, color: { rgb: WHITE }, sz: 12 },
      fill: { fgColor: { rgb: NAVY } },
      alignment: { horizontal: 'center', vertical: 'center' },
    }};
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } }];
    ws['!ref'] = `A1:${XLSX.utils.encode_cell({ r: nrows + 1, c: ncols - 1 })}`;

    // Header row (row index 1 = Excel row 2)
    colOrder.forEach((h, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 1, c: ci });
      if (!ws[addr]) ws[addr] = { v: h, t: 's' };
      ws[addr].s = {
        font: { bold: true, color: { rgb: WHITE }, sz: 11 },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    });

    const usdCol = colOrder.indexOf('TOTAL USD');

    // Data rows
    for (let ri = 0; ri < nrows; ri++) {
      const isTotals = ri === nrows - 1;
      colOrder.forEach((h, ci) => {
        const addr = XLSX.utils.encode_cell({ r: ri + 2, c: ci });
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        const isUsd = ci === usdCol;
        ws[addr].s = {
          font: { bold: isTotals, color: { rgb: isTotals ? WHITE : '111827' }, sz: 11 },
          fill: { fgColor: { rgb: isTotals ? NAVY : WHITE } },
          alignment: { horizontal: isUsd ? 'right' : 'left', vertical: 'center' },
        };
        if (isUsd && typeof ws[addr].v === 'number') ws[addr].t = 'n';
      });
    }

    return ws;
  }

  const wsReceived = buildSheet(receivedRows, 'RECEIVED — Containers in Demurrage (Invoiced)', true);
  const wsPending  = buildSheet(pendingRows,  'NOT RECEIVED — Containers in Demurrage (Pending)', false);

  XLSX.utils.book_append_sheet(wb, wsReceived, 'RECEIVED');
  XLSX.utils.book_append_sheet(wb, wsPending,  'NOT RECEIVED');
  XLSX.writeFile(wb, `Relatorio_COSCO_${todayStr}.xlsx`);

  if (typeof logAuditAction === 'function') {
    logAuditAction('exportacao_relatorio', {
      tipo: 'relatorio_cosco',
      invoiced: receivedRows.length,
      pending: pendingRows.length,
    });
  }
  toast('Relatório COSCO exportado!', 'success');
}

