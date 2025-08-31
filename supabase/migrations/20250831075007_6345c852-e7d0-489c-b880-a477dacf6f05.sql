-- Create RPCs for role management
CREATE OR REPLACE FUNCTION public.list_roles_for_active_tenant(p_tenant_id uuid)
RETURNS TABLE (role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.role::text
  FROM public.memberships m
  WHERE m.user_id = auth.uid()
    AND m.tenant_id = p_tenant_id
    AND m.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.get_role_preference(p_tenant_id uuid)
RETURNS TABLE (role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT rp.role
  FROM public.role_preferences rp
  WHERE rp.user_id = auth.uid()
    AND rp.tenant_id = p_tenant_id;
$$;

CREATE OR REPLACE FUNCTION public.set_role_preference(p_tenant_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the role is granted in memberships
  IF NOT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = p_tenant_id
      AND m.role::text = p_role
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Role not granted for this tenant';
  END IF;

  INSERT INTO public.role_preferences (user_id, tenant_id, role)
  VALUES (auth.uid(), p_tenant_id, p_role)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET role = EXCLUDED.role, updated_at = now();
END;
$$;

-- Create trigger for updated_at on memberships
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_preferences_updated_at
  BEFORE UPDATE ON public.role_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();