# Demurrage Manager — Snapshot de Engenharia

> **Versão:** v3.6 | **Cache:** `?v=123` | **Atualizado:** 2026-04-03
> **Repositório:** https://github.com/luccafwlog/demurrage-manager (`main`)
> **Produção:** https://demurragemanager.web.app
> **Supabase:** `vcdivphwlspsymgibfri` · us-east-1 · PostgreSQL 17.6

---

## 1. Arquitetura

| Camada        | Tecnologia                                                        |
|---------------|-------------------------------------------------------------------|
| Hosting       | Firebase Hosting (CI/CD via GitHub Actions → push `main`)        |
| Banco de Dados| Supabase (PostgreSQL + PostgREST)                                 |
| Autenticação  | Supabase Auth — email/senha, sessão persistida no `localStorage`  |
| Frontend      | HTML5 + CSS3 + JavaScript Vanilla (sem framework, sem build step) |

**Decisão arquitetural**: O app é uma SPA em dois arquivos HTML (`index.html` + `app.html`). Toda a lógica está em módulos JS externos carregados via `<script src>` com cache busting por query string (`?v=NNN`). Não há transpilação nem bundler.

---

## 2. Estrutura de Arquivos

```
/
├── index.html                    ← Login (Supabase Auth)
├── app.html                      ← SPA principal
├── firebase.json                 ← Config Firebase Hosting (apenas hosting)
├── firestore.rules               ← Legado, ignorado
├── supabase_schema.sql           ← Schema PostgreSQL de referência
├── demurrage_manager_snapshot.md ← Este arquivo
├── DEPLOY.md                     ← Instruções de deploy
├── css/
│   ├── base.css                  ← Variáveis CSS e reset
│   └── components.css            ← Modais, tabelas, pills, alertas
└── js/
    ├── db.js          ← FONTE DE VERDADE: Supabase init + auth + toda persistência
    ├── utils.js       ← Toast, modais, formatação de datas/valores, uid gerador
    ├── rates.js       ← Tabela de taxas D&D, cálculos USD, PTAX
    ├── billing.js     ← Módulo Faturamento: BLs, geração de faturas, PDF, PIX
    ├── tracking.js    ← Módulo Rastreamento: importação XLSX, status, migração→billing
    ├── clients.js     ← Módulo Clientes: CNPJ, emails, sync com BLs
    ├── users.js       ← Admin: gestão de usuários, log de auditoria
    ├── consolidated.js← Visão consolidada por CNPJ (múltiplos BLs)
    └── init.js        ← Bootstrap UI, Dashboard, Configurações
```

### Ordem de carregamento e fluxo de boot

```html
<!-- CDN Supabase JS v2 (UMD — disponível como window.supabase) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>

<!-- db.js como ES module — defer automático, executa APÓS DOM e scripts regulares -->
<script type="module" src="js/db.js?v=113"></script>

<!-- Módulos regulares — executam em ordem, antes do db.js -->
<script src="js/utils.js?v=113"></script>
<script src="js/rates.js?v=113"></script>
<script src="js/billing.js?v=113"></script>
<script src="js/tracking.js?v=113"></script>
<script src="js/clients.js?v=113"></script>
<script src="js/users.js?v=113"></script>
<script src="js/consolidated.js?v=113"></script>
<script src="js/init.js?v=113"></script>
```

**Sequência de boot:**
1. Scripts regulares executam → cada módulo registra funções no `window`, `init.js` define `window._dmOnReady()`
2. `db.js` (module/deferred) executa → cria cliente Supabase → verifica sessão
3. `db.js` carrega dados (`bls`, `clients`, `settings`, `usuarios`, `containers` paginado) → popula `window._dmStore`
4. `db.js` chama `window._dmOnReady()` → UI renderiza com os dados em memória

> **Crítico**: se `_dmOnReady` não estiver definido quando `db.js` terminar (erro em algum script regular), o app fica em tela em branco sem erro visível.

---

## 3. Banco de Dados

### Tabelas e PKs

| Tabela       | PK                                  | RLS | Rows (atual) | Notas |
|--------------|-------------------------------------|-----|--------------|-------|
| `bls`        | `(user_id, id)`                     | ✅  | ~254         | BLs de faturamento D&D |
| `containers` | `(user_id, container, bl)`          | ✅  | 1625         | PK tripla: mesmo container pode existir em BLs distintos (transshipment) |
| `clients`    | `(user_id, id)`                     | ✅  | ~78          | `id` = CNPJ normalizado (14 dígitos, com leading zero) |
| `settings`   | `user_id`                           | ✅  | 1+           | Apenas `alert_days` por ora |
| `usuarios`   | `id` (UUID = auth.users.id)         | ✅  | 1+           | Perfis: nome, cargo, admin, ativo |
| `logs`       | `id` (UUID gerado)                  | ✅  | variável     | Auditoria de ações |
| `checkpoints`| `id` (UUID gerado)                  | ✅  | variável     | Snapshots de dados para backup/restore |

### Schema

```sql
CREATE TABLE bls (
  id         TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users,
  data       JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

-- PK tripla — container pode aparecer em múltiplos BLs (cenário de transshipment)
-- bl TEXT NOT NULL DEFAULT '' garante que rows antigas sem bl não quebrem o upsert
CREATE TABLE containers (
  container  TEXT NOT NULL,
  bl         TEXT NOT NULL DEFAULT '',
  user_id    UUID REFERENCES auth.users,
  data       JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, container, bl)
);

CREATE TABLE clients (
  id         TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users,
  data       JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, id)
  -- ⚠️ constraint clients_unique (UNIQUE id isolado) foi REMOVIDA em 2026-03-31
  -- pois causava HTTP 409 quando usuários distintos tinham o mesmo CNPJ
);

CREATE TABLE settings (
  user_id    UUID PRIMARY KEY REFERENCES auth.users,
  alert_days INTEGER DEFAULT 5
);

CREATE TABLE usuarios (
  id        UUID PRIMARY KEY REFERENCES auth.users,
  nome      TEXT, email TEXT, cargo TEXT,
  admin     BOOLEAN DEFAULT false,
  ativo     BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users,
  usuario_nome TEXT,
  sessao_id    TEXT,
  acao         TEXT,
  detalhe      JSONB,
  criado_em    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE checkpoints (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users,
  label      TEXT NOT NULL DEFAULT '',
  tipo       TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'auto'
  criado_por TEXT,
  criado_em  TIMESTAMPTZ DEFAULT now(),
  payload    JSONB NOT NULL DEFAULT '{}'      -- snapshot completo: {bls, trk, clients}
);
```

### RLS — Modelo Colaborativo

```sql
-- Política aplicada em TODAS as tabelas:
CREATE POLICY "authenticated_rw" ON public.<tabela>
  FOR ALL TO public
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

> ⚠️ **RISCO ARQUITETURAL**: RLS não filtra por `user_id` — qualquer usuário autenticado lê e escreve todos os dados. O `user_id` nos registros serve apenas para rastreabilidade (logs). Se multitenancy real for necessário, exige migração das políticas RLS para `auth.uid() = user_id`.

---

## 4. Camada de Dados — db.js (fonte de verdade)

### Store em memória

```javascript
window._dmStore = {
  bls:       [],   // array de objetos BL (billing)
  trk:       [],   // array de objetos container (tracking)
  clients:   [],   // array de objetos cliente
  alertDays: 5     // limiar de alerta de free time
}
```

Todo módulo lê de `_dmStore` e escreve via funções de persistência de `db.js`. **Nunca mutatar `_dmStore` diretamente** — o mecanismo de diff do `_dmFireSave` depende de comparação entre a versão em memória e a versão anterior.

### API pública de db.js

| Função | Descrição |
|--------|-----------|
| `_dmStore` | Store em memória — leitura direta pelos módulos |
| `_dmUser` / `_dmUid` | Usuário autenticado e seu UUID |
| `_dmIsAdmin` / `_dmUserData` | Flag admin e perfil completo |
| `_dmSession` | ID de sessão (string UUID local, para logs) |
| `_dmFireSave(type, newData[])` | **Upsert em lote com diff** — ver abaixo |
| `_dmFireSaveOne(type, id, data)` | Upsert de registro único |
| `_dmFireDelete(type, id)` | Delete por ID (com filtro `user_id`) |
| `_dmFireRestore(bkp)` | Limpa e restaura tabelas (usado em backup) |
| `_dmFireLog(action, details)` | INSERT em `logs` |
| `_dmSaveAlertDays(n)` | Upsert em `settings.alert_days` |
| `_dmFireLoadUsuarios()` | SELECT usuarios |
| `_dmFireSaveUsuario(data)` | Upsert em usuarios |
| `_dmFireLoadLogs()` | SELECT logs (últimos 500) |
| `_dmFireDeleteLogs(ids[])` | DELETE logs WHERE id IN (...) |
| `_dmFireSaveCheckpoint(label, tipo)` | Salva snapshot completo em `checkpoints` |
| `_dmFireLoadCheckpoints()` | SELECT checkpoints (últimos 50, sem payload) |
| `_dmFireRestoreCheckpoint(id)` | Restaura dados do snapshot (limpa tabelas + reinserção) |
| `_dmFireDeleteCheckpoint(id)` | DELETE checkpoint por ID |
| `_dmLogout()` | `sb.auth.signOut()` |

### _dmFireSave — mecanismo de diff inteligente

Este é o coração do sistema de persistência. Comportamento:

```
1. Captura oldStore = JSON.parse(JSON.stringify(_dmStore[type]))  ← snapshot imutável
2. Atualiza _dmStore[type] = JSON.parse(JSON.stringify(newData))  ← deep copy (evita aliasing)
3. Constrói rowMap da newData usando _KEY_FN[type]
4. Diff: para cada row em newData, compara JSON.stringify com oldStore
5. Apenas rows modificadas ou novas vão para o upsert
6. Envia em chunks de 50 rows → sb.from(table).upsert(chunk, { onConflict })
7. Em caso de erro: rollback _dmStore[type] = oldStore
```

**Mapeamento interno de tipos:**

```javascript
_TABLE    = { bls: 'bls',           trk: 'containers',        clients: 'clients'      }

_KEY_FN   = {
  bls:     r => String(r.id || ''),
  trk:     r => `${r.container || ''}\x00${r.bl || ''}`,  // ← chave composta obrigatória
  clients: r => String(r.id || r.cnpj || '')
}

_COLS_FN  = {
  bls:     r => ({ id: r.id }),
  trk:     r => ({ container: r.container, bl: r.bl || '' }),  // bl vazio string, nunca null
  clients: r => ({ id: String(r.id || r.cnpj || '') })
}

_CONFLICT = {
  bls:     'user_id,id',
  trk:     'user_id,container,bl',   // alinhado à PK tripla da tabela
  clients: 'user_id,id'
}
```

> **Delete de container**: `_dmFireDelete('trk', 'ABCU1234567\x00HLCSSA3260012345')` — o ID deve ser a chave composta com `\x00` como separador.

### Carregamento de containers — paginação obrigatória

PostgREST tem um `max_rows` server-side que trunca respostas. A query de containers usa loop paginado:

```javascript
// db.js — boot
const TRK_PAGE = 1000;
let pageFrom = 0;
while (true) {
  const { data: page } = await sb.from('containers')
    .select('container, bl, data')
    .range(pageFrom, pageFrom + TRK_PAGE - 1);
  trkAllRows.push(...(page || []));
  if ((page || []).length < TRK_PAGE) break;
  pageFrom += TRK_PAGE;
}
```

> ⚠️ `bls` e `clients` não têm paginação. Se crescerem além de `max_rows`, serão truncados silenciosamente.

---

## 5. Módulos — Comportamento e Fluxos

### billing.js

- Lê: `window._dmStore.bls`
- Escreve via: `save(bls)` → `_dmFireSave('bls', bls)` | `saveOne(bl)` → `_dmFireSaveOne` | `deleteBLById(id)` → `_dmFireDelete`
- **PTAX**: busca na API Banco Central (`olinda.bcb.gov.br`). ROE = PTAX × 1.065. Fallback para entrada manual.
- **Numeração de faturas** (`genDocnum`): `DEM-{ano}-{ts4}{suffix3}` onde `ts4 = Date.now().toString(36).slice(-4).toUpperCase()` e `suffix3 = (|hash(bl)| % 1000).padStart(3, '0')`. Praticamente sem risco de colisão (substituiu hash mod 9000 que colisionou).
- Ações auditadas via `logAuditAction()` → `_dmFireLog`: criar, editar, excluir, pagar, faturar, enviar email.

### tracking.js

- Lê: `window._dmStore.trk`
- Escreve via: `trkSave(data)` → `_dmFireSave('trk', data)`
- **Importação**: drag-and-drop de XLSX (SheetJS). Colunas esperadas: `CONTAINER, BL, CNEE, TYPE, POL, POD, VESSEL, DISCHARGE, EMPTY RETURN, ROE, FREE TIME, CNPJ`.

**Filtro de importação (comportamento intencional):**
```
Container ignorado SE: emptyReturn preenchido AND discharge preenchido AND (emptyReturn - discharge) <= freeTime
→ Devolvido dentro do free time = sem demurrage = não entra no sistema
→ freeTime default = 21 dias se ausente na planilha
```

**Status de container:**

| Status | Condição |
|--------|----------|
| `returned` | `emptyReturn` preenchido, `used_days <= freeTime` (não importado) |
| `free` | Sem `discharge` |
| `grace` | `discharge` preenchido, dentro do free time |
| `dd_open` | Free time vencido, sem `emptyReturn` |
| `dd_returned` | Free time vencido, com `emptyReturn` |

**Auto-migração para faturamento** (`checkAndMigrateBLs`):
```
Para cada grupo de containers agrupados por BL:
  1. Todos os containers do BL têm emptyReturn? (allReturned)
  2. Pelo menos um tem status dd_returned? (hasDemurrage)
  Se (1) E (2):
    - BL não existe em billing → cria BL novo automaticamente
    - BL existe e não está pago/faturado → atualiza lista de containers se mudou
Retorna { newBLs: N, updatedContainers: M }
```

**Sync de emails (padrão batch — crítico):**

Após importação, para cada BL com CNPJ identificado, o sistema sincroniza emails do cliente com o BL correspondente em billing. O padrão **obrigatório** é acumular todas as mudanças em `Map` e executar um único `save(bls)` ao final. Chamadas individuais dentro de loops causam N requests HTTP concorrentes → `ERR_INSUFFICIENT_RESOURCES` (bug K/L, corrigido).

```javascript
// CORRETO — padrão atual em clients.js e tracking.js
const emailChanges = new Map(); // cnpj → emails[]
items.forEach(item => {
  // acumula no Map, não salva aqui
  emailChanges.set(item.cnpj, mergedEmails);
});
await cliSave(clients);          // 1 request
emailChanges.forEach((emails, cnpj) => syncBLEmails(cnpj, emails));
await save(bls);                  // 1 request

// ERRADO — nunca fazer isso:
items.forEach(item => {
  syncBLEmails(item.cnpj, emails); // salva bls N vezes → crash
});
```

### clients.js

- Lê: `window._dmStore.clients`
- Escreve via: `cliSave(clients)` → `_dmFireSave('clients', clients)`
- CNPJ normalizado: sempre 14 dígitos com leading zero (ex: `'04123456000100'`)
- `id` do cliente = CNPJ normalizado. Fallback no load: `r.id || r.cnpj || ''`
- Email merge usa Set (nunca sobrescreve): `new Set([...existing.emails, ...newEmails])`

### users.js

- Restrito a `_dmIsAdmin === true`
- Opera diretamente via `_dmFireLoadUsuarios` / `_dmFireSaveUsuario` / `_dmFireLoadLogs` / `_dmFireDeleteLogs`
- Log de auditoria: últimos 500 registros, filtros por ação/usuário/data, exportação CSV

### init.js

- Define `window._dmOnReady()` — ponto de entrada da UI após db.js carregar dados
- Dashboard: KPIs, alertas de free time (`alertDays`), top clientes, containers em D&D
- Taxas D&D: customizáveis pela interface, persistidas em `localStorage` (`dm_rates_v2`)
- `alertDays`: persistido no Supabase via `_dmSaveAlertDays(n)`
- Backup: exporta/importa JSON com snapshot de `_dmStore`
- Checkpoints: `createCheckpoint(tipo)`, `renderCheckpointList()`, `restoreCheckpoint(id,label)`, `deleteCheckpoint(id)`
- **Auto-checkpoint**: gerenciado pelo **Supabase pg_cron** — função `public.auto_checkpoint_daily()` agendada para `59 2 * * *` (02:59 UTC = **23:59 BRT**). Roda no servidor, independente do app estar aberto. Proteção anti-duplicata via checagem de `criado_em::date` no próprio banco. Frontend não tem mais nenhuma lógica de agendamento.

---

## 6. Estado Atual dos Dados (2026-03-31)

| Tabela       | Registros | Status |
|--------------|-----------|--------|
| `bls`        | ~254      | Migrados do Firebase |
| `containers` | 1625      | Importados via planilha (1629 − 4 devolvidos no free time) |
| `clients`    | ~78       | Migrados do Firebase |
| `settings`   | 1+        | Criado ao salvar alertDays |
| `usuarios`   | 1+        | Admin configurado |
| `logs`       | variável  | Crescimento em produção |

---

## 7. ⚠️ Riscos Técnicos e Pontos de Atenção

### [ALTO] RLS não isola dados por usuário
Todos os autenticados leem/escrevem todos os dados. Intencionalmente colaborativo hoje, mas impede multitenancy futuro sem migração de RLS.

### [ALTO] bls e clients sem paginação
`db.js` carrega `bls` e `clients` em query única sem `.range()`. Se ultrapassarem `max_rows` do PostgREST, serão truncados silenciosamente. Monitorar crescimento; adicionar paginação quando necessário.

### [MÉDIO] Concorrência em _dmFireSave
Se dois `_dmFireSave` do mesmo tipo forem disparados quase simultaneamente (ex: `save(bls)` chamado duas vezes em sequência rápida), o segundo captura `oldStore` antes que o primeiro termine o upsert. O diff do segundo pode gerar writes redundantes ou sobrescrever. Não há lock/mutex. Evitar múltiplos saves concorrentes do mesmo tipo.

### [MÉDIO] checkAndMigrateBLs não reverte
A migração automática de containers para billing é irreversível via código — uma vez criado o BL em billing, ele não é removido se containers forem deletados do tracking.

### [MÉDIO] genDocnum não é sequencial
O número de fatura `DEM-{ano}-{ts}{hash}` não é sequencial. Para fins fiscais/contábeis, se houver exigência de numeração sequencial, o mecanismo atual não atende.

### [BAIXO] _dmOnReady sem timeout de segurança
Se qualquer script regular falhar ao carregar (erro de sintaxe, 404), `_dmOnReady` não é definido e o app trava silenciosamente após o login.

### [BAIXO] Taxas D&D em localStorage
As taxas D&D customizadas ficam em `localStorage` — não são compartilhadas entre usuários nem dispositivos. Cada sessão/browser pode ter taxas diferentes.

---

## 8. Operações de Manutenção

### Bump de cache
Alterar `?v=NNN` para o próximo inteiro em todos os 9 `<script src>` de `app.html`. Usar `sed -i 's/v=118/v=119/g' app.html`. Versão atual: `?v=118`.

### Adicionar usuário
1. Criar conta em Supabase Auth Dashboard → Authentication → Users
2. Inserir na tabela `usuarios`:
```sql
INSERT INTO usuarios (id, nome, email, cargo, admin, ativo)
VALUES ('<uuid-do-auth>', 'Nome', 'email@empresa.com', 'Cargo', false, true);
```

### Promover admin
```sql
UPDATE usuarios SET admin = true WHERE email = 'usuario@empresa.com';
```

### Deploy
```bash
git add -A && git commit -m "descrição"
git push origin main
# GitHub Actions executa o deploy automaticamente para Firebase Hosting
```

---

## 9. Links

| Recurso | URL |
|---------|-----|
| App produção | https://demurragemanager.web.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/vcdivphwlspsymgibfri |
| Repositório GitHub | https://github.com/luccafwlog/demurrage-manager |

---

## 10. Changelog Recente

### v3.5 — 2026-04-03 — Controle de Containers: colunas ocultas, Sem CNPJ, Limpar Filtros

**`js/tracking.js`**
- Colunas TIPO, POL, POD, NAVIO, DESCARGA e DEADLINE agora recebem `class="trk-col-hidden"` nas `<td>` do template de linha → dados preservados, exibição ocultada via CSS.
- `toggleTrkSemCnpj()`: ativa/desativa filtro toggle "Sem CNPJ" via `window._trkFilterSemCnpj`.
- `renderTracking()`: aplica `matchSemCnpj` quando filtro ativo (exibe apenas containers sem CNPJ de 14 dígitos).
- `clearTrkFilters()`: agora também reseta `trk-search`, `trk-filter-status` (volta a "all") e o toggle `_trkFilterSemCnpj`.

**`app.html`**
- Botão **⚠ Sem CNPJ** adicionado na toolbar de Controle de Containers (`id="trk-btn-sem-cnpj"`).
- Cache bump: `?v=121` → `?v=122`.

### v3.4 — 2026-04-03 — Filtros Clientes, CNPJ em Containers, Edit/Delete

**`js/clients.js` + `app.html`**
- `window._cliActiveFilter`: estado único para filtros mutuamente exclusivos (`semEmail` | `comBLs` | `semBLs` | null).
- 3 botões de filtro toggle na toolbar de Clientes: **📭 Sem e-mail**, **📋 Com BLs**, **Sem BLs**. Botão ativo fica com estilo `.btn-outline.active` (fundo azul).
- `toggleCliFilter(type)`, `clearClientFilter()`, `_updateCliFilterButtons()` adicionados a `clients.js`.
- Busca textual e filtros categóricos são cumulativos.

**`js/init.js`**
- `groupAlertsByCnee()`: quando `a.row.cnpj` está vazio, tenta encontrar o cliente pelo nome (`cnee`). Se encontrado, usa o e-mail do cadastro e exibe badge "⚠ CNPJ não vinculado" no painel de Alertas.
- `filterClientsSemEmail()`: usa o novo `_cliActiveFilter`.

**`app.html` + `js/tracking.js`**
- Coluna **CNPJ** adicionada na tabela de containers (após CNEE): exibe formatado ou "—" em vermelho se ausente.
- Filtro de coluna `tf-cnpj` com busca por dígitos.
- Coluna **AÇÕES** adicionada no final da tabela com botões ✏️ e 🗑️ por linha.
- Modal `modal-trk-edit` com todos os campos editáveis do container.
- `openEditContainer(safeKey)`: abre modal com dados do container selecionado.
- `saveEditContainer()`: salva trkData + atualiza container no BL de faturamento (se não congelado) + recalcula deadline.
- `confirmDeleteContainer(safeKey)`: remove do trkData + remove do BL de faturamento (se não congelado) + aviso se BL já congelado.

**`css/base.css`**
- `.btn-outline.active` — estado ativo para botões de filtro toggle.

### v3.3 — 2026-04-03 — Redesign Painel: cards, filtros e remoções

**`app.html` + `css/components.css`**
- Cards de Faturamento redesenhados: nova cor `.dk-slate` para "Total de BLs"; sem cor duplicada.
- Seções "Faturamento" e "Faturamento & Cobranças" unidas em uma só com 2 linhas de cards.
- Card "VENCIDO" (vermelho) removido — datas de vencimento são sempre próximo dia útil, nunca representam atraso real.
- Valores monetários (`dk-money-val`) com `font-size:clamp(12px,1.3vw,17px)` e `white-space:nowrap` — nunca quebram linha.
- Botão "Importar Planilha – Faturamento via Excel" removido das Ações Rápidas.
- Aba Clientes: badge de filtro ativo "📭 Sem e-mail" com botão ✕ para limpar.

**`js/init.js`**
- `pendentes` corrigido: `bls.filter(b => b.billed && !b.paid)` — era incorretamente `!b.paid` (=total de BLs).
- `renderTodoList`: removidos itens "faturas vencidas" e "faturas vencendo em 3 dias".
- `filterClientsSemEmail()`: agora define `window._cliFilterSemEmail = true` antes de navegar.
- `clearClientFilter()`: nova função, limpa flag e badge.
- `switchModule()`: limpa filtro sem-email ao sair da aba Clientes.

**`js/clients.js`**
- `renderClients()`: aplica `window._cliFilterSemEmail` para exibir apenas clientes sem e-mail quando ativado pelo painel.
- Busca manual limpa o filtro automaticamente ao digitar.

### v3.2 — 2026-04-03 — Auto-checkpoint server-side via pg_cron

**Supabase (migration: `auto_checkpoint_pg_cron`)**
- Habilitada extensão `pg_cron`.
- Criada função `public.auto_checkpoint_daily()`: monta payload com `jsonb_agg` das tabelas `bls`, `containers` e `clients`; proteção anti-duplicata via `(criado_em AT TIME ZONE 'America/Sao_Paulo')::date`; insere com `criado_por = 'SISTEMA'`.
- Job agendado: `cron.schedule('auto-checkpoint-diario', '59 2 * * *', ...)` — **02:59 UTC = 23:59 BRT**.
- O checkpoint agora ocorre **no servidor**, independente de qualquer browser estar aberto.

**`js/init.js`**
- Removidas funções `_tryAutoCheckpoint()` e `_scheduleAutoCheckpoint()` (frontend não agenda mais nada).
- Checkpoints manuais (`createCheckpoint('manual')`) continuam funcionando normalmente.

### v3.1 — 2026-04-03 — Auto-checkpoint agendado para 23:59 (substituído por v3.2)

---

### v3.0 — 2026-04-03 — Dashboards KPI reativos (Faturamento + Containers)

**Faturamento (`billing.js` + `app.html`)**
- Nova função `blTotalUSD(b)`: calcula total em USD de um BL (desconto percentual aplicado; desconto fixo BRL ignorado para USD).
- Nova função `updateBillingKPIs(filtered)`: agrega e renderiza 4 KPI cards com base no array `filtered` atual.
- `renderList()`: chama `updateBillingKPIs(filtered)` imediatamente após `updateBillingBadges()` — antes do early-return de estado vazio, garantindo que cards reflitam mesmo quando nenhum resultado é encontrado.
- HTML: `.billing-kpi-grid` com 4 cards (`kpi-usd`, `kpi-brl`, `kpi-bls`, `kpi-containers`) inserido acima do `#bl-list`.

**Controle de Containers (`tracking.js` + `app.html`)**
- Nova função `trkRowUSD(r)`: calcula USD estimado de D&D de uma linha (usa `getRateForBL` com `freeTime` por container).
- Nova função `updateTrkKPIs(filtered)`: agrega Containers, BLs únicos, D&D aberto, Atenção e Valor USD — todos baseados no `filtered` atual.
- `renderTracking()`: stats (`ts-total`, `ts-over`, `ts-grace`, `ts-bls`, `ts-usd`) agora derivados do `filtered` em vez de `trkData`. `ts-ready` mantido como indicador global.
- HTML: `.trk-stats` expandido para 6 cards; adicionados `ts-bls` (BLs únicos) e `ts-usd` (Valor D&D USD); cada card exibe legenda de contexto (`.trk-stat-sub`).

**CSS (`base.css` + `components.css`)**
- `.trk-stats`: 4 → 6 colunas; breakpoints ajustados (768px→3col, 480px→2col).
- `.billing-kpi-grid`: grid 4-col, barra de cor no topo (`::before`), responsivo (768px→2col, 480px→2col).
- Novas classes: `.kpi-card`, `.kpi-card--{blue|green|navy|gold}`, `.kpi-icon`, `.kpi-label`, `.kpi-val`, `.trk-stat-sub`.

---

## 11. Decisões Arquiteturais Relevantes (ADRs Compactos)

| Decisão | Motivo | Trade-off |
|---------|--------|-----------|
| SPA em HTML puro sem framework | Zero dependência de build, deploy simples | Sem hot reload, sem tipagem, sem tree shaking |
| db.js como ES module, demais como scripts regulares | db.js precisa de `import` (Supabase SDK). Módulos têm defer implícito, garantindo que `_dmOnReady` exista quando db.js termina | Risco de race condition se scripts regulares falharem |
| Diff inteligente no _dmFireSave | Evita writes desnecessários no Supabase (custo + rate limit) | Deep copy em JSON a cada save — overhead em listas grandes |
| Deep copy obrigatória em _dmStore | Evita aliasing entre módulo e store (causou bugs de diff fantasma) | Memória duplicada em sessões com muitos dados |
| PK tripla (user_id, container, bl) | Suporta transshipment: mesmo container em BLs diferentes | Delete de container exige chave composta com `\x00` |
| RLS colaborativa (sem filtro por user_id) | Simplicidade operacional para equipe pequena | Impede isolamento de dados por usuário sem refactor |
| Paginação de containers (1000/página) | PostgREST max_rows truncava silenciosamente | bls/clients ainda sem paginação |
| UNIQUE(id) removida de clients | Causava HTTP 409 quando usuários distintos tinham mesmo CNPJ | PK (user_id, id) garante unicidade com semântica correta |
