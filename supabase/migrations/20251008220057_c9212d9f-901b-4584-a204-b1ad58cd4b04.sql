-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('lab_test', 'wellness_service', 'provider_session', 'product', 'deal')),
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  item_price NUMERIC(10,2) NOT NULL,
  item_image_url TEXT,
  item_metadata JSONB DEFAULT '{}'::jsonb,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checkout_sessions table
CREATE TABLE public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'canceled', 'expired')),
  total_amount NUMERIC(10,2) NOT NULL,
  cart_snapshot JSONB NOT NULL,
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cart_items
CREATE POLICY "Users can manage their own cart items"
ON public.cart_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for checkout_sessions
CREATE POLICY "Users can view their own checkout sessions"
ON public.checkout_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checkout sessions"
ON public.checkout_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update checkout sessions"
ON public.checkout_sessions
FOR UPDATE
USING (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_cart_updated_at();

CREATE TRIGGER update_checkout_sessions_updated_at
BEFORE UPDATE ON public.checkout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_cart_updated_at();

-- Create index for faster queries
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_checkout_sessions_user_id ON public.checkout_sessions(user_id);
CREATE INDEX idx_checkout_sessions_stripe_id ON public.checkout_sessions(stripe_session_id);