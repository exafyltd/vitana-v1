-- Normalize currency parameters to uppercase within wallet RPC functions

-- Update process_wallet_transfer to uppercase currency
CREATE OR REPLACE FUNCTION public.process_wallet_transfer(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_currency text,
  p_amount numeric
)
RETURNS TABLE(transaction_id uuid, from_balance numeric, to_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_id uuid;
  v_fee_amount numeric;
  v_net_amount numeric;
  v_from_balance numeric;
  v_to_balance numeric;
  v_currency text := UPPER(p_currency);
BEGIN
  -- Calculate fee (0.5%)
  v_fee_amount := ROUND(p_amount * 0.005, 2);
  v_net_amount := p_amount - v_fee_amount;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;
  
  -- Initialize wallets if they don't exist
  PERFORM public.initialize_user_wallet(p_from_user_id);
  PERFORM public.initialize_user_wallet(p_to_user_id);
  
  -- Get current balances and validate sender has enough funds
  SELECT balance INTO v_from_balance FROM public.user_wallets 
  WHERE user_id = p_from_user_id AND currency_type = v_currency;
  
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_from_balance, p_amount;
  END IF;
  
  -- Debit sender
  UPDATE public.user_wallets 
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_from_user_id AND currency_type = v_currency;
  
  -- Credit recipient (net amount after fees)
  UPDATE public.user_wallets 
  SET balance = balance + v_net_amount, updated_at = NOW()
  WHERE user_id = p_to_user_id AND currency_type = v_currency;
  
  -- Get updated balances
  SELECT balance INTO v_from_balance FROM public.user_wallets 
  WHERE user_id = p_from_user_id AND currency_type = v_currency;
  
  SELECT balance INTO v_to_balance FROM public.user_wallets 
  WHERE user_id = p_to_user_id AND currency_type = v_currency;
  
  -- Create completed transaction record
  INSERT INTO public.wallet_transactions (
    from_user_id, to_user_id, amount, fees, status, 
    transaction_type, from_currency, to_currency,
    metadata
  ) VALUES (
    p_from_user_id, p_to_user_id, p_amount, v_fee_amount, 'completed',
    'transfer', v_currency, v_currency,
    jsonb_build_object(
      'net_amount', v_net_amount,
      'processed_at', NOW()
    )
  ) RETURNING id INTO v_transaction_id;
  
  -- Return results
  RETURN QUERY SELECT v_transaction_id, v_from_balance, v_to_balance;
END;
$$;

-- Update process_wallet_exchange to uppercase currency params
CREATE OR REPLACE FUNCTION public.process_wallet_exchange(
  p_user_id uuid,
  p_from_currency text,
  p_to_currency text,
  p_amount numeric,
  p_exchange_rate numeric
)
RETURNS TABLE(transaction_id uuid, from_balance numeric, to_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Calculate exchange fee (1%) and converted amount
  v_exchange_fee := ROUND(p_amount * 0.01, 2);
  v_converted_amount := ROUND((p_amount - v_exchange_fee) * p_exchange_rate, 2);
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
  
  -- Credit to currency (net amount after fees and conversion)
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
      'processed_at', NOW()
    )
  ) RETURNING id INTO v_transaction_id;
  
  -- Return results
  RETURN QUERY SELECT v_transaction_id, v_from_balance, v_to_balance;
END;
$$;