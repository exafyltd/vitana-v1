import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_offset_x: number | null;
  avatar_offset_y: number | null;
}

export function useProfilesByIds(userIds: string[]) {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  
  return useQuery({
    queryKey: ['profiles', ids.sort().join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', ids);
      
      if (error) throw error;
      return (data || []) as Profile[];
    },
    staleTime: 60_000,
  });
}
