-- Add redeemed_by_user_id column to track who redeemed the voucher
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS redeemed_by_user_id UUID REFERENCES auth.users(id);

-- RLS policy for users to view vouchers by code for redemption
-- Users can view active vouchers or vouchers they redeemed
DROP POLICY IF EXISTS "Users can view vouchers by code for redemption" ON public.vouchers;
CREATE POLICY "Users can view vouchers by code for redemption"
ON public.vouchers FOR SELECT
USING (
  status = 'active' 
  OR redeemed_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM voucher_orders vo 
    WHERE vo.voucher_id = vouchers.id 
    AND vo.buyer_user_id = auth.uid()
  )
);

-- Policy for users to claim active vouchers
DROP POLICY IF EXISTS "Users can claim active vouchers" ON public.vouchers;
CREATE POLICY "Users can claim active vouchers"
ON public.vouchers FOR UPDATE
USING (status = 'active')
WITH CHECK (
  redeemed_by_user_id = auth.uid()
  AND status = 'redeemed'
);