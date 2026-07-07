// ============================================================
// clients.js — Módulo de Clientes (CNPJ, e-mails)
// Demurrage Manager — Transhipping Agenciamento Marítimo
// ============================================================
// Dependências (carregadas antes via <script src>):
//   utils.js   — toast, openModal, closeModal, uid
//   billing.js — bls array, save() para syncBLEmails
// Lê dados via window._dmStore.clients (preenchido por db.js).
// ============================================================

// ============================================================
// CLIENTS IMPORT / EXPORT
// ============================================================
const CLI_TEMPLATE_B64 = "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";

function downloadCliTemplate() {
  const bin = atob(CLI_TEMPLATE_B64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'clientes_importacao.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importClientsFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => parseClientsCSV(e.target.result);
    reader.readAsText(file, 'UTF-8');
    return;
  }

  // XLSX via SheetJS
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb   = XLSX.read(data, {type:'array'});
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});
      processClientRows(rows);
    } catch(err) {
      toast('Erro ao ler arquivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseClientsCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g,'')));
  processClientRows(lines);
}

function processClientRows(rows) {
  function toStr(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return v.toFixed(0);
    return String(v);
  }
  function norm(s) {
    return toStr(s).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  }

  // Find header row and map columns
  let dataStart = -1;
  let colCnpj = 0, colName = 1, colEmail = 2;

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!row) continue;

    // Check every cell in this row for header keywords
    let foundCnpj = false;
    row.forEach((cell, idx) => {
      const h = norm(cell);
      if (h.includes('CNPJ'))                          { colCnpj = idx; foundCnpj = true; }
      if (h.includes('RAZ') || h.includes('SOCIAL'))   { colName  = idx; }
      if (h.includes('MAIL'))                           { colEmail = idx; }
    });

    if (foundCnpj) { dataStart = i + 1; break; }

    // No header yet — check if col 0 already has CNPJ-like data
    const digits = toStr(row[0]).replace(/\D/g,'');
    if (digits.length === 13 || digits.length === 14) { dataStart = i; break; }
  }

  if (dataStart < 0) {
    toast('Nenhuma linha de dados encontrada. Verifique o arquivo.', 'error');
    return;
  }

  let added = 0, updated = 0, skipped = 0, skipReasons = [];
  // FIX: acumula alterações de email por CNPJ — aplica syncBLEmails UMA VEZ
  // depois do loop, evitando N saves concorrentes que causam ERR_INSUFFICIENT_RESOURCES
  const emailChanges = new Map(); // cnpj → emails[]

  rows.slice(dataStart).forEach((row, idx) => {
    if (!row || row.every(c => c === null || c === undefined || c === '')) return;

    let cnpjStr = toStr(row[colCnpj]).replace(/\D/g,'').trim();
    if (cnpjStr.length === 13) cnpjStr = '0' + cnpjStr; // leading zero dropped by Excel

    const nameRaw  = toStr(row[colName]).trim();
    const emailRaw = toStr(row[colEmail]).trim();

    if (!cnpjStr || cnpjStr.length !== 14) {
      skipped++;
      if (skipReasons.length < 5) skipReasons.push(`linha ${dataStart + idx + 1}: "${toStr(row[colCnpj])}" → ${cnpjStr.length}d`);
      return;
    }

    const emails   = parseEmails(emailRaw);
    const existing = clients.find(c => normalizeCnpj(c.cnpj) === cnpjStr);

    if (existing) {
      if (nameRaw)           existing.name   = nameRaw;
      if (emails.length > 0) {
        const existingSet = new Set(existing.emails || []);
        emails.forEach(e => existingSet.add(e));
        existing.emails = Array.from(existingSet);
      }
      emailChanges.set(cnpjStr, existing.emails);
      updated++;
    } else {
      clients.unshift({ id: uid(), cnpj: cnpjStr, name: nameRaw, emails, createdAt: Date.now() });
      emailChanges.set(cnpjStr, emails);
      added++;
    }
  });

  // FIX: salva clientes UMA VEZ (com todos os emails já preenchidos no array)
  cliSave(clients);

  // FIX: aplica sync de emails nos BLs em batch — um único save(bls) no final
  if (emailChanges.size > 0) {
    let blsChanged = false;
    emailChanges.forEach((emails, cnpjStr) => {
      bls.forEach(b => {
        if (normalizeCnpj(b.cnpj) === cnpjStr) {
          b.email = emails.join(', ');
          blsChanged = true;
        }
      });
    });
    if (blsChanged) save(bls);
  }

  renderClients();

  let msg = `Importação: ${added} criado(s), ${updated} atualizado(s)`;
  if (skipped) msg += `, ${skipped} ignorado(s)`;
  if (skipReasons.length) msg += ` — CNPJs inválidos: ${skipReasons.join(' | ')}`;
  toast(msg, (!added && !updated) ? 'error' : 'success');
}

// ============================================================
// CLIENTS MODULE
// ============================================================
// ── STORAGE: Clientes (Firestore via window._dmStore) ─────────────────────
// FIX #2: cópia profunda — mesma razão que load()
function cliLoad() { return JSON.parse(JSON.stringify((window._dmStore && window._dmStore.clients) || [])); }
function cliSave(d) {
  if (window._dmFireSave) window._dmFireSave('clients', d);
  else {
    console.warn('[CLIENTS] _dmFireSave indisponível — salvando apenas localmente');
    if (window._dmStore) window._dmStore.clients = d;
  }
}

// Remove duplicatas de CNPJ mantendo o registro mais recente
function deduplicateClients(list) {
  const seen = new Map();
  for (const c of list) {
    const norm = normalizeCnpj(c.cnpj);
    if (!norm) continue;
    const score = c._updatedAt || c.updatedAt || c.createdAt || 0;
    const prev = seen.get(norm);
    if (!prev || score > (prev._updatedAt || prev.updatedAt || prev.createdAt || 0)) {
      seen.set(norm, c);
    }
  }
  return Array.from(seen.values());
}

let clients = cliLoad();
let editingClientId = null;

function normalizeCnpj(cnpj) {
  const d = String(cnpj||'').replace(/\D/g,'');
  return d.length === 13 ? '0' + d : d;
}

function formatCnpj(cnpj) {
  const d = normalizeCnpj(cnpj);
  if (d.length !== 14) return d || cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function parseEmails(raw) {
  if (!raw) return [];
  return String(raw).split(/[\n,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 3 && e.includes('@') && e.includes('.'));
}

function getClientByCnpj(cnpj) {
  const norm = normalizeCnpj(cnpj);
  return clients.find(c => normalizeCnpj(c.cnpj) === norm) || null;
}

function getEmailsForBL(b) {
  if (b.cnpj) {
    const c = getClientByCnpj(b.cnpj);
    if (c && c.emails && c.emails.length > 0) return c.emails;
  }
  if (b.email) return parseEmails(b.email);
  return [];
}

// Upsert a client: create if new, update name/emails if exists
function upsertClient(cnpj, name, emails) {
  const norm = normalizeCnpj(cnpj);
  if (!norm || norm.length !== 14) return;
  const idx = clients.findIndex(c => normalizeCnpj(c.cnpj) === norm);
  if (idx >= 0) {
    if (name) clients[idx].name = name;
    if (emails && emails.length > 0) clients[idx].emails = emails;
  } else {
    clients.unshift({ id: uid(), cnpj: norm, name: name||'', emails: emails||[], createdAt: Date.now() });
  }
  cliSave(clients);
  if (emails && emails.length > 0) syncBLEmails(norm, emails);
}

function autoRegisterClient(cnpj, name, email) {
  const emails = parseEmails(email);
  upsertClient(cnpj, name, emails);
}

function syncBLEmails(cnpjNorm, emails) {
  let changed = false;
  bls.forEach(b => {
    if (normalizeCnpj(b.cnpj) === cnpjNorm) {
      b.email = emails.join(', ');
      changed = true;
    }
  });
  if (changed) save(bls);
}

function onCnpjInput() {
  const raw = document.getElementById('fc-cnpj').value;
  const norm = normalizeCnpj(raw);
  const hint = document.getElementById('fc-cnpj-hint');
  if (norm.length === 14 && !editingClientId) {
    const existing = clients.find(c => normalizeCnpj(c.cnpj) === norm);
    if (existing) {
      hint.textContent = '⚠️ CNPJ já cadastrado — clique em Editar para alterar.';
      hint.style.color = 'var(--red)';
    } else {
      hint.textContent = '✔ CNPJ disponível.';
      hint.style.color = 'var(--green)';
      const blMatch = bls.find(b => normalizeCnpj(b.cnpj) === norm);
      if (blMatch && blMatch.client && !document.getElementById('fc-name').value) {
        document.getElementById('fc-name').value = blMatch.client;
      }
    }
  } else {
    hint.textContent = '';
  }
}

function openNewClient() {
  editingClientId = null;
  document.getElementById('modal-client-title').textContent = 'Novo Cliente';
  document.getElementById('save-client-label').textContent = 'Criar Cliente';
  document.getElementById('fc-cnpj').value = '';
  document.getElementById('fc-cnpj').disabled = false;
  document.getElementById('fc-name').value = '';
  document.getElementById('fc-emails').value = '';
  document.getElementById('fc-cnpj-hint').textContent = '';
  openModal('modal-client');
}

function openEditClient(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  editingClientId = id;
  document.getElementById('modal-client-title').textContent = 'Editar Cliente';
  document.getElementById('save-client-label').textContent = 'Atualizar';
  document.getElementById('fc-cnpj').value = formatCnpj(c.cnpj);
  document.getElementById('fc-cnpj').disabled = true;
  document.getElementById('fc-name').value = c.name || '';
  document.getElementById('fc-emails').value = (c.emails||[]).join('\n');
  document.getElementById('fc-cnpj-hint').textContent = '';
  openModal('modal-client');
}

function saveClient() {
  const cnpjRaw  = document.getElementById('fc-cnpj').value.trim();
  const norm     = normalizeCnpj(cnpjRaw);
  const name     = document.getElementById('fc-name').value.trim();
  const emailsRaw = document.getElementById('fc-emails').value;
  const emails   = parseEmails(emailsRaw);

  if (!norm || norm.length !== 14) { toast('CNPJ inválido — informe 14 dígitos.', 'error'); return; }
  if (!name) { toast('Razão Social é obrigatória.', 'error'); return; }

  if (!editingClientId) {
    if (clients.find(c => normalizeCnpj(c.cnpj) === norm)) {
      toast('CNPJ já cadastrado. Use Editar para alterar.', 'error'); return;
    }
    clients.unshift({ id: uid(), cnpj: norm, name, emails, createdAt: Date.now() });
    toast('Cliente criado!', 'success');
  } else {
    const duplicate = clients.find(c => normalizeCnpj(c.cnpj) === norm && c.id !== editingClientId);
    if (duplicate) { toast('CNPJ já pertence a outro cadastro.', 'error'); return; }
    const idx = clients.findIndex(x => x.id === editingClientId);
    if (idx >= 0) {
      clients[idx] = { ...clients[idx], cnpj: norm, name, emails };
      toast('Cliente atualizado!', 'success');
    }
  }

  syncBLEmails(norm, emails);
  cliSave(clients);
  logAuditAction('edicao_cliente', { cnpj: norm, name, acao: editingClientId ? 'edicao' : 'criacao' });
  closeModal('modal-client');
  renderClients();
}

function deleteClient(id) {
  if (!confirm('Excluir este cliente?')) return;
  clients = clients.filter(x => x.id !== id);
  cliSave(clients);
  renderClients();
  toast('Cliente excluído.');
}

function clearClients() {
  showDoubleConfirmation(
    'Excluir todos os Clientes?',
    'Você está prestes a excluir permanentemente TODOS os clientes cadastrados no sistema. Informações de contato, histórico e configurações associadas também serão removidas.',
    clients.length,
    () => {
      // FIX #15: captura quantidade ANTES de zerar o array (senão log registra 0)
      var qtdExcluida = clients.length;
      clients = [];
      cliSave(clients);
      renderClients();
      toast('✓ Cadastro de clientes excluído permanentemente.', '');
      logAuditAction('exclusao_todos_clientes', {quantidade: qtdExcluida});
    }
  );
}

// Filtro ativo na aba de Clientes: null | 'semEmail' | 'comBLs' | 'semBLs'
window._cliActiveFilter = window._cliActiveFilter || null;

function toggleCliFilter(type) {
  window._cliActiveFilter = (window._cliActiveFilter === type) ? null : type;
  _updateCliFilterButtons();
  renderClients();
}
function clearClientFilter() {
  window._cliActiveFilter = null;
  _updateCliFilterButtons();
  renderClients();
}
function _updateCliFilterButtons() {
  ['semEmail','comBLs','semBLs'].forEach(t => {
    const btn = document.getElementById('cli-btn-' + t.replace(/([A-Z])/g, s => '-' + s.toLowerCase()));
    if (btn) btn.classList.toggle('active', window._cliActiveFilter === t);
  });
}

function renderClients() {
  _updateCliFilterButtons();
  const q = (document.getElementById('cli-search')?.value || '').toLowerCase();
  const qDigits = q.replace(/\D/g, ''); // query stripped to digits only
  const activeFilter = window._cliActiveFilter;
  const sorted = [...clients].sort((a,b) => (a.name||a.cnpj||"").localeCompare(b.name||b.cnpj||"", "pt-BR"));
  const filtered = sorted.filter(c => {
    // Filtros de categoria (mutuamente exclusivos)
    if (activeFilter === 'semEmail' && (c.emails||[]).length > 0) return false;
    if (activeFilter === 'comBLs') {
      const hasBL = bls.some(b => normalizeCnpj(b.cnpj) === normalizeCnpj(c.cnpj));
      if (!hasBL) return false;
    }
    if (activeFilter === 'semBLs') {
      const hasBL = bls.some(b => normalizeCnpj(b.cnpj) === normalizeCnpj(c.cnpj));
      if (hasBL) return false;
    }
    if (!q) return true;
    const text = [formatCnpj(c.cnpj), c.name, (c.emails||[]).join(' ')].join(' ').toLowerCase();
    if (text.includes(q)) return true;
    if (qDigits.length >= 2 && c.cnpj.includes(qDigits)) return true;
    return false;
  });

  const table = document.getElementById('cli-table');
  const empty = document.getElementById('cli-empty');
  const tbody = document.getElementById('cli-body');
  if (!table) return;

  if (!filtered.length) {
    table.style.display = 'none';
    if (empty) empty.style.display = '';
    return;
  }
  table.style.display = '';
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filtered.map(c => {
    const blCount = bls.filter(b => normalizeCnpj(b.cnpj) === normalizeCnpj(c.cnpj)).length;
    const emailsHtml = (c.emails||[]).length
      ? c.emails.map(e => `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border-radius:4px;padding:1px 7px;font-size:11px;margin:1px;">${e}</span>`).join(' ')
      : '<span style="color:var(--muted);font-size:11px;">—</span>';
    return `<tr>
      <td style="font-family:monospace;font-weight:600">${formatCnpj(c.cnpj)}</td>
      <td style="text-align:left">${c.name||'—'}</td>
      <td style="text-align:left">${emailsHtml}</td>
      <td>${blCount > 0 ? `<span style="font-weight:600;color:var(--blue)">${blCount}</span>` : '—'}</td>
      <td>
        <button class="act-btn edit" onclick="openEditClient('${c.id}')" style="padding:4px 10px;font-size:12px;">Editar</button>
        <button class="act-btn del"  onclick="deleteClient('${c.id}')"  style="padding:4px 10px;font-size:12px;" aria-label="Excluir cliente ${c.name||c.id}">Excluir</button>
      </td>
    </tr>`;
  }).join('');
}
// ============================================================
