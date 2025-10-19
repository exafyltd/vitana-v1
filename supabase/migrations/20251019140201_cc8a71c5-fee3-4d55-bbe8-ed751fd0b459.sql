-- Add columns to crewai_test table for storing CrewAI task results
ALTER TABLE public.crewai_test 
ADD COLUMN IF NOT EXISTS work_item_id TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS result JSONB,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Create index for faster lookups by work_item_id
CREATE INDEX IF NOT EXISTS idx_crewai_work_item ON public.crewai_test(work_item_id);

-- Enable RLS
ALTER TABLE public.crewai_test ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own tasks
CREATE POLICY "Users can insert their own crewai tasks"
ON public.crewai_test
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view all tasks (adjust if needed)
CREATE POLICY "Users can view crewai tasks"
ON public.crewai_test
FOR SELECT
TO authenticated
USING (true);