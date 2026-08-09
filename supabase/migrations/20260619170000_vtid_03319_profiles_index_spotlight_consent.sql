-- VTID-03319: opt-in consent for the news-feed "most improved" community
-- spotlight. Off by default — a member's Vitana Index is only considered for
-- the spotlight after they explicitly opt in. Keyed on profiles.user_id (the
-- auth user id), which is what vitana_index_scores.user_id and the frontend
-- toggle both use.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS index_spotlight_consent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.index_spotlight_consent IS
  'VTID-03319: user opted in to appear in the news-feed most-improved spotlight. Exact Index scores are never exposed.';
