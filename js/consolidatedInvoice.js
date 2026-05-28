// ============================================================
// consolidatedInvoice.js — Fatura Consolidada (1 fatura ↔ N BLs)
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Permite emitir uma ÚNICA fatura que agrupa vários BLs do mesmo
// consignatário (CNPJ). O número da fatura (docnum) é gravado em
// TODOS os BLs do grupo, e usado como txid do PIX QR code. Quando
// o extrato do banco for importado pela conciliação, o txid (igual
// ao docnum da fatura consolidada) marcará TODOS os BLs do grupo
// como pagos de uma só vez.
//
// Dependências (carregadas antes via <script src>):
//   utils.js     — toast, fmtBRL, fmtDate, openModal, closeModal
//   rates.js     — calcUSD, getRateForBL, daysBetween
//   billing.js   — bls, blTotal, effectiveROE, saveOne, logAuditAction,
//                  buildPixPayload, ptaxState
//   clients.js   — getClientByCnpj, formatCnpj, getEmailsForBL
//   consolidated.js — _consSelectedBLs (Set de BL ids selecionados)
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

// Retorna a lista de BLs (objetos) que compõem uma fatura consolidada,
// dado o docnum. Atravessa o array global `bls` procurando BLs com
// docnum igual.
function getBLsByConsolidatedDocnum(docnum) {
  if (!docnum) return [];
  const norm = String(docnum).toUpperCase();
  return (typeof bls !== 'undefined' ? bls : []).filter(b =>
    String(b.docnum || '').toUpperCase() === norm
  );
}

// ────────────────────────────────────────────────────────────
// Cálculo do total individual de um BL (em BRL, já com desconto)
// Reaproveita a regra de billing.blTotal() respeitando frozen.
// ────────────────────────────────────────────────────────────
function _consolBLTotal(b, roe) {
  if ((b.paid || b.billed) && b.frozenTotal != null) return b.frozenTotal;
  return blTotal(b, roe);
}

// ────────────────────────────────────────────────────────────
// Emissão da fatura consolidada
// ────────────────────────────────────────────────────────────
// 1. Valida seleção (mínimo 2 BLs do mesmo CNPJ, todos não pagos)
// 2. Gera docnum único (DEMC-…)
// 3. Para cada BL: grava docnum compartilhado, marca billed, congela
//    ROE e total individual, registra metadados do grupo, salva.
// 4. Abre a fatura consolidada em janela para impressão/PDF.
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

  // ROE precisa estar disponível (igual à emissão de fatura individual)
  const roe = effectiveROE(selected[0]);
  if (!roe) {
    alert('⚠ PTAX não disponível.\n\nAguarde o carregamento da cotação para emitir a fatura consolidada.');
    return;
  }

  // Calcula totais ANTES de gravar (cada BL recebe o seu fatiamento;
  // congela ROE e total no momento da emissão)
  const slices = selected.map(b => {
    const total = blTotal(b, roe);
    return { b, total };
  });
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
    docnum,
    groupId,
    cnpj,
    cliente: getClientByCnpj(cnpj)?.name || selected[0].client,
    blIds,
    total: grandTotal,
    qtd: selected.length
  });

  closeModal('modal-consolidated');
  if (typeof renderList === 'function') renderList();
  toast(`Fatura consolidada ${docnum} emitida (${selected.length} BLs). 📄`, 'success');

  // Abre a fatura para visualização/impressão
  openConsolidatedInvoiceView(docnum);
}

// ────────────────────────────────────────────────────────────
// Renderização do HTML da fatura consolidada
// ────────────────────────────────────────────────────────────
function _renderConsolidatedInvoiceHTML(docnum) {
  const group = getBLsByConsolidatedDocnum(docnum);
  if (!group.length) return '<p>Fatura consolidada não encontrada.</p>';

  const first = group[0];
  const cliente = (getClientByCnpj(first.cnpj)?.name) || first.client || '—';
  const cnpjFmt = formatCnpj(first.cnpj || '');
  const venc = first.venc
    ? new Date(first.venc + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—';
  const emissao = (first.consolidatedAt || first.billedAt || new Date().toISOString().slice(0, 10));
  const emissaoFmt = new Date(emissao + 'T12:00:00').toLocaleDateString('pt-BR');

  const roe = first.frozenRoe || effectiveROE(first);
  const roeFmt = roe
    ? roe.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
    : '—';

  // Para cada BL → seção com containers e subtotal
  let grandTotal = 0;
  const blSections = group.map(b => {
    const subtotal = (b.frozenTotal != null) ? b.frozenTotal : blTotal(b, roe);
    grandTotal += subtotal;

    const containerRows = (b.containers || []).filter(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      return dc !== null && calcUSD(dc, getRateForBL(b, c.type), b.ov1 || null, b.ov2 || null).totalUSD > 0;
    }).map(c => {
      const dc   = daysBetween(c.discharge, c.emptyReturn);
      const rate = getRateForBL(b, c.type);
      const calc = calcUSD(dc, rate, b.ov1 || null, b.ov2 || null);
      const brl  = calc.totalUSD * roe;
      const dch  = c.discharge ? new Date(c.discharge + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
      const ret  = c.emptyReturn ? new Date(c.emptyReturn + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
      return `
        <tr>
          <td>${c.container || '—'}</td>
          <td>${c.type || '—'}</td>
          <td style="text-align:center">${calc.diasP1 || '—'}</td>
          <td style="text-align:center">$${(calc.usdP1 || 0).toFixed(2)}</td>
          <td style="text-align:center">${calc.diasP2 || '—'}</td>
          <td style="text-align:center">${calc.diasP2 ? '$' + (calc.usdP2 || 0).toFixed(2) : '—'}</td>
          <td style="text-align:center">${dch}</td>
          <td style="text-align:center">${ret}</td>
          <td style="text-align:right">R$&nbsp;${brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`;
    }).join('');

    return `
      <div class="ci-bl-block">
        <div class="ci-bl-head">
          <div><strong>BL:</strong> ${b.bl || '—'} &nbsp;·&nbsp; <strong>Navio:</strong> ${b.vessel || '—'} &nbsp;·&nbsp; <strong>POL/POD:</strong> ${(b.pol || '—')} → ${(b.pod || '—')}</div>
          <div class="ci-bl-sub">Subtotal deste BL: <strong>R$&nbsp;${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
        </div>
        <table class="ci-tbl">
          <thead>
            <tr>
              <th>CONTAINER</th><th>TIPO</th>
              <th>DIAS 1º PER.</th><th>USD/Dia</th>
              <th>DIAS 2º PER.</th><th>USD/Dia</th>
              <th>DESCARGA</th><th>RETORNO</th><th>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>${containerRows || '<tr><td colspan="9" style="text-align:center;color:#888;">Sem containers com cobrança</td></tr>'}</tbody>
        </table>
      </div>`;
  }).join('');

  // PIX QR code: o txid é o próprio docnum consolidado.
  // A conciliação faz _normTxid(docnum) e bate com o identificador da planilha.
  const pixPayload = buildPixPayload(
    '06352972000121',
    'TRANSHIPPING AGENC MARITIMO',
    'VIT',
    parseFloat(grandTotal.toFixed(2)),
    docnum
  );

  const grandFmt = grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `
    <div class="ci-doc">
      <div class="ci-header">
        <div class="ci-left">
          <div class="ci-title">FATURA DE SOBREESTADIA — CONSOLIDADA</div>
          <div class="ci-emit">TRANSHIPPING AGENCIAMENTO MARÍTIMO LTDA.</div>
          <div class="ci-emit-sub">CNPJ: 06.352.972/0001-21 · Vitória/ES</div>
        </div>
        <div class="ci-right">
          <div class="ci-num">Nº ${docnum}</div>
          <div class="ci-meta">Emissão: <strong>${emissaoFmt}</strong></div>
          <div class="ci-meta">Vencimento: <strong>${venc}</strong></div>
          <div class="ci-meta">BLs incluídos: <strong>${group.length}</strong></div>
        </div>
      </div>

      <div class="ci-client">
        <div><span class="ci-lbl">SACADO:</span> <strong>${cliente}</strong></div>
        <div><span class="ci-lbl">CNPJ:</span> ${cnpjFmt}</div>
      </div>

      <div class="ci-note">
        Esta fatura consolidada quita os <strong>${group.length} BLs</strong> listados abaixo
        com um único pagamento via PIX. O identificador <code>${docnum}</code> é o
        <em>txid</em> do QR code e será reconhecido pela conciliação bancária.
      </div>

      ${blSections}

      <div class="ci-totals">
        <div class="ci-totals-line">
          <span>PTAX utilizada (R$/USD):</span><strong>${roeFmt}</strong>
        </div>
        <div class="ci-totals-grand">
          <span>TOTAL CONSOLIDADO:</span><strong>R$&nbsp;${grandFmt}</strong>
        </div>
      </div>

      <div class="ci-pix">
        <div class="ci-pix-info">
          <div class="ci-pix-title">PIX — QR Code Cobrança</div>
          <div class="ci-pix-row"><span>Chave (CNPJ):</span> <strong>06.352.972/0001-21</strong></div>
          <div class="ci-pix-row"><span>Beneficiário:</span> <strong>TRANSHIPPING AGENCIAMENTO MARÍTIMO LTDA.</strong></div>
          <div class="ci-pix-row"><span>Valor:</span> <strong>R$ ${grandFmt}</strong></div>
          <div class="ci-pix-row"><span>Identificador (txid):</span> <code>${docnum}</code></div>
          <div class="ci-pix-copia">
            <div class="ci-pix-lbl">PIX Copia e Cola:</div>
            <textarea readonly onclick="this.select();" rows="3">${pixPayload}</textarea>
          </div>
        </div>
        <div class="ci-pix-qr">
          <div id="pix-qr-${docnum}" class="ci-qr-box"></div>
          <div class="ci-qr-cap">Escaneie para pagar</div>
        </div>
      </div>

      <div class="ci-foot">
        Dúvidas: eqp@fwlog.com.br · Após o pagamento, a conciliação automática
        marcará todos os ${group.length} BLs desta fatura como quitados.
      </div>
    </div>
  `;
}

// ────────────────────────────────────────────────────────────
// CSS embutido do documento (independente do app, para print)
// ────────────────────────────────────────────────────────────
function _consolidatedInvoiceCSS() {
  return `
    *{box-sizing:border-box;}
    html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:#f1f5f9;}
    .top-bar{position:sticky;top:0;z-index:200;display:flex;align-items:center;gap:12px;padding:10px 20px;background:#0f2a4a;color:#fff;font-size:13px;}
    .top-bar strong{flex:1;}
    .top-bar button{padding:7px 20px;background:#f59e0b;color:#111;border:none;border-radius:6px;cursor:pointer;font-weight:700;}
    .ci-doc{background:#fff;max-width:900px;margin:20px auto;padding:32px 36px;box-shadow:0 4px 14px rgba(0,0,0,.08);}
    .ci-header{display:flex;justify-content:space-between;border-bottom:2px solid #0f2a4a;padding-bottom:14px;margin-bottom:18px;}
    .ci-left .ci-title{font-size:18px;font-weight:800;color:#0f2a4a;letter-spacing:.5px;}
    .ci-left .ci-emit{font-size:13px;margin-top:4px;}
    .ci-left .ci-emit-sub{font-size:11px;color:#555;}
    .ci-right{text-align:right;}
    .ci-right .ci-num{font-family:monospace;font-size:15px;font-weight:700;color:#0f2a4a;}
    .ci-right .ci-meta{font-size:12px;color:#333;margin-top:2px;}
    .ci-client{display:flex;justify-content:space-between;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:13px;}
    .ci-client .ci-lbl{color:#0369a1;font-weight:600;}
    .ci-note{background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:10px 14px;font-size:12px;color:#713f12;margin-bottom:18px;}
    .ci-note code{background:#fff;padding:1px 5px;border-radius:3px;border:1px solid #fde047;font-family:monospace;}
    .ci-bl-block{margin-bottom:18px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;}
    .ci-bl-head{background:#f8fafc;padding:8px 12px;font-size:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid #e5e7eb;}
    .ci-bl-sub{color:#0f2a4a;}
    .ci-tbl{width:100%;border-collapse:collapse;font-size:11px;}
    .ci-tbl thead th{background:#0f2a4a;color:#fff;padding:6px 4px;font-size:10px;font-weight:600;letter-spacing:.3px;text-align:left;}
    .ci-tbl tbody td{padding:5px 6px;border-bottom:1px solid #f1f5f9;}
    .ci-totals{margin-top:12px;text-align:right;}
    .ci-totals-line{font-size:12px;color:#555;}
    .ci-totals-grand{margin-top:6px;background:#0f2a4a;color:#fff;display:inline-block;padding:8px 18px;border-radius:6px;font-size:15px;font-weight:700;}
    .ci-totals-grand span{margin-right:14px;font-weight:500;opacity:.85;}
    .ci-pix{margin-top:20px;display:flex;gap:18px;border:1px solid #d1fae5;border-radius:8px;padding:14px;background:#f0fdf4;}
    .ci-pix-info{flex:1;font-size:12px;}
    .ci-pix-title{font-size:13px;font-weight:700;color:#166534;margin-bottom:6px;}
    .ci-pix-row{margin:2px 0;}
    .ci-pix-row code{font-family:monospace;background:#fff;padding:1px 5px;border-radius:3px;border:1px solid #d1fae5;}
    .ci-pix-copia{margin-top:10px;}
    .ci-pix-lbl{font-size:11px;color:#166534;margin-bottom:2px;}
    .ci-pix-copia textarea{width:100%;font-family:monospace;font-size:10px;padding:6px;border:1px solid #d1fae5;border-radius:4px;background:#fff;resize:none;}
    .ci-pix-qr{display:flex;flex-direction:column;align-items:center;justify-content:center;}
    .ci-qr-box{width:130px;height:130px;background:#fff;border:1px solid #d1fae5;border-radius:6px;padding:6px;display:flex;align-items:center;justify-content:center;}
    .ci-qr-cap{font-size:10px;color:#166534;margin-top:4px;}
    .ci-foot{margin-top:18px;padding-top:10px;border-top:1px dashed #cbd5e1;font-size:11px;color:#666;text-align:center;}
    @page{margin:14mm;}
    @media print{
      .top-bar{display:none!important;}
      html,body{background:#fff;}
      .ci-doc{box-shadow:none;margin:0;max-width:100%;padding:0;}
    }
  `;
}

// ────────────────────────────────────────────────────────────
// Abre a fatura consolidada em uma nova janela para print/PDF.
// Espera o QRCode.js carregar antes de gerar o QR.
// ────────────────────────────────────────────────────────────
function openConsolidatedInvoiceView(docnum) {
  const group = getBLsByConsolidatedDocnum(docnum);
  if (!group.length) {
    toast('Fatura consolidada não encontrada.', 'error');
    return;
  }
  const html = _renderConsolidatedInvoiceHTML(docnum);
  const css  = _consolidatedInvoiceCSS();
  const title = `Fatura Consolidada ${docnum} (${group.length} BLs)`;

  const doc = `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="UTF-8">
<title>${title}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<style>${css}</style>
</head><body>
<div class="top-bar">
  <strong>📄 ${title}</strong>
  <span style="opacity:.75;font-size:12px;">Ctrl+P para PDF</span>
  <button onclick="window.print()">🖨️ Imprimir / PDF</button>
</div>
${html}
<script>
(function(){
  function gen(){
    var el = document.getElementById('pix-qr-${docnum}');
    if (!el) return;
    if (typeof QRCode === 'undefined') { setTimeout(gen, 100); return; }
    el.innerHTML = '';
    var ta = document.querySelector('.ci-pix-copia textarea');
    var payload = ta ? ta.value : '';
    new QRCode(el, { text: payload, width: 120, height: 120, correctLevel: QRCode.CorrectLevel.M });
  }
  gen();
})();
<\/script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    toast('Permita pop-ups para visualizar a fatura.', 'error');
    return;
  }
  w.document.write(doc);
  w.document.close();
}

// ────────────────────────────────────────────────────────────
// Reabertura: localiza o docnum a partir de qualquer BL do grupo
// (útil para botão de re-abrir a partir da lista de BLs).
// ────────────────────────────────────────────────────────────
function openConsolidatedInvoiceForBL(blId) {
  const b = (typeof bls !== 'undefined' ? bls : []).find(x => x.id === blId);
  if (!b) { toast('BL não encontrado.', 'error'); return; }
  const docnum = b.consolidatedDocnum || (isConsolidatedDocnum(b.docnum) ? b.docnum : null);
  if (!docnum) {
    toast('Este BL não pertence a uma fatura consolidada.', 'error');
    return;
  }
  openConsolidatedInvoiceView(docnum);
}

// Exporta no escopo global (carregado via <script src>, sem módulos)
window.genConsolidatedDocnum       = genConsolidatedDocnum;
window.isConsolidatedDocnum        = isConsolidatedDocnum;
window.getBLsByConsolidatedDocnum  = getBLsByConsolidatedDocnum;
window.issueConsolidatedInvoice    = issueConsolidatedInvoice;
window.openConsolidatedInvoiceView = openConsolidatedInvoiceView;
window.openConsolidatedInvoiceForBL = openConsolidatedInvoiceForBL;
