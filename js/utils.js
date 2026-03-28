// ============================================================
// utils.js — Utilitários: uid(), toast(), fmtBRL(), openModal()
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Sem dependências externas. Funções auxiliares reutilizáveis.
// Depende apenas do DOM (document.getElementById).
// ============================================================

// ============================================================
// UTILS
// ============================================================
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }

function genDocnum(blStr) {
  // Hash determinístico baseado no número do BL
  let hash = 0;
  const s = String(blStr || '').toUpperCase();
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  const num = (Math.abs(hash) % 9000) + 1000; // 1000–9999
  return 'DEM-' + new Date().getFullYear() + '-' + num;
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

