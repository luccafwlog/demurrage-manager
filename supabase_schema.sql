-- ============================================================
-- Demurrage Manager — Supabase Schema
-- ============================================================
-- Como usar:
-- 1. Acesse: https://supabase.com/dashboard → seu projeto
-- 2. Clique em "SQL Editor" no menu lateral
-- 3. Clique em "New query"
-- 4. Cole todo este conteúdo e clique em "Run"
-- ============================================================

-- ──────────────────────────────────────────
-- 1. TABELAS
-- ──────────────────────────────────────────

-- BLs (faturamento) — TABELA COMPARTILHADA: uma linha por processo (PK só id).
-- Qualquer usuário autenticado pode ler/editar qualquer BL, independente de
-- quem criou. user_id registra o último escritor (rastreabilidade), sem
-- efeito sobre identidade ou acesso.
create table if not exists bls (
  id           text    not null primary key,
  user_id      uuid    not null references auth.users(id) on delete cascade,
  data         jsonb   not null default '{}'::jsonb,
  updated_at   timestamptz default now()
);

-- Containers (tracking)
-- ATENÇÃO: a PK é (user_id, container, bl) — um container pode existir em múltiplos BLs.
create table if not exists containers (
  container    text    not null,
  bl           text    not null default '',
  user_id      uuid    not null references auth.users(id) on delete cascade,
  data         jsonb   not null default '{}'::jsonb,
  updated_at   timestamptz default now(),
  primary key (user_id, container, bl)
);

-- Clientes
create table if not exists clients (
  id           text    not null,
  user_id      uuid    not null references auth.users(id) on delete cascade,
  data         jsonb   not null default '{}'::jsonb,
  updated_at   timestamptz default now(),
  primary key (user_id, id)
);

-- Configurações
create table if not exists settings (
  user_id      uuid    not null references auth.users(id) on delete cascade primary key,
  alert_days   integer not null default 5
);

-- Logs de auditoria
create table if not exists logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users(id),
  usuario_nome text,
  sessao_id    text,
  acao         text        not null,
  detalhe      jsonb,
  criado_em    timestamptz default now()
);

-- Checkpoints (snapshots de backup)
create table if not exists checkpoints (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id),
  label      text        not null default '',
  tipo       text        not null default 'manual',
  criado_por text,
  criado_em  timestamptz default now(),
  payload    jsonb       not null default '{}'
);

-- Taxas D&D (compartilhadas entre todos os usuários — ver js/init.js)
create table if not exists rates (
  type       text        primary key,
  free_until integer,
  p1_usd     numeric,
  p2_usd     numeric,
  updated_at timestamptz default now(),
  updated_by text
);

-- Perfis de usuário (admin, ativo, cargo)
create table if not exists usuarios (
  id           uuid    primary key references auth.users(id) on delete cascade,
  nome         text,
  email        text,
  cargo        text,
  admin        boolean not null default false,
  ativo        boolean not null default true,
  criado_em    timestamptz default now()
);

-- ──────────────────────────────────────────
-- 2. FUNÇÃO AUXILIAR: verifica se usuário é admin
--    (mantida para uso futuro; as policies atuais não dependem dela)
-- ──────────────────────────────────────────
create or replace function auth_is_admin()
returns boolean
language sql security definer stable
as $$
  select coalesce(
    (select admin from usuarios where id = auth.uid()),
    false
  );
$$;

-- ⚠️ As policies abaixo são o estado ANTIGO (qualquer autenticado escreve tudo,
-- inclusive usuarios.admin e os logs). O estado atual de produção deve ser o de
-- supabase/migrations/20261008_seguranca_rls.sql — aplique-a depois deste arquivo.
-- ──────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS) — MODELO COLABORATIVO
-- ──────────────────────────────────────────
-- Todas as tabelas operacionais são compartilhadas: qualquer usuário
-- autenticado lê e escreve todos os dados. O user_id nos registros serve
-- apenas para rastreabilidade. NÃO aplicar policies restritas por user_id
-- em produção — isso quebra a colaboração (ver histórico: UNIQUE(id) e
-- policies *_own causaram HTTP 409 e saves silenciosamente perdidos).
alter table bls        enable row level security;
alter table containers enable row level security;
alter table clients    enable row level security;
alter table settings   enable row level security;
alter table logs       enable row level security;
alter table usuarios   enable row level security;
alter table checkpoints enable row level security;
alter table rates      enable row level security;

-- BLs: COMPARTILHADO — qualquer autenticado lê e escreve todos os processos
drop policy if exists "bls_own" on bls;
drop policy if exists "bls_authenticated" on bls;
drop policy if exists "authenticated_rw" on bls;
create policy "authenticated_rw" on bls
  for all to authenticated
  using (true)
  with check (true);

-- Containers: idem
drop policy if exists "containers_own" on containers;
drop policy if exists "containers_authenticated" on containers;
create policy "containers_authenticated" on containers
  for all to public
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Clients: idem
drop policy if exists "clients_own" on clients;
drop policy if exists "clients_authenticated" on clients;
create policy "clients_authenticated" on clients
  for all to public
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Settings: idem
drop policy if exists "settings_own" on settings;
drop policy if exists "settings_authenticated" on settings;
create policy "settings_authenticated" on settings
  for all to public
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Logs: idem (leitura/escrita abertas a autenticados)
drop policy if exists "logs_insert" on logs;
drop policy if exists "logs_select" on logs;
drop policy if exists "logs_delete_admin" on logs;
drop policy if exists "logs_authenticated" on logs;
create policy "logs_authenticated" on logs
  for all to public
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Usuarios: idem (controle de admin feito na camada de app via _dmIsAdmin)
drop policy if exists "usuarios_select" on usuarios;
drop policy if exists "usuarios_insert" on usuarios;
drop policy if exists "usuarios_update" on usuarios;
drop policy if exists "usuarios_authenticated" on usuarios;
create policy "usuarios_authenticated" on usuarios
  for all to public
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Checkpoints: idem
drop policy if exists "authenticated_rw_checkpoints" on checkpoints;
create policy "authenticated_rw_checkpoints" on checkpoints
  for all to public
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Rates: leitura/escrita abertas; sem delete (conforme produção)
drop policy if exists "rates_insert" on rates;
drop policy if exists "rates_select" on rates;
drop policy if exists "rates_update" on rates;
create policy "rates_insert" on rates
  for insert to authenticated with check (true);
create policy "rates_select" on rates
  for select to authenticated using (true);
create policy "rates_update" on rates
  for update to authenticated using (true) with check (true);

-- ──────────────────────────────────────────
-- 4. REALTIME (habilita para as 3 coleções)
-- ──────────────────────────────────────────
alter publication supabase_realtime add table bls;
alter publication supabase_realtime add table containers;
alter publication supabase_realtime add table clients;

-- ──────────────────────────────────────────
-- FIM DO SCHEMA
-- ──────────────────────────────────────────
-- Próximo passo: em js/db.js preencha SUPABASE_URL e SUPABASE_ANON_KEY
-- com os valores em: Supabase Dashboard → Settings → API
-- ──────────────────────────────────────────
