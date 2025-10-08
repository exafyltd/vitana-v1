-- Create storage bucket for diary photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diary-photos',
  'diary-photos',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

-- Create storage policies for diary photos
CREATE POLICY "Users can upload their own diary photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'diary-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own diary photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'diary-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own diary photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'diary-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add attachments column to diary_entries table
ALTER TABLE public.diary_entries
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;