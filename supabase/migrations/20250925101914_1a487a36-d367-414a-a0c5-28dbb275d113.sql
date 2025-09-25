-- Fix the process_wallet_transfer function to eliminate fees
CREATE OR REPLACE FUNCTION public.process_wallet_transfer(p_from_user_id uuid, p_to_user_id uuid, p_currency text, p_amount numeric)
 RETURNS TABLE(transaction_id uuid, from_balance numeric, to_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction_id uuid;
  v_fee_amount numeric;
  v_net_amount numeric;
  v_from_balance numeric;
  v_to_balance numeric;
  v_currency text := UPPER(p_currency);
BEGIN
  -- No fees in Vitana System
  v_fee_amount := 0;
  v_net_amount := p_amount;
  
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
  
  -- Debit sender (full amount)
  UPDATE public.user_wallets 
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_from_user_id AND currency_type = v_currency;
  
  -- Credit recipient (full amount, no fees deducted)
  UPDATE public.user_wallets 
  SET balance = balance + v_net_amount, updated_at = NOW()
  WHERE user_id = p_to_user_id AND currency_type = v_currency;
  
  -- Get updated balances
  SELECT balance INTO v_from_balance FROM public.user_wallets 
  WHERE user_id = p_from_user_id AND currency_type = v_currency;
  
  SELECT balance INTO v_to_balance FROM public.user_wallets 
  WHERE user_id = p_to_user_id AND currency_type = v_currency;
  
  -- Create completed transaction record with zero fees
  INSERT INTO public.wallet_transactions (
    from_user_id, to_user_id, amount, fees, status, 
    transaction_type, from_currency, to_currency,
    metadata
  ) VALUES (
    p_from_user_id, p_to_user_id, p_amount, v_fee_amount, 'completed',
    'transfer', v_currency, v_currency,
    jsonb_build_object(
      'net_amount', v_net_amount,
      'vitana_system', true,
      'processed_at', NOW()
    )
  ) RETURNING id INTO v_transaction_id;
  
  -- Return results
  RETURN QUERY SELECT v_transaction_id, v_from_balance, v_to_balance;
END;
$function$;