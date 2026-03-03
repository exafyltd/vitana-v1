
-- 1. Create security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.global_community_group_members
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.global_community_group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role IN ('owner', 'admin')
  )
$$;

-- 2. Drop broken policies on global_community_group_members
DROP POLICY IF EXISTS "Group members can view group membership" ON public.global_community_group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON public.global_community_group_members;

-- 3. Recreate with security definer functions
CREATE POLICY "Group members can view group membership"
ON public.global_community_group_members FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group admins can manage members"
ON public.global_community_group_members FOR ALL
USING (public.is_group_admin(group_id, auth.uid()));

-- 4. Fix group_posts policies that also reference the members table
DROP POLICY IF EXISTS "Members can create group posts" ON public.group_posts;
DROP POLICY IF EXISTS "Members can view group posts" ON public.group_posts;

CREATE POLICY "Members can create group posts"
ON public.group_posts FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can view group posts"
ON public.group_posts FOR SELECT
USING (
  public.is_group_member(group_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.global_community_groups g WHERE g.id = group_posts.group_id AND g.is_public = true)
);

-- 5. Fix group_post_comments SELECT policy
DROP POLICY IF EXISTS "Users can view comments on accessible posts" ON public.group_post_comments;

CREATE POLICY "Users can view comments on accessible posts"
ON public.group_post_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_posts gp
    JOIN public.global_community_groups g ON g.id = gp.group_id
    WHERE gp.id = group_post_comments.post_id
    AND (g.is_public = true OR public.is_group_member(g.id, auth.uid()))
  )
);
