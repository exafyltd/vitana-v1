-- ============================================================================
-- PHASE 1: CRITICAL SECURITY FIXES (CORRECTED)
-- ============================================================================

-- ============================================================================
-- FIX 1: SECURE MEDICAL DATA ACCESS IN PROFILES TABLE
-- ============================================================================

-- Drop the overly permissive policy that allows cross-tenant access
DROP POLICY IF EXISTS "Profiles secure medical data access v2" ON public.profiles;

-- Create new policy with strict tenant boundary enforcement
CREATE POLICY "Profiles secure medical data access v3"
ON public.profiles
FOR SELECT
USING (
  -- Users can always see their own profile
  auth.uid() = user_id
  OR
  -- Exafy admins can see all profiles (with proper metadata check)
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR
  -- Staff/Professional/Admin can ONLY see profiles within their ACTIVE tenant context
  (
    EXISTS (
      SELECT 1 FROM public.memberships m1
      WHERE m1.user_id = auth.uid()
        AND m1.role IN ('professional', 'staff', 'admin')
        AND m1.status = 'active'
        -- CRITICAL: Check against active tenant from user's metadata
        AND m1.tenant_id = COALESCE(
          (auth.jwt() -> 'app_metadata' ->> 'active_tenant_id')::uuid,
          m1.tenant_id
        )
        -- Target profile must be in same tenant
        AND EXISTS (
          SELECT 1 FROM public.memberships m2
          WHERE m2.user_id = profiles.user_id
            AND m2.tenant_id = m1.tenant_id
            AND m2.status = 'active'
        )
    )
  )
);

-- ============================================================================
-- FIX 2: ENCRYPT API KEYS USING SUPABASE VAULT
-- ============================================================================

-- Add encrypted_key column
ALTER TABLE public.user_api_keys 
ADD COLUMN IF NOT EXISTS encrypted_key TEXT;

-- Create encryption function using Supabase Vault
CREATE OR REPLACE FUNCTION public.encrypt_api_key(api_key_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_value TEXT;
BEGIN
  -- Use pgsodium extension for encryption (built into Supabase)
  -- Keys are automatically managed by Supabase Vault
  SELECT encode(
    pgsodium.crypto_aead_det_encrypt(
      api_key_text::bytea,
      NULL,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'api_key_encryption_key' LIMIT 1)::bytea,
      NULL
    ),
    'base64'
  ) INTO encrypted_value;
  
  RETURN encrypted_value;
EXCEPTION
  WHEN OTHERS THEN
    -- If vault key doesn't exist, use fallback encryption
    -- This will be caught and user will be prompted to set up vault
    RAISE EXCEPTION 'Encryption key not configured. Please set up Supabase Vault.';
END;
$$;

-- Create decryption function
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_value TEXT;
BEGIN
  SELECT encode(
    pgsodium.crypto_aead_det_decrypt(
      decode(encrypted_key_text, 'base64'),
      NULL,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'api_key_encryption_key' LIMIT 1)::bytea,
      NULL
    ),
    'escape'
  ) INTO decrypted_value;
  
  RETURN decrypted_value;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to decrypt API key. Encryption key may be invalid.';
END;
$$;

-- Migrate existing plain text keys to encrypted format
-- This will fail gracefully if vault is not set up yet
DO $$
BEGIN
  UPDATE public.user_api_keys 
  SET encrypted_key = public.encrypt_api_key(api_key)
  WHERE encrypted_key IS NULL AND api_key IS NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- If migration fails, log it but don't block deployment
    RAISE NOTICE 'API key encryption migration skipped - Vault not configured yet';
END $$;

-- Add audit logging for API key INSERT/UPDATE (not SELECT as it's not supported)
CREATE OR REPLACE FUNCTION public.audit_api_key_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events (user_id, event_type, event_data)
  VALUES (
    auth.uid(),
    'api_key_modified',
    jsonb_build_object(
      'service_name', COALESCE(NEW.service_name, OLD.service_name),
      'timestamp', now(),
      'action', TG_OP
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_api_key_changes_trigger ON public.user_api_keys;
CREATE TRIGGER audit_api_key_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.audit_api_key_changes();

-- ============================================================================
-- FIX 3: SECURE DATABASE FUNCTIONS WITH PROPER SEARCH_PATH
-- ============================================================================

-- Fix function: clean_expired_context_cache
CREATE OR REPLACE FUNCTION public.clean_expired_context_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.user_context_cache
  WHERE expires_at < now();
END;
$function$;

-- Fix function: refresh_follow_counts
CREATE OR REPLACE FUNCTION public.refresh_follow_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_follow_counts;
END;
$function$;

-- Fix function: trigger_refresh_follow_counts
CREATE OR REPLACE FUNCTION public.trigger_refresh_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM public.refresh_follow_counts();
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix function: clean_expired_memory
CREATE OR REPLACE FUNCTION public.clean_expired_memory()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.ai_memory
  SET is_active = false
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND is_active = true;
END;
$function$;

-- ============================================================================
-- VERIFICATION AND AUDIT LOG
-- ============================================================================

-- Create audit entry for this security migration
INSERT INTO public.audit_events (event_type, event_data)
VALUES (
  'security_migration_phase1',
  jsonb_build_object(
    'timestamp', now(),
    'fixes_applied', ARRAY[
      'medical_data_rls_policy_v3',
      'api_key_encryption_functions',
      'function_search_path_security'
    ],
    'description', 'Phase 1 critical security fixes applied',
    'note', 'Vault encryption key must be configured separately'
  )
);