-- Update media-uploads bucket file size limit to 5GB for Pro plan
UPDATE storage.buckets 
SET file_size_limit = 5368709120 
WHERE id = 'media-uploads';

-- Add owner DELETE policy on media_uploads table
CREATE POLICY "Users can delete own media uploads"
ON public.media_uploads
FOR DELETE
TO authenticated
USING (user_id = auth.uid());