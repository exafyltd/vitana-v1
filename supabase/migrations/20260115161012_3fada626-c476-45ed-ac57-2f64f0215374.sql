-- Drop the existing check constraint and add a new one that includes "test"
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_tier_check;

ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_tier_check 
  CHECK (tier IN ('test', 'experience', 'exclusive'));