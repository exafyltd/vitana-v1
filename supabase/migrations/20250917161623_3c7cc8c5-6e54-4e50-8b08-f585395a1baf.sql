-- Create secure RPC to create a global direct thread with both participants
CREATE OR REPLACE FUNCTION public.create_global_direct_thread(p_recipient_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id uuid;
BEGIN
  -- Only community users can create global threads
  IF NOT is_community_user() THEN
    RAISE EXCEPTION 'Access denied: Only community users can start global conversations';
  END IF;

  IF p_recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  -- Create the thread
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
$$;

-- Create secure RPC to create a tenant-scoped direct thread with both participants
CREATE OR REPLACE FUNCTION public.create_tenant_direct_thread(p_recipient_id uuid, p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id uuid;
BEGIN
  -- Ensure the caller has an active membership in the tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid() AND m.tenant_id = p_tenant_id AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: No active membership in tenant';
  END IF;

  -- Ensure the recipient is also part of the tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = p_recipient_id AND m.tenant_id = p_tenant_id AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Recipient is not a member of this tenant';
  END IF;

  IF p_recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  -- Create the thread
  INSERT INTO public.message_threads (tenant_id, created_by, type)
  VALUES (p_tenant_id, auth.uid(), 'direct')
  RETURNING id INTO v_thread_id;

  -- Add participants (bypass RLS via SECURITY DEFINER)
  INSERT INTO public.thread_participants (thread_id, user_id, role)
  VALUES (v_thread_id, auth.uid(), 'admin');

  INSERT INTO public.thread_participants (thread_id, user_id, role)
  VALUES (v_thread_id, p_recipient_id, 'member');

  RETURN v_thread_id;
END;
$$;