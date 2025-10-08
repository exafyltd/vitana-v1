-- Drop and recreate function with social media fields
DROP FUNCTION IF EXISTS public.get_user_profile_by_identifier(text);

CREATE OR REPLACE FUNCTION public.get_user_profile_by_identifier(identifier text)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  full_name text,
  handle text,
  avatar_url text,
  cover_url text,
  bio text,
  email text,
  location text,
  created_at timestamptz,
  linkedin_url text,
  linkedin_headline text,
  linkedin_summary text,
  linkedin_synced_at timestamptz,
  instagram_url text,
  instagram_bio text,
  instagram_followers_count integer,
  instagram_synced_at timestamptz,
  instagram_interests text[],
  tiktok_url text,
  tiktok_bio text,
  tiktok_followers_count integer,
  tiktok_synced_at timestamptz,
  tiktok_content_themes text[],
  youtube_url text,
  youtube_description text,
  youtube_subscribers_count integer,
  youtube_synced_at timestamptz,
  youtube_content_categories text[],
  facebook_url text,
  facebook_bio text,
  facebook_synced_at timestamptz,
  facebook_interests text[],
  x_url text,
  x_bio text,
  x_followers_count integer,
  x_synced_at timestamptz,
  x_topics text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First try to find by handle (if starts with @ or looks like handle)
  IF identifier ~ '^[a-z0-9_-]+$' OR identifier LIKE '@%' THEN
    RETURN QUERY
    SELECT 
      p.user_id,
      p.display_name,
      p.full_name,
      p.handle,
      p.avatar_url,
      p.cover_url,
      p.bio,
      p.email,
      gcp.location,
      p.created_at,
      p.linkedin_url,
      p.linkedin_headline,
      p.linkedin_summary,
      p.linkedin_synced_at,
      p.instagram_url,
      p.instagram_bio,
      p.instagram_followers_count,
      p.instagram_synced_at,
      p.instagram_interests,
      p.tiktok_url,
      p.tiktok_bio,
      p.tiktok_followers_count,
      p.tiktok_synced_at,
      p.tiktok_content_themes,
      p.youtube_url,
      p.youtube_description,
      p.youtube_subscribers_count,
      p.youtube_synced_at,
      p.youtube_content_categories,
      p.facebook_url,
      p.facebook_bio,
      p.facebook_synced_at,
      p.facebook_interests,
      p.x_url,
      p.x_bio,
      p.x_followers_count,
      p.x_synced_at,
      p.x_topics
    FROM public.profiles p
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
    WHERE p.handle = trim(identifier, '@')
    AND gcp.is_visible = true;
    
    -- Return if found by handle
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Try to find by user_id (if looks like UUID)
  IF identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT 
      p.user_id,
      p.display_name,
      p.full_name,
      p.handle,
      p.avatar_url,
      p.cover_url,
      p.bio,
      p.email,
      gcp.location,
      p.created_at,
      p.linkedin_url,
      p.linkedin_headline,
      p.linkedin_summary,
      p.linkedin_synced_at,
      p.instagram_url,
      p.instagram_bio,
      p.instagram_followers_count,
      p.instagram_synced_at,
      p.instagram_interests,
      p.tiktok_url,
      p.tiktok_bio,
      p.tiktok_followers_count,
      p.tiktok_synced_at,
      p.tiktok_content_themes,
      p.youtube_url,
      p.youtube_description,
      p.youtube_subscribers_count,
      p.youtube_synced_at,
      p.youtube_content_categories,
      p.facebook_url,
      p.facebook_bio,
      p.facebook_synced_at,
      p.facebook_interests,
      p.x_url,
      p.x_bio,
      p.x_followers_count,
      p.x_synced_at,
      p.x_topics
    FROM public.profiles p
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
    WHERE p.user_id = identifier::uuid
    AND gcp.is_visible = true;
  END IF;
END;
$$;