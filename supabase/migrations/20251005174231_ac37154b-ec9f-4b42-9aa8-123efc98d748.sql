-- Add LinkedIn columns (if not exists)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS linkedin_headline TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_summary TEXT,
  ADD COLUMN IF NOT EXISTS professional_skills TEXT[];

-- Add Instagram columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS instagram_bio TEXT,
  ADD COLUMN IF NOT EXISTS instagram_followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS instagram_interests TEXT[];

-- Add TikTok columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tiktok_bio TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS tiktok_content_themes TEXT[];

-- Add YouTube columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS youtube_description TEXT,
  ADD COLUMN IF NOT EXISTS youtube_subscribers_count INTEGER,
  ADD COLUMN IF NOT EXISTS youtube_content_categories TEXT[];

-- Add Facebook columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS facebook_bio TEXT,
  ADD COLUMN IF NOT EXISTS facebook_interests TEXT[];

-- Add X (Twitter) columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS x_url TEXT,
  ADD COLUMN IF NOT EXISTS x_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS x_bio TEXT,
  ADD COLUMN IF NOT EXISTS x_followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS x_topics TEXT[];

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_url ON profiles(linkedin_url) WHERE linkedin_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_instagram_url ON profiles(instagram_url) WHERE instagram_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tiktok_url ON profiles(tiktok_url) WHERE tiktok_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_youtube_url ON profiles(youtube_url) WHERE youtube_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_facebook_url ON profiles(facebook_url) WHERE facebook_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_x_url ON profiles(x_url) WHERE x_url IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.linkedin_url IS 'LinkedIn profile URL for professional integration';
COMMENT ON COLUMN profiles.linkedin_synced_at IS 'Last time LinkedIn data was imported';
COMMENT ON COLUMN profiles.instagram_url IS 'Instagram profile URL for lifestyle/visual interests';
COMMENT ON COLUMN profiles.instagram_synced_at IS 'Last time Instagram data was imported';
COMMENT ON COLUMN profiles.tiktok_url IS 'TikTok profile URL for short-form video content';
COMMENT ON COLUMN profiles.tiktok_synced_at IS 'Last time TikTok data was imported';
COMMENT ON COLUMN profiles.youtube_url IS 'YouTube channel URL for video content';
COMMENT ON COLUMN profiles.youtube_synced_at IS 'Last time YouTube data was imported';
COMMENT ON COLUMN profiles.facebook_url IS 'Facebook profile URL for community interests';
COMMENT ON COLUMN profiles.facebook_synced_at IS 'Last time Facebook data was imported';
COMMENT ON COLUMN profiles.x_url IS 'X (Twitter) profile URL for micro-content';
COMMENT ON COLUMN profiles.x_synced_at IS 'Last time X data was imported';