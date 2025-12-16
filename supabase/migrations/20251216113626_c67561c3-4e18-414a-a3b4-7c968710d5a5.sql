-- RPC function to update package + replace items atomically
CREATE OR REPLACE FUNCTION public.update_package_with_items(
  p_package_id UUID,
  p_tenant_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_price_cents INTEGER DEFAULT 0,
  p_original_price_cents INTEGER DEFAULT NULL,
  p_package_type TEXT DEFAULT 'bundle',
  p_billing_interval TEXT DEFAULT NULL,
  p_duration_weeks INTEGER DEFAULT NULL,
  p_validity_days INTEGER DEFAULT 180,
  p_status TEXT DEFAULT 'draft',
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_creator_id UUID;
  v_item JSONB;
  v_sort_order INTEGER := 0;
BEGIN
  -- Verify ownership and tenant match
  SELECT creator_id INTO v_creator_id
  FROM public.business_packages
  WHERE id = p_package_id AND tenant_id = p_tenant_id;
  
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Package not found or tenant mismatch';
  END IF;
  
  IF v_creator_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: you do not own this package';
  END IF;

  -- Update package
  UPDATE public.business_packages SET
    title = p_title,
    description = p_description,
    image_url = p_image_url,
    price_cents = p_price_cents,
    original_price_cents = p_original_price_cents,
    package_type = p_package_type,
    billing_interval = p_billing_interval,
    duration_weeks = p_duration_weeks,
    validity_days = p_validity_days,
    status = p_status,
    updated_at = NOW()
  WHERE id = p_package_id AND tenant_id = p_tenant_id;

  -- Delete existing items
  DELETE FROM public.package_items WHERE package_id = p_package_id;

  -- Insert new items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.package_items (
      package_id,
      tenant_id,
      item_type,
      service_key,
      event_id,
      item_title,
      item_description,
      item_duration_min,
      item_value_cents,
      quantity,
      sort_order
    ) VALUES (
      p_package_id,
      p_tenant_id,
      COALESCE(v_item->>'item_type', 'service'),
      NULLIF(v_item->>'service_key', ''),
      NULLIF(v_item->>'event_id', ''),
      v_item->>'item_title',
      v_item->>'item_description',
      COALESCE((v_item->>'item_duration_min')::INTEGER, NULL),
      COALESCE((v_item->>'item_value_cents')::INTEGER, 0),
      COALESCE((v_item->>'quantity')::INTEGER, 1),
      v_sort_order
    );
    v_sort_order := v_sort_order + 1;
  END LOOP;

  RETURN p_package_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_package_with_items TO authenticated;