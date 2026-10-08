# Demurrage Manager — Snapshot de Engenharia

> **Versão:** v3.18 | **Cache:** `?v=139` | **Atualizado:** 2026-04-11
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

### [RESOLVIDO v4.0] RLS por função
Colaborativo entre usuários ATIVOS; admin, auditoria e taxas protegidos no servidor (ver migração 20261008).

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

### v4.0 — 2026-10-08 — revisão completa: segurança, integridade financeira e UI

**Segurança**
- `supabase/migrations/20261008_seguranca_rls.sql`: RLS por função — usuário inativo sem acesso no servidor; só admin escreve em `usuarios`, `rates` e apaga checkpoints/faturas emitidas; `logs` somente-inclusão; índice único por nº de BL.
- `esc()`/`escJs()` (utils.js) aplicados em toda interpolação de dados em HTML (antes uma planilha com `<img onerror>` executava script).
- `db.js` bloqueia usuário `ativo=false`; login/logout auditados; recuperação de senha pede a nova senha.
- Hosting não publica mais `.md`/`.sql`; Supabase JS com versão fixa.

**Dados**
- Erro de gravação não marca mais o store como salvo (antes os dados se perdiam ao recarregar).
- Exclusões sem filtro de `user_id` (registros de outros usuários "ressuscitavam").
- Carga inicial com erro aborta em vez de abrir com dados parciais.
- Backup/checkpoint: `_dmFireReplaceAll` grava tudo antes de remover; checkpoint de segurança automático; só admin.
- Sincronização em tempo real entre usuários (`postgres_changes` → `_dmOnRemoteChange`).

**Faturamento**
- Fonte única de valor: `invoiceTotalBRL(b)` (painel, KPIs, relatório, e-mails, PIX, consolidada).
- Não congela com PTAX indisponível (antes congelava R$ 0,00); valores congelados em centavos.
- Congelamento usa o valor EMITIDO (impressão/e-mail: `emittedRoe/emittedTotal`).
- "Editar Valor" persistido (`manualTotal`) e auditado.
- Desfazer pagamento de BL faturado mantém o valor congelado; pagamento registra valor recebido (`paidAmount`).
- Conciliação PIX confere valor (divergência desmarcada e confirmada); uma transação por fatura.
- Consolidada não aceita BL já faturado; BL duplicado bloqueado; exclusão de fatura emitida só admin.
- Datas no fuso de Brasília + feriados nacionais em `nextBusinessDay`.

**Rastreamento**
- Free time padrão por tipo (`trkFreeTime`: reefer 10d, demais 21d) — antes 21 para todos.
- "Migrar para Faturamento" salva de fato; "Atenção" usa a mesma janela de alerta do painel.
- Reimportação não sobrescreve containers editados manualmente no BL.

**UI**
- Painel/cabeçalho/modais responsivos; faturado com cor própria; botões de ação com rótulo de ação; foco de teclado; avisos de erro ficam 8s.

> ⚠️ Containers importados ANTES desta versão sem FREE TIME na planilha ficaram gravados com 21 dias, inclusive reefers. Revise-os (filtro por tipo RF) e corrija pelo modal de edição.

### v3.18 — 2026-04-11 — fix: firstBilledAt backfill em BLs existentes + proteção na reversão

**Causa raiz do bug anterior**
- BLs faturados antes da v3.17 existir tinham `billedAt` mas nenhum `firstBilledAt`.
- Ao reverter, `billedAt` era zerado sem antes salvar seu valor em `firstBilledAt`.
- No re-faturamento, `if (!b.firstBilledAt)` era `true` → recebia a data nova, sobrescrevendo o histórico.

**Correções — `js/billing.js`**
- `load()`: backfill automático ao carregar — se `billedAt` existe mas `firstBilledAt` não, define `firstBilledAt = billedAt`. Cobre todos os BLs existentes sem necessidade de re-faturamento.
- `toggleBilled()` (reversão): antes de zerar `billedAt`, verifica `if (!b.firstBilledAt && b.billedAt)` e salva o valor como `firstBilledAt`. Garante que nenhuma reversão futura perca a data original.
- `?v=139` | versão v3.18

---

### v3.17 — 2026-04-10 — fix: firstBilledAt imutável + colunas de faturamento no relatório

**Problema corrigido**
- `billedAt` era sobrescrito toda vez que o usuário marcava uma fatura como "Faturado" novamente após reverter, perdendo a data original.

**Solução aplicada — `js/billing.js`**
- Novo campo `firstBilledAt`: definido apenas na **primeira** vez que o BL é marcado como faturado; nunca sobrescrito em reativações.
- `billedAt` agora representa a data do **último** faturamento (sempre atualizado).
- Ao reverter para Pendente, `firstBilledAt` é preservado; `billedAt` é limpo.
- Card chip na aba Faturados exibe "📄 1ª emissão: DD/MM/AAAA" e, se houver refaturamento, também "· Última: DD/MM/AAAA".
- Filtro de período na aba Faturados filtra por `firstBilledAt` (data canônica da 1ª emissão).
- Aging badge continua usando `billedAt` (dias desde o último faturamento — mais relevante para cobrança).
- Relatório Excel: duas novas colunas **1º FATURAMENTO** e **ÚLT. FATURAMENTO**.
- Cache bumped: `?v=138`

---

### v3.16 — 2026-04-10 — feat: datas e filtro por período em todas as abas de Faturamento

**Funcionalidade adicionada**
- Cada sub-aba do módulo de Faturamento exibe a data relevante em cada card:
  - **Pendentes**: data em que todos os containers foram devolvidos (`readyAt` = max `emptyReturn`) — chip amarelo "📅 Pronto p/ faturar"
  - **Faturados**: data em que o usuário marcou como faturado (`billedAt`) — chip azul "📄 Faturado em"
  - **Pagos**: data do pagamento (`paidAt`) — chip verde "✅ Pago em"
- Filtro de período (De → Até) adicionado na barra de filtros de cada sub-aba, filtrando pelo campo de data correspondente
- Botão "✕ Limpar datas" aparece automaticamente quando um filtro de data está ativo
- `computeReadyAt(b)` — nova função helper em `billing.js` que calcula a data de prontidão de um BL a partir dos containers
- `clearDateFilter(tab)` — função para limpar o filtro de data de uma aba específica
- `readyAt` é calculado automaticamente ao salvar ou importar BLs

**Arquivos modificados**
- `js/billing.js` — `computeReadyAt`, `clearDateFilter`, `renderList` (filtro de data + chip no card), `saveBL` e `doImport` (cálculo automático de `readyAt`)
- `app.html` — inputs de data adicionados aos três `subfilters-*` divs; cache bumped `?v=137`

---

### v3.15 — 2026-04-10 — fix: recálculo automático de vencimento ao reverter FATURADO→PENDENTE

**Problema corrigido**
- Ao desmarcar uma fatura como "Faturado" (`toggleBilled`), o campo `venc` (data de vencimento) permanecia com o valor anterior, sem recálculo.

**Solução aplicada — `js/billing.js`**
- No branch de reversão de `toggleBilled()`, adicionadas 3 linhas:
  1. `const newVenc = nextBusinessDay(null)` — calcula próximo dia útil a partir de hoje.
  2. `b.venc = newVenc` — atualiza o campo no objeto em memória (persiste via `saveOne(b)`).
  3. `logAuditAction('reversao_fatura', {blId, bl, newVenc})` — rastreabilidade no log de auditoria.
- Toast atualizado para exibir o novo vencimento calculado.

**Regra de negócio**
- FATURADO → PENDENTE sempre recalcula `venc` = próximo dia útil após a data da reversão.
- Finais de semana tratados: sexta → segunda, sábado → segunda, domingo → segunda.
- Nenhuma outra transição de status é afetada.
- `nextBusinessDay()` preexistente reutilizada sem modificação.

---

### v3.14 — 2026-04-10 — feat: Recibo Consolidado + restrição de recibo para faturas pagas

**Regras de Negócio**
- Recibo (`viewDoc(..., 'receipt')`) bloqueado para faturas não pagas — toast de erro + retorno antecipado.
- Botão "🧾 Recibo" desabilitado visualmente (opacity 0.38, cursor not-allowed) para BLs não pagos.
- `generateSelectedReceipts()` e `generateConsolidatedReceipts()` validam `b.paid` antes de gerar; retornam erro `"Receipt can only be issued for paid invoices"` se houver não-pagos selecionados.

**`app.html`** (cache `?v=135` → `?v=136`)
- Botão `#btn-cobranca-consolidada` e `#btn-recibo-consolidado` adicionados na toolbar do módulo Faturamento.
- "Recibo Consolidado" visível apenas na aba "✔ Pagos"; "Cobrança Consolidada" oculto nessa aba.
- Removido botão `#cons-receipts-btn` do footer do modal Cobrança Consolidada.
- Novo modal `#modal-consolidated-receipt` com filtro de cliente/BL, listagem de faturas pagas com checkbox, seleção em massa e botão "🧾 Gerar Recibos".

**`js/billing.js`**
- Linha ~553: botão Recibo renderizado com classe `receipt-locked` + style inline quando `!isPaid`.
- `viewDoc()`: guard de negócio — bloqueia `type === 'receipt'` para `!b.paid`.

**`js/consolidated.js`**
- `openReceiptSelectModal()`: filtra `bls` para `b.cnpj === cnpj && b.paid` (antes incluía não-pagos).
- Checkboxes do `modal-receipt-select` agora nascem todos marcados (todos são pagos).
- `generateSelectedReceipts()`: validação de `b.paid` nos selecionados antes de gerar.
- Removidas referências a `cons-receipts-btn` de `openConsolidatedEmail()`, `_clearConsSelection()` e `_updateConsBLButtons()`.
- Novas funções: `openConsolidatedReceiptModal()`, `filterConsolidatedReceiptList()`, `_renderCrList()`, `_updateCrCount()`, `_toggleAllCrCheckboxes()`, `generateConsolidatedReceipts()`.

**`js/init.js`**
- `setBillingSubTab()`: toggle de visibilidade `#btn-cobranca-consolidada` ↔ `#btn-recibo-consolidado` conforme aba ativa.

---

### v3.13 — 2026-04-06 — feat: campo "Assunto do E-mail" obrigatório na seção Disputa

**`app.html`**
- Adicionado `#f-dispute-subject` (input text) dentro de `#dispute-details`, logo acima de "Observações".
- Label exibe indicador visual `*obrigatório` em vermelho.

**`js/billing.js`**
- `saveBL()`: valida que `f-dispute-subject` está preenchido quando a disputa está marcada como aberta; exibe toast de erro e dá foco no campo se vazio.
- `dispute` object: inclui novo campo `subject` ao persistir.
- `fillForm()`: preenche `f-dispute-subject` a partir de `b.dispute.subject` ao editar BL existente.
- `resetForm()`: limpa `f-dispute-subject` ao abrir modal de novo BL.
- Cache bump: `?v=129` → `?v=130`.

---

### v3.12 — 2026-04-06 — feat: indicador de último upload de containers na barra PTAX

**`app.html`**
- Adicionado `#last-upload-badge` dentro da `.ptax-banner`, agrupado em `.ptax-right-group` com o label "Fonte: BCB".
- Exibe: ícone 📦 + "Último upload:" + timestamp relativo (ex.: "hoje 14:23", "há 5 min", "01/04/2026 08:10").

**`css/components.css`**
- Novos seletores: `.ptax-right-group`, `.ptax-upload-badge`, `.ptax-upload-label`, `.ptax-upload-time`, `.ptax-right-sep`.
- `.ptax-src` removido o `margin-left: auto` (agora pertence ao grupo direito).

**`js/db.js`**
- Query de containers passa a selecionar `updated_at` além de `container, bl, data`.
- Após carregar, calcula `MAX(updated_at)` dos registros e chama `_dmRenderLastUpload()`.
- `window._dmRenderLastUpload(isoDate)`: função global que formata e renderiza o timestamp no badge.

**`js/tracking.js`**
- `doTrkImport()`: após salvar os dados, chama `window._dmRenderLastUpload(new Date().toISOString())` para atualizar o badge em tempo real.
- Cache bump: `?v=128` → `?v=129`.

---

### v3.11 — 2026-04-06 — Fix: vencimento de BLs Pendentes avança automaticamente para próximo dia útil

**`js/init.js`**
- `runStartupMigrations()`: nova etapa **1b** que, a cada abertura do sistema, verifica BLs Pendentes (`!billed && !paid`) cujo `venc` seja anterior a hoje e os avança para `nextBusinessDay(null)` (próximo dia útil a partir de hoje).
- BLs Faturados (`billed && !paid`) **não** são alterados — o venc foi comunicado ao cliente na fatura e não deve mudar.
- Cache bump: `?v=127` → `?v=128`.

**Regra de negócio:** `venc` de BLs Pendentes é sempre >= próximo dia útil. Se o usuário abrir o sistema em uma segunda-feira após um fim de semana, todos os Pendentes com venc no passado são automaticamente atualizados para a terça-feira.

---

### v3.10 — 2026-04-06 — Painel: card Faturados + reorganização da seção Faturamento

**`app.html`**
- Card **🧾 Faturados** adicionado ao painel principal (`id="dk-faturados"`): BLs faturados aguardando pagamento (billed && !paid).
- Card **Pendentes** corrigido para apontar corretamente BLs não faturados (!billed && !paid).
- Linha 1 de Faturamento: 4 cards iguais — Total de BLs | Pendentes | Faturados | Pagos (era 3 + 1 hero).
- Linha 2 de Faturamento: 3 cards financeiros — Saldo em Aberto (2fr) | Faturado (1.2fr) | Em Disputa (1fr).
- Onclicks dos cards de contagem atualizados para `setBillingSubTab()` em vez de `setFilter()`.
- Cache bump: `?v=126` → `?v=127`.

**`js/init.js`**
- `renderDashboard()`: `pendentes` corrigido para `!b.billed && !b.paid` (antes estava calculando `b.billed && !b.paid`, ou seja, Faturados); nova variável `faturados = b.billed && !b.paid`; `dk-faturados` atualizado.

---

### v3.9 — 2026-04-06 — CNPJ obrigatório no import + barras de pesquisa ampliadas

**`js/tracking.js`**
- `processTrkFile()`: validação de CNPJ adicionada antes de habilitar o botão de importar. Se qualquer linha tiver CNPJ ausente ou inválido (≠ 14 dígitos), o botão permanece desabilitado, a drop-zone exibe mensagem de erro com o número de containers problemáticos, e um toast de erro é disparado.
- Importação com todos os CNPJs válidos exibe confirmação "todos os CNPJs OK" na drop-zone.

**`app.html`**
- Barra de pesquisa de **Controle de Containers** (`#trk-search`): `flex:1;max-width:400px` → `flex:2;min-width:240px;max-width:600px`.
- Barra de pesquisa de **Clientes** (`#cli-search`): mesmo ajuste.
- Cache bump: `?v=125` → `?v=126`.

---

### v3.8 — 2026-04-06 — Faturamento: 3 abas (Pendentes / Faturados / Pagos)

**`app.html`**
- Nova aba **⏳ Pendentes** adicionada antes de "Faturados" na barra de sub-tabs do módulo Faturamento (`id="subtab-pendentes"`, `id="badge-pendentes"`).
- Subfilters da aba Pendentes adicionados (`id="subfilters-pendentes"`): Todos | 💚 Com Desconto | ⚠️ Em Disputa.
- Subfilters da aba Faturados simplificados (removidos botões ⏳ Pendentes e 📄 Faturados, que eram redundantes com as abas).
- Cache bump: `?v=124` → `?v=125`.

**`js/init.js`**
- `activeBillingSubTab` permanece `'faturados'` como padrão.
- `setBillingSubTab()` atualizado para suportar 3 valores: `'pendentes'`, `'faturados'`, `'pagos'`.
- `updateBillingBadges()` atualizado: badge Pendentes = `!b.billed && !b.paid`; badge Faturados = `!!b.billed && !b.paid`; badge Pagos = `!!b.paid`.

**`js/billing.js`**
- `renderList()`: lógica `inScope` refatorada para 3 abas — `inPend = !b.billed && !b.paid`, `inFat = !!b.billed && !b.paid`, `inPago = !!b.paid`.
- `setFilter()`: filtros `'unpaid'` e `'billed'` removidos (substituídos pelas abas). Adicionado suporte ao botão `filter-all-pendentes`.
- `toggleDiscountFilter()` e `toggleDisputeFilter()`: incluídos seletores dos novos botões `#filter-discount-btn-pendentes` e `#filter-dispute-btn-pendentes`.

---

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
