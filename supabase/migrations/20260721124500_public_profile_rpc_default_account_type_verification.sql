-- Bug fix: visitors saw "-" for Account Type / Verification Status while the
-- profile owner always saw "Community" / "Unverified" for the same profile.
-- Root cause: profiles.account_type and profiles.verification_status are
-- NULL for every row in the table (no code anywhere actually derives these
-- from role/tenant/KYC signals yet) — the owner's own fetch path
-- (src/context/ProfileProvider.tsx fetchUserProfile()) papers over this with
-- a hardcoded JS fallback (`|| "Community"`, `?? "unverified"`) that looks
-- like real data but isn't. The public RPC added in
-- 20260721121228_public_profile_rpc_add_archetype_account_fields.sql has no
-- equivalent fallback, so visitors got NULL -> "-" instead.
--
-- Fix: apply the SAME default strings inside the RPC's existing
-- account_visibility CASE gate, so a visitor sees exactly what the owner
-- sees for the public-default case, while a private/connections setting
-- still correctly returns NULL (unchanged from the previous migration —
-- this only changes what happens when the field IS public but the
-- underlying column is unset, which today is always).
--
-- Not fixing ProfileProvider.tsx's hardcoded fallback itself, nor building
-- real role/KYC-derived values — that logic doesn't exist anywhere in this
-- codebase today; matching the existing (if crude) owner-side behavior is
-- the proportionate fix here, not inventing a new source of truth.

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
      p.longevity_archetype,
      CASE WHEN COALESCE(p.account_visibility->>'accountType', 'public') = 'public' THEN COALESCE(p.account_type, 'Community') ELSE NULL END,
      CASE WHEN COALESCE(p.account_visibility->>'verificationStatus', 'public') = 'public' THEN COALESCE(p.verification_status, 'unverified') ELSE NULL END
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
      p.longevity_archetype,
      CASE WHEN COALESCE(p.account_visibility->>'accountType', 'public') = 'public' THEN COALESCE(p.account_type, 'Community') ELSE NULL END,
      CASE WHEN COALESCE(p.account_visibility->>'verificationStatus', 'public') = 'public' THEN COALESCE(p.verification_status, 'unverified') ELSE NULL END
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
      p.longevity_archetype,
      CASE WHEN COALESCE(p.account_visibility->>'accountType', 'public') = 'public' THEN COALESCE(p.account_type, 'Community') ELSE NULL END,
      CASE WHEN COALESCE(p.account_visibility->>'verificationStatus', 'public') = 'public' THEN COALESCE(p.verification_status, 'unverified') ELSE NULL END
    FROM public.profiles p
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
    WHERE p.user_id = identifier::uuid
    AND gcp.is_visible = true;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_by_identifier(text) TO anon, authenticated, service_role;
