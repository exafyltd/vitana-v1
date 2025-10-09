-- Create CJ products table to cache product data locally
CREATE TABLE IF NOT EXISTS public.cj_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cj_product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  list_price NUMERIC(10,2),
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  brand TEXT,
  variants JSONB DEFAULT '[]'::jsonb,
  inventory_count INTEGER DEFAULT 0,
  weight NUMERIC(10,2),
  dimensions JSONB,
  shipping_info JSONB,
  rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CJ orders table to track orders placed with CJ
CREATE TABLE IF NOT EXISTS public.cj_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  checkout_session_id UUID REFERENCES public.checkout_sessions(id),
  cj_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  tracking_number TEXT,
  carrier TEXT,
  order_items JSONB NOT NULL,
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create CJ webhook logs table
CREATE TABLE IF NOT EXISTS public.cj_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add external product reference columns to cart_items
ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS external_product_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT DEFAULT 'cj';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cj_products_cj_product_id ON public.cj_products(cj_product_id);
CREATE INDEX IF NOT EXISTS idx_cj_products_category ON public.cj_products(category);
CREATE INDEX IF NOT EXISTS idx_cj_products_is_active ON public.cj_products(is_active);
CREATE INDEX IF NOT EXISTS idx_cj_orders_user_id ON public.cj_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_cj_orders_status ON public.cj_orders(status);
CREATE INDEX IF NOT EXISTS idx_cj_orders_cj_order_id ON public.cj_orders(cj_order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_external ON public.cart_items(external_product_id, external_source);

-- Enable RLS on new tables
ALTER TABLE public.cj_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cj_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cj_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cj_products (public read access)
CREATE POLICY "Anyone can view active CJ products"
  ON public.cj_products FOR SELECT
  USING (is_active = true);

-- RLS Policies for cj_orders (users can only see their own orders)
CREATE POLICY "Users can view their own CJ orders"
  ON public.cj_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CJ orders"
  ON public.cj_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for webhook logs (admin only)
CREATE POLICY "Only admins can view webhook logs"
  ON public.cj_webhook_logs FOR SELECT
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cj_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cj_products_updated_at
  BEFORE UPDATE ON public.cj_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cj_updated_at();

CREATE TRIGGER update_cj_orders_updated_at
  BEFORE UPDATE ON public.cj_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cj_updated_at();