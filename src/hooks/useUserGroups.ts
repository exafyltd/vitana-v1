import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateGroupImage } from "@/lib/groupCardTransformers";

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_url: string | null;
  avatar_url: string | null;
  member_count: number;
  role: string;
  joined_at: string;
}

export function useUserGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-groups', userId],
    queryFn: async (): Promise<UserGroup[]> => {
      if (!userId) return [];

      const { data: memberships, error: membershipsError } = await supabase
        .from('global_community_group_members')
        .select('group_id, role, joined_at')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (membershipsError) {
        console.error('[useUserGroups] Error fetching memberships:', membershipsError);
        throw membershipsError;
      }

      const rows = memberships || [];
      if (rows.length === 0) return [];

      const groupIds = rows.map((row) => row.group_id);
      const { data: groups, error: groupsError } = await supabase
        .from('global_community_groups')
        .select('id, name, description, category, cover_url, avatar_url, member_count')
        .in('id', groupIds);

      if (groupsError) {
        console.error('[useUserGroups] Error fetching group details:', groupsError);
        throw groupsError;
      }

      const groupMap = new Map((groups || []).map((group) => [group.id, group]));

      return rows
        .map((row) => {
          const group = groupMap.get(row.group_id);
          if (!group) return null;

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            category: group.category,
            cover_url: group.cover_url,
            avatar_url: group.avatar_url || generateGroupImage(group.id),
            member_count: group.member_count || 0,
            role: row.role,
            joined_at: row.joined_at,
          };
        })
        .filter((group): group is UserGroup => group !== null);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
