-- Create function to get all conversation participants for a user
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
  WITH global_participants AS (
    -- Get participants from global threads where user is active
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
  ),
  tenant_participants AS (
    -- Get participants from tenant threads where user is active
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
  -- Combine and deduplicate
  SELECT 
    COALESCE(gp.user_id, tp.user_id) as user_id,
    COALESCE(gp.display_name, tp.display_name) as display_name,
    COALESCE(gp.full_name, tp.full_name) as full_name,
    COALESCE(gp.avatar_url, tp.avatar_url) as avatar_url,
    COALESCE(gp.phone, tp.phone) as phone,
    COALESCE(gp.email, tp.email) as email,
    GREATEST(COALESCE(gp.last_message_at, '1970-01-01'::timestamp), COALESCE(tp.last_message_at, '1970-01-01'::timestamp)) as last_message_at
  FROM global_participants gp
  FULL OUTER JOIN tenant_participants tp ON gp.user_id = tp.user_id
  ORDER BY last_message_at DESC;
END;
$$;