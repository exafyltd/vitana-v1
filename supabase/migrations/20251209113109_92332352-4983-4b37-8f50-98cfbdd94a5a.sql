-- V1 Reseller Implementation - Part 1: Tables and Basic Policies

-- 1.1 Add 'reseller' to tenant_role enum
ALTER TYPE tenant_role ADD VALUE IF NOT EXISTS 'reseller' AFTER 'professional';

-- 1.2 Create slim reseller_profiles table
CREATE TABLE IF NOT EXISTS reseller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  reseller_code TEXT NOT NULL UNIQUE,
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'terminated')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 1.3 Create slim reseller_attributions table (for reporting only)
CREATE TABLE IF NOT EXISTS reseller_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES reseller_profiles(id) NOT NULL,
  ticket_purchase_id UUID REFERENCES event_ticket_purchases(id) NOT NULL,
  event_id UUID REFERENCES global_community_events(id) NOT NULL,
  sale_amount DECIMAL(12,2) NOT NULL,
  utm_source TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticket_purchase_id)
);

-- Enable RLS on both tables
ALTER TABLE reseller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_attributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reseller_profiles
CREATE POLICY "reseller_read_own_profile" ON reseller_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_resellers" ON reseller_profiles
  FOR ALL TO authenticated
  USING (
    COALESCE(((auth.jwt()->'app_metadata'->>'exafy_admin')::boolean), false) = true
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = reseller_profiles.tenant_id
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

-- RLS Policies for reseller_attributions
CREATE POLICY "reseller_read_own_attributions" ON reseller_attributions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reseller_profiles rp
      WHERE rp.id = reseller_attributions.reseller_id
        AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_view_attributions" ON reseller_attributions
  FOR SELECT TO authenticated
  USING (
    COALESCE(((auth.jwt()->'app_metadata'->>'exafy_admin')::boolean), false) = true
    OR EXISTS (
      SELECT 1 FROM reseller_profiles rp
      JOIN memberships m ON m.tenant_id = rp.tenant_id
      WHERE rp.id = reseller_attributions.reseller_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

CREATE POLICY "system_insert_attributions" ON reseller_attributions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_reseller_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reseller_profiles_timestamp
  BEFORE UPDATE ON reseller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_reseller_profiles_updated_at();