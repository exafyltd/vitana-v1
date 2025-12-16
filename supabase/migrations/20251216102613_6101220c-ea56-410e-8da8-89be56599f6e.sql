-- ============================================================
-- VITANA-Ready Packages v1 Migration (Fixed)
-- Adds: tenant_id, service_key, cents pricing, restricted item types
-- ============================================================

-- 1. Add tenant_id to all package tables
ALTER TABLE business_packages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE package_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE package_purchases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE package_item_redemptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Create indexes for tenant_id
CREATE INDEX IF NOT EXISTS idx_business_packages_tenant ON business_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_package_items_tenant ON package_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_package_purchases_tenant ON package_purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_package_item_redemptions_tenant ON package_item_redemptions(tenant_id);

-- 2. Add service_key to package_items (no FK, references profile.services[key])
ALTER TABLE package_items ADD COLUMN IF NOT EXISTS service_key TEXT;

-- 3. Safe money conversion: Add _cents columns, backfill, drop old columns

-- business_packages: price -> price_cents
ALTER TABLE business_packages ADD COLUMN IF NOT EXISTS price_cents INTEGER;
UPDATE business_packages SET price_cents = ROUND(COALESCE(price, 0) * 100)::INTEGER WHERE price_cents IS NULL;
ALTER TABLE business_packages ALTER COLUMN price_cents SET DEFAULT 0;
ALTER TABLE business_packages ALTER COLUMN price_cents SET NOT NULL;

-- business_packages: original_price -> original_price_cents
ALTER TABLE business_packages ADD COLUMN IF NOT EXISTS original_price_cents INTEGER;
UPDATE business_packages SET original_price_cents = ROUND(original_price * 100)::INTEGER WHERE original_price IS NOT NULL AND original_price_cents IS NULL;

-- package_items: item_value -> item_value_cents
ALTER TABLE package_items ADD COLUMN IF NOT EXISTS item_value_cents INTEGER DEFAULT 0;
UPDATE package_items SET item_value_cents = ROUND(COALESCE(item_value, 0) * 100)::INTEGER WHERE item_value_cents IS NULL OR item_value_cents = 0;

-- package_purchases: amount_paid -> amount_paid_cents
ALTER TABLE package_purchases ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER;
UPDATE package_purchases SET amount_paid_cents = ROUND(COALESCE(amount_paid, 0) * 100)::INTEGER WHERE amount_paid_cents IS NULL;

-- Drop old decimal columns (after backfill)
ALTER TABLE business_packages DROP COLUMN IF EXISTS price;
ALTER TABLE business_packages DROP COLUMN IF EXISTS original_price;
ALTER TABLE package_items DROP COLUMN IF EXISTS item_value;
ALTER TABLE package_purchases DROP COLUMN IF EXISTS amount_paid;

-- 4. Restrict item_type to service/event only (v1)
ALTER TABLE package_items DROP CONSTRAINT IF EXISTS package_items_item_type_check;
ALTER TABLE package_items ADD CONSTRAINT package_items_item_type_check 
  CHECK (item_type IN ('service', 'event'));

-- 5. Update RLS policies for business_packages
DROP POLICY IF EXISTS "Users can view published packages" ON business_packages;
DROP POLICY IF EXISTS "Users can create their own packages" ON business_packages;
DROP POLICY IF EXISTS "Users can update their own packages" ON business_packages;
DROP POLICY IF EXISTS "Users can delete their own packages" ON business_packages;

CREATE POLICY "Users can view packages in their tenant"
ON business_packages FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
  AND (status = 'published' OR creator_id = auth.uid())
);

CREATE POLICY "Users can create packages in their tenant"
ON business_packages FOR INSERT
WITH CHECK (
  auth.uid() = creator_id 
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Users can update their own packages"
ON business_packages FOR UPDATE
USING (
  auth.uid() = creator_id
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Users can delete their own packages"
ON business_packages FOR DELETE
USING (
  auth.uid() = creator_id
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

-- 6. Update RLS policies for package_items
DROP POLICY IF EXISTS "Users can manage items in their packages" ON package_items;
DROP POLICY IF EXISTS "Users can view items in visible packages" ON package_items;

CREATE POLICY "Users can view items in their tenant packages"
ON package_items FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Users can manage items in their packages"
ON package_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM business_packages bp 
    WHERE bp.id = package_items.package_id 
    AND bp.creator_id = auth.uid()
    AND bp.tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
  )
);

-- 7. Update RLS policies for package_purchases
DROP POLICY IF EXISTS "Users can view their own purchases" ON package_purchases;
DROP POLICY IF EXISTS "Creators can view purchases of their packages" ON package_purchases;

CREATE POLICY "Users can view their own purchases"
ON package_purchases FOR SELECT
USING (
  buyer_id = auth.uid()
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Creators can view purchases of their packages"
ON package_purchases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_packages bp 
    WHERE bp.id = package_purchases.package_id 
    AND bp.creator_id = auth.uid()
  )
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Users can create purchases in their tenant"
ON package_purchases FOR INSERT
WITH CHECK (
  auth.uid() = buyer_id
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

-- 8. Update RLS policies for package_item_redemptions (join through purchase to get buyer)
DROP POLICY IF EXISTS "Users can view their own redemptions" ON package_item_redemptions;
DROP POLICY IF EXISTS "Creators can view redemptions of their packages" ON package_item_redemptions;

CREATE POLICY "Users can view their own redemptions"
ON package_item_redemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM package_purchases pp
    WHERE pp.id = package_item_redemptions.purchase_id
    AND pp.buyer_id = auth.uid()
  )
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Creators can view redemptions of their packages"
ON package_item_redemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM package_purchases pp
    JOIN business_packages bp ON bp.id = pp.package_id
    WHERE pp.id = package_item_redemptions.purchase_id
    AND bp.creator_id = auth.uid()
  )
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "Users can create redemptions in their tenant"
ON package_item_redemptions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM package_purchases pp
    WHERE pp.id = package_item_redemptions.purchase_id
    AND pp.buyer_id = auth.uid()
  )
  AND tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
);