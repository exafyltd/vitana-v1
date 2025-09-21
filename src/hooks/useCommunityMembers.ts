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
      
      if (search && search.trim()) {
        // Use RPC function for searching
        const { data, error } = await supabase
          .rpc('search_global_directory', { search_term: search.trim() });

        if (error) throw error;

        // Transform the data to match our interface
        const transformedData = data?.map((user: any) => ({
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          display_name: user.display_name,
          handle: null, // Not returned by search function
          avatar_url: user.avatar_url
        })) || [];

        setMembers(transformedData);
      } else {
        // Fetch visible community profiles when no search term
        const { data, error } = await supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url, bio')
          .eq('is_visible', true)
          .order('display_name', { ascending: true })
          .limit(20);

        if (error) throw error;

        // Transform to match interface
        const transformedData = data?.map((profile: any) => ({
          user_id: profile.user_id,
          full_name: null,
          email: null,
          display_name: profile.display_name,
          handle: null,
          avatar_url: profile.avatar_url
        })) || [];

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