-- Add 'paused' status to campaigns
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('draft', 'active', 'paused', 'completed'));

-- Add comment
COMMENT ON COLUMN public.campaigns.status IS 'Campaign status: draft, active, paused, or completed';