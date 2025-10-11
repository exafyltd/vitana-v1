-- ============================================================================
-- CRITICAL SECURITY FIXES FOR ERROR-LEVEL VULNERABILITIES (Fixed Syntax)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 1: Create Patient-Provider Assignment System
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_provider_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id, provider_id, tenant_id)
);

ALTER TABLE public.patient_provider_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their assignments"
ON public.patient_provider_assignments
FOR SELECT
USING (
  auth.uid() = provider_id 
  OR auth.uid() = patient_id
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Admins can manage assignments"
ON public.patient_provider_assignments
FOR ALL
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = patient_provider_assignments.tenant_id
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
);

-- ----------------------------------------------------------------------------
-- FIX 2: Create Profile Privacy Settings Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_privacy_settings (
  user_id UUID PRIMARY KEY,
  searchable BOOLEAN NOT NULL DEFAULT true,
  show_email BOOLEAN NOT NULL DEFAULT false,
  show_full_name BOOLEAN NOT NULL DEFAULT true,
  show_phone BOOLEAN NOT NULL DEFAULT false,
  show_medical_info BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own privacy settings"
ON public.profile_privacy_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_privacy_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_privacy_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_privacy_settings_on_profile ON public.profiles;
CREATE TRIGGER create_privacy_settings_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_privacy_settings();

-- ----------------------------------------------------------------------------
-- FIX 3: Update Profiles RLS Policies - CRITICAL MEDICAL DATA PROTECTION
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles secure medical data access v3" ON public.profiles;

CREATE POLICY "Strict medical data access via assignments"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR
  EXISTS (
    SELECT 1 FROM public.patient_provider_assignments ppa
    WHERE ppa.patient_id = profiles.user_id
    AND ppa.provider_id = auth.uid()
    AND ppa.status = 'active'
    AND (ppa.expires_at IS NULL OR ppa.expires_at > now())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.memberships m1
    JOIN public.memberships m2 ON m1.tenant_id = m2.tenant_id
    WHERE m1.user_id = auth.uid()
    AND m1.role IN ('staff', 'admin')
    AND m1.status = 'active'
    AND m2.user_id = profiles.user_id
    AND m2.status = 'active'
  )
);

-- ----------------------------------------------------------------------------
-- FIX 4: Update Search Functions with Privacy Controls
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_tenant_directory(
  search_term text,
  tenant_id_param uuid
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  full_name text,
  avatar_url text,
  bio text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m 
    WHERE m.user_id = auth.uid() 
      AND m.tenant_id = tenant_id_param 
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: No active membership in tenant';
  END IF;

  INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
  VALUES (
    auth.uid(),
    tenant_id_param,
    'directory_search',
    jsonb_build_object('search_term', search_term, 'timestamp', now())
  );

  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    p.display_name,
    CASE WHEN COALESCE(pps.show_full_name, true) THEN p.full_name ELSE NULL END as full_name,
    p.avatar_url,
    p.bio,
    CASE 
      WHEN COALESCE(pps.show_email, false) = true AND EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid()
        AND m.tenant_id = tenant_id_param
        AND m.role IN ('staff', 'admin')
        AND m.status = 'active'
      ) THEN p.email 
      ELSE NULL 
    END as email
  FROM public.profiles p
  JOIN public.memberships m ON p.user_id = m.user_id
  LEFT JOIN public.profile_privacy_settings pps ON p.user_id = pps.user_id
  WHERE m.tenant_id = tenant_id_param
    AND m.status = 'active'
    AND p.user_id != auth.uid()
    AND COALESCE(pps.searchable, true) = true
    AND (
      p.display_name ILIKE '%' || search_term || '%' OR
      (COALESCE(pps.show_full_name, true) AND p.full_name ILIKE '%' || search_term || '%')
    )
  ORDER BY p.display_name
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_global_directory(search_term text)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  full_name text,
  avatar_url text,
  bio text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_community_user() THEN
    RAISE EXCEPTION 'Access denied: Only community users can search global directory';
  END IF;

  INSERT INTO public.audit_events (user_id, event_type, event_data)
  VALUES (
    auth.uid(),
    'global_search',
    jsonb_build_object('search_term', search_term, 'timestamp', now())
  );

  RETURN QUERY
  SELECT DISTINCT
    gcp.user_id,
    gcp.display_name,
    CASE WHEN COALESCE(pps.show_full_name, true) THEN p.full_name ELSE NULL END as full_name,
    gcp.avatar_url,
    gcp.bio,
    NULL::text as email
  FROM public.global_community_profiles gcp
  JOIN public.profiles p ON gcp.user_id = p.user_id
  LEFT JOIN public.profile_privacy_settings pps ON gcp.user_id = pps.user_id
  WHERE gcp.is_visible = true
    AND gcp.user_id != auth.uid()
    AND COALESCE(pps.searchable, true) = true
    AND (
      gcp.display_name ILIKE '%' || search_term || '%' OR
      (COALESCE(pps.show_full_name, true) AND p.full_name ILIKE '%' || search_term || '%')
    )
  ORDER BY gcp.display_name
  LIMIT 20;
END;
$$;

-- ----------------------------------------------------------------------------
-- FIX 5: Add Database Constraints for Input Validation
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'diary_text_length_check'
  ) THEN
    ALTER TABLE public.diary_entries
    ADD CONSTRAINT diary_text_length_check 
    CHECK (length(text) <= 50000);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cart_price_positive'
  ) THEN
    ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_price_positive 
    CHECK (item_price >= 0 AND item_price <= 1000000);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cart_item_name_length'
  ) THEN
    ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_item_name_length 
    CHECK (length(item_name) <= 500);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_memory_content_length'
  ) THEN
    ALTER TABLE public.ai_memory
    ADD CONSTRAINT ai_memory_content_length 
    CHECK (length(content) <= 50000);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'activity_type_length'
  ) THEN
    ALTER TABLE public.user_activity_log
    ADD CONSTRAINT activity_type_length
    CHECK (length(activity_type) <= 100);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- FIX 6: Create Search Audit Log Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  searcher_id UUID NOT NULL,
  search_term TEXT NOT NULL,
  search_scope TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  tenant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.search_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view search audit"
ON public.search_audit_log
FOR SELECT
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
);

CREATE POLICY "System inserts search audit"
ON public.search_audit_log
FOR INSERT
WITH CHECK (true);

GRANT SELECT, INSERT ON public.search_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.patient_provider_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profile_privacy_settings TO authenticated;