-- Add cover_image_url column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_public_campaign_details(UUID);

-- Recreate with the new signature
CREATE OR REPLACE FUNCTION get_public_campaign_details(campaign_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  cover_image_url TEXT,
  status TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_channels JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  owner_id UUID,
  owner_name TEXT,
  owner_avatar TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.cover_image_url,
    c.status,
    c.start_date,
    c.end_date,
    c.target_channels,
    c.metadata,
    c.created_at,
    c.user_id as owner_id,
    COALESCE(p.display_name, p.full_name, 'VITANA Member') as owner_name,
    p.avatar_url as owner_avatar
  FROM campaigns c
  LEFT JOIN profiles p ON p.id = c.user_id
  WHERE c.id = campaign_id;
END;
$$;