-- Create user_health_plans table
CREATE TABLE user_health_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('nutrition', 'exercise', 'hydration', 'sleep', 'mental', 'supplement')),
  plan_data JSONB NOT NULL,
  ai_generated BOOLEAN DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT true,
  adherence_score INTEGER DEFAULT 0 CHECK (adherence_score >= 0 AND adherence_score <= 100),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, plan_type)
);

CREATE INDEX idx_user_health_plans_user_id ON user_health_plans(user_id);
CREATE INDEX idx_user_health_plans_plan_type ON user_health_plans(plan_type);

-- Enable RLS
ALTER TABLE user_health_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own plans"
  ON user_health_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON user_health_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON user_health_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON user_health_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Create plan_adherence_logs table
CREATE TABLE plan_adherence_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES user_health_plans(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data JSONB NOT NULL,
  completed BOOLEAN DEFAULT true,
  notes TEXT
);

CREATE INDEX idx_plan_adherence_logs_user_id ON plan_adherence_logs(user_id);
CREATE INDEX idx_plan_adherence_logs_plan_id ON plan_adherence_logs(plan_id);
CREATE INDEX idx_plan_adherence_logs_logged_at ON plan_adherence_logs(logged_at);

-- Enable RLS
ALTER TABLE plan_adherence_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON plan_adherence_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON plan_adherence_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);