# Demurrage Manager — Snapshot Completo do Projeto

> **Última atualização:** 2026-03-30 | **Cache version:** `?v=107` | **Deploy-date meta:** `2026-03-30T18:00`
> **Repositório:** https://github.com/luccafwlog/demurrage-manager (branch: `main`)
> **App em produção:** https://demurragemanager.web.app
> **Firebase project:** `demurragemanager` (Firestore + Hosting + Auth)
> **PAT GitHub:** `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`

---

## 1. Visão Geral

Web app single-page de gestão de **Demurrage & Detention (D&D)** para a Transhipping Agenciamento Marítimo. Controla containers em sobretaxa portuária, emite faturas/recibos, gerencia cobranças e monitora prazos críticos.

**Stack:** HTML/CSS/JS vanilla + Firebase (Firestore + Auth) + GitHub Actions → Firebase Hosting auto-deploy.

---

## 2. Estrutura de Arquivos

```
/
├── index.html            # Login (Firebase Auth)
├── app.html              # App principal (SPA)
├── css/
│   ├── base.css          # Estilos globais, variáveis CSS, componentes base
│   └── components.css    # Responsividade e overrides mobile
├── js/
│   ├── db.js             # Firebase, Firestore, Auth, persistência (type=module)
│   ├── utils.js          # Funções utilitárias compartilhadas
│   ├── rates.js          # Tabela de taxas D&D e cálculo USD
│   ├── billing.js        # Módulo Faturamento (BLs, PTAX, documentos)
│   ├── tracking.js       # Módulo Controle de Containers
│   ├── clients.js        # Módulo Clientes (CNPJ registry)
│   ├── users.js          # Módulo Usuários & Auditoria
│   ├── consolidated.js   # Cobrança Consolidada por CNPJ
│   └── init.js           # Inicialização, Configurações, Dashboard, Alertas
└── .github/workflows/    # GitHub Actions → Firebase Hosting deploy automático
```

**Ordem de carregamento dos scripts em app.html:**
```html
<script type="module" src="js/db.js?v=107"></script>   <!-- Firebase SDK, Auth, Firestore -->
<script src="js/utils.js?v=107"></script>
<script src="js/rates.js?v=107"></script>
<script src="js/billing.js?v=107"></script>
<script src="js/tracking.js?v=107"></script>
<script src="js/clients.js?v=107"></script>
<script src="js/users.js?v=107"></script>
<script src="js/consolidated.js?v=107"></script>
<script src="js/init.js?v=107"></script>               <!-- último: inicia tudo -->
```
> **Regra de cache:** Para forçar recarga após deploy, incrementar `?v=NNN` em **todos os 9 scripts** em `app.html`. Versão atual: `107`.

---

## 3. Navegação (Módulos / Tabs)

### Tabs principais
```html
<div id="tab-dashboard"  onclick="switchModule('dashboard')">🏠 Painel</div>
<div id="tab-billing"    onclick="switchModule('billing')">📄 Faturamento</div>
<div id="tab-tracking"   onclick="switchModule('tracking')">📦 Controle de Containers</div>
<div id="tab-clients"    onclick="switchModule('clients')">👥 Clientes</div>
<div id="tab-users"      style="display:none;">👨‍💼 Usuários</div>     <!-- nunca exibido; legacy -->
<div id="tab-settings"   style="display:none;">⚙️ Configurações</div> <!-- visível para todos autenticados -->
```

**`switchModule(mod)`** em `init.js`:
- Itera `['dashboard','billing','tracking','clients','settings']` (sem 'users')
- `mod === 'users'` → redireciona automaticamente para `settings` + abre sub-aba `cfg-users`
- Callbacks de render: `renderTracking()`, `renderClients()`, `renderDashboard()`, `initCfgModule()`

### Configurações — sub-abas (`switchCfgPane`)
| ID | Label | Callback |
|----|-------|---------|
| `cfg-geral` | 📊 Geral | — (estático) |
| `cfg-taxas` | 💰 Taxas | `renderCfgRates()` |
| `cfg-users` | 👥 Usuários | `renderUsers()` ← módulo completo de usuários |
| `cfg-backup` | 💾 Backup | — |
| `cfg-sistema` | 🔧 Sistema | `renderCfgSistema()` |

> **Nota:** A aba Usuários foi integrada como sub-aba `cfg-users` dentro de Configurações. `tab-users` existe no DOM mas fica sempre oculto. `switchModule('users')` redireciona para settings + cfg-users.

---

## 4. Firebase & Autenticação

### Config
- **Firebase SDK:** `11.0.0` (ES module — apenas `db.js` é `type="module"`)
- **Projeto:** `demurragemanager`
- **Serviços:** Firestore, Auth (email/senha), Hosting
- **Offline:** `enableIndexedDbPersistence()` ativo

### Estrutura Firestore (todos os dados por usuário — multi-tenant)
```
users/{uid}/bls/{blId}           → BLs de faturamento
users/{uid}/containers/{ctr}     → Containers de tracking (chave = número do container)
users/{uid}/clients/{clientId}   → Cadastro de clientes
users/{uid}/settings/alerts      → { days: N } — dias críticos para alerta D&D
users/{uid}/logs/{logId}         → Audit log de ações do usuário
config/rates                     → Taxas D&D customizadas (compartilhado)
```

### Helpers de path em `db.js`
```js
const uCol = (col) => collection(db, 'users', uid, col);
const uDoc = (col, id) => doc(db, 'users', uid, col, String(id));
const settingsDoc = doc(db, 'users', uid, 'settings', 'alerts');
```

### Auth Flow
1. `onAuthStateChanged` → não autenticado → redireciona para `index.html`
2. Lê `usuarios/{uid}` → `admin: bool`, `active: bool`, `nome`
3. Se `active === false` → alert e logout
4. `window._dmIsAdmin = !!data.admin`
5. Exibe `tab-settings` para todos autenticados
6. `blsReady + trkReady + cliReady` → `checkReady()` → `window._dmOnReady()`

### Globals-chave expostos por `db.js`
| Global | Descrição |
|--------|-----------|
| `window._dmStore` | `{bls:[], trk:[], clients:[], alertDays:5}` — cache in-memory |
| `window._dmFireSave(type, data)` | Salva array com diff — só escreve docs que mudaram |
| `window._dmFireSaveOne(type, id, data)` | Salva **1 documento** com `setDoc+merge` (1 write, sem diff) |
| `window._dmFireDelete(type, id)` | Remove doc com rollback no store |
| `window._dmIsAdmin` | bool — controle de acesso |
| `window._dmUser` | FirebaseUser atual |
| `window._dmUid` | string — UID do usuário |
| `window._dmOnReady` | Callback chamado após carga inicial completa |
| `window._dmOnBLsUpdate` | Callback reativo quando Firestore atualiza bls |
| `window._dmOnTrkUpdate` | Callback reativo quando Firestore atualiza containers |
| `window._dmOnClientsUpdate` | Callback reativo quando Firestore atualiza clientes |

### Sistema de Persistência (dois modos)
- **`_dmFireSave(type, array)`** → batch com diff JSON por doc; apenas docs alterados são escritos. Usar em operações bulk (import, clear, PTAX global, migrações).
- **`_dmFireSaveOne(type, id, data)`** → `setDoc + merge:true` em 1 doc. Usar para operações em entidade única (criar, editar, togglePaid, toggleBilled). 1 write garantido.

---

## 5. Módulo Faturamento (`billing.js`)

### PTAX / ROE
- `loadPTAX()` → busca cotação BCB (CotacaoDolarPeriodo, últimos 10 dias)
- `applyPTAXGlobal()` → **só** atualiza `b.roe` se `b.roe !== ptaxState.roe` (evita writes desnecessários)
- `effectiveROE(b)` → ROE manual (`b.roeManual=true`) > PTAX BCB
- Badge `#ptax-badge` no topo da página

### Funções de Persistência em `billing.js`
```js
function save(b)       // bulk: _dmFireSave('bls', array) — para operações em múltiplos BLs
function saveOne(bl)   // single: _dmFireSaveOne('bls', bl.id, bl) — para 1 BL (1 write)
function deleteBLById(id) // _dmFireDelete('bls', id) — 1 delete direto
```

**Regra de ouro:** Se apenas 1 BL mudou → usar `saveOne(bl)`. Se múltiplos BLs mudam → usar `save(bls)`.

### Mapa de saves em `billing.js`
| Função | Método de save | Writes |
|--------|---------------|--------|
| `saveBL()` | `saveOne(obj)` | 1 |
| `togglePaid(id)` | `saveOne(b)` | 1 |
| `toggleBilled(id)` | `saveOne(b)` | 1 |
| `deleteBL(id)` | `deleteBLById(id)` | 1 delete |
| `clearAllBLs()` | `save(bls)` | bulk |
| `doImport()` | `save(bls)` | bulk (diff) |
| `applyPTAXGlobal()` | `save(bls)` | N (apenas ROE mudou) |

### Objeto BL (dados armazenados no Firestore)
```js
{
  id,                   // uid() — chave primária
  bl,                   // número do BL
  vessel,               // navio
  pol, pod,             // porto origem / destino
  client,               // nome do cliente/CNEE
  cnpj,                 // 14 dígitos normalizado
  phone, email,
  freeTime,             // dias free time (padrão: 21)
  roe,                  // taxa de câmbio efetiva (PTAX ou manual)
  roeManual,            // bool: ROE inserido manualmente
  ov1, ov2,             // overrides de preço USD por período
  venc,                 // data de vencimento (YYYY-MM-DD)
  docDate,              // data do documento
  docnum,               // número do documento
  containers: [{        // array de containers
    container,          // número do container
    type,               // 20GP/HC, 40GP/HC, etc.
    discharge,          // data de descarga (YYYY-MM-DD)
    emptyReturn         // data de retorno (YYYY-MM-DD)
  }],
  billed,               // bool: faturado
  billedAt,             // ISO timestamp
  paid,                 // bool: pago
  paidAt,               // ISO timestamp
  frozenRoe,            // ROE congelado ao faturar
  frozenTotal,          // total BRL congelado ao faturar
  cnee,                 // importador (vindo do tracking via migração)
  discount: {           // null se não houver
    type, value, mode, justification, approver, appliedAt
  },
  dispute: {            // null se não houver
    open, reason, status, notes, openedAt, historico[]
  },
  createdAt,            // ISO timestamp
  migratedFromTracking, // bool
  migratedAt            // data de migração
}
```

### Filtros de Faturamento
- **Sub-abas:** Faturados (não pagos) / Pagos
- **Filtros status:** Todos | Não Faturados | Faturados | Todos os Pagos
- **Filtros extras:** Com Desconto | Em Disputa
- Selecionar "Todos" → **reseta automaticamente** Com Desconto e Em Disputa

### Documentos (Fatura / Recibo)
- `viewDoc(id, 'invoice'|'receipt')` → `renderDoc(b, type)` → preenche `#doc-content`
- `renderDoc()` **NÃO chama `save()`** — apenas atualiza `b.venc` em memória se vazio
- `printAllInvoices()` / `printAllReceipts()` (em `consolidated.js`) → iteram todos BLs do CNPJ via `renderDoc()`, abrem popup para Ctrl+P

---

## 6. Módulo Controle de Containers (`tracking.js`)

### Objeto Container (Firestore)
```js
{
  container,   // número (chave primária)
  bl,          // número do BL
  cnee,        // importador
  vessel,      // navio
  pol, pod,    // portos
  discharge,   // data de descarga (YYYY-MM-DD)
  emptyReturn, // data de retorno do vazio (YYYY-MM-DD)
  deadline,    // prazo livre calculado
  freeTime,    // dias free time por BL
  type,        // tipo de container
  cnpj,        // CNPJ do importador
  useDays,     // dias usados
}
```

### Inicialização de `trkData`
```js
// tracking.js — IIFE de inicialização (sem trkSave aqui — store vazio neste momento)
let trkData = (() => {
  const raw = trkLoad();
  const clean = raw.filter(r => { /* filtra devolvidos no free time */ });
  // NÃO chama trkSave — filtro real é feito em _dmOnReady (init.js)
  return clean;
})();
```
> **Importante:** O `trkSave` foi **removido** do IIFE de tracking.js. O filtro com escrita acontece apenas em `_dmOnReady` após autenticação completa.

### Dual View (Container / BL)
- `window._trkView`: `'container'` | `'bl'` (padrão: `'container'`)
- `toggleTrkView()` → alterna e chama `_updateTrkTableHeader()` + `renderTracking()`
- `_updateTrkTableHeader()` (em `init.js`): troca `#trk-thead` e `#trk-colgroup` dinamicamente
  - **Container:** 15 colunas com filtros por linha
  - **BL:** 8 colunas — BL | CNEE | NAVIO | ROTA | CTRS | DESCARGA | DEADLINE | STATUS
- `window._trkExpanded`: Set de BL keys expandidas na visão BL

### Migração Automática para Faturamento
`checkAndMigrateBLs()` — quando todos containers de um BL são devolvidos com D&D, cria BL automaticamente em Faturamento. **Não faz `save(bls)` internamente** — o chamador é responsável pelo save.

### Mapa de saves em `tracking.js`
| Função | Save | Writes |
|--------|------|--------|
| `doTrkImport()` | `trkSave(trkData)` + `save(bls)` se houve migração | bulk |
| `manualMigrate()` | `save(bls)` após `checkAndMigrateBLs()` | bulk (diff) |
| `clearTracking()` | `trkSave([])` | bulk |

---

## 7. Cobrança Consolidada (`consolidated.js`)

Agrupa BLs por CNPJ para cobranças unificadas.

**Funções:**
- `openConsolidatedEmail()` → modal de seleção de cliente/CNPJ
- `selectConsCnpj(cnpj)` → filtra BLs, renderiza preview de cobrança
- `sendConsolidatedEmail()` → abre mailto com corpo consolidado
- `printAllInvoices()` → popup com todas as faturas do CNPJ (Ctrl+P)
- `printAllReceipts()` → popup com todos os **recibos de BLs pagos** do CNPJ
- `#cons-receipts-btn` (🧾 Imprimir Recibos) — habilitado apenas quando há BLs pagos

---

## 8. Usuários & Auditoria (`users.js`)

Integrado como sub-aba `cfg-users` em Configurações (não é tab standalone).

- `renderUsers()` → chamado por `switchCfgPane` ao ativar `cfg-users`
- KPIs: `#usr-kpi-total`, `#usr-kpi-sessions`, `#usr-kpi-logs`
- Tabela `#usr-body` com colunas: NOME, E-MAIL, CARGO, ADMIN, ATIVO, CRIADO EM, AÇÕES
- Log `#log-body` com filtros: usuário, tipo de ação, período
- `exportLogsCSV()` → baixa logs em CSV
- `confirmClearOldLogs()` → limpa logs com mais de 90 dias usando **writeBatch** (chunks de 400)

---

## 9. Clientes (`clients.js`)

Registry de CNPJs com nomes e e-mails.

- `upsertClient(cnpj, name, emails)` → cria ou atualiza cliente
- `syncBLEmails(cnpjNorm, emails)` → propaga e-mails para BLs com aquele CNPJ → `save(bls)` (bulk)
- `autoRegisterClient(cnpj, name, email)` → registro automático ao salvar BL
- Importação por CSV com template disponível
- `cliSave(d)` → `window._dmFireSave('clients', d)`

---

## 10. Dashboard & Alertas (`init.js`)

### Dashboard
Cards KPI: Total BLs | A Faturar | Pagos | Receita | Vencidos | Faturados s/ Pagamento | Em Disputa | Total Containers | Em D&D | Alertas críticos

### Alertas
- `computeAlerts()` → varre `trkData`, identifica containers em D&D aberto
- `updateAlertBadge()` → badge vermelho na toolbar de tracking
- `openAlertPanel()` → modal com alertas agrupados por CNEE
- `sendAllAlertEmails()` → dispara e-mails de alerta via mailto
- `getAlertDays()` / `saveAlertDays()` → config de dias críticos (Firestore)

---

## 11. Badge de Versão

```html
<!-- Em app.html: -->
<meta name="deploy-date" content="2026-03-30T18:00">
<div class="version-badge" id="version-badge-el">v...</div>
<script>
  // Script inline lê a meta e gera: v2026.03.30-18h00
  var meta = document.querySelector('meta[name="deploy-date"]');
  if (meta) {
    var d = new Date(meta.getAttribute('content'));
    var ver = 'v' + d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' +
      String(d.getDate()).padStart(2,'0') + '-' + String(d.getHours()).padStart(2,'0') +
      'h' + String(d.getMinutes()).padStart(2,'0');
    document.getElementById('version-badge-el').textContent = ver;
  }
</script>
```
**Para atualizar versão:** mudar `content` da meta tag + incrementar `?v=NNN` nos 9 scripts.

---

## 12. Sistema de Escrita Firestore (FIX-QUOTA) — Estado Atual

Todas as correções aplicadas para eliminar writes desnecessários:

| Fix | Arquivo | Problema | Solução |
|-----|---------|----------|---------|
| FIX-QUOTA #A | `db.js` | Reescrevia todos docs mesmo sem mudança | Diff JSON por documento no batch |
| FIX-QUOTA #B | `db.js` | Enviava batch vazio | Bail-out se `setCount === 0 && deleteCount === 0` |
| FIX-QUOTA #C | `db.js` | Sessão criava 1 write no login | Session tracking via localStorage |
| FIX-QUOTA #D | `db.js` | getDocs(logs, limit 1000) | Limite reduzido para 200 |
| FIX-QUOTA #E | `init.js` | Log de auditoria em toda ação | Apenas ações críticas vão ao Firestore |
| FIX-QUOTA #F | `tracking.js` | 2 saves separados no import | Save unificado pós-migração |
| FIX-QUOTA #G | `db.js`+`billing.js` | `save(bls)` para 1 BL = diff de toda a coleção | `_dmFireSaveOne` + `saveOne(bl)`: 1 `setDoc` direto |
| FIX-QUOTA #H | `init.js` | `trkSave` dentro de `_dmOnTrkUpdate` causava cascata | Flag `_trkSaving` anti-loop |
| FIX-QUOTA #I | `tracking.js` | `trkSave` na IIFE antes da autenticação | Removido; filtro real no `_dmOnReady` |
| FIX-QUOTA #J | `users.js` | N `deleteDoc` sequenciais na limpeza de logs | `writeBatch` em chunks de 400 |
| FIX-QUOTA #1 | `billing.js` | `applyPTAXGlobal()` salvava todos BLs mesmo sem mudança de ROE | Condição `b.roe !== ptaxState.roe` |
| FIX-QUOTA #2 | `billing.js` | `renderDoc()` chamava `save(bls)` no loop de print | Removido; apenas memória |
| FIX-QUOTA #4 | `init.js` | 3 migrações de startup = até 3 saves | `runStartupMigrations()`: 1 passagem, 1 save |

**Fluxo correto para 1 BL:**
`saveOne(bl)` → `_dmFireSaveOne('bls', bl.id, bl)` → `setDoc(merge:true)` → onSnapshot → `_dmOnBLsUpdate` → `bls = load()` (0 writes adicionais)

**Fluxo correto para bulk:**
`save(bls)` → `_dmFireSave('bls', bls)` → diff → `batch.commit()` com apenas docs alterados → onSnapshot

---

## 13. Startup Flow (`_dmOnReady` em `init.js`)

```
db.js: onSnapshot(bls+trk+clients) → checkReady() → window._dmOnReady()
  ↓
init.js: _dmOnReady()
  1. bls = load()                      # cópia profunda do _dmStore.bls
  2. runStartupMigrations()            # 1 save apenas se algum campo faltante
     ├── backfill venc (nextBusinessDay)
     ├── backfill docnum (genDocnum)
     └── backfill migratedAt
  3. trkLoad + filter clean            # trkSave apenas se containers foram removidos
  4. clients = cliLoad()
  5. renderList() + renderTracking() + renderDashboard()
  6. loadPTAX()                        # applyPTAXGlobal() → save(bls) só se roe mudou
  7. loadCfgRatesFromFirestore()
  8. switchModule('dashboard')
  9. Registra callbacks reativos:
     ├── _dmOnBLsUpdate  → bls = load(); renderList(); renderDashboard()
     ├── _dmOnTrkUpdate  → filtro clean com _trkSaving guard; renderTracking()
     └── _dmOnClientsUpdate → clients = cliLoad(); renderClients()
```

**Writes esperados por login (após todas as correções):**
- Migrações já feitas → **0 writes**
- PTAX sem mudança → **0 writes**
- Filtro containers sem devolvidos no free time → **0 writes**
- Caso pior (todas as migrações + PTAX mudou + filtro) → **2 batch commits** (1 bls + 1 trk)

---

## 14. Taxas D&D (`rates.js`)

| Tipo | Descrição |
|------|-----------|
| 20GP/HC | 20 pés General Purpose / High Cube |
| 40GP/HC | 40 pés General Purpose / High Cube |
| 20FR/OT | 20 pés Flat Rack / Open Top |
| 40FR/OT | 40 pés Flat Rack / Open Top |
| 20RF/RQ | 20 pés Reefer/Refrigerado |
| 40RF/RQ | 40 pés Reefer/Refrigerado |

- `getRate(typeStr)` → retorna objeto de taxa (com override do Firestore se disponível)
- `getRateForBL(bl, typeStr)` → considera `bl.freeTime` e overrides `ov1/ov2`
- `calcUSD(dc, rate, ov1, ov2)` → `{totalUSD, diasP1, diasP2, usdP1, usdP2}`
- Taxas editáveis em Configurações → Taxas → salvas em `config/rates`

---

## 15. CSS

### Variáveis CSS (`:root` em `base.css`)
`--primary`, `--navy`, `--green`, `--red`, `--amber`, `--blue`, `--border`, `--muted`, `--bg`, `--text`, `--dark`, `--font`, `--blue-light`, `--red-light`, `--green-light`

### Componentes-chave em `base.css`
- `.bl-card` → card de BL com `border-left` colorido (pago=verde, disputa=âmbar)
- `.act-btn` → botões com gradiente, hover `translateY(-1px)`, grupos visuais
- `.bl-action-group` + `.bl-action-divider` → layout dos botões do BL card
- `.dk-card` → card de dashboard/KPI
- `.trk-table` → tabela de containers
- `.cfg-card`, `.cfg-subtabs`, `.cfg-pane` → layout de Configurações
- `.mod-tab` → tabs de navegação
- `.overlay` → backdrop de modal (`.open` exibe)

### Responsividade (`components.css`)
`@media (max-width: 768px)`: `.bl-actions` wraps, `.bl-action-divider` oculto, `act-btn` min-height 38px

---

## 16. Modais

| ID | Propósito |
|----|-----------|
| `modal-bl` | Criar/editar BL |
| `modal-trk-import` | Importar planilha de containers (XLSX/CSV) |
| `modal-consolidated` | Cobrança consolidada por CNPJ |
| `modal-client` | Criar/editar cliente |
| `modal-user` | Criar/editar usuário do sistema |
| `modal-rates` | Editar taxas D&D |
| `modal-editval` | Editar valores congelados de fatura |
| `modal-alert-panel` | Painel de alertas D&D |
| `modal-alert-email` | Configurar e-mail de alerta |
| `modal-import` | Importar BLs — botão removido da toolbar, modal mantido |

`openModal(id)` / `closeModal(id)` → adiciona/remove classe `open` no `.overlay`.

---

## 17. Workflow de Alterações (Como Fazer Mudanças)

### Usando git clone (recomendado no Cowork)
```bash
git clone https://{PAT}@github.com/luccafwlog/demurrage-manager.git repo
# editar arquivos
git add <arquivos>
git commit -m "descrição"
git push origin main
```

### Regras de cache após deploy
- Após qualquer alteração em JS ou CSS → incrementar `?v=NNN` em **todos os 9 scripts** de `app.html`
- Após deploy significativo → atualizar `<meta name="deploy-date" content="YYYY-MM-DDTHH:MM">`
- Versão atual: `?v=107` | Deploy-date: `2026-03-30T18:00`

---

## 18. Regras Críticas de Desenvolvimento

1. **NUNCA** chamar `save()` / `trkSave()` / `cliSave()` dentro de funções de renderização (`renderDoc`, `renderList`, `renderTracking`, etc.). Saves devem ocorrer apenas em resposta a ações diretas do usuário.

2. **Para 1 entidade → `saveOne`**. Para múltiplas entidades → `save(array)`. Nunca usar `save(bls)` quando apenas 1 BL foi modificado.

3. **NUNCA** fazer write dentro de callbacks `onSnapshot`. Se necessário, usar flag de guarda (ex: `_trkSaving`) para evitar cascata.

4. **NUNCA** incrementar `changed++` sem verificar se o valor realmente mudou (padrão: `if (b.roe !== newValue) { b.roe = newValue; changed++; }`).

5. **`tab-users`** existe no DOM mas está sempre `display:none`. `switchModule('users')` redireciona para settings. Não restaurar como tab standalone.

6. **`db.js`** é o único script `type="module"`. Os demais são scripts regulares que dependem dos globals (`window._dmFireSave`, `window._dmFireSaveOne`, `window._dmStore`, etc.) expostos por `db.js`.

7. **Quota Firestore (plano gratuito):** 20K writes/dia. Com todas as correções FIX-QUOTA, consumo em uso normal ≈ **1 write por ação do usuário**.

---

## 19. Histórico de Features e Deploys

### 2026-03-30 — Auditoria Firestore (FIX-QUOTA #G a #J)
| Fix | Descrição |
|-----|-----------|
| `_dmFireSaveOne` em `db.js` | Nova função para 1 write direto sem diff de coleção |
| `saveOne(bl)` em `billing.js` | Wrapper para single-doc saves |
| `togglePaid/toggleBilled/saveBL` | Convertidos de `save(bls)` para `saveOne(bl)` |
| `deleteBL` | Convertido de `save(bls)` para `deleteBLById(id)` (1 delete) |
| Flag `_trkSaving` em `init.js` | Anti-cascata no `_dmOnTrkUpdate` |
| IIFE `trkSave` removido de `tracking.js` | Eliminado write perigoso no carregamento do módulo |
| `manualMigrate` | Corrigido: `save(bls)` adicionado (estava faltando) |
| `writeBatch` em `users.js` | Deleção de logs em batch (era N deletes sequenciais) |

### 2026-03-28 — Features iniciais
| Feature | Arquivos alterados |
|---------|--------------------|
| **FIX-QUOTA** — Correção de writes excessivos (#1 a #F) | `billing.js`, `init.js`, `db.js` |
| **Usuários → Configurações** — Tab integrada como sub-aba `cfg-users` | `app.html`, `init.js`, `db.js` |
| **Badge de versão dinâmico** | `app.html` |
| **Redesign botões BL** — Agrupamento visual, gradientes | `billing.js`, `base.css`, `components.css` |
| **Controle de Containers BL view** | `init.js`, `tracking.js` |
| **Cobrança Consolidada** — Botão 🧾 Imprimir Recibos | `app.html`, `consolidated.js` |
| **Filtro "Todos"** — Reset automático de Com Desconto e Em Disputa | `billing.js` |
