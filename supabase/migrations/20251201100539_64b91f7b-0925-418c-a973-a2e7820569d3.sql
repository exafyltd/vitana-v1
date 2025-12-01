-- Create RPC function to fetch public campaign details (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_public_campaign_details(campaign_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  status TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_channels JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  owner_id UUID,
  owner_name TEXT,
  owner_avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.status,
    c.start_date,
    c.end_date,
    c.target_channels,
    c.metadata,
    c.created_at,
    c.user_id as owner_id,
    COALESCE(p.display_name, p.full_name, 'Campaign Owner') as owner_name,
    p.avatar_url as owner_avatar
  FROM campaigns c
  LEFT JOIN profiles p ON p.user_id = c.user_id
  WHERE c.id = campaign_id
    AND c.status IN ('active', 'draft');
END;
$$;