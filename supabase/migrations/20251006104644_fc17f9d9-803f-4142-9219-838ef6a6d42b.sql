-- ============================================================================
-- PHASE 1: CRITICAL SECURITY FIXES (FINAL - Only missing pieces)
-- ============================================================================

-- Note: Profiles RLS policy v3 already created, skipping

-- ============================================================================
-- FIX 2: ENCRYPT API KEYS (Complete implementation)
-- ============================================================================

-- Ensure encrypted_key column exists
ALTER TABLE public.user_api_keys 
ADD COLUMN IF NOT EXISTS encrypted_key TEXT;

-- Encryption and decryption functions already created

-- Add audit logging for API key changes
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
-- NEXT STEPS FOR USER
-- ============================================================================

-- Add reminder comment for Vault setup
COMMENT ON FUNCTION public.encrypt_api_key IS 
'Encrypts API keys using Supabase Vault. Requires vault secret named "api_key_encryption_key" to be configured in Supabase dashboard.';

COMMENT ON FUNCTION public.decrypt_api_key IS 
'Decrypts API keys using Supabase Vault. Requires vault secret named "api_key_encryption_key" to be configured in Supabase dashboard.';