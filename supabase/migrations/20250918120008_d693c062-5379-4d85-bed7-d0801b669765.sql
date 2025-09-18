-- Create chat-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false);

-- Create RLS policies for chat-attachments bucket
CREATE POLICY "Users can upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-attachments' AND (
    -- Users can view their own uploads
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Users can view attachments in threads they participate in
    EXISTS (
      SELECT 1 FROM thread_participants tp
      WHERE tp.user_id = auth.uid() 
      AND tp.thread_id::text = (storage.foldername(name))[2]
      AND tp.is_active = true
    ) OR
    -- Users can view attachments in global threads they participate in
    EXISTS (
      SELECT 1 FROM global_thread_participants gtp
      WHERE gtp.user_id = auth.uid() 
      AND gtp.thread_id::text = (storage.foldername(name))[2]
      AND gtp.is_active = true
    )
  )
);

CREATE POLICY "Users can delete their own chat attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);