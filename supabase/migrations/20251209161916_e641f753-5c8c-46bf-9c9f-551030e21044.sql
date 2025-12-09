-- Add resellable columns to global_community_events
ALTER TABLE global_community_events
ADD COLUMN IF NOT EXISTS resellable boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS resale_scope text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS default_reseller_commission_rate numeric(5,2),
ADD COLUMN IF NOT EXISTS reseller_config jsonb DEFAULT '{}'::jsonb;

-- Add index for efficient resellable event queries
CREATE INDEX IF NOT EXISTS idx_global_community_events_resellable 
ON global_community_events(resellable, start_time) 
WHERE resellable = true;