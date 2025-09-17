-- Enhanced Messages System Implementation

-- Update messages table to support rich content and workflows
ALTER TABLE public.messages 
ADD COLUMN message_type text NOT NULL DEFAULT 'text',
ADD COLUMN content_data jsonb,
ADD COLUMN parent_message_id uuid REFERENCES public.messages(id),
ADD COLUMN workflow_type text,
ADD COLUMN action_buttons jsonb,
ADD COLUMN expires_at timestamp with time zone,
ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Create message threads table for conversation grouping
CREATE TABLE public.message_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  type text NOT NULL DEFAULT 'direct', -- 'direct', 'group', 'channel'
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create thread participants table
CREATE TABLE public.thread_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_read_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(thread_id, user_id)
);

-- Create message templates table
CREATE TABLE public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  category text NOT NULL,
  template_type text NOT NULL,
  content jsonb NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create message actions table for tracking interactions
CREATE TABLE public.message_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'button_click', 'form_submit', 'reaction'
  action_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add thread_id to messages table
ALTER TABLE public.messages 
ADD COLUMN thread_id uuid REFERENCES public.message_threads(id);

-- Enable RLS on new tables
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_threads
CREATE POLICY "Users can view threads they participate in"
ON public.message_threads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = message_threads.id 
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  ) OR 
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Users can create threads"
ON public.message_threads
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Thread creators and admins can update threads"
ON public.message_threads
FOR UPDATE
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = message_threads.id 
    AND tp.user_id = auth.uid()
    AND tp.role IN ('admin', 'moderator')
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

-- RLS Policies for thread_participants
CREATE POLICY "Users can view participants in their threads"
ON public.thread_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.thread_participants tp2
    WHERE tp2.thread_id = thread_participants.thread_id
    AND tp2.user_id = auth.uid()
    AND tp2.is_active = true
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Thread admins can manage participants"
ON public.thread_participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = thread_participants.thread_id
    AND tp.user_id = auth.uid()
    AND tp.role = 'admin'
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = thread_participants.thread_id
    AND tp.user_id = auth.uid()
    AND tp.role = 'admin'
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

-- RLS Policies for message_templates
CREATE POLICY "Users can view templates for their tenant"
ON public.message_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = message_templates.tenant_id
    AND m.status = 'active'
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Admins can manage templates"
ON public.message_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = message_templates.tenant_id
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = message_templates.tenant_id
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

-- RLS Policies for message_actions
CREATE POLICY "Users can view their own actions"
ON public.message_actions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own actions"
ON public.message_actions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update existing messages RLS to include thread-based access
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;

CREATE POLICY "Enhanced message access policy"
ON public.messages
FOR SELECT
USING (
  -- Direct message access (existing logic)
  (auth.uid() = sender_id) OR 
  (auth.uid() = recipient_id) OR
  -- Thread-based access (new)
  (thread_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = messages.thread_id
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  )) OR
  -- Admin access
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON public.message_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for message tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_threads REPLICA IDENTITY FULL;
ALTER TABLE public.thread_participants REPLICA IDENTITY FULL;
ALTER TABLE public.message_actions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_actions;