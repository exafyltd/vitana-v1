-- Create atomic exchange and send function
CREATE OR REPLACE FUNCTION public.process_wallet_exchange_and_send(
  p_from_user_id uuid,
  p_to_user_id uuid, 
  p_from_currency text,
  p_to_currency text,
  p_amount numeric,
  p_exchange_rate numeric
)
RETURNS TABLE(
  exchange_transaction_id uuid,
  transfer_transaction_id uuid,
  from_balance numeric,
  to_balance numeric,
  net_converted_amount numeric
)
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
  
  -- Calculate fees and conversions
  v_exchange_fee := ROUND(p_amount * 0.01, 2); -- 1% exchange fee
  v_converted_amount := ROUND((p_amount - v_exchange_fee) * p_exchange_rate, 2);
  v_transfer_fee := ROUND(v_converted_amount * 0.005, 2); -- 0.5% transfer fee
  v_net_amount := v_converted_amount - v_transfer_fee;
  
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
  
  -- 2. Credit converted currency to sender (intermediate step for exchange)
  UPDATE public.user_wallets 
  SET balance = balance + v_converted_amount, updated_at = NOW()
  WHERE user_id = p_from_user_id AND currency_type = v_to_currency;
  
  -- 3. Debit converted currency from sender 
  UPDATE public.user_wallets 
  SET balance = balance - v_converted_amount, updated_at = NOW()
  WHERE user_id = p_from_user_id AND currency_type = v_to_currency;
  
  -- 4. Credit net amount to recipient
  UPDATE public.user_wallets 
  SET balance = balance + v_net_amount, updated_at = NOW()
  WHERE user_id = p_to_user_id AND currency_type = v_to_currency;
  
  -- Get updated balances
  SELECT balance INTO v_from_balance FROM public.user_wallets 
  WHERE user_id = p_from_user_id AND currency_type = v_from_currency;
  
  SELECT balance INTO v_to_balance FROM public.user_wallets 
  WHERE user_id = p_to_user_id AND currency_type = v_to_currency;
  
  -- 5. Record exchange transaction
  INSERT INTO public.wallet_transactions (
    from_user_id, to_user_id, amount, exchange_rate, fees, status,
    transaction_type, from_currency, to_currency, metadata
  ) VALUES (
    p_from_user_id, p_from_user_id, p_amount, p_exchange_rate, v_exchange_fee, 'completed',
    'exchange', v_from_currency, v_to_currency,
    jsonb_build_object(
      'converted_amount', v_converted_amount,
      'net_amount', v_converted_amount,
      'processed_at', NOW()
    )
  ) RETURNING id INTO v_exchange_transaction_id;
  
  -- 6. Record transfer transaction  
  INSERT INTO public.wallet_transactions (
    from_user_id, to_user_id, amount, fees, status,
    transaction_type, from_currency, to_currency, metadata
  ) VALUES (
    p_from_user_id, p_to_user_id, v_converted_amount, v_transfer_fee, 'completed',
    'transfer', v_to_currency, v_to_currency,
    jsonb_build_object(
      'net_amount', v_net_amount,
      'exchange_transaction_id', v_exchange_transaction_id,
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