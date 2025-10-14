-- Add CASCADE delete to podcast_metadata foreign key
-- This allows deleting media_uploads to automatically delete related podcast_metadata

-- Drop existing foreign key constraint
ALTER TABLE podcast_metadata 
DROP CONSTRAINT IF EXISTS podcast_metadata_media_id_fkey;

-- Recreate with CASCADE delete
ALTER TABLE podcast_metadata 
ADD CONSTRAINT podcast_metadata_media_id_fkey 
FOREIGN KEY (media_id) 
REFERENCES media_uploads(id) 
ON DELETE CASCADE;