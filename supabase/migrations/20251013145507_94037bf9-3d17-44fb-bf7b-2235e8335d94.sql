-- Fix existing upload that should be public
UPDATE media_uploads 
SET is_public = true 
WHERE id = '5fac1b55-7297-4cc1-8b0e-d667257759f9';