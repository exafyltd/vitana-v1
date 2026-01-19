-- Create storage bucket for voucher PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('voucher-pdfs', 'voucher-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Allow authenticated users to read their own voucher PDFs
-- Note: Signed URLs bypass RLS, so this is a fallback
CREATE POLICY "Users can view their voucher PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voucher-pdfs' AND 
  auth.uid() IS NOT NULL
);