-- Create function to add user to additional tenant or switch tenant context
CREATE OR REPLACE FUNCTION public.switch_to_tenant_by_slug(p_tenant_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  tenant_record RECORD;
  existing_membership RECORD;
BEGIN
  -- Find the tenant by slug
  SELECT * INTO tenant_record FROM public.tenants WHERE slug = p_tenant_slug;
  
  IF tenant_record.id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_slug;
  END IF;
  
  -- Check if user already has membership
  SELECT * INTO existing_membership 
  FROM public.memberships 
  WHERE user_id = auth.uid() AND tenant_id = tenant_record.id;
  
  -- If no membership exists, create one with community role ONLY
  IF existing_membership.id IS NULL THEN
    INSERT INTO public.memberships (user_id, tenant_id, role, status)
    VALUES (auth.uid(), tenant_record.id, 'community'::tenant_role, 'active');
    
    -- Set role preference to community (no self-assignment)
    INSERT INTO public.role_preferences (user_id, tenant_id, role)
    VALUES (auth.uid(), tenant_record.id, 'community')
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'community';
  END IF;
  
  -- Update active tenant in user metadata
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('active_tenant_id', tenant_record.id)
  WHERE id = auth.uid();
  
  -- Log the tenant switch for audit purposes
  INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
  VALUES (
    auth.uid(),
    tenant_record.id,
    'tenant_switch',
    jsonb_build_object('tenant_slug', p_tenant_slug, 'timestamp', now())
  );
END;
$$;