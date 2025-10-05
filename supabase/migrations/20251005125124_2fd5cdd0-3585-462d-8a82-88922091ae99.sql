-- ============================================
-- SUPPLEMENT TRACKING SYSTEM
-- ============================================

-- Create user supplements table
CREATE TABLE IF NOT EXISTS public.user_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_supplements_user ON public.user_supplements(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_supplements_category ON public.user_supplements(category);

-- Enable RLS
ALTER TABLE public.user_supplements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own supplements" ON public.user_supplements;
CREATE POLICY "Users can manage their own supplements"
  ON public.user_supplements FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Extend lab_tests table with omics and data source fields (if columns don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lab_tests' AND column_name = 'data_source') THEN
    ALTER TABLE public.lab_tests ADD COLUMN data_source TEXT;
  END IF;
END $$;

-- Comment on tables
COMMENT ON TABLE public.user_supplements IS 'User supplement tracking with categories like Immunity, Anti-aging, Sleep, etc.';