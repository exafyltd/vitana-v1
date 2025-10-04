-- ============================================
-- VITANA AI INFINITE MEMORY SYSTEM
-- Phase 1: Database Foundation
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. AI CONVERSATIONS TABLE
-- Stores all AI chat sessions with full context snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('health', 'autopilot', 'community', 'wellness')),
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_tenant_id ON public.ai_conversations(tenant_id);
CREATE INDEX idx_ai_conversations_agent_type ON public.ai_conversations(agent_type);
CREATE INDEX idx_ai_conversations_created_at ON public.ai_conversations(created_at DESC);

-- RLS Policies
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. AI MESSAGES TABLE
-- Stores individual messages with context used
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_used JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for conversation retrieval
CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON public.ai_messages(created_at DESC);
CREATE INDEX idx_ai_messages_role ON public.ai_messages(role);

-- RLS Policies
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their conversations"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = ai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- ============================================
-- 3. AI MEMORY TABLE
-- Persistent insights, patterns, preferences
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('insight', 'pattern', 'preference', 'goal', 'fact', 'interaction')),
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
  metadata JSONB DEFAULT '{}'::jsonb,
  source_conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for memory retrieval
CREATE INDEX idx_ai_memory_user_id ON public.ai_memory(user_id);
CREATE INDEX idx_ai_memory_type ON public.ai_memory(memory_type);
CREATE INDEX idx_ai_memory_confidence ON public.ai_memory(confidence_score DESC);
CREATE INDEX idx_ai_memory_active ON public.ai_memory(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_memory_expires_at ON public.ai_memory(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memory"
  ON public.ai_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create memory"
  ON public.ai_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
  ON public.ai_memory FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. AUTOPILOT ACTIONS TABLE
-- Real AI-generated actions (replaces mock data)
-- ============================================
CREATE TABLE IF NOT EXISTS public.autopilot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  reason TEXT,
  category TEXT NOT NULL CHECK (category IN ('health', 'community', 'media', 'discover', 'calendar')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'skipped', 'failed')),
  time_estimate TEXT,
  icon TEXT,
  image_url TEXT,
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for action retrieval
CREATE INDEX idx_autopilot_actions_user_id ON public.autopilot_actions(user_id);
CREATE INDEX idx_autopilot_actions_tenant_id ON public.autopilot_actions(tenant_id);
CREATE INDEX idx_autopilot_actions_status ON public.autopilot_actions(status);
CREATE INDEX idx_autopilot_actions_priority ON public.autopilot_actions(priority);
CREATE INDEX idx_autopilot_actions_created_at ON public.autopilot_actions(created_at DESC);

-- RLS Policies
ALTER TABLE public.autopilot_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own actions"
  ON public.autopilot_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own actions"
  ON public.autopilot_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actions"
  ON public.autopilot_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own actions"
  ON public.autopilot_actions FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for autopilot actions
ALTER PUBLICATION supabase_realtime ADD TABLE public.autopilot_actions;

-- ============================================
-- 5. USER CONTEXT CACHE TABLE
-- Performance optimization (5-minute cache)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Index for fast lookups
CREATE UNIQUE INDEX idx_user_context_cache_user_id ON public.user_context_cache(user_id);
CREATE INDEX idx_user_context_cache_expires_at ON public.user_context_cache(expires_at);

-- RLS Policies
ALTER TABLE public.user_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cache"
  ON public.user_context_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage cache"
  ON public.user_context_cache FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_context_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_context_cache
  WHERE expires_at < now();
END;
$$;

-- Function to clean expired memory entries
CREATE OR REPLACE FUNCTION public.clean_expired_memory()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ai_memory
  SET is_active = false
  WHERE expires_at IS NOT NULL
  AND expires_at < now()
  AND is_active = true;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_memory_updated_at
  BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_autopilot_actions_updated_at
  BEFORE UPDATE ON public.autopilot_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
-- Vitana AI Infinite Memory System database schema created successfully!
-- Tables: ai_conversations, ai_messages, ai_memory, autopilot_actions, user_context_cache
-- RLS policies enabled for all tables
-- Realtime enabled for autopilot_actions
-- Utility functions for cache and memory cleanup created