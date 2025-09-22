-- Clean up stuck pending transactions older than 5 minutes
UPDATE public.wallet_transactions 
SET status = 'failed', 
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('failed_reason', 'timeout_cleanup', 'cleaned_up_at', now())
WHERE status = 'pending' 
AND created_at < now() - interval '5 minutes';

-- Add indices for better performance on transaction queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status_created ON public.wallet_transactions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_status ON public.wallet_transactions(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_to_user_status ON public.wallet_transactions(to_user_id, status);

-- Function to automatically clean up abandoned transactions
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

-- Create a trigger to prevent creation of pending transactions in the future
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

-- Apply the trigger to wallet_transactions
DROP TRIGGER IF EXISTS prevent_pending_transactions_trigger ON public.wallet_transactions;
CREATE TRIGGER prevent_pending_transactions_trigger
  BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_pending_transactions();