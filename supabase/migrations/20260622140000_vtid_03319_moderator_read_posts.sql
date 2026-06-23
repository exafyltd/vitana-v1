-- VTID-03319 — let community moderators read any post they need to review.
--
-- The moderation center shows the actual reported post (author + content) next
-- to each report. The base SELECT policy only exposes public posts (and your
-- own), so a hidden/removed/private reported post wouldn't load for the admin.
-- Add a moderator-only SELECT policy (permissive, OR-ed with the existing ones)
-- using the same is_community_moderator() gate as the rest of Phase 1.

drop policy if exists "Moderators can view all posts" on public.profile_posts;
create policy "Moderators can view all posts" on public.profile_posts
  for select to authenticated
  using (public.is_community_moderator());
