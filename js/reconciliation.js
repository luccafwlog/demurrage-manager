// ── Conciliação Bancária via Planilha Excel PIX ────────────────────────────
// Importa planilha Excel do Itaú Empresas (QR Codes recebidos) e concilia
// com faturas emitidas.
// Estratégia: matching por txid (coluna "identificador" == docnum normalizado),
// com fallback por CNPJ (14 dígitos) + valor para pagamentos sem txid mapeado.

'use strict';

// ─── Parser Excel (SheetJS) ───────────────────────────────────────────────────

/**
 * Lê a planilha de "QR Codes recebidos" do Itaú Empresas.
 * Estrutura esperada:
 *   Linhas 1-10: metadados do banco (ignorados)
 *   Linha 11:    título "QR Codes recebidos" (ignorada)
 *   Linha 12:    cabeçalhos — identificador | pagador efetivo | cpf/cnpj |
 *                             vencimento ou expiração | pago em |
 *                             valor emitido (R$) | valor pago (R$) | tarifa (R$)
 *   Linha 13+:   dados
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ txid, cnpj, date, amount }[]}
 */
function parseExcelPix(arrayBuffer) {
  if (typeof XLSX === 'undefined') {
    throw new Error('Biblioteca XLSX não carregada. Recarregue a página.');
  }

  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

  // Localiza a linha de cabeçalho pela presença de "identificador"
  let headerRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(cell => String(cell).toLowerCase().trim() === 'identificador')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      'Formato não reconhecido. A coluna "identificador" não foi encontrada. ' +
      'Verifique se é a planilha de "QR Codes recebidos" do Itaú Empresas.'
    );
  }

  const headers = rows[headerRowIdx].map(h => String(h).toLowerCase().trim());

  const colId    = headers.indexOf('identificador');
  const colCnpj  = headers.findIndex(h => h.includes('cpf') || h.includes('cnpj'));
  const colDate  = headers.findIndex(h => h.includes('pago em'));
  const colValue = headers.findIndex(h => h.includes('valor pago'));

  if (colId === -1)    throw new Error('Coluna "identificador" não encontrada.');
  if (colValue === -1) throw new Error('Coluna "valor pago" não encontrada.');

  const transactions = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const txid = String(row[colId] || '').trim();
    if (!txid) continue;

    // Data: formato dd/mm/yyyy → yyyy-mm-dd
    let date = '';
    if (colDate >= 0) {
      const raw = String(row[colDate] || '').trim();
      const parts = raw.split('/');
      if (parts.length === 3) {
        date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Valor: formato brasileiro "1.234,56" → float
    let amount = 0;
    if (colValue >= 0) {
      const raw = String(row[colValue] || '').trim();
      amount = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
    }

    if (amount <= 0) continue;

    const cnpj = colCnpj >= 0 ? String(row[colCnpj] || '').trim() : '';

    transactions.push({ txid, cnpj, date, amount });
  }

  return transactions;
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function _normCnpj(str) {
  return (str || '').replace(/\D/g, '');
}

function _normTxid(str) {
  return (str || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

// ─── Correspondência com faturas ──────────────────────────────────────────────

/**
 * Cruza transações com faturas faturadas e não pagas.
 *
 * Estratégia (em ordem de prioridade):
 *   1. txid → docnum normalizado  (matching exato, sem ambiguidade)
 *   2. CNPJ (14 dígitos) + valor  (fallback para pagamentos sem txid mapeado)
 *
 * Resultado por match: { transaction, bl, candidates, ambiguous, matchType }
 *   matchType: 'txid' | 'cnpj'
 */
function matchTransactions(transactions, blsArray) {
  // Mapa txid normalizado → BL faturado e não pago
  const txidMap = {};
  blsArray.forEach(b => {
    if (!b.billed || b.paid || !b.docnum) return;
    const key = _normTxid(b.docnum);
    if (key) txidMap[key] = b;
  });

  // Mapa CNPJ → BLs faturados e não pagos (fallback)
  const cnpjMap = {};
  blsArray.forEach(b => {
    if (!b.billed || b.paid) return;
    const cnpj = _normCnpj(b.cnpj);
    if (cnpj && cnpj.length === 14) {
      if (!cnpjMap[cnpj]) cnpjMap[cnpj] = [];
      cnpjMap[cnpj].push(b);
    }
  });

  // txids já conciliados (anti-duplicidade)
  const usedTxids = new Set();
  blsArray.forEach(b => {
    if (b.pixTxid)  usedTxids.add(b.pixTxid);
    if (b.pixFitid) usedTxids.add(b.pixFitid); // retrocompat. com conciliações OFX anteriores
  });

  const matches = [];
  transactions.forEach(tx => {
    if (usedTxids.has(tx.txid)) return;

    // 1. Matching por txid (identificador == docnum normalizado)
    const key = _normTxid(tx.txid);
    if (key && txidMap[key]) {
      matches.push({
        transaction: tx,
        bl:          txidMap[key],
        candidates:  [txidMap[key]],
        ambiguous:   false,
        matchType:   'txid'
      });
      return;
    }

    // 2. Fallback: CNPJ + valor (apenas CNPJ com 14 dígitos)
    const cnpj = _normCnpj(tx.cnpj);
    if (!cnpj || cnpj.length !== 14) return;

    const candidates = (cnpjMap[cnpj] || []).filter(b =>
      b.frozenTotal != null && Math.abs(b.frozenTotal - tx.amount) < 0.02
    );
    if (candidates.length === 0) return;

    matches.push({
      transaction: tx,
      bl:          candidates[0],
      candidates,
      ambiguous:   candidates.length > 1,
      matchType:   'cnpj'
    });
  });

  return matches;
}

// ─── Estado local do módulo ───────────────────────────────────────────────────

let _pendingMatches = [];

// ─── UI: Modal de Importação ──────────────────────────────────────────────────

function openExtratoImport() {
  _pendingMatches = [];
  const fileInput = document.getElementById('extrato-file-input');
  if (fileInput) fileInput.value = '';
  const dropZone = document.getElementById('extrato-drop-zone');
  if (dropZone) {
    dropZone.innerHTML = '<div class="drop-icon">⬆️</div><p><strong>Arraste ou selecione a planilha PIX</strong></p><p>(.xlsx)</p>';
    dropZone.classList.remove('drag');
  }
  const preview = document.getElementById('extrato-preview');
  if (preview) preview.style.display = 'none';
  const confirmBtn = document.getElementById('btn-confirmar-conciliacao');
  if (confirmBtn) confirmBtn.disabled = true;
  openModal('modal-extrato-import');
}

function handleExtratoDrop(event) {
  event.preventDefault();
  document.getElementById('extrato-drop-zone').classList.remove('drag');
  const file = event.dataTransfer.files[0];
  if (file) processExtratoFile(file);
}

function handleExtratoFile(event) {
  const file = event.target.files[0];
  if (file) processExtratoFile(file);
}

function processExtratoFile(file) {
  const dropZone = document.getElementById('extrato-drop-zone');
  dropZone.innerHTML = '<div class="drop-icon">⏳</div><p>Lendo arquivo...</p>';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const transactions = parseExcelPix(e.target.result);

      if (transactions.length === 0) {
        dropZone.innerHTML = '<div class="drop-icon">⚠️</div><p><strong>Nenhuma transação encontrada.</strong></p><p>Verifique se é a planilha de "QR Codes recebidos" do Itaú Empresas.</p>';
        return;
      }

      dropZone.innerHTML = `<div class="drop-icon">✅</div><p><strong>${file.name}</strong></p><p>${transactions.length} transação(ões) lida(s)</p>`;

      const blsRef = typeof bls !== 'undefined' ? bls : [];
      const matches = matchTransactions(transactions, blsRef);
      _pendingMatches = matches;
      renderReconciliationPreview(matches, transactions.length, blsRef);
    } catch (err) {
      dropZone.innerHTML = '<div class="drop-icon">❌</div><p><strong>Erro ao processar arquivo.</strong></p><p>' + err.message + '</p>';
    }
  };
  reader.onerror = () => {
    dropZone.innerHTML = '<div class="drop-icon">❌</div><p><strong>Erro ao ler o arquivo.</strong></p>';
  };
  reader.readAsArrayBuffer(file);
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function renderReconciliationPreview(matches, totalTransactions, blsRef) {
  const preview    = document.getElementById('extrato-preview');
  const confirmBtn = document.getElementById('btn-confirmar-conciliacao');

  if (matches.length === 0) {
    const elegíveis = (blsRef || []).filter(b => b.billed && !b.paid && b.docnum);
    const dica = elegíveis.length === 0
      ? 'Nenhuma fatura faturada e não paga encontrada. Certifique-se de ter emitido a fatura.'
      : `${elegíveis.length} fatura(s) elegível(is) no sistema. Nenhum identificador (txid) ou CNPJ da planilha coincidiu com uma fatura em aberto.`;
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="padding:16px;background:#fef9c3;border:1px solid #fde047;border-radius:8px;font-size:13px;color:#713f12;">
        <strong>Nenhuma correspondência encontrada.</strong><br>
        De ${totalTransactions} transação(ões) lida(s), nenhum PIX recebido pôde ser associado a uma fatura em aberto.<br><br>
        ${dica}
      </div>`;
    confirmBtn.disabled = true;
    return;
  }

  const fmtBRL  = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

  const rows = matches.map((m, i) => {
    const blCell = m.ambiguous
      ? `<select class="recon-select" data-idx="${i}" style="font-size:12px;border:1px solid #d1d5db;border-radius:6px;padding:4px 6px;max-width:220px;">
           ${m.candidates.map((c, ci) =>
             `<option value="${ci}">${c.bl} — ${c.docnum || '—'} — ${c.client || '—'}</option>`
           ).join('')}
         </select>
         <span style="font-size:10px;color:#b45309;margin-left:4px;">⚠ ambíguo</span>`
      : `<span style="font-weight:600;color:#166534;">${m.bl.bl || m.bl.id}</span>
         <span style="font-size:11px;color:#6b7280;display:block;">${m.bl.docnum || '—'}</span>`;

    const matchBadge = m.matchType === 'txid'
      ? '<span style="font-size:10px;background:#dcfce7;color:#166534;padding:1px 5px;border-radius:4px;margin-left:4px;">txid</span>'
      : '<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:4px;margin-left:4px;">cnpj</span>';

    return `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:8px 10px;">
          <input type="checkbox" class="recon-check" data-idx="${i}" checked style="cursor:pointer;">
        </td>
        <td style="padding:8px 10px;">${blCell}${matchBadge}</td>
        <td style="padding:8px 10px;font-size:12px;">${m.bl.client || '—'}</td>
        <td style="padding:8px 10px;font-size:11px;color:#6b7280;font-family:monospace;">${m.transaction.txid}</td>
        <td style="padding:8px 10px;font-size:12px;color:#1d4ed8;font-weight:600;">${fmtBRL(m.transaction.amount)}</td>
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${m.bl.frozenTotal != null ? fmtBRL(m.bl.frozenTotal) : '—'}</td>
        <td style="padding:8px 10px;font-size:12px;">${fmtDate(m.transaction.date)}</td>
      </tr>`;
  }).join('');

  const hasAmbiguous = matches.some(m => m.ambiguous);
  preview.style.display = 'block';
  preview.innerHTML = `
    <div style="margin-top:14px;">
      <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:8px;">
        ${matches.length} correspondência(s) encontrada(s) de ${totalTransactions} transação(ões)
      </div>
      ${hasAmbiguous ? `<div style="padding:8px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;font-size:12px;color:#92400e;margin-bottom:10px;">
        ⚠ Algumas correspondências são ambíguas (mesmo CNPJ e valor em mais de uma fatura). Selecione a fatura correta no menu.
      </div>` : ''}
      <div style="overflow-x:auto;border:1px solid #d1fae5;border-radius:8px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f0fdf4;border-bottom:1px solid #d1fae5;">
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;"></th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">BL / Fatura</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Cliente</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Identificador PIX</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Valor PIX</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Valor Fatura</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Data PIX</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="margin-top:8px;font-size:11px;color:#6b7280;">
        Desmarque linhas que não deseja conciliar antes de confirmar.
      </div>
    </div>`;

  confirmBtn.disabled = false;
}

// ─── Confirmação da conciliação ───────────────────────────────────────────────

function confirmConciliacao() {
  const checks = document.querySelectorAll('.recon-check');
  const selected = [];

  checks.forEach(chk => {
    if (!chk.checked) return;
    const idx = parseInt(chk.dataset.idx, 10);
    const match = _pendingMatches[idx];
    if (!match) return;

    let bl = match.bl;
    if (match.ambiguous) {
      const sel = document.querySelector(`.recon-select[data-idx="${idx}"]`);
      const ci  = sel ? parseInt(sel.value, 10) : 0;
      bl = match.candidates[ci] || match.bl;
    }

    selected.push({ match, bl });
  });

  if (selected.length === 0) {
    toast('Nenhuma fatura selecionada para conciliar.', 'error');
    return;
  }

  selected.forEach(({ match, bl }) => {
    const tx = match.transaction;

    const roe   = (bl.billed && bl.frozenRoe   != null) ? bl.frozenRoe   : effectiveROE(bl);
    const total = (bl.billed && bl.frozenTotal != null) ? bl.frozenTotal : blTotal(bl, null);

    bl.paid                 = true;
    bl.paidAt               = tx.date;
    bl.frozenRoe            = roe;
    bl.frozenTotal          = total;
    bl.conciliadoPorExtrato = true;
    bl.pixTxid              = tx.txid;

    logAuditAction('conciliacao_automatica', {
      blId:      bl.id,
      bl:        bl.bl,
      docnum:    bl.docnum,
      total,
      paidAt:    tx.date,
      txid:      tx.txid,
      matchType: match.matchType,
      cnpj:      bl.cnpj
    });

    saveOne(bl);
  });

  closeModal('modal-extrato-import');
  renderList();
  toast(`${selected.length} fatura(s) conciliada(s) com sucesso! ✔`, 'success');
}
