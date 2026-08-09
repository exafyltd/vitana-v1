-- Rich text posts — coloured backgrounds + inline @mentions for the News feed.
--
-- Text-only posts in the community feed rendered as a small grey paragraph and
-- looked weak next to image/video cards. This adds two optional, nullable
-- columns to profile_posts so a member can pick a Facebook-style coloured
-- background and tag other members inline:
--
--   * background_style — preset id (e.g. 'sunset'); the frontend maps it to
--     Tailwind classes at render time, so no raw CSS is stored. NULL = plain.
--   * mentions — JSONB array of { user_id, display_name } for tagged members,
--     used to render clickable @mention links.
--
-- Both default to "no enrichment", so existing rows and existing insert paths
-- keep working unchanged. No RLS change is needed — the existing owner
-- insert/update policies already cover these columns.

alter table public.profile_posts
  add column if not exists background_style text;

alter table public.profile_posts
  add column if not exists mentions jsonb not null default '[]'::jsonb;
