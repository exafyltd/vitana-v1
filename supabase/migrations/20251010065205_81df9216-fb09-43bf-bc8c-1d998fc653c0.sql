-- Phase 1: Community Supervision - Robust Table & Column Creation

-- 1) Create content_reports (full table)
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  action_taken TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2) Create or update global_community_groups  
CREATE TABLE IF NOT EXISTS public.global_community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 0,
  max_members INTEGER,
  is_private BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[],
  settings JSONB DEFAULT '{"allow_posts": true, "require_approval": false, "allow_invites": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add missing columns to global_community_groups if they don't exist
DO $cols$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='global_community_groups' AND column_name='status') THEN
    ALTER TABLE public.global_community_groups ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='global_community_groups' AND column_name='moderation_notes') THEN
    ALTER TABLE public.global_community_groups ADD COLUMN moderation_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='global_community_groups' AND column_name='moderated_by') THEN
    ALTER TABLE public.global_community_groups ADD COLUMN moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='global_community_groups' AND column_name='moderated_at') THEN
    ALTER TABLE public.global_community_groups ADD COLUMN moderated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $cols$;

-- 3) Create members table
CREATE TABLE IF NOT EXISTS public.global_community_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.global_community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 4) Add moderation columns to global_community_events
DO $cols$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='global_community_events' AND column_name='moderation_notes') THEN
    ALTER TABLE public.global_community_events ADD COLUMN moderation_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='global_community_events' AND column_name='moderated_by') THEN
    ALTER TABLE public.global_community_events ADD COLUMN moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='global_community_events' AND column_name='moderated_at') THEN
    ALTER TABLE public.global_community_events ADD COLUMN moderated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $cols$;

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON public.content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_global_community_groups_status ON public.global_community_groups(status);
CREATE INDEX IF NOT EXISTS idx_global_community_groups_category ON public.global_community_groups(category);
CREATE INDEX IF NOT EXISTS idx_global_community_group_members_group ON public.global_community_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_global_community_group_members_user ON public.global_community_group_members(user_id);

-- 6) Trigger
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.global_community_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.global_community_groups SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$func$;

DROP TRIGGER IF EXISTS trigger_update_group_member_count ON public.global_community_group_members;
CREATE TRIGGER trigger_update_group_member_count AFTER INSERT OR DELETE ON public.global_community_group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- 7) Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_community_group_members ENABLE ROW LEVEL SECURITY;

-- 8) RLS Policies
DROP POLICY IF EXISTS "Users can create content reports" ON public.content_reports;
CREATE POLICY "Users can create content reports" ON public.content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Staff and admins can view all reports" ON public.content_reports;
CREATE POLICY "Staff and admins can view all reports" ON public.content_reports FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role IN ('staff', 'admin') AND m.status = 'active') OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true);

DROP POLICY IF EXISTS "Staff and admins can update reports" ON public.content_reports;
CREATE POLICY "Staff and admins can update reports" ON public.content_reports FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role IN ('staff', 'admin') AND m.status = 'active') OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true);

DROP POLICY IF EXISTS "Community users can view approved groups" ON public.global_community_groups;
CREATE POLICY "Community users can view approved groups" ON public.global_community_groups FOR SELECT TO authenticated USING (status = 'approved' AND is_community_user());

DROP POLICY IF EXISTS "Community users can create groups" ON public.global_community_groups;
CREATE POLICY "Community users can create groups" ON public.global_community_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND is_community_user());

DROP POLICY IF EXISTS "Group creators can update their groups" ON public.global_community_groups;
CREATE POLICY "Group creators can update their groups" ON public.global_community_groups FOR UPDATE TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Staff and admins can view all groups" ON public.global_community_groups;
CREATE POLICY "Staff and admins can view all groups" ON public.global_community_groups FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role IN ('staff', 'admin') AND m.status = 'active') OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true);

DROP POLICY IF EXISTS "Staff and admins can moderate groups" ON public.global_community_groups;
CREATE POLICY "Staff and admins can moderate groups" ON public.global_community_groups FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role IN ('staff', 'admin') AND m.status = 'active') OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true);

DROP POLICY IF EXISTS "Group members can view group membership" ON public.global_community_group_members;
CREATE POLICY "Group members can view group membership" ON public.global_community_group_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.global_community_group_members gm WHERE gm.group_id = global_community_group_members.group_id AND gm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can join groups" ON public.global_community_group_members;
CREATE POLICY "Users can join groups" ON public.global_community_group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group admins can manage members" ON public.global_community_group_members;
CREATE POLICY "Group admins can manage members" ON public.global_community_group_members FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.global_community_group_members gm WHERE gm.group_id = global_community_group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin')));