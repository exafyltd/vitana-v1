-- Create provider_appointments table
CREATE TABLE public.provider_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_specialty TEXT,
  provider_image_url TEXT,
  appointment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  location TEXT,
  notes TEXT,
  patient_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own appointments
CREATE POLICY "Users can manage their own appointments"
ON public.provider_appointments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_provider_appointments_user_id ON public.provider_appointments(user_id);
CREATE INDEX idx_provider_appointments_start_time ON public.provider_appointments(start_time);
CREATE INDEX idx_provider_appointments_status ON public.provider_appointments(status);

-- Create provider_notes table
CREATE TABLE public.provider_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  note_text TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own notes
CREATE POLICY "Users can manage their own provider notes"
ON public.provider_notes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_provider_notes_user_provider ON public.provider_notes(user_id, provider_id);

-- Trigger for updated_at on provider_appointments
CREATE TRIGGER update_provider_appointments_updated_at
  BEFORE UPDATE ON public.provider_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on provider_notes
CREATE TRIGGER update_provider_notes_updated_at
  BEFORE UPDATE ON public.provider_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();