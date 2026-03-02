import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateGroupImage } from "@/lib/groupCardTransformers";

export interface DirectoryGroup {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_url: string | null;
  avatar_url: string | null;
  member_count: number;
  is_public: boolean;
  created_at: string;
}

export function useGroupDirectory(search?: string) {
  return useQuery({
    queryKey: ['group-directory', search],
    queryFn: async (): Promise<DirectoryGroup[]> => {
      let query = supabase
        .from('global_community_groups')
        .select('id, name, description, category, cover_url, avatar_url, member_count, is_public, created_at')
        .eq('status', 'approved')
        .eq('is_public', true)
        .order('member_count', { ascending: false });

      if (search && search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useGroupDirectory] Error:', error);
        throw error;
      }

      return (data || []).map((g) => ({
        ...g,
        cover_url: g.cover_url || generateGroupImage(g.id),
        avatar_url: g.avatar_url || generateGroupImage(g.id),
      }));
    },
    staleTime: 30_000,
  });
}
