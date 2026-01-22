-- Add code column to vouchers table for direct lookups
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Create index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(code);

-- Function to generate unique 8-character voucher codes
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INTEGER;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vouchers WHERE code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate codes on insert
CREATE OR REPLACE FUNCTION public.set_voucher_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := public.generate_voucher_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS voucher_code_trigger ON public.vouchers;
CREATE TRIGGER voucher_code_trigger
  BEFORE INSERT ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_voucher_code();

-- Backfill existing vouchers with codes
UPDATE public.vouchers 
SET code = public.generate_voucher_code()
WHERE code IS NULL;