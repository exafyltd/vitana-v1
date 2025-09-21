-- Create user wallets table with default balances for all three currencies
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('USD', 'VTN', 'CREDITS')),
  balance DECIMAL(15,2) NOT NULL DEFAULT 1000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, currency_type)
);

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Create policies for user wallet access
CREATE POLICY "Users can view their own wallets" 
ON public.user_wallets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" 
ON public.user_wallets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create transaction records table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID,
  to_user_id UUID,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'exchange', 'reward', 'purchase')),
  from_currency TEXT,
  to_currency TEXT,
  amount DECIMAL(15,2) NOT NULL,
  exchange_rate DECIMAL(10,4),
  fees DECIMAL(15,2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transaction access
CREATE POLICY "Users can view their own transactions" 
ON public.wallet_transactions 
FOR SELECT 
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create transactions from their account" 
ON public.wallet_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = from_user_id);

-- Create exchange rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  change_24h DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create function to initialize user wallet with default balances
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user balance for a specific currency
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user balance
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial exchange rates
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, trend, change_24h) VALUES
  ('USD', 'VTN', 2.45, 'up', 1.2),
  ('VTN', 'USD', 0.408, 'up', -1.2),
  ('VTN', 'CREDITS', 1.05, 'stable', 0.0),
  ('CREDITS', 'VTN', 0.952, 'stable', 0.0),
  ('USD', 'CREDITS', 2.57, 'up', 1.2),
  ('CREDITS', 'USD', 0.389, 'up', -1.2)
ON CONFLICT DO NOTHING;

-- Create trigger to update timestamp
CREATE OR REPLACE FUNCTION public.update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_wallets_timestamp
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_timestamp();

CREATE TRIGGER update_wallet_transactions_timestamp
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_timestamp();