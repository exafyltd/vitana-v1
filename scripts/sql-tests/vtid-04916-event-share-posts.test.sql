-- VTID-04916: profile_posts event attachment + deduplicated share notifications,
-- on a throwaway local Postgres. Never run against a shared or production database.
-- Run: scripts/sql-tests/run-event-share-posts-test.sh
\set ON_ERROR_STOP on

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

-- Minimal stand-ins for the live tables and helpers the trigger uses.
create table public.profile_posts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, content text not null default '',
  is_public boolean not null default true, created_at timestamptz not null default now()
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
-- Placeholder replaced by the migration (the live trigger already exists).
create function public.notify_community_on_public_post() returns trigger language plpgsql as $$ begin return new; end $$;
create trigger trg_notify_community_post after insert on public.profile_posts
  for each row when (new.is_public = true) execute function public.notify_community_on_public_post();

-- Applied twice: idempotent.
\ir ../../supabase/migrations/20261007100000_vtid_04916_profile_posts_event_attachment.sql
\ir ../../supabase/migrations/20261007100000_vtid_04916_profile_posts_event_attachment.sql

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
  ana uuid := gen_random_uuid(); ben uuid := gen_random_uuid(); cleo uuid := gen_random_uuid(); dan uuid := gen_random_uuid();
  ev uuid := gen_random_uuid(); ev2 uuid := gen_random_uuid(); sess uuid := gen_random_uuid(); room uuid := gen_random_uuid();
  n int; r record; err text;
begin
  insert into user_tenants values (ana, t), (ben, t), (cleo, t), (dan, t);
  insert into profiles values (ana, 'Ana', null, null, 'de'), (ben, 'Ben', null, null, 'en'), (cleo, null, 'Cleo C', null, 'de'), (dan, 'Dan', null, null, 'de');
  insert into global_community_events values (ev, 'Sunset walk'), (ev2, 'Yoga');
  insert into live_rooms values (room, 'Calm room');
  insert into live_room_sessions values (sess, room, null);

  -- 1. A plain post notifies everyone else exactly as before.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  insert into profile_posts (user_id, content) values (ana, 'Hello');
  select count(*) into n from user_notifications where type = 'community_post_published';
  assert n = 3, format('plain post: 3 recipients (got %s)', n);
  select * into r from user_notifications where type = 'community_post_published' and user_id = ben;
  assert r.title = 'New post' and r.body = 'Ana shared a new post', 'plain post text unchanged (en)';
  select * into r from user_notifications where type = 'community_post_published' and user_id = cleo;
  assert r.body = 'Ana hat einen neuen Beitrag geteilt', 'plain post text unchanged (de)';

  -- 2. Members cannot attach an event themselves; the reference is set by the gateway only.
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (%L, 'x', 'community_event', %L)$q$, ana, ev));
  assert err like '%ATTACH_VIA_GATEWAY%', format('client attach rejected (got %s)', err);
  perform set_config('request.jwt.claim.role', 'anon', true);
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (%L, 'x', 'community_event', %L)$q$, ana, ev));
  assert err like '%ATTACH_VIA_GATEWAY%', 'anon attach rejected';
  -- PostgREST 12+ only sets the claims JSON, not the single-claim setting.
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"x"}', true);
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (%L, 'x', 'community_event', %L)$q$, ana, ev));
  assert err like '%ATTACH_VIA_GATEWAY%', format('attach rejected via claims JSON (got %s)', err);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- 3. The gateway (service role) shares: one notification per recipient, event title in it.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (ana, 'Kommt mit!', 'community_event', ev);
  select count(*) into n from user_notifications where type = 'community_event_shared';
  assert n = 3, format('event share: 3 recipients (got %s)', n);
  select * into r from user_notifications where type = 'community_event_shared' and user_id = ben;
  assert r.title = 'Join in?' and r.body = 'Ana is going to "Sunset walk"', format('en text (got %s / %s)', r.title, r.body);
  assert r.data->>'ref_id' = ev::text and r.data->>'ref_type' = 'community_event' and r.data->>'url' like '/post/post/%', 'data carries ref + url';
  select * into r from user_notifications where type = 'community_event_shared' and user_id = cleo;
  assert r.title = 'Kommst du mit?' and r.body = 'Ana ist dabei: „Sunset walk“', format('de text (got %s)', r.body);

  -- 4. Others sharing the same event within 24 h notify nobody twice; the sharer still hears about it once.
  insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (ben, 'Me too', 'community_event', ev);
  insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (cleo, '', 'community_event', ev);
  select count(*) into n from user_notifications where type = 'community_event_shared' and data->>'ref_id' = ev::text;
  assert n = 4, format('dedup: 3 from Ana + Ana once (got %s)', n);
  select count(*) into n from user_notifications where type = 'community_event_shared' and user_id = dan;
  assert n = 1, 'dan told once about this event';

  -- A different event is a new notification; after 24 h the same event may notify again.
  insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (dan, '', 'community_event', ev2);
  select count(*) into n from user_notifications where type = 'community_event_shared' and data->>'ref_id' = ev2::text;
  assert n = 3, 'other event notifies';
  update user_notifications set created_at = now() - interval '25 hours' where data->>'ref_id' = ev::text;
  delete from profile_posts where user_id = dan and attached_ref_id = ev;
  insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (dan, 'later', 'community_event', ev);
  select count(*) into n from user_notifications where type = 'community_event_shared' and data->>'ref_id' = ev::text and created_at > now() - interval '1 hour';
  assert n = 3, format('after 24 h: notifies again (got %s)', n);

  -- 5. Live room sessions use the room title when the session has none.
  insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (ben, '', 'live_room_session', sess);
  select * into r from user_notifications where type = 'community_event_shared' and data->>'ref_id' = sess::text and user_id = dan;
  assert r.body = 'Ben ist dabei: „Calm room“', format('live room title (got %s)', r.body);

  -- 6. One share per member per event; both-or-neither; known types only.
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (%L, 'again', 'community_event', %L)$q$, ana, ev));
  assert err like '%duplicate key%', format('second share rejected (got %s)', err);
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type) values (%L, 'x', 'community_event')$q$, ana));
  assert err like '%attached_ref_pair_check%', 'type without id rejected';
  err := pg_temp.rejected(format($q$insert into profile_posts (user_id, content, attached_ref_type, attached_ref_id) values (%L, 'x', 'health_plan', %L)$q$, ana, gen_random_uuid()));
  assert err like '%attached_ref_type_check%', 'unknown type rejected';

  -- 7. A member editing their post cannot change the reference; the text still changes.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  update profile_posts set content = 'edited', attached_ref_id = ev2 where user_id = ana and attached_ref_id = ev;
  select * into r from profile_posts where user_id = ana and content = 'edited';
  assert r.attached_ref_id = ev, 'reference kept on member update';

  -- A private share notifies no one (the trigger only runs for public posts).
  perform set_config('request.jwt.claim.role', 'service_role', true);
  select count(*) into n from user_notifications;
  insert into profile_posts (user_id, content, is_public, attached_ref_type, attached_ref_id) values (cleo, '', false, 'community_event', ev2);
  assert (select count(*) from user_notifications) = n, 'private share notifies no one';
end $$;

\echo 'PASS vtid-04916 event share posts'
