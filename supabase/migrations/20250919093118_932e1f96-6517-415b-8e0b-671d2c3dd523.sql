-- Tighten RLS policies for security hardening

-- 1. Fix global_community_profiles - limit to authenticated users and minimal fields
DROP POLICY IF EXISTS "Community users can view global profiles" ON public.global_community_profiles;
CREATE POLICY "Authenticated users can view minimal global profiles" 
ON public.global_community_profiles 
FOR SELECT 
TO authenticated
USING (is_visible = true);

-- 2. Fix global_thread_participants - require thread membership to view
DROP POLICY IF EXISTS "Community users can view thread participants" ON public.global_thread_participants;
CREATE POLICY "Thread members can view participants" 
ON public.global_thread_participants 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.global_thread_participants gtp_check
    WHERE gtp_check.thread_id = global_thread_participants.thread_id 
    AND gtp_check.user_id = auth.uid() 
    AND gtp_check.is_active = true
  )
);

-- 3. Fix message_reactions - require message access to view reactions
DROP POLICY IF EXISTS "Users can view all reactions" ON public.message_reactions;
CREATE POLICY "Users can view reactions for accessible messages" 
ON public.message_reactions 
FOR SELECT 
TO authenticated
USING (
  -- For global messages
  (EXISTS (
    SELECT 1 FROM public.global_messages gm
    JOIN public.global_thread_participants gtp ON gtp.thread_id = gm.thread_id
    WHERE gm.id = message_reactions.message_id 
    AND gtp.user_id = auth.uid() 
    AND gtp.is_active = true
  ))
  OR
  -- For tenant messages  
  (EXISTS (
    SELECT 1 FROM public.messages tm
    JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
    WHERE tm.id = message_reactions.message_id 
    AND tp.user_id = auth.uid() 
    AND tp.is_active = true
  ))
);

-- Create secure accessor functions

-- ProfileDirectory.getMinimalByIds - get minimal profile data for specific user IDs
CREATE OR REPLACE FUNCTION public.get_minimal_profiles_by_ids(user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limit to authenticated users only
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Return minimal profile data only
  RETURN QUERY
  SELECT 
    gcp.user_id,
    gcp.display_name,
    gcp.avatar_url
  FROM public.global_community_profiles gcp
  WHERE gcp.user_id = ANY(user_ids)
  AND gcp.is_visible = true
  AND gcp.user_id != auth.uid(); -- Don't include self
END;
$$;

-- ProfileDirectory.searchMinimal - scoped minimal profile search
CREATE OR REPLACE FUNCTION public.search_minimal_profiles(
  search_query text,
  search_scope text DEFAULT 'global'
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Require non-empty search query to prevent directory dumps
  IF search_query IS NULL OR length(trim(search_query)) < 2 THEN
    RAISE EXCEPTION 'Search query must be at least 2 characters';
  END IF;

  IF search_scope = 'global' THEN
    -- Global community search - only for community users
    IF NOT is_community_user() THEN
      RAISE EXCEPTION 'Global search limited to community users';
    END IF;

    RETURN QUERY
    SELECT 
      gcp.user_id,
      gcp.display_name,
      gcp.avatar_url
    FROM public.global_community_profiles gcp
    WHERE gcp.is_visible = true
    AND gcp.user_id != auth.uid()
    AND gcp.display_name ILIKE '%' || search_query || '%'
    ORDER BY gcp.display_name
    LIMIT 20;
    
  ELSIF search_scope = 'tenant' THEN
    -- Tenant-scoped search - require active tenant membership
    RETURN QUERY
    SELECT 
      p.user_id,
      p.display_name,
      p.avatar_url
    FROM public.profiles p
    JOIN public.memberships m ON p.user_id = m.user_id
    WHERE EXISTS (
      SELECT 1 FROM public.memberships my_membership
      WHERE my_membership.user_id = auth.uid()
      AND my_membership.tenant_id = m.tenant_id
      AND my_membership.status = 'active'
    )
    AND m.status = 'active'
    AND p.user_id != auth.uid()
    AND (p.display_name ILIKE '%' || search_query || '%' OR p.full_name ILIKE '%' || search_query || '%')
    ORDER BY p.display_name
    LIMIT 20;
  ELSE
    RAISE EXCEPTION 'Invalid search scope. Use "global" or "tenant"';
  END IF;
END;
$$;

-- Threads.getParticipants - get thread participants with membership check
CREATE OR REPLACE FUNCTION public.get_thread_participants(
  thread_id_param uuid,
  context_param text DEFAULT 'global'
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  role text,
  joined_at timestamp with time zone,
  last_read_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF context_param = 'global' THEN
    -- Check if user is participant of this global thread
    IF NOT EXISTS (
      SELECT 1 FROM public.global_thread_participants gtp
      WHERE gtp.thread_id = thread_id_param
      AND gtp.user_id = auth.uid()
      AND gtp.is_active = true
    ) THEN
      RAISE EXCEPTION 'Access denied: Not a participant of this thread';
    END IF;

    -- Return participants with minimal profile data
    RETURN QUERY
    SELECT 
      gtp.user_id,
      COALESCE(gcp.display_name, p.display_name, p.full_name, 'Unknown') as display_name,
      COALESCE(gcp.avatar_url, p.avatar_url) as avatar_url,
      gtp.role,
      gtp.joined_at,
      gtp.last_read_at
    FROM public.global_thread_participants gtp
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = gtp.user_id
    LEFT JOIN public.profiles p ON p.user_id = gtp.user_id
    WHERE gtp.thread_id = thread_id_param
    AND gtp.is_active = true
    ORDER BY gtp.joined_at;

  ELSIF context_param = 'tenant' THEN
    -- Check if user is participant of this tenant thread
    IF NOT EXISTS (
      SELECT 1 FROM public.thread_participants tp
      WHERE tp.thread_id = thread_id_param
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    ) THEN
      RAISE EXCEPTION 'Access denied: Not a participant of this thread';
    END IF;

    -- Return participants with minimal profile data
    RETURN QUERY
    SELECT 
      tp.user_id,
      COALESCE(p.display_name, p.full_name, 'Unknown') as display_name,
      p.avatar_url,
      tp.role,
      tp.joined_at,
      tp.last_read_at
    FROM public.thread_participants tp
    LEFT JOIN public.profiles p ON p.user_id = tp.user_id
    WHERE tp.thread_id = thread_id_param
    AND tp.is_active = true
    ORDER BY tp.joined_at;

  ELSE
    RAISE EXCEPTION 'Invalid context. Use "global" or "tenant"';
  END IF;
END;
$$;

-- Reactions.listForMessage - get reactions with message access check
CREATE OR REPLACE FUNCTION public.get_message_reactions(message_id_param uuid)
RETURNS TABLE(
  message_id uuid,
  user_id uuid,
  emoji text,
  created_at timestamp with time zone,
  display_name text,
  avatar_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check message access via thread membership
  IF NOT (
    -- Global message access
    EXISTS (
      SELECT 1 FROM public.global_messages gm
      JOIN public.global_thread_participants gtp ON gtp.thread_id = gm.thread_id
      WHERE gm.id = message_id_param 
      AND gtp.user_id = auth.uid() 
      AND gtp.is_active = true
    )
    OR
    -- Tenant message access  
    EXISTS (
      SELECT 1 FROM public.messages tm
      JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = message_id_param 
      AND tp.user_id = auth.uid() 
      AND tp.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Cannot view reactions for this message';
  END IF;

  -- Return reactions with minimal user data
  RETURN QUERY
  SELECT 
    mr.message_id,
    mr.user_id,
    mr.emoji,
    mr.created_at,
    COALESCE(gcp.display_name, p.display_name, p.full_name, 'Unknown') as display_name,
    COALESCE(gcp.avatar_url, p.avatar_url) as avatar_url
  FROM public.message_reactions mr
  LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = mr.user_id
  LEFT JOIN public.profiles p ON p.user_id = mr.user_id
  WHERE mr.message_id = message_id_param
  ORDER BY mr.created_at;
END;
$$;

-- Reactions.toggle - toggle reaction with message access check
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
  message_id_param uuid,
  emoji_param text
)
RETURNS boolean -- true if added, false if removed
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reaction_exists boolean := false;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check message access via thread membership (same as listForMessage)
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.global_messages gm
      JOIN public.global_thread_participants gtp ON gtp.thread_id = gm.thread_id
      WHERE gm.id = message_id_param 
      AND gtp.user_id = auth.uid() 
      AND gtp.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.messages tm
      JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = message_id_param 
      AND tp.user_id = auth.uid() 
      AND tp.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Cannot react to this message';
  END IF;

  -- Check if reaction already exists
  SELECT true INTO reaction_exists
  FROM public.message_reactions 
  WHERE message_id = message_id_param 
  AND user_id = auth.uid() 
  AND emoji = emoji_param;

  IF reaction_exists THEN
    -- Remove existing reaction
    DELETE FROM public.message_reactions 
    WHERE message_id = message_id_param 
    AND user_id = auth.uid() 
    AND emoji = emoji_param;
    RETURN false;
  ELSE
    -- Add new reaction
    INSERT INTO public.message_reactions (message_id, user_id, emoji)
    VALUES (message_id_param, auth.uid(), emoji_param);
    RETURN true;
  END IF;
END;
$$;