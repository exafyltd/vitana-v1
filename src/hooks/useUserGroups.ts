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

      const { data, error } = await supabase
        .from('global_community_group_members')
        .select(`
          role,
          joined_at,
          group:global_community_groups (
            id,
            name,
            description,
            category,
            cover_url,
            avatar_url,
            member_count
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('[useUserGroups] Error fetching groups:', error);
        throw error;
      }

      return (data || [])
        .filter((row: any) => row.group)
        .map((row: any) => ({
          id: row.group.id,
          name: row.group.name,
          description: row.group.description,
          category: row.group.category,
          cover_url: row.group.cover_url,
          avatar_url: row.group.avatar_url || generateGroupImage(row.group.id),
          member_count: row.group.member_count || 0,
          role: row.role,
          joined_at: row.joined_at,
        }));
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
