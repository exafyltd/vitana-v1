-- Add channel selection and distribution configuration to campaigns
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS target_channels JSONB DEFAULT '{
  "instagram": false,
  "linkedin": false,
  "twitter": false,
  "facebook": false,
  "youtube": false,
  "tiktok": false,
  "email": false,
  "sms": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS distribution_config JSONB DEFAULT '{
  "template_id": "custom",
  "frequency": "daily",
  "smart_scheduling_enabled": true,
  "best_times": {}
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.target_channels IS 'Selected social media channels for campaign distribution';
COMMENT ON COLUMN public.campaigns.distribution_config IS 'Distribution strategy including template, frequency, and smart scheduling settings';