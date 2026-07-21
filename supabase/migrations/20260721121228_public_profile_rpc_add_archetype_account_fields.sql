-- Bug fix: the Account tab's "Account Details" section (Member Since,
-- Account Type, Verification Status) showed "-" for every visitor even
-- though all three fields default to 'public' visibility
-- (DEFAULT_ACCOUNT_VISIBILITY in src/types/profile.ts) — PublicProfilePage.tsx
-- never populated them because the RPC never returned account_type /
-- verification_status, and never mapped the already-returned created_at
-- into account.memberSince. This migration adds the two missing columns;
-- the frontend fix (same PR) adds memberSince/accountType/verificationStatus
-- to PublicProfilePage.tsx's `account` object.
--
-- Builds on 20260721120000_add_longevity_archetype_to_public_profile_rpc.sql
-- (same DROP-then-CREATE requirement — Postgres won't let CREATE OR REPLACE
-- change a RETURNS TABLE function's OUT-parameter row type).

DROP FUNCTION IF EXISTS public.get_user_profile_by_identifier(text);

CREATE FUNCTION public.get_user_profile_by_identifier(identifier text)
 RETURNS TABLE(user_id uuid, display_name text, full_name text, handle text, avatar_url text, cover_url text, bio text, email text, location text, created_at timestamp with time zone, linkedin_url text, linkedin_headline text, linkedin_summary text, linkedin_synced_at timestamp with time zone, instagram_url text, instagram_bio text, instagram_followers_count integer, instagram_synced_at timestamp with time zone, instagram_interests text[], tiktok_url text, tiktok_bio text, tiktok_followers_count integer, tiktok_synced_at timestamp with time zone, tiktok_content_themes text[], youtube_url text, youtube_description text, youtube_subscribers_count integer, youtube_synced_at timestamp with time zone, youtube_content_categories text[], facebook_url text, facebook_bio text, facebook_synced_at timestamp with time zone, facebook_interests text[], x_url text, x_bio text, x_followers_count integer, x_synced_at timestamp with time zone, x_topics text[], longevity_archetype text, account_type text, verification_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ident text := trim(identifier, '@');
BEGIN
  IF identifier ~ '^[a-z0-9_-]+$' OR identifier LIKE '@%' THEN
    RETURN QUERY
    SELECT
      p.user_id, p.display_name, p.full_name, p.handle, p.avatar_url, p.cover_url,
      p.bio, p.email, gcp.location, p.created_at,
      p.linkedin_url, p.linkedin_headline, p.linkedin_summary, p.linkedin_synced_at,
      p.instagram_url, p.instagram_bio, p.instagram_followers_count, p.instagram_synced_at, p.instagram_interests,
      p.tiktok_url, p.tiktok_bio, p.tiktok_followers_count, p.tiktok_synced_at, p.tiktok_content_themes,
      p.youtube_url, p.youtube_description, p.youtube_subscribers_count, p.youtube_synced_at, p.youtube_content_categories,
      p.facebook_url, p.facebook_bio, p.facebook_synced_at, p.facebook_interests,
      p.x_url, p.x_bio, p.x_followers_count, p.x_synced_at, p.x_topics,
      p.longevity_archetype, p.account_type, p.verification_status
    FROM public.profiles p
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
    WHERE p.handle = ident
    AND gcp.is_visible = true;

    IF FOUND THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      p.user_id, p.display_name, p.full_name, p.handle, p.avatar_url, p.cover_url,
      p.bio, p.email, gcp.location, p.created_at,
      p.linkedin_url, p.linkedin_headline, p.linkedin_summary, p.linkedin_synced_at,
      p.instagram_url, p.instagram_bio, p.instagram_followers_count, p.instagram_synced_at, p.instagram_interests,
      p.tiktok_url, p.tiktok_bio, p.tiktok_followers_count, p.tiktok_synced_at, p.tiktok_content_themes,
      p.youtube_url, p.youtube_description, p.youtube_subscribers_count, p.youtube_synced_at, p.youtube_content_categories,
      p.facebook_url, p.facebook_bio, p.facebook_synced_at, p.facebook_interests,
      p.x_url, p.x_bio, p.x_followers_count, p.x_synced_at, p.x_topics,
      p.longevity_archetype, p.account_type, p.verification_status
    FROM public.profiles p
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
    WHERE p.vitana_id = ident
    AND gcp.is_visible = true;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  IF identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT
      p.user_id, p.display_name, p.full_name, p.handle, p.avatar_url, p.cover_url,
      p.bio, p.email, gcp.location, p.created_at,
      p.linkedin_url, p.linkedin_headline, p.linkedin_summary, p.linkedin_synced_at,
      p.instagram_url, p.instagram_bio, p.instagram_followers_count, p.instagram_synced_at, p.instagram_interests,
      p.tiktok_url, p.tiktok_bio, p.tiktok_followers_count, p.tiktok_synced_at, p.tiktok_content_themes,
      p.youtube_url, p.youtube_description, p.youtube_subscribers_count, p.youtube_synced_at, p.youtube_content_categories,
      p.facebook_url, p.facebook_bio, p.facebook_synced_at, p.facebook_interests,
      p.x_url, p.x_bio, p.x_followers_count, p.x_synced_at, p.x_topics,
      p.longevity_archetype, p.account_type, p.verification_status
    FROM public.profiles p
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
    WHERE p.user_id = identifier::uuid
    AND gcp.is_visible = true;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_by_identifier(text) TO anon, authenticated, service_role;
