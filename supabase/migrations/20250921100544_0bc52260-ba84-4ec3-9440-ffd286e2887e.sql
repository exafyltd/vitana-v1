-- Fix security issues from linter

-- Enable RLS on exchange_rates table (this was the ERROR issue)
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for exchange_rates
CREATE POLICY "Anyone can view active exchange rates" 
ON public.exchange_rates 
FOR SELECT 
USING (is_active = true);

-- Fix function search path issues by adding SET search_path
CREATE OR REPLACE FUNCTION public.initialize_user_wallet(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default balances for all three currencies
  INSERT INTO public.user_wallets (user_id, currency_type, balance)
  VALUES 
    (user_id_param, 'USD', 1000.00),
    (user_id_param, 'VTN', 1000.00),
    (user_id_param, 'CREDITS', 1000.00)
  ON CONFLICT (user_id, currency_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.get_user_balance(user_id_param UUID, currency_param TEXT)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  user_balance DECIMAL(15,2);
BEGIN
  SELECT balance INTO user_balance
  FROM public.user_wallets
  WHERE user_id = user_id_param AND currency_type = currency_param;
  
  IF user_balance IS NULL THEN
    -- Initialize wallet if it doesn't exist and return default balance
    PERFORM public.initialize_user_wallet(user_id_param);
    RETURN 1000.00;
  END IF;
  
  RETURN user_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_user_balance(
  user_id_param UUID, 
  currency_param TEXT, 
  amount_param DECIMAL(15,2),
  operation TEXT DEFAULT 'add'
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  new_balance DECIMAL(15,2);
  current_balance DECIMAL(15,2);
BEGIN
  -- Get current balance
  current_balance := public.get_user_balance(user_id_param, currency_param);
  
  -- Calculate new balance
  IF operation = 'add' THEN
    new_balance := current_balance + amount_param;
  ELSIF operation = 'subtract' THEN
    new_balance := current_balance - amount_param;
    -- Prevent negative balances
    IF new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', current_balance, amount_param;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid operation. Use add or subtract';
  END IF;
  
  -- Update the balance
  UPDATE public.user_wallets 
  SET balance = new_balance, updated_at = NOW()
  WHERE user_id = user_id_param AND currency_type = currency_param;
  
  -- If no rows updated, initialize wallet first
  IF NOT FOUND THEN
    PERFORM public.initialize_user_wallet(user_id_param);
    UPDATE public.user_wallets 
    SET balance = new_balance, updated_at = NOW()
    WHERE user_id = user_id_param AND currency_type = currency_param;
  END IF;
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';