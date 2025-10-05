-- Add missing profile columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add index for languages array queries
CREATE INDEX IF NOT EXISTS idx_profiles_languages ON public.profiles USING GIN(languages);

COMMENT ON COLUMN public.profiles.location IS 'User location (e.g., "San Francisco, CA")';
COMMENT ON COLUMN public.profiles.links IS 'Array of link objects with label and url properties';
COMMENT ON COLUMN public.profiles.languages IS 'Array of languages spoken by the user';