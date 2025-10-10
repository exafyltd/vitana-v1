-- Drop and recreate the function with fixed ambiguous column reference
DROP FUNCTION IF EXISTS get_conversation_participants(uuid);

CREATE OR REPLACE FUNCTION get_conversation_participants(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  full_name text,
  avatar_url text,
  phone text,
  email text,
  last_message_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_participants AS (
    -- Global thread participants
    SELECT DISTINCT
      gtp.user_id,
      COALESCE(gcp.display_name, p.display_name, p.full_name, 'Unknown') as display_name,
      p.full_name,
      COALESCE(gcp.avatar_url, p.avatar_url) as avatar_url,
      p.phone,
      p.email,
      MAX(gm.created_at) as last_message_at
    FROM global_thread_participants gtp
    JOIN global_message_threads gmt ON gmt.id = gtp.thread_id
    LEFT JOIN global_messages gm ON gm.thread_id = gmt.id
    LEFT JOIN global_community_profiles gcp ON gcp.user_id = gtp.user_id
    LEFT JOIN profiles p ON p.user_id = gtp.user_id
    WHERE gtp.thread_id IN (
      SELECT thread_id FROM global_thread_participants 
      WHERE user_id = p_user_id AND is_active = true
    )
    AND gtp.user_id != p_user_id
    AND gtp.is_active = true
    GROUP BY gtp.user_id, gcp.display_name, p.display_name, p.full_name, gcp.avatar_url, p.avatar_url, p.phone, p.email
    
    UNION
    
    -- Tenant thread participants
    SELECT DISTINCT
      tp.user_id,
      COALESCE(p.display_name, p.full_name, 'Unknown') as display_name,
      p.full_name,
      p.avatar_url,
      p.phone,
      p.email,
      MAX(m.created_at) as last_message_at
    FROM thread_participants tp
    JOIN message_threads mt ON mt.id = tp.thread_id
    LEFT JOIN messages m ON m.thread_id = mt.id
    LEFT JOIN profiles p ON p.user_id = tp.user_id
    WHERE tp.thread_id IN (
      SELECT thread_id FROM thread_participants 
      WHERE user_id = p_user_id AND is_active = true
    )
    AND tp.user_id != p_user_id
    AND tp.is_active = true
    GROUP BY tp.user_id, p.display_name, p.full_name, p.avatar_url, p.phone, p.email
  )
  -- Deduplicate and keep most recent interaction
  SELECT 
    ap.user_id,
    MAX(ap.display_name) as display_name,
    MAX(ap.full_name) as full_name,
    MAX(ap.avatar_url) as avatar_url,
    MAX(ap.phone) as phone,
    MAX(ap.email) as email,
    MAX(ap.last_message_at) as last_message_at
  FROM all_participants ap
  GROUP BY ap.user_id
  ORDER BY MAX(ap.last_message_at) DESC NULLS LAST;
END;
$$;