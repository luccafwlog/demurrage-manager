-- ============================================================
-- Demurrage Manager — Endurecimento de segurança (RLS por função)
-- ============================================================
-- APLICAR: Supabase Dashboard → SQL Editor → colar e executar.
-- É idempotente (pode rodar mais de uma vez).
--
-- O que muda:
--   1. Usuário INATIVO (usuarios.ativo = false) perde acesso a TODOS os dados
--      no servidor — não só na tela.
--   2. Só ADMIN altera a tabela usuarios (antes qualquer logado podia se
--      promover a admin via API com a chave pública do app).
--   3. Logs de auditoria passam a ser SOMENTE-INCLUSÃO: ninguém edita nem apaga,
--      e o user_id do log tem que ser o do próprio usuário.
--   4. Taxas, checkpoints e exclusões de registros financeiros (BL faturado/pago)
--      exigem admin no servidor.
--   5. Um processo por número de BL (faturas complementares à parte).
--
-- PERFIL OBRIGATÓRIO: conta sem linha em `usuarios` NÃO acessa nada. Esta
-- migração cria a linha (ativo, não-admin) para todas as contas que já existem
-- — ninguém perde acesso ao aplicá-la — e um trigger cria o perfil de contas
-- novas: convidadas pelo painel entram ativas; cadastro espontâneo (signup
-- público, se estiver habilitado) entra INATIVO até um admin liberar.
-- Antes, qualquer conta criada com a chave pública do app lia todos os dados.
-- ============================================================

-- ── Funções auxiliares (security definer: leem usuarios ignorando RLS) ──
create or replace function public.auth_is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select admin and ativo from usuarios where id = auth.uid()), false);
$$;

create or replace function public.auth_is_active()
returns boolean language sql security definer stable set search_path = public as $$
  select auth.uid() is not null
     and coalesce((select ativo from usuarios where id = auth.uid()), false);
$$;

-- Perfis das contas já existentes (mantém o acesso de quem já usa o sistema).
insert into public.usuarios (id, email, nome, ativo, admin)
select u.id, lower(u.email), coalesce(u.raw_user_meta_data->>'nome', u.email), true, false
from auth.users u
where not exists (select 1 from public.usuarios p where p.id = u.id);

-- Perfil automático para contas novas.
create or replace function public.usuarios_cria_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios (id, email, nome, ativo, admin)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'nome', new.email),
          new.invited_at is not null, false)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists trg_usuarios_cria_perfil on auth.users;
create trigger trg_usuarios_cria_perfil after insert on auth.users
  for each row execute function public.usuarios_cria_perfil();

revoke all on function public.auth_is_admin()  from public;
revoke all on function public.auth_is_active() from public;
grant execute on function public.auth_is_admin()  to authenticated;
grant execute on function public.auth_is_active() to authenticated;

-- ── BLs: marca permanente de fatura emitida ──
-- Proteger a exclusão olhando data.billed/paid não basta: qualquer usuário
-- pode desfazer o faturamento (fluxo normal) e depois excluir. `ja_emitida`
-- é ligada por trigger quando o BL é faturado/pago e NUNCA volta a false.
alter table bls add column if not exists ja_emitida boolean not null default false;
create or replace function public.bls_marca_emitida()
returns trigger language plpgsql as $$
begin
  -- OLD só existe no UPDATE: não referenciar no INSERT.
  if tg_op = 'UPDATE' then
    if old.ja_emitida then
      new.ja_emitida := true;
      return new;
    end if;
  end if;
  new.ja_emitida := coalesce((new.data->>'billed')::boolean, false)
    or coalesce((new.data->>'paid')::boolean, false)
    or coalesce(new.data->>'firstBilledAt', '') <> '';
  return new;
end $$;
drop trigger if exists trg_bls_marca_emitida on bls;
create trigger trg_bls_marca_emitida before insert or update on bls
  for each row execute function public.bls_marca_emitida();
update bls set ja_emitida = true
  where coalesce((data->>'billed')::boolean, false) or coalesce((data->>'paid')::boolean, false)
     or coalesce(data->>'firstBilledAt', '') <> '';

-- ── BLs: colaborativo para ativos; excluir fatura já emitida só admin ──
drop policy if exists "authenticated_rw" on bls;
drop policy if exists "bls_select" on bls;
drop policy if exists "bls_insert" on bls;
drop policy if exists "bls_update" on bls;
drop policy if exists "bls_delete" on bls;
create policy "bls_select" on bls for select to authenticated using (auth_is_active());
create policy "bls_insert" on bls for insert to authenticated with check (auth_is_active());
create policy "bls_update" on bls for update to authenticated using (auth_is_active()) with check (auth_is_active());
create policy "bls_delete" on bls for delete to authenticated using (
  auth_is_active() and (auth_is_admin() or not ja_emitida)
);

-- ── Containers e clientes: colaborativos para ativos ──
drop policy if exists "containers_authenticated" on containers;
drop policy if exists "containers_rw" on containers;
create policy "containers_rw" on containers for all to authenticated
  using (auth_is_active()) with check (auth_is_active());

drop policy if exists "clients_authenticated" on clients;
drop policy if exists "clients_rw" on clients;
create policy "clients_rw" on clients for all to authenticated
  using (auth_is_active()) with check (auth_is_active());

-- ── Settings: cada um a sua linha ──
drop policy if exists "settings_authenticated" on settings;
drop policy if exists "settings_own" on settings;
create policy "settings_own" on settings for all to authenticated
  using (auth_is_active() and user_id = auth.uid())
  with check (auth_is_active() and user_id = auth.uid());

-- ── Usuarios: todos os ativos leem; só admin escreve ──
drop policy if exists "usuarios_authenticated" on usuarios;
drop policy if exists "usuarios_select" on usuarios;
drop policy if exists "usuarios_admin_write" on usuarios;
drop policy if exists "usuarios_admin_insert" on usuarios;
drop policy if exists "usuarios_admin_update" on usuarios;
drop policy if exists "usuarios_admin_delete" on usuarios;
create policy "usuarios_select" on usuarios for select to authenticated
  using (auth_is_active() or id = auth.uid());  -- inativo ainda lê o próprio perfil (para o app saber que está inativo)
create policy "usuarios_admin_insert" on usuarios for insert to authenticated with check (auth_is_admin());
create policy "usuarios_admin_update" on usuarios for update to authenticated using (auth_is_admin()) with check (auth_is_admin());
create policy "usuarios_admin_delete" on usuarios for delete to authenticated using (auth_is_admin());

-- ── Logs: somente inclusão, com o próprio user_id; leitura para ativos ──
drop policy if exists "logs_authenticated" on logs;
drop policy if exists "logs_insert" on logs;
drop policy if exists "logs_select" on logs;
drop policy if exists "logs_delete_admin" on logs;
create policy "logs_insert" on logs for insert to authenticated
  with check (auth_is_active() and user_id = auth.uid());
create policy "logs_select" on logs for select to authenticated using (auth_is_active());
-- (sem policy de update/delete = proibido para todos os clientes)

-- ── Checkpoints: ativos criam/leem; só admin apaga ──
drop policy if exists "authenticated_rw_checkpoints" on checkpoints;
drop policy if exists "checkpoints_select" on checkpoints;
drop policy if exists "checkpoints_insert" on checkpoints;
drop policy if exists "checkpoints_delete" on checkpoints;
create policy "checkpoints_select" on checkpoints for select to authenticated using (auth_is_active());
create policy "checkpoints_insert" on checkpoints for insert to authenticated with check (auth_is_active());
create policy "checkpoints_delete" on checkpoints for delete to authenticated using (auth_is_admin());

-- ── Taxas: ativos leem; só admin altera ──
drop policy if exists "rates_insert" on rates;
drop policy if exists "rates_select" on rates;
drop policy if exists "rates_update" on rates;
create policy "rates_select" on rates for select to authenticated using (auth_is_active());
create policy "rates_insert" on rates for insert to authenticated with check (auth_is_admin());
create policy "rates_update" on rates for update to authenticated using (auth_is_admin()) with check (auth_is_admin());

-- ── Um processo por número de BL ──
-- Antes de criar o índice, liste duplicados (se houver, resolva-os no app):
--   select upper(data->>'bl') bl, count(*) from bls
--   where coalesce(data->>'complementOf','') = '' group by 1 having count(*) > 1;
do $$
begin
  if not exists (
    select 1 from bls where coalesce(data->>'complementOf','') = ''
    group by upper(data->>'bl') having count(*) > 1
  ) then
    create unique index if not exists bls_bl_unico
      on bls (upper(data->>'bl')) where coalesce(data->>'complementOf','') = '';
  else
    raise notice 'Há BLs duplicados — índice bls_bl_unico NÃO criado. Resolva os duplicados e rode de novo.';
  end if;
end $$;

-- ── Realtime (sincronização entre usuários) ──
do $$ begin
  begin alter publication supabase_realtime add table bls;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table containers; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table clients;    exception when duplicate_object then null; end;
end $$;
-- Exclusões chegam aos outros usuários com a chave completa:
alter table containers replica identity full;
alter table clients    replica identity full;
