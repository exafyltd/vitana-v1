-- Core package definition
CREATE TABLE public.business_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Pricing structure
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  original_price NUMERIC,
  
  -- Package type: bundle (one-time), subscription (recurring), program (time-bound journey)
  package_type TEXT NOT NULL DEFAULT 'bundle' CHECK (package_type IN ('bundle', 'subscription', 'program')),
  
  -- Subscription-specific
  billing_interval TEXT CHECK (billing_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  
  -- Program-specific
  duration_weeks INTEGER,
  start_date TIMESTAMPTZ,
  
  -- Validity: how long after purchase items can be redeemed
  validity_days INTEGER DEFAULT 180,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items included in packages (polymorphic)
CREATE TABLE public.package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.business_packages(id) ON DELETE CASCADE,
  
  -- What type of item
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'event', 'access', 'digital_asset')),
  
  -- References (one will be populated based on item_type)
  event_id UUID REFERENCES public.global_community_events(id) ON DELETE SET NULL,
  
  -- For custom/inline items
  item_title TEXT,
  item_description TEXT,
  item_duration_min INTEGER,
  item_value NUMERIC DEFAULT 0,
  
  -- Quantity included
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Access-specific
  access_type TEXT,
  access_duration_days INTEGER,
  
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase tracking
CREATE TABLE public.package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.business_packages(id),
  buyer_id UUID REFERENCES auth.users(id),
  
  -- Guest checkout support
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  
  -- Payment
  amount_paid NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'refunded')),
  
  -- Validity window
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Redemption tracking for items
CREATE TABLE public.package_item_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.package_purchases(id) ON DELETE CASCADE,
  package_item_id UUID NOT NULL REFERENCES public.package_items(id) ON DELETE CASCADE,
  
  -- Track which instance (for quantity > 1)
  redemption_number INTEGER NOT NULL DEFAULT 1,
  
  -- Booking details
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Link to actual booking/ticket if applicable
  ticket_purchase_id UUID REFERENCES public.event_ticket_purchases(id),
  
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'scheduled', 'completed', 'expired', 'cancelled')),
  
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_item_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_packages
CREATE POLICY "Users can view published packages"
ON public.business_packages FOR SELECT
USING (status = 'published' OR creator_id = auth.uid());

CREATE POLICY "Users can create their own packages"
ON public.business_packages FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own packages"
ON public.business_packages FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own packages"
ON public.business_packages FOR DELETE
USING (auth.uid() = creator_id);

-- RLS Policies for package_items
CREATE POLICY "Users can view items of visible packages"
ON public.package_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.business_packages bp 
  WHERE bp.id = package_id 
  AND (bp.status = 'published' OR bp.creator_id = auth.uid())
));

CREATE POLICY "Users can manage items of their packages"
ON public.package_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.business_packages bp 
  WHERE bp.id = package_id AND bp.creator_id = auth.uid()
));

-- RLS Policies for package_purchases
CREATE POLICY "Users can view their own purchases"
ON public.package_purchases FOR SELECT
USING (buyer_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.business_packages bp 
  WHERE bp.id = package_id AND bp.creator_id = auth.uid()
));

CREATE POLICY "Users can create purchases"
ON public.package_purchases FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update purchases"
ON public.package_purchases FOR UPDATE
USING (true);

-- RLS Policies for package_item_redemptions
CREATE POLICY "Users can view their redemptions"
ON public.package_item_redemptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.package_purchases pp 
  WHERE pp.id = purchase_id 
  AND (pp.buyer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.business_packages bp 
    WHERE bp.id = pp.package_id AND bp.creator_id = auth.uid()
  ))
));

CREATE POLICY "Users can manage their redemptions"
ON public.package_item_redemptions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.package_purchases pp 
  WHERE pp.id = purchase_id AND pp.buyer_id = auth.uid()
));

-- Indexes for performance
CREATE INDEX idx_business_packages_creator ON public.business_packages(creator_id);
CREATE INDEX idx_business_packages_status ON public.business_packages(status);
CREATE INDEX idx_package_items_package ON public.package_items(package_id);
CREATE INDEX idx_package_purchases_buyer ON public.package_purchases(buyer_id);
CREATE INDEX idx_package_purchases_package ON public.package_purchases(package_id);
CREATE INDEX idx_package_redemptions_purchase ON public.package_item_redemptions(purchase_id);

-- Trigger for updated_at
CREATE TRIGGER update_business_packages_updated_at
BEFORE UPDATE ON public.business_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_package_purchases_updated_at
BEFORE UPDATE ON public.package_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();