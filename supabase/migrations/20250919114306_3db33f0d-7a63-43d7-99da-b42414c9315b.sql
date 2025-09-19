-- Ensure the create_or_get_global_dm function exists and works correctly
-- This function creates or returns existing direct message threads in the global context

CREATE OR REPLACE FUNCTION public.create_or_get_global_dm(p_other_user uuid)
RETURNS TABLE(thread_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  v_thread_id uuid;
BEGIN
  -- Authentication check
  IF me IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Community user check
  IF NOT is_community_user() THEN
    RAISE EXCEPTION 'Access denied: Only community users can create global conversations';
  END IF;

  -- Self-check
  IF p_other_user = me THEN
    RAISE EXCEPTION 'Cannot start a DM with yourself';
  END IF;

  -- Look for existing DM between exactly these 2 users
  SELECT t.id INTO v_thread_id
  FROM global_message_threads t
  WHERE t.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM global_thread_participants p1 
      WHERE p1.thread_id = t.id 
        AND p1.user_id = me 
        AND p1.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM global_thread_participants p2 
      WHERE p2.thread_id = t.id 
        AND p2.user_id = p_other_user 
        AND p2.is_active = true
    )
    AND (
      SELECT COUNT(*) FROM global_thread_participants p3 
      WHERE p3.thread_id = t.id AND p3.is_active = true
    ) = 2
  LIMIT 1;

  -- Return existing thread if found
  IF v_thread_id IS NOT NULL THEN
    RETURN QUERY SELECT v_thread_id;
    RETURN;
  END IF;

  -- Create new thread + participants atomically
  INSERT INTO global_message_threads (created_by, type)
  VALUES (me, 'direct')
  RETURNING id INTO v_thread_id;

  -- Insert both participants
  INSERT INTO global_thread_participants (thread_id, user_id, role, is_active)
  VALUES 
    (v_thread_id, me, 'admin', true),
    (v_thread_id, p_other_user, 'member', true);

  -- Return new thread id
  RETURN QUERY SELECT v_thread_id;
END;
$$;