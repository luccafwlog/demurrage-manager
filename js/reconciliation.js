// ── Conciliação Bancária via Extrato OFX ──────────────────────────────────
// Importa extrato OFX do Itaú e concilia pagamentos PIX com faturas emitidas.
// Estratégia de correspondência: CNPJ do pagador (extraído do MEMO) + valor exato.
// O banco não repassa o txid no OFX; o CNPJ aparece no final do campo MEMO.

'use strict';

// ─── Parser OFX ──────────────────────────────────────────────────────────────

function _ofxTag(block, tag) {
  const re = new RegExp('<' + tag + '>([^<\\r\\n]+)', 'i');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function _ofxDate(raw) {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.length < 8) return '';
  return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8);
}

function parseOFX(text) {
  const transactions = [];
  const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let idx = 0;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const block  = m[1];
    const date   = _ofxDate(_ofxTag(block, 'DTPOSTED'));
    const amount = parseFloat(_ofxTag(block, 'TRNAMT').replace(',', '.')) || 0;
    const memo   = _ofxTag(block, 'MEMO') || _ofxTag(block, 'NAME');

    // TRNTYPE: OFX usa "CREDIT"/"DEBIT"; OFC usa "1" para ambos (sinal do valor define)
    const rawType = _ofxTag(block, 'TRNTYPE').toUpperCase();
    let type;
    if (rawType === 'CREDIT' || rawType === 'DEBIT') {
      type = rawType;
    } else {
      type = amount >= 0 ? 'CREDIT' : 'DEBIT';
    }

    // FITID: OFC exporta vazio — gera ID sintético para anti-duplicidade
    const rawFitid = _ofxTag(block, 'FITID');
    const fitid = rawFitid || `${date}-${Math.abs(amount).toFixed(2)}-${idx}`;

    transactions.push({ type, date, amount: Math.abs(amount), fitid, memo });
    idx++;
  }
  return transactions;
}

// ─── Extração de CNPJ do campo MEMO ──────────────────────────────────────────

function _normCnpj(str) {
  return (str || '').replace(/\D/g, '');
}

/**
 * Extrai o CNPJ do pagador do campo MEMO.
 * O Itaú coloca o CNPJ formatado no final:
 *   "PIX QR CODE RECEBIDO NOME14/04 NOME COMPLETO LTDA 12.345.678/0001-90"
 * Retorna string de 14 dígitos ou null.
 */
function extractCNPJ(memo) {
  if (!memo) return null;
  const m = memo.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s*$/);
  if (!m) return null;
  const norm = _normCnpj(m[1]);
  return norm.length === 14 ? norm : null;
}

// ─── Correspondência com faturas ──────────────────────────────────────────────

/**
 * Cruza transações com faturas faturadas e não pagas.
 * Para cada transação CREDIT com CNPJ identificável no MEMO, busca BLs onde:
 *   - b.cnpj (normalizado) === CNPJ extraído
 *   - b.frozenTotal ≈ tx.amount (tolerância de R$ 0,02)
 *
 * Resultado por match:
 *   { transaction, bl, candidates, ambiguous }
 *   - ambiguous: false → correspondência única (bl = o BL encontrado)
 *   - ambiguous: true  → múltiplos BLs possíveis (usuário escolhe via select)
 */
function matchTransactions(transactions, blsArray) {
  // Monta mapa CNPJ → [BLs faturados e não pagos]
  const cnpjMap = {};
  blsArray.forEach(b => {
    if (!b.billed || b.paid) return;
    const cnpj = _normCnpj(b.cnpj);
    if (!cnpj || cnpj.length !== 14) return;
    if (!cnpjMap[cnpj]) cnpjMap[cnpj] = [];
    cnpjMap[cnpj].push(b);
  });

  // FITIDs já conciliados (anti-duplicidade)
  const usedFitids = new Set();
  blsArray.forEach(b => { if (b.pixFitid) usedFitids.add(b.pixFitid); });

  const matches = [];
  transactions.forEach(tx => {
    if (tx.type !== 'CREDIT' || tx.amount <= 0) return;
    if (usedFitids.has(tx.fitid)) return;

    const cnpj = extractCNPJ(tx.memo);
    if (!cnpj) return;

    const candidates = (cnpjMap[cnpj] || []).filter(b =>
      b.frozenTotal != null && Math.abs(b.frozenTotal - tx.amount) < 0.02
    );

    if (candidates.length === 0) return;

    matches.push({
      transaction: tx,
      bl:          candidates[0],
      candidates,
      ambiguous:   candidates.length > 1
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
        dropZone.innerHTML = '<div class="drop-icon">⚠️</div><p><strong>Nenhuma transação encontrada.</strong></p><p>Verifique se é um extrato OFX válido.</p>';
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
  reader.readAsText(file, 'UTF-8');
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function renderReconciliationPreview(matches, totalTransactions, blsRef) {
  const preview    = document.getElementById('extrato-preview');
  const confirmBtn = document.getElementById('btn-confirmar-conciliacao');

  if (matches.length === 0) {
    const elegíveis = (blsRef || []).filter(b => b.billed && !b.paid && b.cnpj);
    const dica = elegíveis.length === 0
      ? 'Nenhuma fatura faturada e não paga com CNPJ cadastrado encontrada. Certifique-se de ter emitido a fatura e de que o cliente possui CNPJ registrado no BL.'
      : `${elegíveis.length} fatura(s) elegível(is) no sistema. Nenhum CNPJ do extrato coincidiu com o valor de uma fatura em aberto.`;
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

    return `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:8px 10px;">
          <input type="checkbox" class="recon-check" data-idx="${i}" checked style="cursor:pointer;">
        </td>
        <td style="padding:8px 10px;">${blCell}</td>
        <td style="padding:8px 10px;font-size:12px;">${m.bl.client || '—'}</td>
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
      // Lê qual candidato o usuário escolheu no select
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

    bl.paid                = true;
    bl.paidAt              = tx.date;
    bl.frozenRoe           = roe;
    bl.frozenTotal         = total;
    bl.conciliadoPorExtrato = true;
    bl.pixFitid            = tx.fitid;

    logAuditAction('conciliacao_automatica', {
      blId:   bl.id,
      bl:     bl.bl,
      docnum: bl.docnum,
      total,
      paidAt: tx.date,
      fitid:  tx.fitid,
      cnpj:   bl.cnpj
    });

    saveOne(bl);
  });

  closeModal('modal-extrato-import');
  renderList();
  toast(`${selected.length} fatura(s) conciliada(s) com sucesso! ✔`, 'success');
}
