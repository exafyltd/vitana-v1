-- =============================================
-- MAXINA GIFT VOUCHER SYSTEM - DATABASE SCHEMA
-- =============================================

-- 1. Create vouchers table
CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'maxina_event_entry',
  tier text NOT NULL CHECK (tier IN ('experience', 'exclusive')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'redeemed', 'expired', 'void')),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_event_id uuid,
  redeemed_by_staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create voucher_orders table
CREATE TABLE public.voucher_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  buyer_user_id uuid,
  buyer_email text NOT NULL,
  buyer_name text,
  provider text NOT NULL DEFAULT 'stripe',
  checkout_session_id text UNIQUE,
  payment_intent_id text,
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create voucher_redemptions table
CREATE TABLE public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  staff_user_id uuid NOT NULL,
  device_id text,
  status text NOT NULL CHECK (status IN ('success', 'rejected')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create indexes for performance
CREATE INDEX idx_vouchers_tenant_id ON public.vouchers(tenant_id);
CREATE INDEX idx_vouchers_status ON public.vouchers(status);
CREATE INDEX idx_voucher_orders_tenant_id ON public.voucher_orders(tenant_id);
CREATE INDEX idx_voucher_orders_buyer_user_id ON public.voucher_orders(buyer_user_id);
CREATE INDEX idx_voucher_orders_buyer_email ON public.voucher_orders(buyer_email);
CREATE INDEX idx_voucher_orders_checkout_session_id ON public.voucher_orders(checkout_session_id);
CREATE INDEX idx_voucher_redemptions_voucher_id ON public.voucher_redemptions(voucher_id);

-- 5. Enable RLS on all tables
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for vouchers
CREATE POLICY "Users can view their own vouchers through orders"
  ON public.vouchers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voucher_orders vo
      WHERE vo.voucher_id = vouchers.id
      AND (vo.buyer_user_id = auth.uid() OR vo.buyer_email = auth.email())
    )
  );

CREATE POLICY "Service role can manage vouchers"
  ON public.vouchers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7. RLS Policies for voucher_orders
CREATE POLICY "Users can view their own voucher orders"
  ON public.voucher_orders FOR SELECT
  USING (buyer_user_id = auth.uid() OR buyer_email = auth.email());

CREATE POLICY "Service role can manage voucher orders"
  ON public.voucher_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 8. RLS Policies for voucher_redemptions (using correct enum values: admin, staff)
CREATE POLICY "Staff can view redemptions for their tenant"
  ON public.voucher_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.tenant_id = voucher_redemptions.tenant_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff can create redemptions"
  ON public.voucher_redemptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.tenant_id = voucher_redemptions.tenant_id
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Service role can manage redemptions"
  ON public.voucher_redemptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 9. Create storage bucket for voucher PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voucher-pdfs',
  'voucher-pdfs',
  false,
  5242880,
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 10. Storage policies for voucher-pdfs bucket
CREATE POLICY "Users can download their own voucher PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voucher-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.voucher_orders vo
      WHERE vo.pdf_path = name
      AND (vo.buyer_user_id = auth.uid() OR vo.buyer_email = auth.email())
    )
  );

CREATE POLICY "Service role can manage voucher PDFs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'voucher-pdfs' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'voucher-pdfs' AND auth.role() = 'service_role');

-- 11. Create atomic redemption function
CREATE OR REPLACE FUNCTION public.redeem_voucher(
  p_voucher_id uuid,
  p_tenant_id uuid,
  p_event_id uuid,
  p_staff_user_id uuid,
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher record;
  v_redemption_id uuid;
BEGIN
  -- Lock the voucher row to prevent race conditions
  SELECT id, status, expires_at, tier, tenant_id
  INTO v_voucher
  FROM public.vouchers
  WHERE id = p_voucher_id
  FOR UPDATE;

  -- Check if voucher exists
  IF v_voucher IS NULL THEN
    INSERT INTO public.voucher_redemptions (tenant_id, voucher_id, event_id, staff_user_id, device_id, status, reason)
    VALUES (p_tenant_id, p_voucher_id, p_event_id, p_staff_user_id, p_device_id, 'rejected', 'VOUCHER_NOT_FOUND');
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VOUCHER_NOT_FOUND',
      'message', 'Voucher not found'
    );
  END IF;

  -- Check tenant match
  IF v_voucher.tenant_id != p_tenant_id THEN
    INSERT INTO public.voucher_redemptions (tenant_id, voucher_id, event_id, staff_user_id, device_id, status, reason)
    VALUES (p_tenant_id, p_voucher_id, p_event_id, p_staff_user_id, p_device_id, 'rejected', 'TENANT_MISMATCH');
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TENANT_MISMATCH',
      'message', 'Voucher belongs to a different tenant'
    );
  END IF;

  -- Check if already redeemed
  IF v_voucher.status = 'redeemed' THEN
    INSERT INTO public.voucher_redemptions (tenant_id, voucher_id, event_id, staff_user_id, device_id, status, reason)
    VALUES (p_tenant_id, p_voucher_id, p_event_id, p_staff_user_id, p_device_id, 'rejected', 'ALREADY_REDEEMED');
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_REDEEMED',
      'message', 'Voucher has already been redeemed'
    );
  END IF;

  -- Check if expired
  IF v_voucher.expires_at < now() THEN
    UPDATE public.vouchers SET status = 'expired', updated_at = now() WHERE id = p_voucher_id;
    
    INSERT INTO public.voucher_redemptions (tenant_id, voucher_id, event_id, staff_user_id, device_id, status, reason)
    VALUES (p_tenant_id, p_voucher_id, p_event_id, p_staff_user_id, p_device_id, 'rejected', 'EXPIRED');
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EXPIRED',
      'message', 'Voucher has expired'
    );
  END IF;

  -- Check if voucher is active
  IF v_voucher.status != 'active' THEN
    INSERT INTO public.voucher_redemptions (tenant_id, voucher_id, event_id, staff_user_id, device_id, status, reason)
    VALUES (p_tenant_id, p_voucher_id, p_event_id, p_staff_user_id, p_device_id, 'rejected', 'INVALID_STATUS');
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', 'Voucher is not active (status: ' || v_voucher.status || ')'
    );
  END IF;

  -- All checks passed - redeem the voucher
  UPDATE public.vouchers
  SET 
    status = 'redeemed',
    redeemed_at = now(),
    redeemed_event_id = p_event_id,
    redeemed_by_staff_id = p_staff_user_id,
    updated_at = now()
  WHERE id = p_voucher_id;

  -- Record successful redemption
  INSERT INTO public.voucher_redemptions (tenant_id, voucher_id, event_id, staff_user_id, device_id, status, reason)
  VALUES (p_tenant_id, p_voucher_id, p_event_id, p_staff_user_id, p_device_id, 'success', NULL)
  RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'voucher_id', p_voucher_id,
    'tier', v_voucher.tier,
    'event_id', p_event_id,
    'redeemed_at', now()
  );
END;
$$;

-- 12. Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_voucher_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Add triggers for updated_at
CREATE TRIGGER vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_voucher_updated_at();

CREATE TRIGGER voucher_orders_updated_at
  BEFORE UPDATE ON public.voucher_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_voucher_updated_at();