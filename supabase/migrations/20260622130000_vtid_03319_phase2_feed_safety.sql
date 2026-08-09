-- VTID-03319 Phase 2 — per-user feed safety controls.
--
-- Phase 1 added GLOBAL admin moderation (moderation_status, bans). This phase
-- adds PERSONAL, viewer-scoped controls that only affect the current user's
-- own feed and never touch anyone else's view:
--   * hide a single post           -> user_hidden_posts
--   * mute an author (soft)        -> user_muted_authors
--   * block an author (stronger)   -> user_blocked_authors
--
-- All three are owned by auth.uid() (RLS: a user only ever sees/writes their
-- own rows). The feed query (useAllNewsFeed) reads these to drop hidden posts
-- and posts from muted/blocked authors before ranking.

-- ---------------------------------------------------------------------------
-- 1) Hidden posts ("Hide post" / "Not interested").
-- ---------------------------------------------------------------------------
create table if not exists public.user_hidden_posts (
  user_id    uuid not null default auth.uid(),
  post_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.user_hidden_posts enable row level security;
drop policy if exists "Users manage own hidden posts" on public.user_hidden_posts;
create policy "Users manage own hidden posts" on public.user_hidden_posts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) Muted authors ("Mute author") — softer than block.
-- ---------------------------------------------------------------------------
create table if not exists public.user_muted_authors (
  user_id    uuid not null default auth.uid(),
  author_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);
alter table public.user_muted_authors enable row level security;
drop policy if exists "Users manage own muted authors" on public.user_muted_authors;
create policy "Users manage own muted authors" on public.user_muted_authors
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3) Blocked authors ("Block author") — stronger personal safety action.
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocked_authors (
  user_id    uuid not null default auth.uid(),
  author_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);
alter table public.user_blocked_authors enable row level security;
drop policy if exists "Users manage own blocked authors" on public.user_blocked_authors;
create policy "Users manage own blocked authors" on public.user_blocked_authors
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
