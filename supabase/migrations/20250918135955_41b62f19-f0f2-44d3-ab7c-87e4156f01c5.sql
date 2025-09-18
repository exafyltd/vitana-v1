-- Update the create_global_direct_thread function to prevent duplicate threads
CREATE OR REPLACE FUNCTION public.create_global_direct_thread(p_recipient_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_thread_id uuid;
  v_existing_thread_id uuid;
BEGIN
  -- Only community users can create global threads
  IF NOT is_community_user() THEN
    RAISE EXCEPTION 'Access denied: Only community users can start global conversations';
  END IF;

  IF p_recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  -- Check if a direct thread already exists between these two users
  SELECT t.id INTO v_existing_thread_id
  FROM public.global_message_threads t
  WHERE t.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM public.global_thread_participants p1 
      WHERE p1.thread_id = t.id 
        AND p1.user_id = auth.uid() 
        AND p1.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.global_thread_participants p2 
      WHERE p2.thread_id = t.id 
        AND p2.user_id = p_recipient_id 
        AND p2.is_active = true
    )
    -- Ensure it has exactly 2 participants (direct conversation)
    AND (
      SELECT COUNT(*) FROM public.global_thread_participants p3 
      WHERE p3.thread_id = t.id AND p3.is_active = true
    ) = 2
  LIMIT 1;

  -- If existing thread found, return it
  IF v_existing_thread_id IS NOT NULL THEN
    RETURN v_existing_thread_id;
  END IF;

  -- Create new thread only if none exists
  INSERT INTO public.global_message_threads (created_by, type)
  VALUES (auth.uid(), 'direct')
  RETURNING id INTO v_thread_id;

  -- Add current user as admin
  INSERT INTO public.global_thread_participants (thread_id, user_id, role)
  VALUES (v_thread_id, auth.uid(), 'admin');

  -- Add recipient as member (bypass RLS via SECURITY DEFINER)
  INSERT INTO public.global_thread_participants (thread_id, user_id, role)
  VALUES (v_thread_id, p_recipient_id, 'member');

  RETURN v_thread_id;
END;
$function$