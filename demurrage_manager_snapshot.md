# Demurrage Manager — Snapshot de Engenharia

> **Versão:** v2.8 | **Cache:** `?v=114` | **Atualizado:** 2026-04-02
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
Alterar `?v=113` para o próximo inteiro em todos os 9 `<script src>` de `app.html`. Usar `sed -i 's/v=113/v=114/g' app.html`.

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

## 10. Decisões Arquiteturais Relevantes (ADRs Compactos)

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
