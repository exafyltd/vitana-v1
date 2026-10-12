-- VTID-05126: share any own calendar entry (calendar_entry + attached_snapshot),
-- on a throwaway local Postgres. Never run against a shared or production database.
-- Run: scripts/sql-tests/run-calendar-entry-share-test.sh
\set ON_ERROR_STOP on

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

-- Minimal stand-ins for the live tables and helpers.
create table public.profile_posts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, content text not null default '',
  is_public boolean not null default true, created_at timestamptz not null default now()
);
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, title text not null,
  start_time timestamptz not null, end_time timestamptz, location text, status text not null default 'confirmed',
  description text
);
create table public.user_tenants (user_id uuid, tenant_id uuid, is_primary boolean default true);
create table public.profiles (user_id uuid primary key, display_name text, full_name text, vitana_id text, locale text);
create table public.global_community_events (id uuid primary key, title text);
create table public.live_rooms (id uuid primary key, title text);
create table public.live_room_sessions (id uuid primary key, room_id uuid, session_title text);
create table public.user_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid, tenant_id uuid, type text, title text, body text,
  data jsonb, channel text, priority text, created_at timestamptz not null default now()
);
create function public._notif_is_test_actor(p uuid) returns boolean language sql as $$ select false $$;
create function public._notif_user_locale(p uuid) returns text language sql
  as $$ select coalesce((select locale from public.profiles where user_id = p), 'de') $$;
create function public.notify_community_on_public_post() returns trigger language plpgsql as $$ begin return new; end $$;
create trigger trg_notify_community_post after insert on public.profile_posts
  for each row when (new.is_public = true) execute function public.notify_community_on_public_post();

-- The live VTID-04916 state first, then this migration — each twice (idempotent).
\ir ../../supabase/migrations/20261007100000_vtid_04916_profile_posts_event_attachment.sql
\ir ../../supabase/migrations/20261012120000_vtid_05126_profile_posts_calendar_entry_share.sql
\ir ../../supabase/migrations/20261012120000_vtid_05126_profile_posts_calendar_entry_share.sql

create function pg_temp.rejected(sql text) returns text language plpgsql as $$
begin
  execute sql;
  return null;
exception when others then
  return sqlerrm;
end $$;

do $$
declare
  t uuid := gen_random_uuid();
  ana uuid := gen_random_uuid(); ben uuid := gen_random_uuid(); cleo uuid := gen_random_uuid();
  ev uuid := gen_random_uuid(); entry uuid; entry2 uuid; post uuid;
  snap jsonb := '{"title":"Marias Geburtstag","start_time":"2026-11-04T00:00:00Z","end_time":"2026-11-04T00:15:00Z","location":null,"emoji":"🎂","status":"confirmed"}';
  n int; r record; err text;
begin
  insert into user_tenants values (ana, t), (ben, t), (cleo, t);
  insert into profiles values (ana, 'Ana', null, null, 'de'), (ben, 'Ben', null, null, 'en'), (cleo, 'Cleo', null, null, 'de');
  insert into global_community_events values (ev, 'Sunset walk');
  insert into calendar_events (user_id, title, start_time, end_time, location, description)
    values (ana, 'Erinnerung: Geburtstag von Maria Maksina', '2026-11-04T00:00:00Z', '2026-11-04T00:15:00Z', 'Bei Maria', 'privat')
    returning id into entry;
  insert into calendar_events (user_id, title, start_time, end_time, location)
    values (ana, 'Kardiologie', '2026-10-16T09:30:00Z', '2026-10-16T10:00:00Z', 'Praxis Weber')
    returning id into entry2;

  -- 1. Clients can attach neither a reference nor a snapshot.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id, attached_snapshot) values (%L, 'x', 'calendar_entry', %L, %L)$q$, ana, entry, snap));
  assert err like '%ATTACH_VIA_GATEWAY%', format('client calendar_entry attach rejected (got %s)', err);
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_snapshot) values (%L, 'x', %L)$q$, ana, snap));
  assert err like '%ATTACH_VIA_GATEWAY%', format('client snapshot alone rejected (got %s)', err);

  -- 2. The gateway shares an own entry: snapshot required, notification names the card title.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (%L, 'x', 'calendar_entry', %L)$q$, ana, entry));
  assert err like '%attached_snapshot_check%', format('calendar_entry without snapshot rejected (got %s)', err);
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id, attached_snapshot) values (%L, 'x', 'community_event', %L, %L)$q$, ana, ev, snap));
  assert err like '%attached_snapshot_check%', format('event share with snapshot rejected (got %s)', err);
  insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id, attached_snapshot)
    values (ana, 'Wer ist dabei?', 'calendar_entry', entry, snap) returning id into post;
  select * into r from user_notifications where type = 'community_event_shared' and user_id = ben;
  assert r.body = 'Ana is going to "Marias Geburtstag"', format('en names the card title (got %s)', r.body);
  assert r.data->>'ref_type' = 'calendar_entry' and r.data->>'ref_id' = entry::text, 'data carries the entry ref';
  select * into r from user_notifications where type = 'community_event_shared' and user_id = cleo;
  assert r.body = 'Ana ist dabei: „Marias Geburtstag“', format('de names the card title (got %s)', r.body);
  assert position('Erinnerung' in r.body) = 0, 'the private calendar title never reaches a notification';
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id, attached_snapshot) values (%L, 'again', 'calendar_entry', %L, %L)$q$, ana, entry, snap));
  assert err like '%duplicate key%', format('one share per entry (got %s)', err);

  -- 3. The member moving their entry (as 'authenticated') moves the card; their chosen title and hidden place stay.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  update calendar_events set start_time = '2026-11-05T18:00:00Z', end_time = '2026-11-05T20:00:00Z', location = 'Neuer Ort' where id = entry;
  select attached_snapshot into snap from profile_posts where id = post;
  assert snap->>'title' = 'Marias Geburtstag', format('chosen title kept (got %s)', snap->>'title');
  assert (snap->>'start_time')::timestamptz = '2026-11-05T18:00:00Z'::timestamptz, format('start follows (got %s)', snap->>'start_time');
  assert snap->'location' = 'null'::jsonb, format('hidden place stays hidden (got %s)', snap->>'location');

  -- 4. A client editing the post itself cannot change the snapshot; the text still changes.
  update profile_posts set content = 'edited', attached_snapshot = attached_snapshot || '{"title":"forged"}' where id = post;
  select * into r from profile_posts where id = post;
  assert r.content = 'edited' and r.attached_snapshot->>'title' = 'Marias Geburtstag', 'client cannot forge the card';

  -- 5. A card that shows the place follows a moved place; cancel and delete read cancelled.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into profile_posts (user_id, content, is_public, attached_ref_type, attached_ref_id, attached_snapshot)
    values (ana, '', false, 'calendar_entry', entry2,
            '{"title":"Arzttermin","start_time":"2026-10-16T09:30:00Z","end_time":"2026-10-16T10:00:00Z","location":"Praxis Weber","emoji":null,"status":"confirmed"}');
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  update calendar_events set location = 'Praxis Neu' where id = entry2;
  select attached_snapshot into snap from profile_posts where attached_ref_id = entry2;
  assert snap->>'location' = 'Praxis Neu' and snap->>'title' = 'Arzttermin', format('shown place follows (got %s)', snap);
  update calendar_events set status = 'cancelled' where id = entry2;
  select attached_snapshot into snap from profile_posts where attached_ref_id = entry2;
  assert snap->>'status' = 'cancelled', 'cancel reads cancelled';
  delete from calendar_events where id = entry;
  select attached_snapshot into snap from profile_posts where id = post;
  assert snap->>'status' = 'cancelled', 'delete reads cancelled';

  -- 6. A private share notified no one; an event share is unchanged (live title, no snapshot).
  select count(*) into n from user_notifications where data->>'ref_id' = entry2::text;
  assert n = 0, 'private share notifies no one';
  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (ben, '', 'community_event', ev);
  select * into r from user_notifications where type = 'community_event_shared' and data->>'ref_id' = ev::text and user_id = cleo;
  assert r.body = 'Ben ist dabei: „Sunset walk“', format('event share unchanged (got %s)', r.body);
end $$;

\echo 'PASS vtid-05126 calendar entry share'
