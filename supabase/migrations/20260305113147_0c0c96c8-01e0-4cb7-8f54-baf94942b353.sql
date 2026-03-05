-- 1. Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- 2. Enable RLS on ai_personality_config tables
ALTER TABLE ai_personality_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personality_config_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_personality_config (admin-only write, authenticated read)
CREATE POLICY "Authenticated users can read personality config"
ON ai_personality_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages personality config"
ON ai_personality_config FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read config audit"
ON ai_personality_config_audit FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages config audit"
ON ai_personality_config_audit FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Fix signup_funnel view: set security_invoker = on so it respects caller's permissions
ALTER VIEW public.signup_funnel SET (security_invoker = on);