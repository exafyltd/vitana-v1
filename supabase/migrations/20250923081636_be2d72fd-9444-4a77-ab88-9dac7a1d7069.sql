-- Update exchange rates for Vitana System
-- First, deactivate old rates
UPDATE public.exchange_rates SET is_active = false WHERE is_active = true;

-- Insert new Vitana System exchange rates with no fees
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, trend, change_24h, is_active) VALUES
-- USD to VTN: 1 USD = 100 VTN (VTN growing)
('USD', 'VTN', 100.0, 'up', 2.5, true),
-- VTN to USD: 1 VTN = 0.01 USD (VTN appreciating)
('VTN', 'USD', 0.01, 'up', 2.5, true),
-- VTN to Credits: 1 VTN = 1 Credit (perfect parity)
('VTN', 'CREDITS', 1.0, 'up', 1.8, true),
-- Credits to VTN: 1 Credit = 1 VTN (perfect parity)
('CREDITS', 'VTN', 1.0, 'up', 1.8, true),
-- USD to Credits: 1 USD = 100 Credits
('USD', 'CREDITS', 100.0, 'up', 2.2, true),
-- Credits to USD: 1 Credit = 0.01 USD
('CREDITS', 'USD', 0.01, 'up', 2.2, true)
ON CONFLICT (from_currency, to_currency) 
DO UPDATE SET 
  rate = EXCLUDED.rate,
  trend = EXCLUDED.trend,
  change_24h = EXCLUDED.change_24h,
  is_active = EXCLUDED.is_active;

-- Update wallet exchange function to remove fees for Vitana System
CREATE OR REPLACE FUNCTION public.process_wallet_exchange(p_user_id uuid, p_from_currency text, p_to_currency text, p_amount numeric, p_exchange_rate numeric)
RETURNS TABLE(transaction_id uuid, from_balance numeric, to_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction_id uuid;
  v_exchange_fee numeric;
  v_converted_amount numeric;
  v_net_amount numeric;
  v_from_balance numeric;
  v_to_balance numeric;
  v_from_currency text := UPPER(p_from_currency);
  v_to_currency text := UPPER(p_to_currency);
BEGIN
  -- No fees in Vitana System
  v_exchange_fee := 0;
  v_converted_amount := ROUND(p_amount * p_exchange_rate, 2);
  v_net_amount := v_converted_amount;
  
  -- Validate amount and rate
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Exchange amount must be positive';
  END IF;
  
  IF p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Exchange rate must be positive';
  END IF;
  
  -- Initialize wallet if it doesn't exist
  PERFORM public.initialize_user_wallet(p_user_id);
  
  -- Get current balance and validate sufficient funds
  SELECT balance INTO v_from_balance FROM public.user_wallets 
  WHERE user_id = p_user_id AND currency_type = v_from_currency;
  
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance for exchange. Current: %, Required: %', v_from_balance, p_amount;
  END IF;
  
  -- Debit from currency
  UPDATE public.user_wallets 
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND currency_type = v_from_currency;
  
  -- Credit to currency (full amount, no fees)
  UPDATE public.user_wallets 
  SET balance = balance + v_net_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND currency_type = v_to_currency;
  
  -- Get updated balances
  SELECT balance INTO v_from_balance FROM public.user_wallets 
  WHERE user_id = p_user_id AND currency_type = v_from_currency;
  
  SELECT balance INTO v_to_balance FROM public.user_wallets 
  WHERE user_id = p_user_id AND currency_type = v_to_currency;
  
  -- Create completed transaction record
  INSERT INTO public.wallet_transactions (
    from_user_id, to_user_id, amount, exchange_rate, fees, status,
    transaction_type, from_currency, to_currency,
    metadata
  ) VALUES (
    p_user_id, p_user_id, p_amount, p_exchange_rate, v_exchange_fee, 'completed',
    'exchange', v_from_currency, v_to_currency,
    jsonb_build_object(
      'converted_amount', v_converted_amount,
      'net_amount', v_net_amount,
      'vitana_system', true,
      'processed_at', NOW()
    )
  ) RETURNING id INTO v_transaction_id;
  
  -- Return results
  RETURN QUERY SELECT v_transaction_id, v_from_balance, v_to_balance;
END;
$function$;

-- Update exchange and send function to remove fees
CREATE OR REPLACE FUNCTION public.process_wallet_exchange_and_send(p_from_user_id uuid, p_to_user_id uuid, p_from_currency text, p_to_currency text, p_amount numeric, p_exchange_rate numeric)
RETURNS TABLE(exchange_transaction_id uuid, transfer_transaction_id uuid, from_balance numeric, to_balance numeric, net_converted_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exchange_transaction_id uuid;
  v_transfer_transaction_id uuid;
  v_exchange_fee numeric;
  v_transfer_fee numeric;
  v_converted_amount numeric;
  v_net_amount numeric;
  v_from_balance numeric;
  v_to_balance numeric;
  v_from_currency text := UPPER(p_from_currency);
  v_to_currency text := UPPER(p_to_currency);
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  IF p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Exchange rate must be positive';
  END IF;
  
  -- No fees in Vitana System
  v_exchange_fee := 0;
  v_converted_amount := ROUND(p_amount * p_exchange_rate, 2);
  v_transfer_fee := 0; -- No transfer fees either
  v_net_amount := v_converted_amount;
  
  -- Initialize wallets if they don't exist
  PERFORM public.initialize_user_wallet(p_from_user_id);
  PERFORM public.initialize_user_wallet(p_to_user_id);
  
  -- Check sender has sufficient balance
  SELECT balance INTO v_from_balance FROM public.user_wallets 
  WHERE user_id = p_from_user_id AND currency_type = v_from_currency;
  
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_from_balance, p_amount;
  END IF;
  
  -- ATOMIC TRANSACTION BEGINS HERE --
  
  -- 1. Debit original currency from sender
  UPDATE public.user_wallets 
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_from_user_id AND currency_type = v_from_currency;
  
  -- 2. Credit converted currency to recipient (full amount, no fees)
  UPDATE public.user_wallets 
  SET balance = balance + v_net_amount, updated_at = NOW()
  WHERE user_id = p_to_user_id AND currency_type = v_to_currency;
  
  -- Get updated balances
  SELECT balance INTO v_from_balance FROM public.user_wallets 
  WHERE user_id = p_from_user_id AND currency_type = v_from_currency;
  
  SELECT balance INTO v_to_balance FROM public.user_wallets 
  WHERE user_id = p_to_user_id AND currency_type = v_to_currency;
  
  -- 3. Record exchange transaction
  INSERT INTO public.wallet_transactions (
    from_user_id, to_user_id, amount, exchange_rate, fees, status,
    transaction_type, from_currency, to_currency, metadata
  ) VALUES (
    p_from_user_id, p_from_user_id, p_amount, p_exchange_rate, v_exchange_fee, 'completed',
    'exchange', v_from_currency, v_to_currency,
    jsonb_build_object(
      'converted_amount', v_converted_amount,
      'net_amount', v_converted_amount,
      'vitana_system', true,
      'processed_at', NOW()
    )
  ) RETURNING id INTO v_exchange_transaction_id;
  
  -- 4. Record transfer transaction  
  INSERT INTO public.wallet_transactions (
    from_user_id, to_user_id, amount, fees, status,
    transaction_type, from_currency, to_currency, metadata
  ) VALUES (
    p_from_user_id, p_to_user_id, v_converted_amount, v_transfer_fee, 'completed',
    'transfer', v_to_currency, v_to_currency,
    jsonb_build_object(
      'net_amount', v_net_amount,
      'exchange_transaction_id', v_exchange_transaction_id,
      'vitana_system', true,
      'processed_at', NOW()
    )
  ) RETURNING id INTO v_transfer_transaction_id;
  
  -- Return results
  RETURN QUERY SELECT 
    v_exchange_transaction_id,
    v_transfer_transaction_id,
    v_from_balance,
    v_to_balance,
    v_net_amount;
END;
$function$;