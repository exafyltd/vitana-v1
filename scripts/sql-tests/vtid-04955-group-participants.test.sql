-- VTID-04955: group creator can deactivate other members; nobody else can.
-- Throwaway local Postgres only. Run: scripts/sql-tests/run-group-participants-test.sh
\set ON_ERROR_STOP on

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema if not exists auth;
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;

-- Stand-ins mirroring the live tables and policies (pg_policies, 2026-10-07).
create table public.global_message_threads (
  id uuid primary key default gen_random_uuid(), created_by uuid not null, name text, type text not null default 'direct'
);
create table public.global_thread_participants (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null, user_id uuid not null,
  role text not null default 'member', is_active boolean not null default true
);
create function public.is_participant_of_global_thread(thread_id_param uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.global_thread_participants gtp
                 where gtp.thread_id = thread_id_param and gtp.user_id = auth.uid() and gtp.is_active = true) $$;
create function public.is_community_user() returns boolean language sql stable as $$ select true $$;

alter table public.global_message_threads enable row level security;
alter table public.global_thread_participants enable row level security;
create policy global_threads_read_by_participants on public.global_message_threads
  for select using (is_participant_of_global_thread(id));
create policy "Users can view participants in their threads" on public.global_thread_participants
  for select using (user_id = auth.uid() or is_participant_of_global_thread(thread_id));
create policy "Users can update their own thread participation" on public.global_thread_participants
  for update using (user_id = auth.uid() and is_community_user());
grant select, update on public.global_message_threads, public.global_thread_participants to authenticated;

-- Applied twice: idempotent.
\ir ../../supabase/migrations/20261007160000_vtid_04955_group_creator_manage_participants.sql
\ir ../../supabase/migrations/20261007160000_vtid_04955_group_creator_manage_participants.sql

create function pg_temp.deactivate_as(actor uuid, row_id uuid) returns int language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', actor::text, true);
  set local role authenticated;
  update public.global_thread_participants set is_active = false where id = row_id;
  get diagnostics n = row_count;
  reset role;
  return n;
end $$;

do $$
declare
  owner uuid := gen_random_uuid(); ben uuid := gen_random_uuid(); cleo uuid := gen_random_uuid(); dan uuid := gen_random_uuid();
  t uuid := gen_random_uuid(); other_t uuid := gen_random_uuid();
  p_owner uuid := gen_random_uuid(); p_ben uuid := gen_random_uuid(); p_cleo uuid := gen_random_uuid();
  p_dan_other uuid := gen_random_uuid(); p_owner_other uuid := gen_random_uuid();
  n int;
begin
  insert into global_message_threads (id, created_by, name, type) values (t, owner, 'Lauftreff', 'group'), (other_t, dan, 'Other', 'group');
  insert into global_thread_participants (id, thread_id, user_id, role) values
    (p_owner, t, owner, 'admin'), (p_ben, t, ben, 'member'), (p_cleo, t, cleo, 'member'),
    (p_dan_other, other_t, dan, 'admin'), (p_owner_other, other_t, owner, 'member');

  -- 1. The creator removes another member: exactly one row.
  n := pg_temp.deactivate_as(owner, p_ben);
  if n <> 1 then raise exception 'creator could not remove a member (rows=%)', n; end if;

  -- 2. A plain member cannot remove someone else: 0 rows (the old silent case).
  n := pg_temp.deactivate_as(cleo, p_owner);
  if n <> 0 then raise exception 'member removed another participant (rows=%)', n; end if;

  -- 3. A member can still leave (own row).
  n := pg_temp.deactivate_as(cleo, p_cleo);
  if n <> 1 then raise exception 'member could not leave (rows=%)', n; end if;

  -- 4. Being creator of one group gives nothing in a group someone else created.
  n := pg_temp.deactivate_as(owner, p_dan_other);
  if n <> 0 then raise exception 'creator reached into another group (rows=%)', n; end if;

  -- 5. The new policy does not let the creator move ANOTHER member's row into a
  --    thread they did not create (WITH CHECK). (A member's OWN row is governed
  --    by the pre-existing own-row policy, unchanged here.)
  begin
    perform set_config('request.jwt.claim.sub', owner::text, true);
    set local role authenticated;
    update global_thread_participants set thread_id = other_t where id = p_ben;
    reset role;
    raise exception 'creator moved a participant row into another group';
  exception when insufficient_privilege or check_violation then
    reset role;
  end;

  raise notice 'VTID-04955 group participant policy: 5/5 checks passed';
end $$;
