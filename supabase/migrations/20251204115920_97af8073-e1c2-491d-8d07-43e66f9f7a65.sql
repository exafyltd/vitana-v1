
-- Event Ticket Types - Define ticket tiers per event
CREATE TABLE public.event_ticket_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.global_community_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  quantity_available INTEGER NOT NULL DEFAULT 100,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  sale_start_date TIMESTAMP WITH TIME ZONE,
  sale_end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event Ticket Purchases - Track purchased tickets
CREATE TABLE public.event_ticket_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.global_community_events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.event_ticket_types(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id),
  buyer_email TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  qr_code_token TEXT NOT NULL UNIQUE,
  ticket_number TEXT NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES auth.users(id),
  refunded_at TIMESTAMP WITH TIME ZONE,
  refund_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event Ticket Scans - Track check-ins for validation
CREATE TABLE public.event_ticket_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_purchase_id UUID NOT NULL REFERENCES public.event_ticket_purchases(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES auth.users(id),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scan_location TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  rejection_reason TEXT,
  device_info JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.event_ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_ticket_types
CREATE POLICY "Anyone can view active ticket types"
ON public.event_ticket_types
FOR SELECT
USING (is_active = true);

CREATE POLICY "Event creators can manage ticket types"
ON public.event_ticket_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.global_community_events e
    WHERE e.id = event_ticket_types.event_id
    AND e.created_by = auth.uid()
  )
);

-- RLS Policies for event_ticket_purchases
CREATE POLICY "Buyers can view their own purchases"
ON public.event_ticket_purchases
FOR SELECT
USING (buyer_id = auth.uid());

CREATE POLICY "Event organizers can view all purchases for their events"
ON public.event_ticket_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.global_community_events e
    WHERE e.id = event_ticket_purchases.event_id
    AND e.created_by = auth.uid()
  )
);

CREATE POLICY "System can insert purchases"
ON public.event_ticket_purchases
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update purchases"
ON public.event_ticket_purchases
FOR UPDATE
USING (true);

-- RLS Policies for event_ticket_scans
CREATE POLICY "Event organizers can manage scans"
ON public.event_ticket_scans
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.event_ticket_purchases p
    JOIN public.global_community_events e ON e.id = p.event_id
    WHERE p.id = event_ticket_scans.ticket_purchase_id
    AND e.created_by = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_ticket_types_event_id ON public.event_ticket_types(event_id);
CREATE INDEX idx_ticket_purchases_event_id ON public.event_ticket_purchases(event_id);
CREATE INDEX idx_ticket_purchases_buyer_id ON public.event_ticket_purchases(buyer_id);
CREATE INDEX idx_ticket_purchases_qr_token ON public.event_ticket_purchases(qr_code_token);
CREATE INDEX idx_ticket_purchases_status ON public.event_ticket_purchases(status);
CREATE INDEX idx_ticket_scans_purchase_id ON public.event_ticket_scans(ticket_purchase_id);

-- Function to generate unique ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  ticket_num TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.event_ticket_purchases;
  ticket_num := 'VTN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 6, '0');
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
BEFORE INSERT ON public.event_ticket_purchases
FOR EACH ROW
EXECUTE FUNCTION set_ticket_number();

-- Function to update quantity_sold on ticket types
CREATE OR REPLACE FUNCTION update_ticket_quantity_sold()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    UPDATE public.event_ticket_types
    SET quantity_sold = quantity_sold + NEW.quantity
    WHERE id = NEW.ticket_type_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    UPDATE public.event_ticket_types
    SET quantity_sold = quantity_sold + NEW.quantity
    WHERE id = NEW.ticket_type_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status = 'refunded' THEN
    UPDATE public.event_ticket_types
    SET quantity_sold = quantity_sold - NEW.quantity
    WHERE id = NEW.ticket_type_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quantity_sold
AFTER INSERT OR UPDATE ON public.event_ticket_purchases
FOR EACH ROW
EXECUTE FUNCTION update_ticket_quantity_sold();

-- Function to get public ticket purchase details (for QR validation)
CREATE OR REPLACE FUNCTION get_ticket_by_qr_token(token TEXT)
RETURNS TABLE (
  id UUID,
  event_id UUID,
  event_title TEXT,
  event_start_time TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  event_image_url TEXT,
  ticket_type_name TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  quantity INTEGER,
  ticket_number TEXT,
  status TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.event_id,
    e.title as event_title,
    e.start_time as event_start_time,
    e.location as event_location,
    e.image_url as event_image_url,
    t.name as ticket_type_name,
    p.buyer_name,
    p.buyer_email,
    p.quantity,
    p.ticket_number,
    p.status,
    p.checked_in_at
  FROM public.event_ticket_purchases p
  JOIN public.global_community_events e ON e.id = p.event_id
  JOIN public.event_ticket_types t ON t.id = p.ticket_type_id
  WHERE p.qr_code_token = token;
END;
$$ LANGUAGE plpgsql;
