-- VTID-03319 — Phase 1 content moderation for the global news feed.
--
-- The launch-phase News feed broadcasts every public post to every member, so
-- we need: (a) a moderation state on posts the feed respects, (b) a way for
-- members to report bad content (reuses existing content_reports), (c) admin
-- takedown + user ban, and (d) a posting rate limit / suspended-user block.
--
-- Admin = active staff/admin membership OR the exafy_admin JWT claim — the same
-- predicate already used by content_reports policies.

-- ---------------------------------------------------------------------------
-- 0) Canonical moderator check (DRY helper, used by RPCs + triggers + RLS).
-- ---------------------------------------------------------------------------
create or replace function public.is_community_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = any (array['staff','admin']::tenant_role[])
        and m.status = 'active'
    )
    or coalesce(((auth.jwt() -> 'app_metadata' ->> 'exafy_admin'))::boolean, false) = true;
$$;

-- ---------------------------------------------------------------------------
-- 1) moderation_status on profile_posts. Feed shows only 'active'.
-- ---------------------------------------------------------------------------
alter table public.profile_posts
  add column if not exists moderation_status text not null default 'active';

alter table public.profile_posts
  drop constraint if exists profile_posts_moderation_status_chk;
alter table public.profile_posts
  add constraint profile_posts_moderation_status_chk
  check (moderation_status in ('active','hidden','removed'));

create index if not exists idx_profile_posts_moderation
  on public.profile_posts (moderation_status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) User suspensions (bans).
-- ---------------------------------------------------------------------------
create table if not exists public.user_suspensions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  reason     text,
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz            -- null = permanent
);
create index if not exists idx_user_suspensions_user on public.user_suspensions (user_id);

alter table public.user_suspensions enable row level security;
drop policy if exists "Admins manage suspensions" on public.user_suspensions;
create policy "Admins manage suspensions" on public.user_suspensions
  for all to authenticated
  using (public.is_community_moderator())
  with check (public.is_community_moderator());

-- ---------------------------------------------------------------------------
-- 3) Moderation audit log.
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  reason      text,
  created_at  timestamptz not null default now()
);
alter table public.moderation_actions enable row level security;
drop policy if exists "Admins view moderation actions" on public.moderation_actions;
create policy "Admins view moderation actions" on public.moderation_actions
  for select to authenticated
  using (public.is_community_moderator());

-- ---------------------------------------------------------------------------
-- 4) Admin RPCs (SECURITY DEFINER, internal admin gate).
-- ---------------------------------------------------------------------------
create or replace function public.moderate_profile_post(
  p_post_id uuid,
  p_status  text,
  p_reason  text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_community_moderator() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_status not in ('active','hidden','removed') then
    raise exception 'BAD_STATUS';
  end if;
  update public.profile_posts
     set moderation_status = p_status, updated_at = now()
   where id = p_post_id;
  insert into public.moderation_actions(actor_id, action, target_type, target_id, reason)
  values (auth.uid(), 'post_' || p_status, 'profile_post', p_post_id, p_reason);
end;
$$;

create or replace function public.set_user_suspension(
  p_user_id    uuid,
  p_reason     text default null,
  p_expires_at timestamptz default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_community_moderator() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  insert into public.user_suspensions(user_id, reason, created_by, expires_at)
  values (p_user_id, p_reason, auth.uid(), p_expires_at);
  -- Hide the banned member's currently-visible posts immediately.
  update public.profile_posts
     set moderation_status = 'hidden', updated_at = now()
   where user_id = p_user_id and moderation_status = 'active';
  insert into public.moderation_actions(actor_id, action, target_type, target_id, reason)
  values (auth.uid(), 'user_suspend', 'user', p_user_id, p_reason);
end;
$$;

grant execute on function public.moderate_profile_post(uuid, text, text) to authenticated;
grant execute on function public.set_user_suspension(uuid, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Block posts from suspended users + simple rate limit (defense in depth).
-- ---------------------------------------------------------------------------
create or replace function public.profile_posts_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if exists (
    select 1 from public.user_suspensions s
    where s.user_id = new.user_id
      and (s.expires_at is null or s.expires_at > now())
  ) then
    raise exception 'USER_SUSPENDED';
  end if;

  select count(*) into recent
    from public.profile_posts
   where user_id = new.user_id
     and created_at > now() - interval '1 hour';
  if recent >= 20 then
    raise exception 'RATE_LIMITED';
  end if;

  return new;
end;
$$;
drop trigger if exists trg_profile_posts_guard on public.profile_posts;
create trigger trg_profile_posts_guard
  before insert on public.profile_posts
  for each row execute function public.profile_posts_guard();

-- ---------------------------------------------------------------------------
-- 6) Prevent non-moderators from tampering with moderation_status directly
--    (the existing "owner can update own posts" policy would otherwise let an
--     author un-hide their own removed post). Silently revert the field.
-- ---------------------------------------------------------------------------
create or replace function public.profile_posts_protect_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.moderation_status is distinct from old.moderation_status
     and not public.is_community_moderator() then
    new.moderation_status := old.moderation_status;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_profile_posts_protect_mod on public.profile_posts;
create trigger trg_profile_posts_protect_mod
  before update on public.profile_posts
  for each row execute function public.profile_posts_protect_moderation();
