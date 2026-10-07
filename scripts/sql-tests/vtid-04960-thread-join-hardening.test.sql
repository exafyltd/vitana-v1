-- VTID-04960: members cannot add themselves to conversations they were not
-- invited to; normal messenger actions keep working. Throwaway Postgres only.
-- Run: scripts/sql-tests/run-thread-join-hardening-test.sh
\set ON_ERROR_STOP on

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;

-- Stand-ins mirroring the live tables and policies (pg_policies, 2026-10-07).
create table public.global_message_threads (id uuid primary key default gen_random_uuid(), created_by uuid not null, type text not null default 'direct', name text);
create table public.global_thread_participants (id uuid primary key default gen_random_uuid(), thread_id uuid not null, user_id uuid not null, role text not null default 'member', is_active boolean not null default true, last_read_at timestamptz);
create table public.message_threads (id uuid primary key default gen_random_uuid(), created_by uuid not null, type text not null default 'direct', name text);
create table public.thread_participants (id uuid primary key default gen_random_uuid(), thread_id uuid not null, user_id uuid not null, role text not null default 'member', is_active boolean not null default true, last_read_at timestamptz);
create function public.is_community_user() returns boolean language sql stable as $$ select true $$;
create function public.is_participant_of_global_thread(thread_id_param uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.global_thread_participants g where g.thread_id = thread_id_param and g.user_id = auth.uid() and g.is_active) $$;

alter table public.global_message_threads enable row level security;
alter table public.global_thread_participants enable row level security;
alter table public.message_threads enable row level security;
alter table public.thread_participants enable row level security;
create policy global_threads_read on public.global_message_threads for select using (is_participant_of_global_thread(id));
create policy "Authenticated users can create threads" on public.global_message_threads for insert with check (auth.uid() = created_by);
create policy "Users can view participants in their threads" on public.global_thread_participants for select using (user_id = auth.uid() or is_participant_of_global_thread(thread_id));
create policy "Thread creators can add participants" on public.global_thread_participants for insert
  with check (exists (select 1 from public.global_message_threads t where t.id = thread_id and t.created_by = auth.uid()));
create policy "Users can join threads as themselves" on public.global_thread_participants for insert with check (user_id = auth.uid());
create policy "Users can update their own thread participation" on public.global_thread_participants for update using (user_id = auth.uid() and is_community_user());
create policy "Thread creators can update participants" on public.global_thread_participants for update
  using (exists (select 1 from public.global_message_threads t where t.id = thread_id and t.created_by = auth.uid()))
  with check (exists (select 1 from public.global_message_threads t where t.id = thread_id and t.created_by = auth.uid()));
create policy "Users can create threads" on public.message_threads for insert with check (auth.uid() = created_by);
create policy tenant_threads_read on public.message_threads for select using (exists (select 1 from public.thread_participants tp where tp.thread_id = id and tp.user_id = auth.uid() and tp.is_active));
create policy "Users can join threads as themselves" on public.thread_participants for insert with check (user_id = auth.uid());
create policy "Users can view thread participants" on public.thread_participants for select using (user_id = auth.uid());
create policy "Users can update their own participation" on public.thread_participants for update using (user_id = auth.uid());
grant select, insert, update on public.global_message_threads, public.global_thread_participants, public.message_threads, public.thread_participants to authenticated;

-- Stand-in for a SECURITY DEFINER DM creator (create_or_get_global_dm shape).
create function public.create_dm_stub(p_other uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid := gen_random_uuid();
begin
  insert into public.global_message_threads (id, created_by, type) values (t, auth.uid(), 'direct');
  insert into public.global_thread_participants (thread_id, user_id) values (t, auth.uid()), (t, p_other);
  return t;
end $$;
grant execute on function public.create_dm_stub(uuid) to authenticated;

\if :{?skip_migration}
\else
\ir ../../supabase/migrations/20261007180000_vtid_04960_thread_participants_join_hardening.sql
\ir ../../supabase/migrations/20261007180000_vtid_04960_thread_participants_join_hardening.sql
\endif

-- Run a statement as a signed-in user; return null on success, the error otherwise.
create function pg_temp.as_user(actor uuid, sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  set local role authenticated;
  begin
    execute sql;
  exception when others then
    reset role;
    return sqlerrm;
  end;
  reset role;
  return null;
end $$;
create function pg_temp.rows_as(actor uuid, sql text) returns int language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  set local role authenticated;
  execute sql; get diagnostics n = row_count;
  reset role;
  return n;
end $$;

do $$
declare
  owner uuid := gen_random_uuid(); ben uuid := gen_random_uuid(); eve uuid := gen_random_uuid();
  g uuid := gen_random_uuid(); g2 uuid := gen_random_uuid(); tt uuid := gen_random_uuid(); dm uuid;
  err text; n int; pass int := 0;
begin
  -- 1. THE HOLE: a stranger cannot add themselves to someone else's group.
  insert into global_message_threads (id, created_by, type, name) values (g2, ben, 'group', 'Bens');
  err := pg_temp.as_user(eve, format('insert into global_thread_participants (thread_id, user_id) values (%L, %L)', g2, eve));
  if err is null then raise exception 'CHECK 1 FAILED: stranger joined someone else''s global group'; end if; pass := pass + 1;
  insert into message_threads (id, created_by, type) values (tt, ben, 'group');
  err := pg_temp.as_user(eve, format('insert into thread_participants (thread_id, user_id) values (%L, %L)', tt, eve));
  if err is null then raise exception 'CHECK 2 FAILED: stranger joined someone else''s tenant thread'; end if; pass := pass + 1;

  -- 3. The app's group creation still works: thread, creator alone, then members.
  err := pg_temp.as_user(owner, format('insert into global_message_threads (id, created_by, type, name) values (%L, %L, %L, %L)', g, owner, 'group', 'Lauftreff'));
  if err is not null then raise exception 'CHECK 3a FAILED: %', err; end if;
  err := pg_temp.as_user(owner, format('insert into global_thread_participants (thread_id, user_id, role) values (%L, %L, %L)', g, owner, 'admin'));
  if err is not null then raise exception 'CHECK 3b FAILED creator self-insert: %', err; end if;
  err := pg_temp.as_user(owner, format('insert into global_thread_participants (thread_id, user_id) values (%L, %L)', g, ben));
  if err is not null then raise exception 'CHECK 3c FAILED creator adds member: %', err; end if; pass := pass + 1;

  -- 4. A member marks read (own row) and can leave.
  n := pg_temp.rows_as(ben, format('update global_thread_participants set last_read_at = now() where thread_id = %L and user_id = %L', g, ben));
  if n <> 1 then raise exception 'CHECK 4a FAILED mark read rows=%', n; end if;
  n := pg_temp.rows_as(ben, format('update global_thread_participants set is_active = false where thread_id = %L and user_id = %L', g, ben));
  if n <> 1 then raise exception 'CHECK 4b FAILED leave rows=%', n; end if; pass := pass + 1;
  update global_thread_participants set is_active = true where thread_id = g and user_id = ben;

  -- 5. A member cannot move their row, take another user id, or promote themselves.
  err := pg_temp.as_user(ben, format('update global_thread_participants set thread_id = %L where thread_id = %L and user_id = %L', g2, g, ben));
  if err is null then raise exception 'CHECK 5a FAILED: member moved own row to another thread'; end if;
  err := pg_temp.as_user(ben, format('update global_thread_participants set role = %L where thread_id = %L and user_id = %L', 'admin', g, ben));
  if err is null then raise exception 'CHECK 5b FAILED: member promoted themselves'; end if;
  err := pg_temp.as_user(ben, format('update global_thread_participants set user_id = %L where thread_id = %L and user_id = %L', eve, g, ben));
  if err is null then raise exception 'CHECK 5c FAILED: member rewrote user_id'; end if; pass := pass + 1;

  -- 6. The creator can change a member's role and remove them (VTID-04955).
  err := pg_temp.as_user(owner, format('update global_thread_participants set role = %L where thread_id = %L and user_id = %L', 'moderator', g, ben));
  if err is not null then raise exception 'CHECK 6a FAILED creator role change: %', err; end if;
  n := pg_temp.rows_as(owner, format('update global_thread_participants set is_active = false where thread_id = %L and user_id = %L', g, ben));
  if n <> 1 then raise exception 'CHECK 6b FAILED creator remove rows=%', n; end if; pass := pass + 1;

  -- 7. Direct messages through a SECURITY DEFINER function still work.
  perform set_config('request.jwt.claim.sub', owner::text, true);
  set local role authenticated;
  dm := public.create_dm_stub(eve);
  reset role;
  if (select count(*) from global_thread_participants where thread_id = dm) <> 2 then raise exception 'CHECK 7 FAILED definer DM'; end if; pass := pass + 1;

  -- 8. Service context (no JWT) is not blocked by the guard.
  perform set_config('request.jwt.claim.sub', '', true);
  update global_thread_participants set role = 'member' where thread_id = g and user_id = ben; pass := pass + 1;

  raise notice 'VTID-04960 thread join hardening: %/8 checks passed', pass;
end $$;
