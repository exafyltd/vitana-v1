-- Create atomic increment_wallet_balance RPC function
-- This prevents race conditions by using INSERT ... ON CONFLICT DO UPDATE
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(
  p_user_id uuid,
  p_currency_type text,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_balance numeric;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  -- Atomic upsert - either insert new wallet or increment existing balance
  INSERT INTO public.user_wallets (user_id, currency_type, balance, updated_at)
  VALUES (p_user_id, UPPER(p_currency_type), p_amount, NOW())
  ON CONFLICT (user_id, currency_type)
  DO UPDATE SET 
    balance = user_wallets.balance + EXCLUDED.balance,
    updated_at = NOW()
  RETURNING balance INTO new_balance;
  
  RETURN new_balance;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, text, numeric) TO service_role;