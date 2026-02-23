UPDATE storage.buckets
SET allowed_mime_types = array['video/mp4','video/webm','video/quicktime','audio/mpeg','audio/wav','audio/ogg','audio/mp4','image/jpeg','image/png','image/webp']
WHERE id = 'media-uploads';