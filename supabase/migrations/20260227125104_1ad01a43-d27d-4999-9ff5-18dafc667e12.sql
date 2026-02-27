UPDATE storage.buckets 
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  ARRAY['video/3gpp', 'video/3gpp2']
)
WHERE id = 'media-uploads'
AND NOT (allowed_mime_types @> ARRAY['video/3gpp']);