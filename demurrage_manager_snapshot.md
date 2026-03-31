# Demurrage Manager — Snapshot Completo do Projeto

> **Última atualização:** 2026-03-31 (v2.7) | **Cache version:** `?v=113` | **Deploy-date meta:** `2026-03-31`
> **Repositório:** https://github.com/luccafwlog/demurrage-manager (branch: `main`)
> **App em produção:** https://demurragemanager.web.app

---

## 🏗️ Arquitetura Atual

| Camada        | Tecnologia                                                        |
|---------------|-------------------------------------------------------------------|
| Hosting       | Firebase Hosting (`demurragemanager.web.app`)                     |
| Banco de Dados| **Supabase** (PostgreSQL) · projeto `vcdivphwlspsymgibfri`        |
| Autenticação  | **Supabase Auth** (email/senha · sessão persistente via localStorage) |
| Frontend      | HTML5 + CSS3 + JavaScript Vanilla (sem framework)                 |
| Deploy        | GitHub Actions → Firebase Hosting (push para `main`)             |

> ⚠️ **Migração concluída em 2026-03-30**: Todo o código Firebase (Auth + Firestore) foi removido/substituído por Supabase. Apenas o Firebase Hosting foi mantido.

---

## 📁 Estrutura de Arquivos

```
/
├── index.html                    ← Página de login (Supabase Auth)
├── app.html                      ← Aplicação principal (SPA)
├── firebase.json                 ← Configuração do Firebase Hosting (mantido)
├── firestore.rules               ← Arquivo legado (ignorado)
├── supabase_schema.sql           ← Schema PostgreSQL do Supabase
├── demurrage_manager_snapshot.md ← Este arquivo
├── DEPLOY.md                     ← Instruções de deploy
├── css/
│   ├── base.css                  ← Variáveis CSS e estilos base
│   └── components.css            ← Componentes UI (modais, tabelas, pills)
└── js/
    ├── db.js          ← Supabase init + auth + todas as funções de persistência
    ├── utils.js       ← Funções utilitárias (uid, toast, modais, formatação)
    ├── rates.js       ← Tabela de taxas D&D e cálculos USD
    ├── billing.js     ← Módulo de Faturamento (BLs, PTAX, PDFs)
    ├── tracking.js    ← Módulo de Rastreamento de Containers
    ├── clients.js     ← Módulo de Clientes (CNPJ + emails)
    ├── users.js       ← Módulo Admin: Usuários e Log de Auditoria
    ├── consolidated.js← Módulo Consolidado (visão por cliente/CNPJ)
    └── init.js        ← Inicialização da app, Dashboard, Configurações
```

### Ordem de carregamento dos scripts (app.html)

```html
<!-- 1. Biblioteca Supabase JS v2 (UMD) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>

<!-- 2. db.js (module — deferred, executa após DOM pronto) -->
<script type="module" src="js/db.js?v=113"></script>

<!-- 3. Scripts do app (regulares — executam na ordem, antes do db.js module) -->
<script src="js/utils.js?v=113"></script>
<script src="js/rates.js?v=113"></script>
<script src="js/billing.js?v=113"></script>
<script src="js/tracking.js?v=113"></script>
<script src="js/clients.js?v=113"></script>
<script src="js/users.js?v=113"></script>
<script src="js/consolidated.js?v=113"></script>
<script src="js/init.js?v=113"></script>
<!-- init.js define window._dmOnReady() → db.js o chama após carga -->
```

**Fluxo de execução:**
1. Scripts regulares executam → `window._dmOnReady` é definido em `init.js`
2. `db.js` (module/deferred) executa → autentica, carrega dados do Supabase
3. `db.js` chama `window._dmOnReady()` → UI é inicializada com os dados

---

## 🗄️ Banco de Dados Supabase

**Projeto ID:** `vcdivphwlspsymgibfri`
**Região:** `us-east-1`
**PostgreSQL:** 17.6

### Tabelas

| Tabela       | PK                              | RLS | Rows    | Descrição                              |
|--------------|---------------------------------|-----|---------|----------------------------------------|
| `bls`        | `(user_id, id)`                 | ✅  | ~254    | BLs de faturamento D&D                 |
| `containers` | `(user_id, container, bl)` ⚠️NEW| ✅  | variável | Containers em rastreamento (um container pode existir em múltiplos BLs) |
| `clients`    | `(user_id, id)`                 | ✅  | ~78     | Cadastro de clientes (CNPJ + emails)   |
| `settings`   | `user_id` (uuid)                | ✅  | por user| Configurações (alert_days)             |
| `usuarios`   | `id` (uuid)                     | ✅  | 1+      | Perfis (nome, cargo, admin, ativo)     |
| `logs`       | `id` (uuid)                     | ✅  | variável| Log de auditoria de ações              |

### Schemas detalhados

```sql
-- BLs / Containers / Clients (estrutura idêntica, PK diferente)
CREATE TABLE bls (
  id         TEXT PRIMARY KEY,
  user_id    UUID REFERENCES auth.users,
  data       JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ⚠️ ATENÇÃO: PK composta — container pode existir em múltiplos BLs
CREATE TABLE containers (
  container  TEXT NOT NULL,
  bl         TEXT NOT NULL DEFAULT '',  -- BL associado ao container
  user_id    UUID REFERENCES auth.users,
  data       JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, container, bl)  -- migrado de (user_id, container) em 2026-03-30
);

-- Settings por usuário
CREATE TABLE settings (
  user_id    UUID PRIMARY KEY REFERENCES auth.users,
  alert_days INTEGER DEFAULT 5
);

-- Perfis de usuário
CREATE TABLE usuarios (
  id         UUID PRIMARY KEY REFERENCES auth.users,
  nome       TEXT, email TEXT, cargo TEXT,
  admin      BOOLEAN DEFAULT false,
  ativo      BOOLEAN DEFAULT true,
  criado_em  TIMESTAMPTZ DEFAULT now()
);

-- Auditoria
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

### RLS Policies

Todas as tabelas usam política de acesso para usuários autenticados:

```sql
-- Modelo colaborativo: todos os usuários autenticados compartilham os dados
CREATE POLICY "table_authenticated" ON public.<tabela>
  FOR ALL TO public
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

> **Nota de arquitetura**: O design atual é colaborativo — todos os usuários autenticados veem e editam os mesmos dados. Não há isolamento por `user_id` nas leituras. O `user_id` é gravado nos registros para rastreabilidade, mas não filtra o acesso.

---

## 🔐 Fluxo de Autenticação

### Login (`index.html`)
```javascript
const { error } = await sb.auth.signInWithPassword({ email, password });
if (!error) window.location.href = 'app.html';
```
- Sessão persiste automaticamente no `localStorage` pelo cliente Supabase
- Se já autenticado ao abrir `index.html` → redireciona para `app.html`

### Verificação de sessão (`db.js`)
```javascript
const { data: { session } } = await sb.auth.getSession();
if (!session) window.location.href = 'index.html';
```

### Logout
```javascript
// Botão "Sair" em app.html → onclick="window._dmLogout()"
window._dmLogout = async () => {
  await sb.auth.signOut();
  // onAuthStateChange(SIGNED_OUT) → redireciona para index.html
};
```

### Refresh de token
Automático pelo Supabase client JS (nenhum código adicional necessário).

---

## ⚙️ Camada de Dados (db.js)

### Funções globais expostas por db.js

| Função                        | Descrição                                                   |
|-------------------------------|-------------------------------------------------------------|
| `window._dmDb`                | Cliente Supabase (para uso avançado)                        |
| `window._dmUser`              | Objeto do usuário autenticado                               |
| `window._dmUid`               | UUID do usuário                                             |
| `window._dmStore`             | Store em memória `{ bls, trk, clients, alertDays }`         |
| `window._dmIsAdmin`           | Boolean: usuário é admin?                                   |
| `window._dmUserData`          | Perfil completo do usuário (tabela `usuarios`)              |
| `window._dmSession`           | ID de sessão local (para logs)                              |
| `window._dmFireSave(type, data)` | Upsert em lote com diff inteligente (evita writes desnecessários) |
| `window._dmFireSaveOne(type, id, data)` | Upsert de um único registro                    |
| `window._dmFireDelete(type, id)` | Delete de um registro pelo ID                          |
| `window._dmFireRestore(bkp)` | Limpa todas as tabelas (usado em restore de backup)         |
| `window._dmFireLog(action, details)` | Insere log de auditoria na tabela `logs`           |
| `window._dmSaveAlertDays(n)` | Upsert em `settings` (campo `alert_days`)                   |
| `window._dmFireLoadUsuarios()` | SELECT * FROM usuarios ORDER BY nome                      |
| `window._dmFireSaveUsuario(data)` | Upsert em `usuarios`                                  |
| `window._dmFireLoadLogs()` | SELECT logs (últimos 500, mais recentes primeiro)           |
| `window._dmFireDeleteLogs(ids)` | DELETE logs IN (ids)                                   |
| `window._dmLogout()`         | `sb.auth.signOut()`                                         |
| `window._dmOnReady()`        | Definido por `init.js`, chamado por `db.js` após carga      |

### Mapeamento de tipos e chaves compostas

```javascript
// Tipos aceitos por _dmFireSave, _dmFireSaveOne, _dmFireDelete
// TABLE: { bls: 'bls', trk: 'containers', clients: 'clients' }

// KEY_FN — chave composta usada internamente para deduplicação
_KEY_FN = {
  bls:     r => String(r.id || ''),
  trk:     r => String(r.container || '') + '\x00' + String(r.bl || ''),  // ⚠️ composta!
  clients: r => String(r.id || r.cnpj || '')
}

// COLS_FN — colunas de primeira classe que vão para o banco
_COLS_FN = {
  bls:     r => ({ id: r.id }),
  trk:     r => ({ container: r.container, bl: r.bl || '' }),             // ⚠️ bl obrigatório
  clients: r => ({ id: r.id || r.cnpj })
}

// CONFLICT — onConflict do upsert Supabase
_CONFLICT = {
  bls:     'user_id,id',
  trk:     'user_id,container,bl',   // ⚠️ migrado — era 'user_id,container'
  clients: 'user_id,id'
}

// Para _dmFireDelete de containers: id deve ser 'container\x00bl'
// Ex: _dmFireDelete('trk', 'ABCU1234567\x00HLCUSSA3260012345')
```

---

## 🧩 Módulos da Aplicação

### billing.js — Faturamento
- **Store**: `bls[]` ← `window._dmStore.bls`
- **Save**: `save(bls)` → `_dmFireSave('bls', bls)` (diff de toda a coleção)
- **Save One**: `saveOne(bl)` → `_dmFireSaveOne('bls', bl.id, bl)`
- **Delete**: `deleteBLById(id)` → `_dmFireDelete('bls', id)`
- **Audit**: `logAuditAction(action, details)` → `_dmFireLog`
- **PTAX**: Carregado da API Banco Central (olinda.bcb.gov.br), ROE = PTAX × 1.065
- **Ações auditadas**: criação, edição, exclusão, pagamento, faturamento, envio de email

### tracking.js — Rastreamento de Containers
- **Store**: `trkData[]` ← `window._dmStore.trk`
- **Save**: `trkSave(data)` → `_dmFireSave('trk', data)`
- **Import**: via XLSX drag-and-drop (SheetJS)
- **Auto-migração**: quando todos os containers de um BL são devolvidos com D&D, o BL é criado automaticamente no módulo de Faturamento
- **Status possíveis**: `free`, `grace`, `dd_open`, `dd_returned`, `returned`

### clients.js — Clientes
- **Store**: `clients[]` ← `window._dmStore.clients`
- **Save**: `cliSave(clients)` → `_dmFireSave('clients', clients)`
- Sincroniza emails automaticamente com BLs ao cadastrar/editar cliente

### users.js — Admin
- Usa `_dmFireLoadUsuarios` / `_dmFireSaveUsuario` / `_dmFireLoadLogs` / `_dmFireDeleteLogs`
- Restrito a `window._dmIsAdmin === true`

### init.js — Dashboard e Configurações
- Define `window._dmOnReady()` — ponto de entrada da UI
- **Taxas D&D**: Customização salva em `localStorage` (`dm_rates_v2`)
- **Alert days**: Salvo no Supabase via `_dmSaveAlertDays`
- **Backup**: Exporta/importa JSON com dados em memória

---

## 📊 Estado dos Dados (2026-03-30)

| Tabela       | Registros | Observação                          |
|--------------|-----------|-------------------------------------|
| `bls`        | 254       | Dados migrados do Firebase          |
| `containers` | 1625      | Importados via planilha (1629 linhas − 4 devolvidos no free time) |
| `clients`    | 78        | Dados migrados do Firebase          |
| `settings`   | 0         | Será criado ao salvar alertDays     |
| `usuarios`   | 1         | Conta do administrador              |
| `logs`       | 0         | Zerado na migração                  |

> Containers com `emptyReturn` e `discharge` onde `used_days <= freeTime` são **intencionalmente ignorados** na importação (devolvidos no free time = sem demurrage). Comportamento correto e esperado.

---

## 🐛 Histórico de Correções

### 2026-03-31 — Fix paginação de containers + 409 em clientes (v2.7)

**Cache version:** `?v=113` | **Commit:** `0b13ffd`

| # | Bug | Causa Raiz | Fix |
|---|-----|------------|-----|
| N | Após reload, apenas 100 containers eram exibidos (de 1625 no banco) | `db.js` fazia uma única query sem paginação; PostgREST tem `max_rows` configurado que truncava o resultado em ~100 linhas | Substituído por loop paginado com `.range(from, from+999)` em `db.js` até carregar todos os registros. Log `[DB] containers carregados: N` adicionado |
| O | Exclusão de e-mail de cliente não persistia após refresh (HTTP 409) | Tabela `clients` tinha `UNIQUE(id)` isolado (`clients_unique`) além da PK `(user_id, id)`. Quando dois usuários tinham cliente com mesmo CNPJ, o upsert violava a constraint secundária → PostgREST 409 → save silenciosamente ignorado | Migration DDL: `ALTER TABLE clients DROP CONSTRAINT clients_unique`. A PK composta `(user_id, id)` já garante unicidade por usuário |

### 2026-03-31 — Auditoria pipeline containers→faturamento (v2.5 / v2.6)

**Cache versions:** `?v=111` → `?v=112` | **Commits:** série de 3

| # | Bug | Causa Raiz | Fix |
|---|-----|------------|-----|
| K | `ERR_INSUFFICIENT_RESOURCES` ao importar planilha com CNPJs — emails não salvavam | `processClientRows` em `clients.js` chamava `syncBLEmails()` dentro de `forEach` loop → N requests HTTP concorrentes para `save(bls)` → browser esgotava recursos → `cliSave(clients)` nunca chegava ao servidor | Batch accumulation: `const emailChanges = new Map()` acumula mudanças no loop; único `save(bls)` após `cliSave(clients)` |
| L | Mesmo bug N-saves em `doTrkImport` em `tracking.js` | `syncBLEmails()` e `upsertClient()` chamados por BL dentro de loop `Object.entries(cnpjByBL).forEach` | Mesmo padrão: `emailSyncs: Map` + `newClientsToAdd[]` acumulados; saves em lote após o loop |
| M | `genDocnum` gerava colisões de número de fatura | Hash mod 9000 → colisão confirmada: dois BLs distintos geraram `DEM-2026-1454` | Reescrito com timestamp `Date.now().toString(36).slice(-4)` + hash suffix; colisão na prática impossível |

### 2026-03-30 — Fix merge de emails na importação (v2.4)

| # | Bug | Causa Raiz | Fix |
|---|-----|------------|-----|
| I | Importar planilha com CNPJ existente sobrescrevia emails anteriores | `processClientRows` usava `existing.emails = emails` — atribuição direta apagava os e-mails já cadastrados | Substituído por Set-based merge: emails existentes + novos sem duplicatas |
| J | `db.js` com composite-key fix não chegava ao browser | `app.html` mantinha `?v=109` em todos os `<script src>` — browser servia versão em cache | Bump para `?v=110` em todos os 9 scripts |

### 2026-03-30 — Fix referência compartilhada no store (v2.3)

| # | Bug | Causa Raiz | Fix |
|---|-----|------------|-----|
| F | Clientes: name/emails somem após refresh mesmo sendo exibidos na tela | `_dmFireSave` atribuía `_dmStore[sKey] = newData` (mesma referência). Mutações posteriores ao array do módulo (`existing.name = 'X'`) já refletiam em `oldStore`, tornando o diff vazio → nenhum upsert executado | `_dmStore[sKey] = JSON.parse(JSON.stringify(newData))` — deep copy garante independência; `oldStore` também capturado como snapshot imutável |
| G | Mesmo bug latente em bls e trk | Mesmo mecanismo — saves subsequentes na mesma sessão poderiam ignorar mudanças | Corrigido de forma abrangente nos três tipos |
| H | `_dmFireSaveOne` mutava `_dmStore` diretamente | `store[idx] = data` mutava o array sem deep copy | Deep copy em `_dmFireSaveOne` ao atualizar o store |

### 2026-03-30 — Fix crítico de persistência (v2.2)

| # | Bug | Causa Raiz | Fix |
|---|-----|------------|-----|
| A | Containers com múltiplos BLs sobrescritos | PK `(user_id, container)` impedia mesmo número de container em BLs distintos | Migração DDL: nova coluna `bl`, nova PK `(user_id, container, bl)` |
| B | Deduplicação errada no frontend | `_dmFireSave` usava `Map` com chave apenas em `container`, colapsando registros antes do upsert | `_KEY_FN.trk` usa chave composta `container + '\x00' + bl` |
| C | `onConflict` errado | `onConflict: 'user_id,container'` fazia upsert sobrescrever o registro | Corrigido para `'user_id,container,bl'` alinhado à nova PK |
| D | Clients sumiam após refresh | Clientes antigos sem campo `id` → `_dmFireSave` mandava `id: 'undefined'` → erro silencioso | Load do banco agora garante `id` válido com fallback para CNPJ |
| E | Delete sem `user_id` no filtro | `_dmFireDelete` e batch delete não incluíam `.eq('user_id', uid)` | Todos os deletes agora incluem filtro explícito de `user_id` |

### 2026-03-30 — Auditoria pós-migração (v2.1)

| # | Bug | Causa | Fix |
|---|-----|-------|-----|
| 1 | Logout não funcionava | Botão sem handler de click | `onclick="window._dmLogout()"` + `_dmLogout()` em db.js |
| 2 | Scripts duplicados em app.html | Bloco legado de migração no final do HTML | Bloco removido |
| 3 | `firebase.firestore()` em init.js | Migração parcial de backup, taxas, usuários | Substituído por Supabase/localStorage |
| 4 | Funções ausentes em db.js | db.js não implementou todas as funções esperadas | Adicionadas: `_dmFireLog`, `_dmFireSaveOne`, `_dmFireSaveUsuario`, `_dmFireLoadUsuarios`, `_dmFireLoadLogs`, `_dmFireDeleteLogs`, `_dmSaveAlertDays`, `_dmLogout` |
| 5 | alertDays não persistia | `_dmFireSave('alertDays', v)` sem tratamento do tipo | `_dmSaveAlertDays(v)` → upsert em `settings` |
| 6 | Delete fire-and-forget | `sb.from().delete()` sem await | Async IIFE com await + error handling |
| 7 | Código morto em _dmOnReady | Redefinição interna de `_dmOnReady` (fragmento de migração) | Removido |
| 8 | Info de sistema desatualizada | app.html ainda exibia Firebase | Atualizado para Supabase |

---

## 🔧 Manutenção e Configuração

### Atualizar versão de cache
Em `app.html`, alterar `?v=113` para o próximo número em todos os `<script src>` (atualmente 9 tags).

### Adicionar novo usuário
1. Criar conta no Supabase Auth (Dashboard → Authentication → Users)
2. Inserir registro na tabela `usuarios` com mesmo UUID

### Configurar admin
```sql
UPDATE usuarios SET admin = true WHERE email = 'usuario@empresa.com';
```

### Deploy
```bash
git add -A && git commit -m "descrição"
git push origin main
# GitHub Actions faz o deploy automaticamente
```

---

## 🔗 Links

| Recurso | URL |
|---------|-----|
| App (produção) | https://demurragemanager.web.app/ |
| Supabase Dashboard | https://supabase.com/dashboard/project/vcdivphwlspsymgibfri |
| Repositório GitHub | https://github.com/luccafwlog/demurrage-manager |
