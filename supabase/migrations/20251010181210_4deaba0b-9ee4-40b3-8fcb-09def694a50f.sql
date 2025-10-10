-- Step 1: Drop the old check constraint
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS user_wallets_currency_type_check;

-- Step 2: Add new check constraint allowing VTNA (and temporarily VTN for migration)
ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_currency_type_check 
CHECK (currency_type IN ('USD', 'VTN', 'VTNA', 'CREDITS'));

-- Step 3: Rename VTN to VTNA in user_wallets
UPDATE user_wallets 
SET currency_type = 'VTNA' 
WHERE currency_type = 'VTN';

-- Step 4: Update wallet_transactions
UPDATE wallet_transactions 
SET from_currency = 'VTNA' 
WHERE from_currency = 'VTN';

UPDATE wallet_transactions 
SET to_currency = 'VTNA' 
WHERE to_currency = 'VTN';

-- Step 5: Update exchange_rates table if exists
UPDATE exchange_rates 
SET from_currency = 'VTNA' 
WHERE from_currency = 'VTN';

UPDATE exchange_rates 
SET to_currency = 'VTNA' 
WHERE to_currency = 'VTN';

-- Step 6: Update initialize_user_wallet function to use VTNA
CREATE OR REPLACE FUNCTION public.initialize_user_wallet(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default balances for all three currencies
  INSERT INTO public.user_wallets (user_id, currency_type, balance)
  VALUES 
    (user_id_param, 'USD', 1000.00),
    (user_id_param, 'VTNA', 1000.00),
    (user_id_param, 'CREDITS', 1000.00)
  ON CONFLICT (user_id, currency_type) DO NOTHING;
END;
$function$;

-- Step 7: Remove VTN from constraint (only allow VTNA going forward)
ALTER TABLE user_wallets DROP CONSTRAINT user_wallets_currency_type_check;
ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_currency_type_check 
CHECK (currency_type IN ('USD', 'VTNA', 'CREDITS'));