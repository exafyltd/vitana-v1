-- ============================================================================
-- Prevent & clean up DUPLICATE community posts.
--
-- Symptom: a post created once showed up several times in the News feed (e.g.
-- "Mariia Maksina" appearing 3×). Root cause: the post composer's submit
-- handler could run multiple times on rapid taps — the submit button's
-- `disabled` state lags behind the long media-upload step, so each tap
-- re-uploaded the media and inserted a fresh `profile_posts` row (the duplicate
-- rows had identical content but different `video_url`s, ~2s apart).
--
-- The frontend now has a synchronous re-entrancy guard, but per the request we
-- also make duplicates *technically impossible* at the database level:
--   Part A — one-time cleanup: collapse existing duplicate rows, merging their
--            likes/comments/hidden-markers onto the original (earliest) post.
--   Part B — a BEFORE INSERT trigger that rejects a near-identical post by the
--            same author within a short window (defense-in-depth; independent of
--            any client bug).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Part A — collapse existing duplicates
-- ---------------------------------------------------------------------------
-- Duplicate signature: same author + identical (trimmed) non-empty content,
-- created within 10 minutes of the earliest copy (the accidental-resubmit
-- window). The earliest row is kept as the canonical post.
create temp table _pp_dups on commit drop as
with ranked as (
  select
    id,
    user_id,
    created_at,
    min(created_at) over (partition by user_id, md5(btrim(content)))          as first_at,
    first_value(id) over (
      partition by user_id, md5(btrim(content))
      order by created_at asc, id asc
    )                                                                          as keep_id
  from public.profile_posts
  where coalesce(btrim(content), '') <> ''
)
select id as dup_id, keep_id
from ranked
where id <> keep_id
  and created_at <= first_at + interval '10 minutes';

-- Merge likes onto the survivor (skip likers who already liked it), then drop
-- the duplicates' likes. The (post_id, user_id) unique constraint is respected.
insert into public.profile_post_likes (post_id, user_id, created_at)
select distinct d.keep_id, l.user_id, l.created_at
from public.profile_post_likes l
join _pp_dups d on d.dup_id = l.post_id
on conflict (post_id, user_id) do nothing;

delete from public.profile_post_likes l
using _pp_dups d
where l.post_id = d.dup_id;

-- Repoint comments to the survivor.
update public.profile_post_comments c
set post_id = d.keep_id
from _pp_dups d
where c.post_id = d.dup_id;

-- Repoint hidden-post markers to the survivor, de-duplicating per user.
delete from public.user_hidden_posts h
using _pp_dups d
where h.post_id = d.dup_id
  and exists (
    select 1 from public.user_hidden_posts h2
    where h2.user_id = h.user_id and h2.post_id = d.keep_id
  );

update public.user_hidden_posts h
set post_id = d.keep_id
from _pp_dups d
where h.post_id = d.dup_id;

-- Delete the duplicate posts.
delete from public.profile_posts p
using _pp_dups d
where p.id = d.dup_id;

-- Recompute denormalized counters on the survivors.
update public.profile_posts p
set
  likes_count    = coalesce((select count(*) from public.profile_post_likes    l where l.post_id = p.id), 0),
  comments_count = coalesce((select count(*) from public.profile_post_comments c where c.post_id = p.id), 0)
where p.id in (select distinct keep_id from _pp_dups);

-- ---------------------------------------------------------------------------
-- Part B — BEFORE INSERT duplicate guard
-- ---------------------------------------------------------------------------
-- Rejects a near-identical post by the same user created within a short window:
--   * non-empty content : 90 seconds (catches re-submits with slow uploads)
--   * empty content (media-only): 15 seconds (two distinct uploads within
--     seconds are always an accidental double-submit; a human can't pick and
--     upload two different files that fast)
-- The error uses SQLSTATE 23505 (unique_violation) with a recognizable message
-- so the client can treat it as a benign "already posted" and not surface an
-- error toast.
create or replace function public.profile_posts_block_duplicate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash   text     := md5(coalesce(btrim(NEW.content), ''));
  v_window interval := case when coalesce(btrim(NEW.content), '') = ''
                            then interval '15 seconds'
                            else interval '90 seconds' end;
  v_dupe   uuid;
begin
  select id into v_dupe
  from public.profile_posts
  where user_id = NEW.user_id
    and md5(coalesce(btrim(content), '')) = v_hash
    and created_at >= now() - v_window
  limit 1;

  if v_dupe is not null then
    raise exception 'duplicate_post_suppressed'
      using errcode = '23505',
            detail  = format('A near-identical post by this user already exists (%s).', v_dupe),
            hint    = 'duplicate_post';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_profile_posts_block_duplicate on public.profile_posts;
create trigger trg_profile_posts_block_duplicate
before insert on public.profile_posts
for each row
execute function public.profile_posts_block_duplicate();
