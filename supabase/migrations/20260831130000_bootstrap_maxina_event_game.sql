-- =============================================================================
-- MAXINA LONGEVITY GAME — event-specific gamification layer (BOOTSTRAP)
--
-- Temporary, isolated, configurable event-game feature for the Sept 6 2026
-- Maxina gathering. Three new tables + two additive nullable columns on
-- profile_posts. All scoring is enforced server-side via SECURITY DEFINER
-- triggers/RPCs — the frontend is never trusted to set score/rank/points.
--
-- Design notes (see implementation plan for full rationale):
--   * Registration (+1) is awarded unconditionally on join — NOT gated on the
--     scoring window. Posting/liking ARE gated, by starts_at/ends_at directly
--     (never by `status` — an admin forgetting to flip status must never cost
--     real in-window activity its points).
--   * A post earns exactly ONE of two mutually-exclusive amounts
--     (points_event_post OR points_longevity_post) depending on
--     profile_posts.is_longevity_bonus — a switch, not a stacking bonus.
--   * event_game_points is an append-only ledger (reversal rows, never
--     delete/update of an award row) — this is what makes "why does this
--     user have N points" always traceable.
--   * No auto-enroll: a post only scores if the poster already has an
--     explicit event_game_participants row.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) event_games — organizer-editable config + lifecycle.
-- ---------------------------------------------------------------------------
create table if not exists public.event_games (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid,                          -- informational only; profile_posts itself carries no tenant_id
  slug                     text not null unique,
  name                     text not null,
  description              text,
  rules_text               text,
  status                   text not null default 'draft'
                             check (status in ('draft','scheduled','live','ended','archived')),
  starts_at                timestamptz not null,
  ends_at                  timestamptz not null,
  linked_meetup_id         uuid,                          -- soft reference only, no FK (target table unconfirmed)
  points_registration      int not null default 1,
  points_event_post        int not null default 5,        -- regular-category post
  points_longevity_post    int not null default 10,       -- longevity-category post (switch, not a stacking bonus)
  points_like_received     int not null default 1,
  points_like_received_cap int not null default 100,      -- total like-derived points cap per post
  max_posts_per_user       int not null default 3,
  hero_image_url           text,
  winner_reward_text       text,
  winner_reward_description text,
  created_by               uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint event_games_time_range_chk check (ends_at > starts_at)
);

create index if not exists idx_event_games_status on public.event_games(status);

alter table public.event_games enable row level security;

drop policy if exists "event_games_select_all" on public.event_games;
create policy "event_games_select_all" on public.event_games
  for select
  using (true);

drop policy if exists "event_games_moderator_write" on public.event_games;
create policy "event_games_moderator_write" on public.event_games
  for all to authenticated
  using (public.is_community_moderator())
  with check (public.is_community_moderator());

drop policy if exists "event_games_service_role" on public.event_games;
create policy "event_games_service_role" on public.event_games
  for all to service_role
  using (true)
  with check (true);

create or replace function public.set_event_games_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_event_games_updated_at on public.event_games;
create trigger trg_event_games_updated_at
  before update on public.event_games
  for each row execute function public.set_event_games_updated_at();

-- ---------------------------------------------------------------------------
-- 2) event_game_participants — idempotent join. Client inserts directly;
--    RLS lets a user only ever insert their own row, and there is no
--    update/delete policy for authenticated at all.
-- ---------------------------------------------------------------------------
create table if not exists public.event_game_participants (
  id             uuid primary key default gen_random_uuid(),
  event_game_id  uuid not null references public.event_games(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  joined_at      timestamptz not null default now(),
  unique (event_game_id, user_id)
);

create index if not exists idx_egp_event on public.event_game_participants(event_game_id);
create index if not exists idx_egp_user on public.event_game_participants(user_id);

alter table public.event_game_participants enable row level security;

drop policy if exists "egp_select_all" on public.event_game_participants;
create policy "egp_select_all" on public.event_game_participants
  for select
  using (true);

drop policy if exists "egp_insert_own" on public.event_game_participants;
create policy "egp_insert_own" on public.event_game_participants
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "egp_service_role" on public.event_game_participants;
create policy "egp_service_role" on public.event_game_participants
  for all to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 3) event_game_points — append-only ledger. THE sole source of scoring
--    truth. `authenticated` has SELECT of own rows (+ moderators, all rows)
--    and ZERO write policy — every write goes through a SECURITY DEFINER
--    trigger/RPC below, or service_role. This is what makes "frontend must
--    never set score" a database-enforced fact, not a convention.
-- ---------------------------------------------------------------------------
create table if not exists public.event_game_points (
  id                  uuid primary key default gen_random_uuid(),
  event_game_id       uuid not null references public.event_games(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  point_type          text not null check (point_type in
                        ('registration','post','like_received','admin_adjustment','reversal')),
  points              int not null,                        -- negative for reversal/admin_adjustment rows
  source_post_id      uuid references public.profile_posts(id) on delete set null,
  source_like_user_id uuid,
  reversal_of_id      uuid references public.event_game_points(id) on delete set null,
  reason              text,
  created_by          uuid,
  created_at          timestamptz not null default now()
);

create index if not exists idx_egpt_event_user on public.event_game_points(event_game_id, user_id);
create index if not exists idx_egpt_source_post on public.event_game_points(source_post_id);

-- Note: 'longevity_bonus' is deliberately NOT a separate point_type. A post's
-- award amount (points_event_post vs points_longevity_post) is resolved once,
-- at insert time, from profile_posts.is_longevity_bonus — so every post
-- generates exactly one 'post' row, and uq_egpt_post (keyed on source_post_id
-- alone) is sufficient to prevent duplicate awards.
create unique index if not exists uq_egpt_registration
  on public.event_game_points(event_game_id, user_id) where point_type = 'registration';
create unique index if not exists uq_egpt_post
  on public.event_game_points(event_game_id, source_post_id) where point_type = 'post';
create unique index if not exists uq_egpt_like
  on public.event_game_points(source_post_id, source_like_user_id) where point_type = 'like_received';
create unique index if not exists uq_egpt_reversal
  on public.event_game_points(reversal_of_id) where reversal_of_id is not null;

alter table public.event_game_points enable row level security;

drop policy if exists "egpt_select_own_or_moderator" on public.event_game_points;
create policy "egpt_select_own_or_moderator" on public.event_game_points
  for select to authenticated
  using (auth.uid() = user_id or public.is_community_moderator());

drop policy if exists "egpt_service_role" on public.event_game_points;
create policy "egpt_service_role" on public.event_game_points
  for all to service_role
  using (true)
  with check (true);
-- Deliberately NO insert/update/delete policy for `authenticated` — every
-- write must go through a SECURITY DEFINER trigger/RPC below.

-- ---------------------------------------------------------------------------
-- 4) profile_posts — two additive nullable columns, same pattern the table
--    has already absorbed twice (background_style, moderation_status).
-- ---------------------------------------------------------------------------
alter table public.profile_posts
  add column if not exists event_game_id uuid references public.event_games(id) on delete set null,
  add column if not exists is_longevity_bonus boolean not null default false;

create index if not exists idx_profile_posts_event_game
  on public.profile_posts(event_game_id) where event_game_id is not null;

-- Anti-tamper: an owner can UPDATE their own post (existing RLS policy has no
-- column-level WITH CHECK), so without this a user could retroactively set
-- event_game_id/is_longevity_bonus on an old post after the fact. Scoring
-- itself is immune (trigger B only fires on INSERT), but this closes the
-- cosmetic/audit-trail gap the same way profile_posts_protect_moderation()
-- already closes the moderation_status one.
create or replace function public.profile_posts_protect_event_game_tag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.event_game_id is distinct from old.event_game_id
      or new.is_longevity_bonus is distinct from old.is_longevity_bonus)
     and not public.is_community_moderator() then
    new.event_game_id := old.event_game_id;
    new.is_longevity_bonus := old.is_longevity_bonus;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_posts_protect_event_game_tag on public.profile_posts;
create trigger trg_profile_posts_protect_event_game_tag
  before update on public.profile_posts
  for each row execute function public.profile_posts_protect_event_game_tag();

-- =============================================================================
-- SCORING TRIGGERS
--
-- All SECURITY DEFINER, all wrapped in EXCEPTION WHEN OTHERS so a scoring bug
-- can never block the underlying join/post/like action itself (mirrors
-- notify_on_profile_post_like()'s established fail-safe pattern exactly).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Registration — unconditional, no time-window check at all. The row can
--    only be created while the game is visible (scheduled/live) in the first
--    place, per the app's own join flow, but the award never re-checks the
--    scoring window once that row exists.
-- ---------------------------------------------------------------------------
create or replace function public.award_event_game_registration_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int;
begin
  select points_registration into v_points
  from public.event_games where id = new.event_game_id;

  if v_points is null then
    return new;
  end if;

  insert into public.event_game_points(event_game_id, user_id, point_type, points, created_by)
  values (new.event_game_id, new.user_id, 'registration', v_points, new.user_id)
  on conflict (event_game_id, user_id) where point_type = 'registration' do nothing;

  return new;
exception when others then
  raise log 'award_event_game_registration_points: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_award_event_game_registration on public.event_game_participants;
create trigger trg_award_event_game_registration
  after insert on public.event_game_participants
  for each row execute function public.award_event_game_registration_points();

-- ---------------------------------------------------------------------------
-- B) Post points — no auto-enroll (skip silently if the poster isn't already
--    an explicit participant); timestamp-only window gate (never `status`);
--    max_posts_per_user cap; switch amount by is_longevity_bonus.
-- ---------------------------------------------------------------------------
create or replace function public.award_event_game_post_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
  v_is_participant boolean;
  v_post_count int;
  v_points int;
begin
  if new.event_game_id is null then
    return new;
  end if;

  select exists(
    select 1 from public.event_game_participants
    where event_game_id = new.event_game_id and user_id = new.user_id
  ) into v_is_participant;

  if not v_is_participant then
    return new;
  end if;

  select starts_at, ends_at, points_event_post, points_longevity_post, max_posts_per_user
    into v_game
  from public.event_games where id = new.event_game_id;

  if v_game is null or now() < v_game.starts_at or now() >= v_game.ends_at then
    return new;
  end if;

  select count(*) into v_post_count
  from public.event_game_points
  where event_game_id = new.event_game_id and user_id = new.user_id and point_type = 'post';

  if v_post_count >= v_game.max_posts_per_user then
    return new;
  end if;

  v_points := case when new.is_longevity_bonus then v_game.points_longevity_post else v_game.points_event_post end;

  insert into public.event_game_points(event_game_id, user_id, point_type, points, source_post_id, created_by)
  values (new.event_game_id, new.user_id, 'post', v_points, new.id, new.user_id)
  on conflict (event_game_id, source_post_id) where point_type = 'post' do nothing;

  return new;
exception when others then
  raise log 'award_event_game_post_points: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_award_event_game_post on public.profile_posts;
create trigger trg_award_event_game_post
  after insert on public.profile_posts
  for each row
  when (new.event_game_id is not null)
  execute function public.award_event_game_post_points();

-- ---------------------------------------------------------------------------
-- C) Like points — self-likes excluded, non-active posts excluded, timestamp
--    window (never status), per-post like-point cap.
-- ---------------------------------------------------------------------------
create or replace function public.award_event_game_like_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post record;
  v_game record;
  v_current_like_points int;
  v_points int;
begin
  select id, user_id, moderation_status, event_game_id
    into v_post
  from public.profile_posts where id = new.post_id;

  if v_post is null or v_post.event_game_id is null then
    return new;
  end if;

  if v_post.user_id = new.user_id then
    return new; -- self-like never scores
  end if;

  if v_post.moderation_status is distinct from 'active' then
    return new;
  end if;

  select starts_at, ends_at, points_like_received, points_like_received_cap
    into v_game
  from public.event_games where id = v_post.event_game_id;

  if v_game is null or now() < v_game.starts_at or now() >= v_game.ends_at then
    return new;
  end if;

  select coalesce(sum(points), 0) into v_current_like_points
  from public.event_game_points
  where source_post_id = v_post.id and point_type = 'like_received';

  if v_current_like_points + v_game.points_like_received > v_game.points_like_received_cap then
    return new;
  end if;

  v_points := v_game.points_like_received;

  insert into public.event_game_points(
    event_game_id, user_id, point_type, points, source_post_id, source_like_user_id, created_by
  )
  values (v_post.event_game_id, v_post.user_id, 'like_received', v_points, v_post.id, new.user_id, new.user_id)
  on conflict (source_post_id, source_like_user_id) where point_type = 'like_received' do nothing;

  return new;
exception when others then
  raise log 'award_event_game_like_points: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_award_event_game_like on public.profile_post_likes;
create trigger trg_award_event_game_like
  after insert on public.profile_post_likes
  for each row execute function public.award_event_game_like_points();

-- ---------------------------------------------------------------------------
-- D) Unlike reversal — reverses the matching like_received row once. A
--    like -> unlike -> re-like from the same user does NOT re-award, since
--    uq_egpt_like already has a row on file for that (post, liker) pair.
--    Accepted tradeoff (closes the farming loop; a genuine second like never
--    re-earns a point).
-- ---------------------------------------------------------------------------
create or replace function public.reverse_event_game_like_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original record;
begin
  select id, event_game_id, user_id, points
    into v_original
  from public.event_game_points
  where source_post_id = old.post_id
    and source_like_user_id = old.user_id
    and point_type = 'like_received';

  if v_original is null then
    return old;
  end if;

  insert into public.event_game_points(
    event_game_id, user_id, point_type, points, source_post_id, source_like_user_id, reversal_of_id, reason
  )
  values (
    v_original.event_game_id, v_original.user_id, 'reversal', -v_original.points,
    old.post_id, old.user_id, v_original.id, 'unlike'
  )
  on conflict (reversal_of_id) where reversal_of_id is not null do nothing;

  return old;
exception when others then
  raise log 'reverse_event_game_like_points: %', sqlerrm;
  return old;
end;
$$;

drop trigger if exists trg_reverse_event_game_like on public.profile_post_likes;
create trigger trg_reverse_event_game_like
  after delete on public.profile_post_likes
  for each row execute function public.reverse_event_game_like_points();

-- ---------------------------------------------------------------------------
-- E) Moderation reversal — on active -> hidden/removed, reverses every
--    non-reversed positive row tied to that post (post points + accumulated
--    like points).
-- ---------------------------------------------------------------------------
create or replace function public.reverse_event_game_points_on_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if old.moderation_status is not distinct from new.moderation_status then
    return new;
  end if;
  if new.moderation_status not in ('hidden', 'removed') then
    return new;
  end if;

  for v_row in
    select p.id, p.event_game_id, p.user_id, p.points
    from public.event_game_points p
    where p.source_post_id = new.id
      and p.points > 0
      and p.point_type in ('post', 'like_received')
      and not exists (
        select 1 from public.event_game_points r where r.reversal_of_id = p.id
      )
  loop
    insert into public.event_game_points(
      event_game_id, user_id, point_type, points, source_post_id, reversal_of_id, reason
    )
    values (
      v_row.event_game_id, v_row.user_id, 'reversal', -v_row.points, new.id, v_row.id, 'moderation'
    )
    on conflict (reversal_of_id) where reversal_of_id is not null do nothing;
  end loop;

  return new;
exception when others then
  raise log 'reverse_event_game_points_on_moderation: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_reverse_event_game_points_on_moderation on public.profile_posts;
create trigger trg_reverse_event_game_points_on_moderation
  after update of moderation_status on public.profile_posts
  for each row
  when (new.event_game_id is not null)
  execute function public.reverse_event_game_points_on_moderation();

-- ---------------------------------------------------------------------------
-- E2) Delete reversal — same reversal, closing the earn-then-delete
--     loophole (owners can hard-delete their own posts today).
-- ---------------------------------------------------------------------------
create or replace function public.reverse_event_game_points_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select p.id, p.event_game_id, p.user_id, p.points
    from public.event_game_points p
    where p.source_post_id = old.id
      and p.points > 0
      and p.point_type in ('post', 'like_received')
      and not exists (
        select 1 from public.event_game_points r where r.reversal_of_id = p.id
      )
  loop
    insert into public.event_game_points(
      event_game_id, user_id, point_type, points, source_post_id, reversal_of_id, reason
    )
    values (
      v_row.event_game_id, v_row.user_id, 'reversal', -v_row.points, null, v_row.id, 'post_deleted'
    )
    on conflict (reversal_of_id) where reversal_of_id is not null do nothing;
  end loop;

  return old;
exception when others then
  raise log 'reverse_event_game_points_on_delete: %', sqlerrm;
  return old;
end;
$$;

drop trigger if exists trg_reverse_event_game_points_on_delete on public.profile_posts;
create trigger trg_reverse_event_game_points_on_delete
  before delete on public.profile_posts
  for each row
  when (old.event_game_id is not null)
  execute function public.reverse_event_game_points_on_delete();

-- =============================================================================
-- RPCs
-- =============================================================================

-- Leaderboard: score DESC, tie-broken by the timestamp each user's running
-- cumulative total first reached their final score ("earliest to achieve the
-- score wins the tie", never "most recently active" — see plan §7), then
-- user_id for total determinism. Used identically for the live leaderboard
-- and the frozen final-results view — one implementation, not two that could
-- drift. SECURITY DEFINER so it can join profiles without a broad
-- "read any profile" RLS policy.
create or replace function public.get_event_game_leaderboard(p_event_game_id uuid, p_limit int default 100)
returns table(
  user_id uuid, display_name text, avatar_url text,
  score bigint, post_count bigint, rank bigint, achieved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with running as (
    select ep.user_id, ep.created_at,
           sum(ep.points) over (
             partition by ep.user_id order by ep.created_at, ep.id
             rows between unbounded preceding and current row
           ) as running_score
    from public.event_game_points ep
    where ep.event_game_id = p_event_game_id
  ), totals as (
    select ep.user_id, sum(ep.points) as score,
           count(*) filter (where ep.point_type = 'post') as post_count
    from public.event_game_points ep
    where ep.event_game_id = p_event_game_id
    group by ep.user_id
  ), first_reached as (
    select r.user_id, min(r.created_at) as achieved_at
    from running r
    join totals t on t.user_id = r.user_id and r.running_score = t.score
    group by r.user_id
  )
  select t.user_id, p.full_name, p.avatar_url, t.score, t.post_count,
         rank() over (order by t.score desc, fr.achieved_at asc, t.user_id asc) as rank,
         fr.achieved_at
  from totals t
  join first_reached fr using (user_id)
  left join public.profiles p on p.user_id = t.user_id
  order by rank
  limit p_limit;
$$;

grant execute on function public.get_event_game_leaderboard(uuid, int) to authenticated;

-- Same rule, filtered to the caller — drives "your score / your rank / your
-- points breakdown" on the Home view.
create or replace function public.get_my_event_game_rank(p_event_game_id uuid)
returns table(score bigint, rank bigint, post_count bigint, achieved_at timestamptz, breakdown jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with running as (
    select ep.user_id, ep.created_at,
           sum(ep.points) over (
             partition by ep.user_id order by ep.created_at, ep.id
             rows between unbounded preceding and current row
           ) as running_score
    from public.event_game_points ep
    where ep.event_game_id = p_event_game_id
  ), totals as (
    select ep.user_id, sum(ep.points) as score,
           count(*) filter (where ep.point_type = 'post') as post_count
    from public.event_game_points ep
    where ep.event_game_id = p_event_game_id
    group by ep.user_id
  ), ranked as (
    select t.user_id, t.score, t.post_count,
           rank() over (order by t.score desc, t.user_id asc) as rank
    from totals t
  ), first_reached as (
    select r.user_id, min(r.created_at) as achieved_at
    from running r
    join totals t on t.user_id = r.user_id and r.running_score = t.score
    group by r.user_id
  )
  select r.score, r.rank, r.post_count, fr.achieved_at,
    (select jsonb_object_agg(x.point_type, x.s) from
      (select point_type, sum(points) as s from public.event_game_points
       where event_game_id = p_event_game_id and user_id = auth.uid()
       group by point_type) x
    ) as breakdown
  from ranked r
  left join first_reached fr using (user_id)
  where r.user_id = auth.uid();
$$;

grant execute on function public.get_my_event_game_rank(uuid) to authenticated;

-- Admin correction — the only sanctioned direct write path into the ledger
-- besides the triggers above; moderator-gated, always auditable (reason +
-- created_by).
create or replace function public.admin_adjust_event_game_points(
  p_event_game_id uuid, p_user_id uuid, p_points int, p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_community_moderator() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  insert into public.event_game_points(event_game_id, user_id, point_type, points, reason, created_by)
  values (p_event_game_id, p_user_id, 'admin_adjustment', p_points, p_reason, auth.uid());
end;
$$;

grant execute on function public.admin_adjust_event_game_points(uuid, uuid, int, text) to authenticated;
