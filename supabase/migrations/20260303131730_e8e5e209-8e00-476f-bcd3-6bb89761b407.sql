-- Fix stale member_count: sync with actual member rows
UPDATE public.global_community_groups 
SET member_count = (
  SELECT count(*) FROM public.global_community_group_members 
  WHERE group_id = global_community_groups.id
)
WHERE id = '4efc49e5-a622-4e19-b122-7eec6b9a6f5b';

-- Also add a trigger to keep member_count in sync automatically
CREATE OR REPLACE FUNCTION public.sync_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE global_community_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE global_community_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_member_count ON public.global_community_group_members;
CREATE TRIGGER trg_sync_group_member_count
AFTER INSERT OR DELETE ON public.global_community_group_members
FOR EACH ROW EXECUTE FUNCTION public.sync_group_member_count();
