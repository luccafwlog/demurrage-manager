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

// Escapa texto para interpolação em HTML (conteúdo e atributos). TODO dado
// vindo de planilha, cadastro ou banco passa por aqui antes de ir para
// innerHTML — sem isso, um CNEE como <img onerror=...> executa script.
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Para argumentos string dentro de onclick="fn('...')": escapa para JS e HTML.
function escJs(v) {
  return esc(String(v ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' '));
}

// ── Datas no fuso de Brasília ───────────────────────────────────────────
// toISOString() devolve a data em UTC: depois das 21h (BRT) já é "amanhã".
// Todas as datas de negócio (faturamento, pagamento, vencimento) usam estas.
const APP_TZ = 'America/Sao_Paulo';
function isoLocal(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function todayISO() { return isoLocal(new Date()); }
function addDaysISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n, 12));
  return dt.toISOString().slice(0, 10);
}
function weekdayISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

// Feriados nacionais (fixos + móveis a partir da Páscoa).
const _holidayCache = {};
function brHolidays(year) {
  if (_holidayCache[year]) return _holidayCache[year];
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const set = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map(md => `${year}-${md}`));
  [-48, -47, -2, 60].forEach(n => set.add(addDaysISO(easter, n))); // carnaval (2), sexta santa, corpus christi
  return (_holidayCache[year] = set);
}
function isBusinessDay(iso) {
  const wd = weekdayISO(iso);
  return wd !== 0 && wd !== 6 && !brHolidays(Number(iso.slice(0, 4))).has(iso);
}
// Próximo dia útil após fromDate (ou hoje), pulando fins de semana e feriados.
function nextBusinessDay(fromDate) {
  let d = addDaysISO(fromDate || todayISO(), 1);
  while (!isBusinessDay(d)) d = addDaysISO(d, 1);
  return d;
}

function genDocnum(blStr) {
  // DEM-YYYY-<4 chars base36 do timestamp><3 dígitos do hash do BL>
  const year = todayISO().slice(0, 4);
  const ts   = Date.now().toString(36).slice(-4).toUpperCase();
  let hash = 0;
  const s = String(blStr || '').toUpperCase();
  for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash |= 0; }
  return `DEM-${year}-${ts}${(Math.abs(hash) % 1000).toString().padStart(3, '0')}`;
}

// Erros ficam na tela até o usuário ler (8s); sucesso some em 3s.
let _toastTimer = null;
function toast(msg, t='') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.className = 'toast show '+t;
  el.setAttribute('role', t === 'error' ? 'alert' : 'status');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>el.classList.remove('show'), t === 'error' ? 8000 : 3000);
}
function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

// Modal genérico reutilizável (para histórico e outras funcionalidades).
// `html` deve vir com os dados já escapados por esc().
function showGenericModal(title, html, width) {
  let m = document.getElementById('generic-modal-overlay');
  if (!m) {
    m = document.createElement('div');
    m.id = 'generic-modal-overlay';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    m.innerHTML = `<div id="generic-modal-box" role="dialog" aria-modal="true" style="background:white;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:80vh;max-width:100%;display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--border);background:#f9fafb;">
        <h3 id="generic-modal-title" style="font-size:15px;font-weight:700;margin:0;color:var(--text);"></h3>
        <button aria-label="Fechar" onclick="document.getElementById('generic-modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted);line-height:1;padding:4px;">×</button>
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
function fmtDate(s) { return s ? new Date(String(s).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR') : ''; }
function fmtBRL(v) { return 'R$ '+(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function parseDs(v) {
  if (!v) return '';
  if (v instanceof Date) return isoLocal(v);
  if (typeof v==='number') { const d=new Date((v-25569)*86400000); return d.toISOString().slice(0,10); }
  const p=String(v).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (p) { const y=p[3].length===2?'20'+p[3]:p[3]; return `${y}-${p[2].padStart(2,'0')}-${p[1].padStart(2,'0')}`; }
  const iso=String(v).match(/(\d{4})-(\d{2})-(\d{2})/); return iso?iso[0]:'';
}
function nk(k) { return String(k).trim().toUpperCase().replace(/[\s\/\-]+/g,'_'); }
function longDate() { return new Date().toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric',timeZone:APP_TZ}); }
function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

// Fill venc field with auto value (next business day from today)
function autoFillVenc() {
  const field = document.getElementById('f-venc');
  if (!field.value) field.value = nextBusinessDay(null);
}

