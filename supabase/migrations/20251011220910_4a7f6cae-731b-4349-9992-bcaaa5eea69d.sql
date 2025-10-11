-- Phase 1: Database Foundation - Missing Tables
-- =====================================================

-- 2. AUTOMATION EXECUTIONS TABLE
CREATE TABLE public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  trigger_data JSONB DEFAULT '{}',
  conditions_result JSONB DEFAULT '{}',
  actions_executed JSONB DEFAULT '[]',
  
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'skipped')),
  error_message TEXT,
  execution_time_ms INTEGER,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. AI SITUATION ANALYSES TABLE
CREATE TABLE public.ai_situation_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  situation_description TEXT NOT NULL,
  context_filters JSONB DEFAULT '{}',
  constraints JSONB DEFAULT '{}',
  
  analysis_result JSONB,
  suggested_triggers TEXT[],
  suggested_conditions JSONB,
  suggested_actions JSONB,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  error_message TEXT,
  analysis_duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. AI RECOMMENDATIONS TABLE
CREATE TABLE public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  situation_id UUID REFERENCES public.ai_situation_analyses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  conditions JSONB DEFAULT '[]',
  actions JSONB NOT NULL,
  
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
  estimated_users_affected INTEGER,
  
  deployed BOOLEAN DEFAULT false,
  deployed_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  deployed_at TIMESTAMP WITH TIME ZONE,
  deployed_by UUID,
  
  admin_rating INTEGER CHECK (admin_rating >= 1 AND admin_rating <= 5),
  admin_feedback TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. RECOMMENDATION DEPLOYMENTS TABLE
CREATE TABLE public.recommendation_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.ai_recommendations(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  deployed_by UUID NOT NULL,
  
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER,
  
  unique_users_affected INTEGER DEFAULT 0,
  positive_feedback_count INTEGER DEFAULT 0,
  negative_feedback_count INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  deactivated_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. PATTERN DISCOVERIES TABLE
CREATE TABLE public.pattern_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'user_behavior', 'engagement', 'conversion', 'churn_risk', 'opportunity'
  )),
  pattern_name TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  
  confidence_level NUMERIC(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  sample_size INTEGER NOT NULL,
  occurrence_rate NUMERIC(5,2),
  
  triggers JSONB DEFAULT '[]',
  conditions JSONB DEFAULT '[]',
  suggested_actions JSONB DEFAULT '[]',
  expected_impact TEXT,
  
  status TEXT DEFAULT 'discovered' CHECK (status IN (
    'discovered', 'reviewed', 'implemented', 'dismissed'
  )),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  implemented_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. AUTOPILOT ACTION TEMPLATES TABLE
CREATE TABLE public.autopilot_action_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'health', 'community', 'media', 'discover', 'calendar', 'wallet', 'learning'
  )),
  
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  time_estimate TEXT,
  
  prompt_template TEXT NOT NULL,
  context_requirements JSONB DEFAULT '[]',
  personalization_fields JSONB DEFAULT '[]',
  
  max_frequency_per_day INTEGER DEFAULT 1,
  min_hours_between INTEGER DEFAULT 24,
  
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. AUTOPILOT FEEDBACK TABLE
CREATE TABLE public.autopilot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.autopilot_actions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'irrelevant', 'timing_bad')),
  comment TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_automation_executions_rule ON public.automation_executions(rule_id);
CREATE INDEX idx_automation_executions_user ON public.automation_executions(user_id);
CREATE INDEX idx_automation_executions_status ON public.automation_executions(status);
CREATE INDEX idx_automation_executions_created ON public.automation_executions(created_at DESC);

CREATE INDEX idx_ai_situation_status ON public.ai_situation_analyses(status);
CREATE INDEX idx_ai_situation_created_by ON public.ai_situation_analyses(created_by);

CREATE INDEX idx_ai_recommendations_situation ON public.ai_recommendations(situation_id);
CREATE INDEX idx_ai_recommendations_deployed ON public.ai_recommendations(deployed);
CREATE INDEX idx_ai_recommendations_confidence ON public.ai_recommendations(confidence_score DESC);

CREATE INDEX idx_pattern_discoveries_type ON public.pattern_discoveries(pattern_type);
CREATE INDEX idx_pattern_discoveries_status ON public.pattern_discoveries(status);
CREATE INDEX idx_pattern_discoveries_confidence ON public.pattern_discoveries(confidence_level DESC);

CREATE INDEX idx_autopilot_feedback_action ON public.autopilot_feedback(action_id);
CREATE INDEX idx_autopilot_feedback_user ON public.autopilot_feedback(user_id);

-- TRIGGERS
CREATE TRIGGER update_ai_situation_analyses_updated_at
  BEFORE UPDATE ON public.ai_situation_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_recommendations_updated_at
  BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recommendation_deployments_updated_at
  BEFORE UPDATE ON public.recommendation_deployments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pattern_discoveries_updated_at
  BEFORE UPDATE ON public.pattern_discoveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_autopilot_action_templates_updated_at
  BEFORE UPDATE ON public.autopilot_action_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS POLICIES
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own executions"
ON public.automation_executions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all executions"
ON public.automation_executions FOR SELECT
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = automation_executions.tenant_id
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
);

CREATE POLICY "System can insert executions"
ON public.automation_executions FOR INSERT
WITH CHECK (true);

ALTER TABLE public.ai_situation_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage situation analyses"
ON public.ai_situation_analyses FOR ALL
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = ai_situation_analyses.tenant_id
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
);

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recommendations"
ON public.ai_recommendations FOR ALL
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = ai_recommendations.tenant_id
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
);

ALTER TABLE public.recommendation_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deployments"
ON public.recommendation_deployments FOR SELECT
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR EXISTS (
    SELECT 1 FROM public.ai_recommendations r
    JOIN public.memberships m ON m.tenant_id = r.tenant_id
    WHERE r.id = recommendation_deployments.recommendation_id
    AND m.user_id = auth.uid()
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
);

CREATE POLICY "System can manage deployments"
ON public.recommendation_deployments FOR ALL
USING (true);

ALTER TABLE public.pattern_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pattern discoveries"
ON public.pattern_discoveries FOR ALL
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = pattern_discoveries.tenant_id
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
);

ALTER TABLE public.autopilot_action_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage action templates"
ON public.autopilot_action_templates FOR ALL
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Anyone can view active templates"
ON public.autopilot_action_templates FOR SELECT
USING (is_active = true);

ALTER TABLE public.autopilot_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own feedback"
ON public.autopilot_feedback FOR ALL
USING (auth.uid() = user_id);