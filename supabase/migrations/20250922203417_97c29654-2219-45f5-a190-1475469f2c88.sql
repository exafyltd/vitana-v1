-- Fix search path for functions to address security warning
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark transactions as failed if they've been pending for more than 5 minutes
  UPDATE public.wallet_transactions 
  SET status = 'failed',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'failed_reason', 'abandoned_timeout',
        'auto_failed_at', now()
      )
  WHERE status = 'pending' 
  AND created_at < now() - interval '5 minutes';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_pending_transactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If someone tries to create a pending transaction, set it to processing instead
  IF NEW.status = 'pending' THEN
    NEW.status = 'processing';
  END IF;
  RETURN NEW;
END;
$$;