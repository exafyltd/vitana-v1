-- Allow users to delete their own media uploads
CREATE POLICY "Users can delete their own media"
ON public.media_uploads
FOR DELETE
USING (auth.uid() = user_id);