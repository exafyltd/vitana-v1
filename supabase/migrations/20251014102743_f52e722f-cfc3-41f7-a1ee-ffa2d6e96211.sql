-- Add language column to podcast_metadata table
ALTER TABLE podcast_metadata
ADD COLUMN language text;

-- Add a comment to describe the column
COMMENT ON COLUMN podcast_metadata.language IS 'ISO language code (e.g., de-DE, en-US, sr-RS)';