-- Create global community tables for cross-tenant community features
-- These tables are for community role users only

-- Global community profiles (extends profiles for community features)
CREATE TABLE public.global_community_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  interests TEXT[],
  location TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Global message threads (cross-tenant community messaging)
CREATE TABLE public.global_message_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT,
  type TEXT NOT NULL DEFAULT 'direct',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Global message thread participants
CREATE TABLE public.global_thread_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(thread_id, user_id)
);

-- Global messages (cross-tenant community messages)
CREATE TABLE public.global_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content_data JSONB,
  parent_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Global community groups
CREATE TABLE public.global_community_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  category TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Global community group members
CREATE TABLE public.global_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(group_id, user_id)
);

-- Global community events
CREATE TABLE public.global_community_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'meetup',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  virtual_link TEXT,
  max_participants INTEGER,
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Global event participants
CREATE TABLE public.global_event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'attending',
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Add foreign key constraints
ALTER TABLE public.global_thread_participants 
ADD CONSTRAINT fk_global_thread_participants_thread 
FOREIGN KEY (thread_id) REFERENCES public.global_message_threads(id) ON DELETE CASCADE;

ALTER TABLE public.global_messages 
ADD CONSTRAINT fk_global_messages_thread 
FOREIGN KEY (thread_id) REFERENCES public.global_message_threads(id) ON DELETE CASCADE;

ALTER TABLE public.global_group_members 
ADD CONSTRAINT fk_global_group_members_group 
FOREIGN KEY (group_id) REFERENCES public.global_community_groups(id) ON DELETE CASCADE;

ALTER TABLE public.global_event_participants 
ADD CONSTRAINT fk_global_event_participants_event 
FOREIGN KEY (event_id) REFERENCES public.global_community_events(id) ON DELETE CASCADE;

-- Create helper function to check if user has community role
CREATE OR REPLACE FUNCTION public.is_community_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_preferences rp
    WHERE rp.user_id = auth.uid() AND rp.role = 'community'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.role_preferences WHERE user_id = auth.uid()
  );
$$;

-- Create helper function to check if user should access tenant-scoped data
CREATE OR REPLACE FUNCTION public.is_tenant_scoped_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_preferences rp
    WHERE rp.user_id = auth.uid() 
    AND rp.role IN ('patient', 'professional', 'staff', 'admin')
  );
$$;

-- Enable RLS on all global tables
ALTER TABLE public.global_community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_event_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Global Community Profiles
CREATE POLICY "Community users can view global profiles" 
ON public.global_community_profiles FOR SELECT 
USING (is_community_user() AND is_visible);

CREATE POLICY "Users can manage their own global profile" 
ON public.global_community_profiles FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND is_community_user());

-- RLS Policies for Global Message Threads
CREATE POLICY "Community users can view threads they participate in" 
ON public.global_message_threads FOR SELECT 
USING (
  is_community_user() AND (
    EXISTS (
      SELECT 1 FROM public.global_thread_participants gtp
      WHERE gtp.thread_id = global_message_threads.id 
      AND gtp.user_id = auth.uid() 
      AND gtp.is_active = true
    )
  )
);

CREATE POLICY "Community users can create threads" 
ON public.global_message_threads FOR INSERT 
WITH CHECK (auth.uid() = created_by AND is_community_user());

CREATE POLICY "Thread creators can update threads" 
ON public.global_message_threads FOR UPDATE 
USING (created_by = auth.uid() AND is_community_user());

-- RLS Policies for Global Thread Participants
CREATE POLICY "Community users can view thread participants" 
ON public.global_thread_participants FOR SELECT 
USING (is_community_user());

CREATE POLICY "Community users can join threads" 
ON public.global_thread_participants FOR INSERT 
WITH CHECK (user_id = auth.uid() AND is_community_user());

CREATE POLICY "Users can update their own participation" 
ON public.global_thread_participants FOR UPDATE 
USING (user_id = auth.uid() AND is_community_user());

-- RLS Policies for Global Messages
CREATE POLICY "Community users can view messages in their threads" 
ON public.global_messages FOR SELECT 
USING (
  is_community_user() AND EXISTS (
    SELECT 1 FROM public.global_thread_participants gtp
    WHERE gtp.thread_id = global_messages.thread_id 
    AND gtp.user_id = auth.uid() 
    AND gtp.is_active = true
  )
);

CREATE POLICY "Community users can create messages" 
ON public.global_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND is_community_user());

CREATE POLICY "Users can update their own messages" 
ON public.global_messages FOR UPDATE 
USING (auth.uid() = sender_id AND is_community_user());

-- RLS Policies for Global Community Groups
CREATE POLICY "Community users can view public groups" 
ON public.global_community_groups FOR SELECT 
USING (is_community_user() AND (is_public OR EXISTS (
  SELECT 1 FROM public.global_group_members ggm 
  WHERE ggm.group_id = global_community_groups.id 
  AND ggm.user_id = auth.uid() 
  AND ggm.is_active = true
)));

CREATE POLICY "Community users can create groups" 
ON public.global_community_groups FOR INSERT 
WITH CHECK (auth.uid() = created_by AND is_community_user());

CREATE POLICY "Group creators can manage groups" 
ON public.global_community_groups FOR UPDATE 
USING (created_by = auth.uid() AND is_community_user());

-- RLS Policies for Global Group Members
CREATE POLICY "Community users can view group members" 
ON public.global_group_members FOR SELECT 
USING (is_community_user());

CREATE POLICY "Community users can join groups" 
ON public.global_group_members FOR INSERT 
WITH CHECK (user_id = auth.uid() AND is_community_user());

CREATE POLICY "Users can manage their own group membership" 
ON public.global_group_members FOR UPDATE 
USING (user_id = auth.uid() AND is_community_user());

-- RLS Policies for Global Community Events
CREATE POLICY "Community users can view events" 
ON public.global_community_events FOR SELECT 
USING (is_community_user());

CREATE POLICY "Community users can create events" 
ON public.global_community_events FOR INSERT 
WITH CHECK (auth.uid() = created_by AND is_community_user());

CREATE POLICY "Event creators can manage events" 
ON public.global_community_events FOR UPDATE 
USING (created_by = auth.uid() AND is_community_user());

-- RLS Policies for Global Event Participants
CREATE POLICY "Community users can view event participants" 
ON public.global_event_participants FOR SELECT 
USING (is_community_user());

CREATE POLICY "Community users can join events" 
ON public.global_event_participants FOR INSERT 
WITH CHECK (user_id = auth.uid() AND is_community_user());

CREATE POLICY "Users can manage their event participation" 
ON public.global_event_participants FOR UPDATE 
USING (user_id = auth.uid() AND is_community_user());

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_global_community_profiles_updated_at
  BEFORE UPDATE ON public.global_community_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_message_threads_updated_at
  BEFORE UPDATE ON public.global_message_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_messages_updated_at
  BEFORE UPDATE ON public.global_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_community_groups_updated_at
  BEFORE UPDATE ON public.global_community_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_community_events_updated_at
  BEFORE UPDATE ON public.global_community_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();