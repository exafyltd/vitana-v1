-- Phase 1: Fresh start IAM migration
-- Drop existing IAM tables to start fresh
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.role_preferences CASCADE;

-- Fix tenant names (Salama -> Earthlinks)
UPDATE public.tenants 
SET name = 'Earthlinks', slug = 'earthlinks'
WHERE lower(name) = 'salama' OR slug = 'salama';

-- Ensure tenants have slug column and seed required tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug text UNIQUE;
UPDATE public.tenants SET slug = lower(replace(name, ' ', '-')) WHERE slug IS NULL;

-- Seed tenants idempotently
INSERT INTO public.tenants (id, name, slug)
SELECT gen_random_uuid(), 'Maxina', 'maxina'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug='maxina');

INSERT INTO public.tenants (id, name, slug)
SELECT gen_random_uuid(), 'AlKalma', 'alkalma'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug='alkalma');

INSERT INTO public.tenants (id, name, slug)
SELECT gen_random_uuid(), 'Earthlings', 'earthlings'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug='earthlings');

-- Create tenant roles enum
CREATE TYPE IF NOT EXISTS tenant_role AS ENUM ('community', 'patient', 'professional', 'staff', 'admin');

-- Recreate memberships table with proper structure
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'community',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- Create role preferences table for sticky role selection per tenant
CREATE TABLE public.role_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('community','patient','professional','staff','admin')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- Enable RLS on all tables
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for memberships (Exafy admin or tenant admin can manage)
CREATE POLICY memberships_select 
ON public.memberships FOR SELECT 
USING (
  user_id = auth.uid() 
  OR ((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true)
  OR EXISTS (
    SELECT 1 FROM public.memberships admin 
    WHERE admin.user_id = auth.uid() 
    AND admin.tenant_id = memberships.tenant_id 
    AND admin.role = 'admin' 
    AND admin.status = 'active'
  )
);

CREATE POLICY memberships_insert_by_admins 
ON public.memberships FOR INSERT 
WITH CHECK (
  ((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true)
  OR EXISTS (
    SELECT 1 FROM public.memberships admin 
    WHERE admin.user_id = auth.uid() 
    AND admin.tenant_id = memberships.tenant_id 
    AND admin.role = 'admin' 
    AND admin.status = 'active'
  )
);

CREATE POLICY memberships_update_by_admins 
ON public.memberships FOR UPDATE 
USING (
  ((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true)
  OR EXISTS (
    SELECT 1 FROM public.memberships admin 
    WHERE admin.user_id = auth.uid() 
    AND admin.tenant_id = memberships.tenant_id 
    AND admin.role = 'admin' 
    AND admin.status = 'active'
  )
)
WITH CHECK (
  ((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true)
  OR EXISTS (
    SELECT 1 FROM public.memberships admin 
    WHERE admin.user_id = auth.uid() 
    AND admin.tenant_id = memberships.tenant_id 
    AND admin.role = 'admin' 
    AND admin.status = 'active'
  )
);

CREATE POLICY memberships_delete_by_admins 
ON public.memberships FOR DELETE 
USING (
  ((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true)
  OR EXISTS (
    SELECT 1 FROM public.memberships admin 
    WHERE admin.user_id = auth.uid() 
    AND admin.tenant_id = memberships.tenant_id 
    AND admin.role = 'admin' 
    AND admin.status = 'active'
  )
);

-- RLS policies for role_preferences (users manage their own)
CREATE POLICY rp_select_self 
ON public.role_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY rp_upsert_self 
ON public.role_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY rp_update_self 
ON public.role_preferences FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY rp_delete_self 
ON public.role_preferences FOR DELETE 
USING (auth.uid() = user_id);

-- Update tenant policies for Exafy-only management
DROP POLICY IF EXISTS tenants_select_any_member ON public.tenants;
DROP POLICY IF EXISTS tenants_cud_exafy_only ON public.tenants;

CREATE POLICY tenants_select_any_member 
ON public.tenants FOR SELECT 
USING (
  ((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true)
  OR EXISTS (
    SELECT 1 FROM public.memberships m 
    WHERE m.user_id = auth.uid() 
    AND m.tenant_id = tenants.id 
    AND m.status = 'active'
  )
);

CREATE POLICY tenants_cud_exafy_only 
ON public.tenants FOR ALL 
USING (((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true))
WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true));

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

-- Create audit events table for logging
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_select_own_or_admin 
ON public.audit_events FOR SELECT 
USING (
  user_id = auth.uid() 
  OR ((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean = true)
);

CREATE POLICY audit_events_insert_any 
ON public.audit_events FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at
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