import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CommunityMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

export function useCommunityMembers() {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchMembers = async (search?: string) => {
    try {
      setLoading(true);
      
      // Get current user to exclude from results
      const { data: { user } } = await supabase.auth.getUser();

      if (search && search.trim()) {
        // Search visible global community profiles by display name only (RLS-safe)
        const { data, error } = await supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url')
          .eq('is_visible', true)
          .ilike('display_name', `%${search.trim()}%`)
          .order('display_name', { ascending: true })
          .limit(20);

        if (error) throw error;

        const transformedData = (data || [])
          .filter((p: any) => !user || p.user_id !== user.id)
          .map((p: any) => ({
            user_id: p.user_id,
            full_name: null,
            email: null,
            display_name: p.display_name,
            handle: null,
            avatar_url: p.avatar_url
          }));

        setMembers(transformedData);
      } else {
        // Fetch default visible community profiles
        const { data, error } = await supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url')
          .eq('is_visible', true)
          .order('display_name', { ascending: true })
          .limit(20);

        if (error) throw error;

        const transformedData = (data || [])
          .filter((p: any) => !user || p.user_id !== user.id)
          .map((p: any) => ({
            user_id: p.user_id,
            full_name: null,
            email: null,
            display_name: p.display_name,
            handle: null,
            avatar_url: p.avatar_url
          }));

        setMembers(transformedData);
      }

    } catch (error) {
      console.error('Error fetching community members:', error);
      toast({
        title: 'Failed to load members',
        description: 'Could not fetch community members',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const searchMembers = (term: string) => {
    setSearchTerm(term);
    fetchMembers(term);
  };

  const getDisplayName = (member: CommunityMember): string => {
    return member.display_name || member.full_name || member.handle || member.email || 'Unknown User';
  };

  const getInitials = (member: CommunityMember): string => {
    const name = getDisplayName(member);
    return name.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return {
    members,
    loading,
    searchTerm,
    searchMembers,
    getDisplayName,
    getInitials,
    refreshMembers: () => fetchMembers(searchTerm)
  };
}