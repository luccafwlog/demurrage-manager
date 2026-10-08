// ============================================================
// complementar.js — Fatura complementar (diferença sobre fatura já emitida)
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Quando uma fatura já emitida cobrou menos que o devido (ex.: tipo de
// container errado), a original fica exatamente como foi emitida e a diferença
// vira um registro próprio em `bls`, com nº DEM, vencimento e PIX próprios:
//   complementOf / complementOfDocnum — vínculo com a fatura original
//   complementReason                  — motivo (obrigatório)
//   containers[].creditUSD            — USD já cobrado do container na original
//   containers[].billedType           — tipo usado na original (exibição)
// O valor sai de calcContainer() (rates.js), que desconta creditUSD. A ROE segue
// a regra das demais faturas: PTAX do dia até faturar, congelada depois.
// A complementar fica fora das buscas por nº de BL (rastreamento, importação)
// e da fatura consolidada.
//
// Dependências: billing.js (bls, CONTAINER_TYPES, saveOne, renderList, toast,
// uid, genDocnum, nextBusinessDay, computeReadyAt, effectiveROE, fmtBRL,
// showGenericModal, logAuditAction), rates.js, tracking.js (trkData).
// ============================================================

function complementsOf(b) {
  return bls.filter(x => x.complementOf === b.id);
}

function _compEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _compUSD(v) {
  return 'USD ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Tipo atual do container no Controle de Containers (sugestão do tipo correto).
function _compTrackingType(b, c) {
  const list = typeof trkData !== 'undefined' ? trkData : [];
  const r = list.find(x => x.container === c.container && x.bl === b.bl);
  return r && r.type ? r.type : null;
}

// Linhas candidatas: containers com dias acima do free time na original.
// creditUSD é o que a original cobrou (antes do desconto, que vale no BL todo).
function _compCandidates(b) {
  const ft = b.freeTime != null ? b.freeTime : 21;
  return (b.containers || [])
    .filter(c => daysBetween(c.discharge, c.emptyReturn) > ft)
    .map(c => {
      const trkType = _compTrackingType(b, c);
      return {
        c,
        billedType: c.type,
        suggested: trkType || c.type,
        creditUSD: Math.round(calcContainer(b, c).totalUSD * 100) / 100,
      };
    })
    .sort((x, y) => (y.suggested !== y.billedType) - (x.suggested !== x.billedType));
}

// Valor correto do container com o tipo escolhido, na base da complementar
// (tabela padrão, free time da original, sem USD/dia manual).
function _compCorrectUSD(b, c, type) {
  return calcContainer({ freeTime: b.freeTime }, { ...c, type, creditUSD: 0 }).totalUSD;
}

function openComplementModal(id) {
  const b = bls.find(x => x.id === id);
  if (!b || b.complementOf) return;
  if (!b.billed && !b.paid) {
    toast('A fatura complementar é para faturas já emitidas. Esta ainda pode ser editada.', 'error');
    return;
  }
  const existing = complementsOf(b);
  if (existing.length) {
    toast(`Já existe a complementar ${existing.map(x => x.docnum).join(', ')} para esta fatura. Edite ou exclua antes de gerar outra.`, 'error');
    return;
  }

  const cands = _compCandidates(b);
  if (!cands.length) {
    toast('Nenhum container desta fatura passou do free time.', 'error');
    return;
  }
  window._compCands = cands;
  window._compBLId = b.id;

  const d = b.discount && b.discount.value > 0 ? b.discount : null;
  const typeOpts = sel => {
    const types = CONTAINER_TYPES.slice();
    if (sel && !types.includes(sel)) types.unshift(sel);
    return types.map(t => `<option value="${t}"${t === sel ? ' selected' : ''}>${t}</option>`).join('');
  };
  const rows = cands.map((x, i) => `
    <tr data-i="${i}">
      <td style="padding:5px 6px;font-family:monospace;">${x.c.container}</td>
      <td style="padding:5px 6px;text-align:center;">${daysBetween(x.c.discharge, x.c.emptyReturn)}</td>
      <td style="padding:5px 6px;">${x.billedType || '—'}</td>
      <td style="padding:5px 6px;"><select class="comp-type" onchange="_compRecalc()" style="width:110px">${typeOpts(x.suggested)}</select></td>
      <td style="padding:5px 6px;text-align:right;">${x.creditUSD.toFixed(2)}</td>
      <td style="padding:5px 6px;text-align:right;" data-correct>—</td>
      <td style="padding:5px 6px;text-align:right;font-weight:600;" data-diff>—</td>
    </tr>`).join('');

  const discTypes = [['comercial','Desconto comercial'],['datas','Ajuste de datas'],['cortesia','Cortesia'],['acordo','Acordo de pagamento'],['erro','Erro operacional']];
  const ovWarn = (b.ov1 || b.ov2)
    ? `<div style="margin-bottom:10px;padding:8px 10px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;font-size:12px;">A fatura original usa USD/dia manual. A complementar calcula pela tabela padrão.</div>`
    : '';

  const html = `
    <div style="font-size:13px;margin-bottom:10px;">
      Fatura original <strong>${b.docnum || '—'}</strong> · BL <strong>${b.bl}</strong> · ${_compEsc(b.client || '—')}<br>
      <span style="color:var(--muted);font-size:12px;">A original não é alterada. Cada linha cobra o valor no tipo correto menos o que já foi cobrado. Tipo sugerido a partir do Controle de Containers.</span>
    </div>
    ${ovWarn}
    <div style="max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead style="background:#f3f4f6;position:sticky;top:0;"><tr>
          <th style="padding:6px;text-align:left;">Container</th><th style="padding:6px;">Dias</th>
          <th style="padding:6px;text-align:left;">Tipo faturado</th><th style="padding:6px;text-align:left;">Tipo correto</th>
          <th style="padding:6px;text-align:right;">Cobrado USD</th><th style="padding:6px;text-align:right;">Correto USD</th>
          <th style="padding:6px;text-align:right;">Diferença USD</th>
        </tr></thead>
        <tbody id="comp-rows">${rows}</tbody>
      </table>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;font-size:12px;">
      <label>Desconto
        <select id="comp-disc-type" onchange="_compRecalc()" style="width:100%">
          <option value="">Sem desconto</option>
          ${discTypes.map(([v, l]) => `<option value="${v}"${d && d.type === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
      <label>Valor
        <span style="display:flex;gap:6px;">
          <input id="comp-disc-value" type="number" step="0.01" min="0" value="${d ? d.value : ''}" oninput="_compRecalc()" style="flex:1">
          <select id="comp-disc-mode" onchange="_compRecalc()">
            <option value="percent"${!d || d.mode === 'percent' ? ' selected' : ''}>%</option>
            <option value="fixed"${d && d.mode === 'fixed' ? ' selected' : ''}>R$</option>
          </select>
        </span></label>
      <label>Aprovador do desconto *
        <input id="comp-disc-approver" type="text" value="${_compEsc(d ? d.approver : '')}" style="width:100%"></label>
      <label>Justificativa do desconto *
        <input id="comp-disc-justification" type="text" value="${_compEsc(d ? d.justification : '')}" style="width:100%"></label>
    </div>
    <label style="display:block;margin-top:10px;font-size:12px;">Motivo da complementar *
      <textarea id="comp-reason" rows="2" style="width:100%;resize:vertical;"></textarea></label>
    <div id="comp-summary" style="margin-top:12px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn btn-outline" onclick="document.getElementById('generic-modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="createComplement()">Gerar fatura complementar</button>
    </div>`;

  showGenericModal('➕ Fatura complementar', html, '820px');
  _compRecalc(true);
}

// Recalcula diferenças e resumo. Na abertura, também sugere o motivo.
function _compRecalc(fillReason) {
  const b = bls.find(x => x.id === window._compBLId);
  if (!b) return;
  let diffUSD = 0;
  const changes = [];
  document.querySelectorAll('#comp-rows tr').forEach(tr => {
    const x = window._compCands[+tr.dataset.i];
    const type = tr.querySelector('.comp-type').value;
    const correct = _compCorrectUSD(b, x.c, type);
    const diff = Math.max(0, correct - x.creditUSD);
    tr.querySelector('[data-correct]').textContent = correct.toFixed(2);
    tr.querySelector('[data-diff]').textContent = diff > 0 ? diff.toFixed(2) : '—';
    tr.style.background = diff > 0 ? '#f0fdf4' : '';
    diffUSD += diff;
    if (diff > 0 && type !== x.billedType) changes.push(`${x.billedType} → ${type}`);
  });

  const discType = document.getElementById('comp-disc-type').value;
  const discValue = parseFloat(document.getElementById('comp-disc-value').value) || 0;
  const discMode = document.getElementById('comp-disc-mode').value;
  const roe = effectiveROE({});
  let brl = roe ? diffUSD * roe : null;
  let discTxt = '';
  if (brl != null && discType && discValue > 0) {
    brl = discMode === 'percent' ? brl * (1 - discValue / 100) : Math.max(0, brl - discValue);
    discTxt = ` · desconto ${discMode === 'percent' ? discValue + '%' : 'R$ ' + discValue}`;
  }
  document.getElementById('comp-summary').innerHTML = diffUSD > 0
    ? `Diferença: <strong>${_compUSD(diffUSD)}</strong>${discTxt}` +
      (roe ? ` · ROE de hoje ${roe.toFixed(4).replace('.', ',')} → <strong>${fmtBRL(brl)}</strong>
         <div style="font-size:11px;color:var(--muted);margin-top:4px;">O valor em R$ acompanha a PTAX até a fatura ser marcada como faturada, como nas demais faturas.</div>`
           : ` · <span style="color:#b91c1c;">PTAX indisponível — valor em R$ calculado quando a cotação carregar.</span>`)
    : 'Nenhuma diferença a cobrar com os tipos selecionados.';

  if (fillReason) {
    const uniq = [...new Set(changes)];
    document.getElementById('comp-reason').value = uniq.length
      ? `Correção do tipo de container na fatura ${b.docnum}: ${uniq.join(', ')}.`
      : '';
  }
}

function createComplement() {
  const b = bls.find(x => x.id === window._compBLId);
  if (!b) return;
  if (complementsOf(b).length) { toast('Já existe complementar para esta fatura.', 'error'); return; }

  const containers = [];
  document.querySelectorAll('#comp-rows tr').forEach(tr => {
    const x = window._compCands[+tr.dataset.i];
    const type = tr.querySelector('.comp-type').value;
    if (_compCorrectUSD(b, x.c, type) - x.creditUSD <= 0) return;
    containers.push({
      container:   x.c.container,
      type,
      discharge:   x.c.discharge || '',
      emptyReturn: x.c.emptyReturn || '',
      billedType:  x.billedType,
      creditUSD:   x.creditUSD,
    });
  });
  if (!containers.length) { toast('Nenhuma diferença a cobrar.', 'error'); return; }

  const reason = document.getElementById('comp-reason').value.trim();
  if (!reason) { toast('Informe o motivo da fatura complementar.', 'error'); return; }

  const discType = document.getElementById('comp-disc-type').value;
  const discValue = parseFloat(document.getElementById('comp-disc-value').value) || 0;
  let discount = null;
  if (discType && discValue > 0) {
    const approver = document.getElementById('comp-disc-approver').value.trim();
    const justification = document.getElementById('comp-disc-justification').value.trim();
    if (!approver || !justification) {
      toast('Desconto na fatura complementar exige aprovador e justificativa.', 'error');
      return;
    }
    discount = {
      type: discType,
      value: discValue,
      mode: document.getElementById('comp-disc-mode').value,
      approver,
      justification,
      appliedAt: new Date().toISOString().slice(0, 10),
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const comp = {
    id: uid(),
    bl: b.bl,
    vessel: b.vessel || '',
    pol: b.pol || '',
    pod: b.pod || '',
    client: b.client || '',
    cnee: b.cnee || '',
    cnpj: b.cnpj || '',
    phone: b.phone || '',
    email: b.email || '',
    freeTime: b.freeTime != null ? b.freeTime : 21,
    roe: null,
    roeManual: false,
    ov1: null,
    ov2: null,
    venc: nextBusinessDay(null),
    docDate: today,
    docnum: genDocnum(b.bl),
    containers,
    discount,
    dispute: null,
    complementOf: b.id,
    complementOfDocnum: b.docnum || '',
    complementReason: reason,
    createdAt: Date.now(),
  };
  comp.readyAt = computeReadyAt(comp);

  bls.unshift(comp);
  saveOne(comp);
  logAuditAction('criacao_fatura_complementar', {
    blId: comp.id, bl: comp.bl, docnum: comp.docnum,
    originalId: b.id, originalDocnum: b.docnum, motivo: reason,
    containers: containers.map(c => `${c.container}:${c.billedType}->${c.type}`),
    creditoUSD: containers.reduce((s, c) => s + c.creditUSD, 0),
    desconto: discount ? `${discount.value}${discount.mode === 'percent' ? '%' : ' BRL'}` : null,
  });
  const ov = document.getElementById('generic-modal-overlay');
  if (ov) ov.remove();
  renderList();
  toast(`Fatura complementar ${comp.docnum} criada em Pendentes.`, 'success');
}
