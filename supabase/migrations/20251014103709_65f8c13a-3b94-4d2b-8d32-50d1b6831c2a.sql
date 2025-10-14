-- Backfill language data for existing podcasts
-- Set German language for podcasts with German titles
UPDATE podcast_metadata 
SET language = 'de-DE' 
WHERE media_id IN (
  SELECT id FROM media_uploads 
  WHERE title ILIKE '%schlafen%' OR title ILIKE '%deutsch%'
) AND language IS NULL;

-- Set English as default for any remaining podcasts without language
UPDATE podcast_metadata 
SET language = 'en-US' 
WHERE language IS NULL;