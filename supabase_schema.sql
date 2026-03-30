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

-- BLs (faturamento)
create table if not exists bls (
  id           text    not null,
  user_id      uuid    not null references auth.users(id) on delete cascade,
  data         jsonb   not null default '{}'::jsonb,
  updated_at   timestamptz default now(),
  primary key (user_id, id)
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
--    (security definer evita recursão nas policies)
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

-- ──────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────
alter table bls        enable row level security;
alter table containers enable row level security;
alter table clients    enable row level security;
alter table settings   enable row level security;
alter table logs       enable row level security;
alter table usuarios   enable row level security;

-- BLs: cada usuário acessa apenas seus próprios dados
drop policy if exists "bls_own" on bls;
create policy "bls_own" on bls
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Containers: idem
drop policy if exists "containers_own" on containers;
create policy "containers_own" on containers
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Clients: idem
drop policy if exists "clients_own" on clients;
create policy "clients_own" on clients
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Settings: idem
drop policy if exists "settings_own" on settings;
create policy "settings_own" on settings
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Logs: qualquer usuário pode inserir seus próprios logs;
--       admins podem ler todos; usuário lê os próprios
drop policy if exists "logs_insert" on logs;
create policy "logs_insert" on logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "logs_select" on logs;
create policy "logs_select" on logs
  for select using (
    auth.uid() = user_id
    or auth_is_admin()
  );

drop policy if exists "logs_delete_admin" on logs;
create policy "logs_delete_admin" on logs
  for delete using (auth_is_admin());

-- Usuarios: cada um lê e edita o próprio perfil;
--           admins lêem e editam todos
drop policy if exists "usuarios_select" on usuarios;
create policy "usuarios_select" on usuarios
  for select using (
    auth.uid() = id
    or auth_is_admin()
  );

drop policy if exists "usuarios_insert" on usuarios;
create policy "usuarios_insert" on usuarios
  for insert with check (
    auth.uid() = id
    or auth_is_admin()
  );

drop policy if exists "usuarios_update" on usuarios;
create policy "usuarios_update" on usuarios
  for update using (
    auth.uid() = id
    or auth_is_admin()
  );

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
