-- Create api_integrations table
CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text NOT NULL,
  auth_type text NOT NULL CHECK (auth_type IN ('api_key', 'oauth2', 'none')),
  auth_token text,
  integration_type text NOT NULL CHECK (integration_type IN (
    'lab', 'calendar', 'messenger', 'marketplace', 'ai_multimodal', 
    'ai_stt', 'ai_tts', 'payment', 'telemedicine', 'ehr', 'other'
  )),
  test_endpoints jsonb DEFAULT '[]'::jsonb,
  test_frequency_minutes integer NOT NULL DEFAULT 15,
  test_runner_function text,
  last_test_status text CHECK (last_test_status IN ('success', 'fail', 'timeout', 'pending')),
  last_test_timestamp timestamptz,
  is_active boolean DEFAULT true,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create api_test_logs table
CREATE TABLE public.api_test_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.api_integrations(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('success', 'fail', 'timeout')),
  response_time_ms integer,
  response_body jsonb,
  error_log text,
  test_type text DEFAULT 'automated',
  triggered_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_api_test_logs_integration ON public.api_test_logs(integration_id);
CREATE INDEX idx_api_test_logs_timestamp ON public.api_test_logs(timestamp DESC);
CREATE INDEX idx_api_test_logs_status ON public.api_test_logs(status);

-- Enable RLS
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_test_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_integrations
CREATE POLICY "Admins can manage integrations"
  ON public.api_integrations
  FOR ALL
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.role IN ('admin', 'staff')
      AND m.status = 'active'
    )
  );

CREATE POLICY "Staff can view integrations"
  ON public.api_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.role IN ('admin', 'staff', 'professional')
      AND m.status = 'active'
    )
  );

-- RLS policies for api_test_logs
CREATE POLICY "Staff can view test logs"
  ON public.api_test_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.role IN ('admin', 'staff', 'professional')
      AND m.status = 'active'
    )
  );

CREATE POLICY "System can insert test logs"
  ON public.api_test_logs
  FOR INSERT
  WITH CHECK (true);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_api_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_integrations_timestamp
  BEFORE UPDATE ON public.api_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_api_integration_timestamp();

-- Insert Vertex Live as first integration
INSERT INTO public.api_integrations (
  name,
  base_url,
  auth_type,
  integration_type,
  test_runner_function,
  test_frequency_minutes,
  notes,
  is_active
) VALUES (
  'Vertex AI Live (Multimodal)',
  'wss://inmkhvwdcuyhnxkgfvsb.functions.supabase.co',
  'oauth2',
  'ai_multimodal',
  'test-vertex-live',
  15,
  'Gemini Live WebSocket integration with audio, video, screen sharing',
  true
);