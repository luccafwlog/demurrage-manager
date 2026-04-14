// ── Conciliação Bancária via Extrato OFX ──────────────────────────────────
// Importa extrato OFX do Itaú e concilia automaticamente pagamentos PIX
// com faturas emitidas, identificando-as pelo txid (docnum sanitizado).

'use strict';

// ─── Parser OFX ──────────────────────────────────────────────────────────────

/**
 * Extrai valor de uma tag OFX de um bloco de texto.
 * Suporta formato SGML (sem fechamento de tag) e XML.
 * Ex.: "<TRNAMT>1234.56" ou "<TRNAMT>1234.56</TRNAMT>"
 */
function _ofxTag(block, tag) {
  const re = new RegExp('<' + tag + '>([^<\\r\\n]+)', 'i');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

/**
 * Converte data OFX (ex: "20260414000000[-3:BRT]") para string ISO "YYYY-MM-DD".
 */
function _ofxDate(raw) {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.length < 8) return '';
  return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8);
}

/**
 * Parseia texto OFX e retorna array de transações:
 * { type, date, amount, fitid, memo }
 */
function parseOFX(text) {
  const transactions = [];
  // Captura blocos <STMTTRN>...</STMTTRN> (SGML e XML)
  const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const block = m[1];
    const type   = _ofxTag(block, 'TRNTYPE').toUpperCase();
    const date   = _ofxDate(_ofxTag(block, 'DTPOSTED'));
    const amount = parseFloat(_ofxTag(block, 'TRNAMT').replace(',', '.')) || 0;
    const fitid  = _ofxTag(block, 'FITID');
    const memo   = _ofxTag(block, 'MEMO') || _ofxTag(block, 'NAME');
    transactions.push({ type, date, amount, fitid, memo });
  }
  return transactions;
}

// ─── Identificação de txid no campo MEMO ─────────────────────────────────────

/**
 * Tenta extrair o txid (formato DEM + ano + 7 chars) do campo MEMO.
 * Retorna null se não encontrado.
 */
function extractTxid(memo) {
  if (!memo) return null;
  // Pattern: DEM seguido de 4 dígitos (ano) e 4-7 alfanuméricos
  const m = memo.toUpperCase().match(/DEM\d{4}[A-Z0-9]{4,7}/);
  return m ? m[0] : null;
}

// ─── Correspondência com faturas ──────────────────────────────────────────────

/**
 * Cruza transações com faturas faturadas e não pagas.
 * Retorna array de objetos { transaction, bl, txid } apenas para matches.
 * Ignora transações cujo FITID já esteja registrado em alguma fatura (anti-duplo).
 */
function matchTransactions(transactions, blsArray) {
  // Monta mapa txid → BL (apenas faturados e não pagos)
  const txidMap = {};
  blsArray.forEach(b => {
    if (!b.billed || b.paid || !b.docnum) return;
    const tid = b.docnum.replace(/[^A-Za-z0-9]/g, '');
    txidMap[tid] = b;
  });

  // Conjunto de FITIDs já conciliados (evita duplicidade)
  const usedFitids = new Set();
  blsArray.forEach(b => { if (b.pixFitid) usedFitids.add(b.pixFitid); });

  const matches = [];
  transactions.forEach(tx => {
    if (tx.type !== 'CREDIT' || tx.amount <= 0) return;
    if (usedFitids.has(tx.fitid)) return; // já conciliado
    const txid = extractTxid(tx.memo);
    if (!txid) return;
    const bl = txidMap[txid];
    if (!bl) return;
    matches.push({ transaction: tx, bl, txid });
  });

  return matches;
}

// ─── Estado local do módulo ───────────────────────────────────────────────────

let _pendingMatches = []; // matches aguardando confirmação

// ─── UI: Modal de Importação ──────────────────────────────────────────────────

function openExtratoImport() {
  // Reset do estado
  _pendingMatches = [];
  const fileInput = document.getElementById('extrato-file-input');
  if (fileInput) fileInput.value = '';
  const dropZone = document.getElementById('extrato-drop-zone');
  if (dropZone) {
    dropZone.innerHTML = '<div class="drop-icon">⬆️</div><p><strong>Arraste ou selecione o extrato OFX</strong></p><p>(.ofx)</p>';
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
      const text = e.target.result;
      const transactions = parseOFX(text);

      if (transactions.length === 0) {
        dropZone.innerHTML = '<div class="drop-icon">⚠️</div><p><strong>Nenhuma transação encontrada no arquivo.</strong></p><p>Verifique se é um extrato OFX válido.</p>';
        return;
      }

      dropZone.innerHTML = `<div class="drop-icon">✅</div><p><strong>${file.name}</strong></p><p>${transactions.length} transação(ões) lida(s)</p>`;

      const matches = matchTransactions(transactions, window.bls || []);
      _pendingMatches = matches;
      renderReconciliationPreview(matches, transactions.length);
    } catch (err) {
      dropZone.innerHTML = '<div class="drop-icon">❌</div><p><strong>Erro ao processar arquivo.</strong></p><p>' + err.message + '</p>';
    }
  };
  reader.onerror = () => {
    dropZone.innerHTML = '<div class="drop-icon">❌</div><p><strong>Erro ao ler o arquivo.</strong></p>';
  };
  reader.readAsText(file, 'UTF-8');
}

function renderReconciliationPreview(matches, totalTransactions) {
  const preview = document.getElementById('extrato-preview');
  const confirmBtn = document.getElementById('btn-confirmar-conciliacao');

  if (matches.length === 0) {
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="padding:16px;background:#fef9c3;border:1px solid #fde047;border-radius:8px;font-size:13px;color:#713f12;">
        <strong>Nenhuma correspondência encontrada.</strong><br>
        De ${totalTransactions} transação(ões) lida(s), nenhuma PIX pôde ser associada a uma fatura em aberto.<br>
        Verifique se as faturas possuem QR Code com txid (gerado após atualização do sistema).
      </div>`;
    confirmBtn.disabled = true;
    return;
  }

  const fmtBRL = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

  const rows = matches.map((m, i) => {
    const frozenTotal = m.bl.frozenTotal != null ? m.bl.frozenTotal : null;
    const totalStr = frozenTotal != null ? fmtBRL(frozenTotal) : '—';
    return `
      <tr>
        <td style="padding:8px 10px;">
          <input type="checkbox" class="recon-check" data-idx="${i}" checked style="cursor:pointer;">
        </td>
        <td style="padding:8px 10px;font-weight:600;color:#166534;">${m.bl.bl || m.bl.id}</td>
        <td style="padding:8px 10px;font-size:12px;color:#6b7280;">${m.bl.docnum || '—'}</td>
        <td style="padding:8px 10px;font-size:12px;">${m.bl.client || '—'}</td>
        <td style="padding:8px 10px;font-size:12px;color:#1d4ed8;">${fmtBRL(m.transaction.amount)}</td>
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${totalStr}</td>
        <td style="padding:8px 10px;font-size:12px;">${fmtDate(m.transaction.date)}</td>
      </tr>`;
  }).join('');

  preview.style.display = 'block';
  preview.innerHTML = `
    <div style="margin-top:14px;">
      <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:8px;">
        ${matches.length} correspondência(s) encontrada(s) de ${totalTransactions} transação(ões)
      </div>
      <div style="overflow-x:auto;border:1px solid #d1fae5;border-radius:8px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f0fdf4;border-bottom:1px solid #d1fae5;">
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;"></th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">BL</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Fatura</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Cliente</th>
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
    if (chk.checked) {
      const idx = parseInt(chk.dataset.idx, 10);
      if (_pendingMatches[idx]) selected.push(_pendingMatches[idx]);
    }
  });

  if (selected.length === 0) {
    toast('Nenhuma fatura selecionada para conciliar.', 'error');
    return;
  }

  selected.forEach(m => {
    const b = m.bl;
    const tx = m.transaction;

    const roe   = (b.billed && b.frozenRoe   != null) ? b.frozenRoe   : effectiveROE(b);
    const total = (b.billed && b.frozenTotal != null) ? b.frozenTotal : blTotal(b, null);

    b.paid               = true;
    b.paidAt             = tx.date;
    b.frozenRoe          = roe;
    b.frozenTotal        = total;
    b.conciliadoPorExtrato = true;
    b.pixFitid           = tx.fitid;

    logAuditAction('conciliacao_automatica', {
      blId:   b.id,
      bl:     b.bl,
      docnum: b.docnum,
      total:  total,
      paidAt: tx.date,
      fitid:  tx.fitid,
      txid:   m.txid
    });

    saveOne(b);
  });

  closeModal('modal-extrato-import');
  renderList();
  toast(`${selected.length} fatura(s) conciliada(s) com sucesso! ✔`, 'success');
}
