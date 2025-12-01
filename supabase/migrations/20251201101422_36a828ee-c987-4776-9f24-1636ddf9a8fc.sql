-- Grant execute permissions for the public campaign details RPC function
-- This allows anonymous users (including social media crawlers) to call the function

GRANT EXECUTE ON FUNCTION public.get_public_campaign_details(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_campaign_details(UUID) TO authenticated;