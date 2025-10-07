-- Add campaign_id to distribution_posts table for linking posts to campaigns
ALTER TABLE public.distribution_posts 
ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Create index for faster campaign post queries
CREATE INDEX idx_distribution_posts_campaign_id ON public.distribution_posts(campaign_id);

-- Add comment for documentation
COMMENT ON COLUMN public.distribution_posts.campaign_id IS 'Optional reference to campaign this post belongs to';