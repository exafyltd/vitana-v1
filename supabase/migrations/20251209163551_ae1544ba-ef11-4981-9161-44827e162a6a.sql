-- Add missing columns to reseller_attributions for complete attribution tracking
ALTER TABLE reseller_attributions
ADD COLUMN IF NOT EXISTS commission_amount numeric(15,2),
ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2),
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at timestamptz,
ADD COLUMN IF NOT EXISTS utm_medium text;

-- Add index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_reseller_attributions_status ON reseller_attributions(status);

-- Add index for reseller performance queries
CREATE INDEX IF NOT EXISTS idx_reseller_attributions_reseller_id ON reseller_attributions(reseller_id);