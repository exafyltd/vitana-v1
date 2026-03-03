
-- Auto-add creator as admin member when a group is created
CREATE OR REPLACE FUNCTION public.auto_add_group_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.global_community_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_group_creator
AFTER INSERT ON public.global_community_groups
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_group_creator_as_member();

-- Fix the existing group that's missing its creator membership
INSERT INTO public.global_community_group_members (group_id, user_id, role)
SELECT id, created_by, 'admin'
FROM public.global_community_groups g
WHERE NOT EXISTS (
  SELECT 1 FROM public.global_community_group_members m 
  WHERE m.group_id = g.id AND m.user_id = g.created_by
)
ON CONFLICT DO NOTHING;
