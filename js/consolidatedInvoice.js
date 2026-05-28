// ============================================================
// consolidatedInvoice.js — Fatura Consolidada (1 fatura ↔ N BLs)
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Visualmente IDÊNTICA à fatura única (mesma estrutura HTML, mesmas
// classes CSS, mesmo logo, mesmo cabeçalho, mesma tabela navy, mesmo
// total laranja, mesmo bloco PIX). A diferença está no conteúdo:
//   • Nº começa com DEMC- (txid distinto para conciliação)
//   • A tabela agrupa containers de N BLs com divisores por BL
//   • TOTAL e PIX são GRAND total (somatório de todos os BLs)
//   • Um único pagamento PIX quita todos os BLs do grupo
//
// Dependências (carregadas antes via <script src>):
//   utils.js           — toast, fmtBRL, fmtDate, longDate, cap
//   rates.js           — calcUSD, getRateForBL, daysBetween
//   billing.js         — bls, blTotal, effectiveROE, saveOne, logAuditAction,
//                        buildPixPayload, ptaxState, currentBL/Type/Docnum
//   clients.js         — getClientByCnpj, formatCnpj, getEmailsForBL
//   invoiceAssets.js   — window.INVOICE_LOGO_HTML
//   consolidated.js    — _consSelectedBLs (Set de BL ids selecionados)
// ============================================================

'use strict';

// ────────────────────────────────────────────────────────────
// Geração do número da fatura consolidada
// ────────────────────────────────────────────────────────────
// Formato: DEMC-YYYY-XXXXYYY
//   DEMC   → prefixo dedicado a fatura Consolidada (distingue de DEM-)
//   YYYY   → ano corrente
//   XXXX   → 4 chars base36 do timestamp (unicidade temporal)
//   YYY    → 3 chars do hash dos BL ids (determinístico para o grupo)
//
// A normalização do txid PIX remove o hífen, restando "DEMCYYYYXXXXYYY"
// (15 chars) — bem dentro do limite de 35 chars do padrão BACEN.
function genConsolidatedDocnum(blIds) {
  const year = new Date().getFullYear();
  const ts   = Date.now().toString(36).slice(-4).toUpperCase();
  const seed = (blIds || []).slice().sort().join('|').toUpperCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const suffix = (Math.abs(hash) % 1000).toString().padStart(3, '0');
  return `DEMC-${year}-${ts}${suffix}`;
}

// Identifica se um docnum é de fatura consolidada
function isConsolidatedDocnum(docnum) {
  return /^DEMC-\d{4}-/i.test(String(docnum || ''));
}

// Retorna a lista de BLs (objetos) que compõem uma fatura consolidada.
function getBLsByConsolidatedDocnum(docnum) {
  if (!docnum) return [];
  const norm = String(docnum).toUpperCase();
  return (typeof bls !== 'undefined' ? bls : []).filter(b =>
    String(b.docnum || '').toUpperCase() === norm
  );
}

// ────────────────────────────────────────────────────────────
// Emissão da fatura consolidada
// ────────────────────────────────────────────────────────────
function issueConsolidatedInvoice() {
  const cnpj = document.getElementById('cons-cnpj-hidden').value;
  if (!cnpj) {
    toast('Selecione um cliente primeiro.', 'error');
    return;
  }

  const allUnpaid = bls.filter(b => b.cnpj === cnpj && !b.paid);
  const selected = (typeof _consSelectedBLs !== 'undefined' && _consSelectedBLs.size > 0)
    ? allUnpaid.filter(b => _consSelectedBLs.has(b.id))
    : [];

  if (selected.length < 2) {
    toast('Selecione pelo menos 2 BLs para emitir uma fatura consolidada.', 'error');
    return;
  }

  const roe = effectiveROE(selected[0]);
  if (!roe) {
    alert('⚠ PTAX não disponível.\n\nAguarde o carregamento da cotação para emitir a fatura consolidada.');
    return;
  }

  const slices = selected.map(b => ({ b, total: blTotal(b, roe) }));
  const grandTotal = slices.reduce((s, x) => s + x.total, 0);

  if (grandTotal <= 0) {
    toast('Total da fatura consolidada é zero — nada a faturar.', 'error');
    return;
  }

  const blIds   = selected.map(b => b.id);
  const docnum  = genConsolidatedDocnum(blIds);
  const groupId = 'cgrp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const today   = new Date().toISOString().slice(0, 10);

  const confirmMsg =
    `Emitir fatura consolidada para ${selected.length} BLs?\n\n` +
    `Cliente: ${(getClientByCnpj(cnpj)?.name) || selected[0].client || cnpj}\n` +
    `CNPJ:    ${formatCnpj(cnpj)}\n` +
    `Total:   ${fmtBRL(grandTotal)}\n` +
    `Nº Fatura: ${docnum}\n\n` +
    `Todos os BLs serão marcados como FATURADOS e congelados.\n` +
    `Ao receber o pagamento via PIX (mesmo txid), todos serão quitados juntos.`;
  if (!confirm(confirmMsg)) return;

  slices.forEach(({ b, total }) => {
    b.docnum               = docnum;        // ← txid compartilhado p/ conciliação
    b.billed               = true;
    b.billedAt             = today;
    if (!b.firstBilledAt) b.firstBilledAt = today;
    b.frozenRoe            = roe;
    b.frozenTotal          = total;         // fatiamento individual deste BL
    b.consolidatedDocnum   = docnum;        // marca explícita do grupo
    b.consolidatedGroupId  = groupId;
    b.consolidatedAt       = today;
    b.consolidatedTotal    = grandTotal;    // total do grupo (p/ exibição)
    b.consolidatedBLIds    = blIds.slice();
    saveOne(b);
  });

  logAuditAction('emissao_fatura_consolidada', {
    docnum, groupId, cnpj,
    cliente: getClientByCnpj(cnpj)?.name || selected[0].client,
    blIds, total: grandTotal, qtd: selected.length
  });

  closeModal('modal-consolidated');
  if (typeof renderList === 'function') renderList();
  toast(`Fatura consolidada ${docnum} emitida (${selected.length} BLs). 📄`, 'success');

  viewConsolidatedDoc(docnum);
}

// ────────────────────────────────────────────────────────────
// Renderização da fatura consolidada DENTRO de #doc-content
// (mesmo container/CSS que a fatura única → visualmente idêntica)
// ────────────────────────────────────────────────────────────
function _buildConsolidatedInvoiceHTML(group, docnum) {
  const first   = group[0];
  const roe     = first.frozenRoe || effectiveROE(first);
  const roeFmt  = roe.toFixed(4).replace('.', ',');
  const cliente = (getClientByCnpj(first.cnpj)?.name) || first.client || '—';
  const cnpjStr = first.cnpj || '';

  // Pré-calcula linhas da tabela (uma seção por BL, com divisor visual).
  let grandTotal = 0;
  const blInfoBlocks  = [];
  const tableSections = [];

  group.forEach((b, idx) => {
    const billable = (b.containers || []).map(c => {
      const dc   = daysBetween(c.discharge, c.emptyReturn);
      const rate = getRateForBL(b, c.type);
      const calc = calcUSD(dc, rate, b.ov1 || null, b.ov2 || null);
      return { c, calc, brl: calc.totalUSD * roe };
    }).filter(({ calc }) => calc.totalUSD > 0);

    const subtotal = (b.frozenTotal != null) ? b.frozenTotal : billable.reduce((s, x) => s + x.brl, 0);
    grandTotal += subtotal;

    // Bloco de informações do BL — mesmas inv-rows da fatura única, repetidas
    // por BL para preservar a identidade visual ("BL", "Container(s)",
    // "Navio/Voy", "From", "To").
    const ctrsStr = billable.map(x => x.c.container).join(', ');
    blInfoBlocks.push(`
    ${idx > 0 ? '<hr class="inv-hr-light">' : ''}
    <div class="inv-row"><span class="inv-lbl">BL ${idx + 1} de ${group.length}</span><span class="inv-val">${b.bl || '—'}</span></div>
    <div class="inv-row"><span class="inv-lbl">Container(s)</span><span class="inv-val">${ctrsStr || '—'}</span></div>
    <div class="inv-row"><span class="inv-lbl">Navio/Voy:</span><span class="inv-val">${b.vessel || '—'}</span></div>
    <div class="inv-row"><span class="inv-lbl">From:</span><span class="inv-val">${b.pol || '—'}</span></div>
    <div class="inv-row"><span class="inv-lbl">To:</span><span class="inv-val">${b.pod || '—'}</span></div>`);

    // Linhas da tabela: divisor por BL + uma linha por container cobrável.
    const divider = `
      <tr class="inv-bl-divider">
        <td colspan="9">
          <span class="inv-bl-tag">BL ${idx + 1}</span>
          <strong>${b.bl || '—'}</strong>
          &nbsp;·&nbsp; ${b.vessel || '—'}
          &nbsp;·&nbsp; ${b.pol || '—'} → ${b.pod || '—'}
          <span class="inv-bl-sub">${fmtBRL(subtotal)}</span>
        </td>
      </tr>`;
    const rowsHTML = billable.map(({ c, calc, brl }) => `
      <tr>
        <td>${c.container || '—'}</td>
        <td>${c.type || '—'}</td>
        <td>${calc.diasP1 || 0}</td>
        <td>${calc.usdP1.toFixed(2)}</td>
        <td>${calc.diasP2 || 0}</td>
        <td>${calc.usdP2.toFixed(2)}</td>
        <td>${fmtDate(c.discharge)}</td>
        <td>${fmtDate(c.emptyReturn)}</td>
        <td style="font-weight:600">${fmtBRL(brl)}</td>
      </tr>`).join('');
    tableSections.push(divider + rowsHTML);
  });

  // Vencimento: usa o do primeiro BL (todos do mesmo grupo costumam compartilhar).
  if (!first.venc) first.venc = nextBusinessDay(null);
  const vencFmt = fmtDate(first.venc) || '—';

  // PIX: txid = docnum consolidado → conciliação bate em TODOS os BLs do grupo.
  const pixPayload = buildPixPayload(
    '06352972000121',
    'TRANSHIPPING AGENC MARITIMO',
    'VIT',
    parseFloat(grandTotal.toFixed(2)),
    docnum
  );

  const logoHTML = window.INVOICE_LOGO_HTML || '';

  return {
    html: `
  <div class="invoice">
    <div class="inv-header">
      <div class="inv-logo-area">
        ${logoHTML}
      </div>
      <div class="inv-num">Nº ${docnum}</div>
    </div>
    <div class="inv-title">FATURA DE SOBREESTADIA DE CONTAINER</div>
    <hr class="inv-hr">
    <div class="inv-row"><span class="inv-lbl">Cliente:</span><span class="inv-val">${cliente}${cnpjStr ? '<br>CNPJ: ' + cnpjStr : ''}</span></div>
    <hr class="inv-hr-light">
    ${blInfoBlocks.join('\n')}

    <div style="display:flex;justify-content:flex-end;margin-bottom:0;">
      <div class="roe-box" style="min-width:160px;"><span>ROE</span><span>${roeFmt}</span></div>
    </div>
    <table class="inv-tbl">
      <thead><tr>
        <th>CONTAINER</th><th>TIPO</th>
        <th>DIAS 1º PER.</th><th>USD/Dia</th>
        <th>DIAS 2º PER.</th><th>USD/Dia</th>
        <th>DESCARGA</th><th>RETORNO</th><th>LÍQUIDO</th>
      </tr></thead>
      <tbody>
        ${tableSections.join('\n')}
        <tr class="inv-total-row">
          <td colspan="8" class="inv-total-lbl">TOTAL:</td>
          <td class="inv-total-val">${fmtBRL(grandTotal)}</td>
        </tr>
        <tr class="inv-venc-row">
          <td colspan="8" style="text-align:right;padding:7px 12px;font-weight:600">VENCIMENTO DIA</td>
          <td class="inv-venc-highlight">${vencFmt}</td>
        </tr>
      </tbody>
    </table>
    <div class="inv-pix">
      <div class="inv-pix-qr" id="pix-qr-${docnum}"></div>
      <div class="inv-pix-info">
        <strong>Pagamento via PIX</strong>
        Escaneie o QR Code ao lado ou utilize o código Pix Copia e Cola abaixo para realizar o pagamento.<br>
        Valor da fatura: <strong>${fmtBRL(grandTotal)}</strong>
        <div class="inv-pix-copiacola">
          <span class="inv-pix-copiacola-label">Pix Copia e Cola</span>
          <span class="inv-pix-copiacola-code">${pixPayload}</span>
        </div>
      </div>
    </div>
    <div class="inv-date">Vitória, ${cap(longDate())}</div>
  </div>`,
    pixPayload,
    grandTotal
  };
}

// ────────────────────────────────────────────────────────────
// Abre a fatura consolidada na mesma view (#doc-view) da fatura única.
// Garante toolbar, CSS e fluxo de impressão idênticos.
// ────────────────────────────────────────────────────────────
function viewConsolidatedDoc(docnum) {
  const group = getBLsByConsolidatedDocnum(docnum);
  if (!group.length) {
    toast('Fatura consolidada não encontrada.', 'error');
    return;
  }

  // Sincroniza o estado global da view com o grupo, para que a toolbar
  // (printDoc, sendInvoiceEmail, editar valor) opere de forma coerente.
  currentBL     = group[0];                  // BL "âncora" da view
  currentType   = 'invoice';
  currentDocnum = docnum;
  ovTotal = null; ovRoe = null;

  const { html, pixPayload } = _buildConsolidatedInvoiceHTML(group, docnum);
  document.getElementById('doc-content').innerHTML = html;

  // Toolbar: ajusta botões (mesma lógica de viewDoc, mas adaptada à
  // natureza consolidada — valores SEMPRE congelados).
  const emailBtn = document.getElementById('email-btn');
  if (emailBtn) emailBtn.style.display = getEmailsForBL(currentBL).length > 0 ? '' : 'none';
  const editBtn = document.getElementById('edit-val-btn');
  if (editBtn) {
    editBtn.textContent  = '🔒 Valores Congelados';
    editBtn.style.color  = 'var(--navy)';
    editBtn.style.borderColor = '#93c5fd';
    editBtn.style.cursor = 'default';
  }

  // QR Code PIX (mesma chamada usada em renderDoc)
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

  document.getElementById('app').style.display = 'none';
  document.getElementById('doc-view').classList.add('active');
  window.scrollTo(0, 0);
}

// ────────────────────────────────────────────────────────────
// E-mail da fatura consolidada (mailto:) — usado pelo botão
// "Enviar por E-mail" da toolbar quando a view atual é consolidada.
// ────────────────────────────────────────────────────────────
function sendConsolidatedInvoiceEmail(docnum) {
  const group = getBLsByConsolidatedDocnum(docnum);
  if (!group.length) { toast('Fatura consolidada não encontrada.', 'error'); return; }
  const first = group[0];
  const grandTotal = group.reduce((s, b) =>
    s + (b.frozenTotal != null ? b.frozenTotal : blTotal(b, b.frozenRoe || effectiveROE(b))), 0);
  const totalFmt = grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const vencFmt  = first.venc ? new Date(first.venc + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const emails   = getEmailsForBL(first);
  const to       = encodeURIComponent((emails && emails.join(', ')) || first.email || '');
  const cliente  = (getClientByCnpj(first.cnpj)?.name) || first.client || 'Cliente';
  const subject  = encodeURIComponent(`${docnum} - Fatura de Demurrage Consolidada (${group.length} BLs)`);
  const blsBlock = group.map(b => {
    const sub = (b.frozenTotal != null ? b.frozenTotal : blTotal(b, b.frozenRoe || effectiveROE(b)));
    const subFmt = sub.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const ctrs = (b.containers || []).map(c => c.container).join(', ');
    return `  • BL ${b.bl || '—'}  ·  Navio: ${b.vessel || '—'}  ·  R$ ${subFmt}\n    Containers: ${ctrs || '—'}`;
  }).join('\n');

  const body = encodeURIComponent(
`Prezado(a) ${cliente.split(' ')[0] || 'Cliente'},

Encaminhamos em anexo a Fatura CONSOLIDADA de Sobreestadia de Container,
que reúne ${group.length} BLs e é quitada com um único pagamento PIX:

  Nº Fatura  : ${docnum}
  Total      : R$ ${totalFmt}
  Vencimento : ${vencFmt}

BLs incluídos:
${blsBlock}

Para pagamento via PIX, utilize a chave: 06.352.972/0001-21 (CNPJ).
O identificador (txid) do QR Code é o próprio número desta fatura
(${docnum}), e quitará automaticamente todos os ${group.length} BLs
listados acima na conciliação bancária.


Atenciosamente,
TRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.
CNPJ: 06.352.972/0001-21`
  );

  logAuditAction('envio_email_consolidada', {
    docnum, qtd: group.length, blIds: group.map(b => b.id), total: grandTotal
  });
  window.location.href = `mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${body}`;
}

// Reabre a fatura consolidada a partir de qualquer BL do grupo
function openConsolidatedInvoiceForBL(blId) {
  const b = (typeof bls !== 'undefined' ? bls : []).find(x => x.id === blId);
  if (!b) { toast('BL não encontrado.', 'error'); return; }
  const docnum = b.consolidatedDocnum || (isConsolidatedDocnum(b.docnum) ? b.docnum : null);
  if (!docnum) {
    toast('Este BL não pertence a uma fatura consolidada.', 'error');
    return;
  }
  viewConsolidatedDoc(docnum);
}

// Alias retrocompat. — versão anterior abria janela nova; agora redireciona
// para a view padrão (#doc-view) para preservar identidade visual.
function openConsolidatedInvoiceView(docnum) { viewConsolidatedDoc(docnum); }

// Exporta no escopo global
window.genConsolidatedDocnum        = genConsolidatedDocnum;
window.isConsolidatedDocnum         = isConsolidatedDocnum;
window.getBLsByConsolidatedDocnum   = getBLsByConsolidatedDocnum;
window.issueConsolidatedInvoice     = issueConsolidatedInvoice;
window.viewConsolidatedDoc          = viewConsolidatedDoc;
window.sendConsolidatedInvoiceEmail = sendConsolidatedInvoiceEmail;
window.openConsolidatedInvoiceView  = openConsolidatedInvoiceView;
window.openConsolidatedInvoiceForBL = openConsolidatedInvoiceForBL;
