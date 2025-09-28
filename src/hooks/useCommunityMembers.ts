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
      console.log('useCommunityMembers: fetchMembers called with search:', search);
      
      // Get current user to exclude from results
      const { data: { user } } = await supabase.auth.getUser();

      if (search && search.trim()) {
        console.log('useCommunityMembers: Performing search for:', search.trim());
        // Search visible global community profiles with profile data including handle
        const { data, error } = await supabase
          .from('global_community_profiles')
          .select(`
            user_id, 
            display_name, 
            avatar_url,
            profiles!inner(handle, full_name, email)
          `)
          .eq('is_visible', true)
          .ilike('display_name', `%${search.trim()}%`)
          .order('display_name', { ascending: true })
          .limit(20);

        if (error) throw error;
        console.log('useCommunityMembers: Search results:', data);

        const transformedData = (data || [])
          .filter((p: any) => !user || p.user_id !== user.id)
          .map((p: any) => ({
            user_id: p.user_id,
            full_name: p.profiles?.full_name || null,
            email: p.profiles?.email || null,
            display_name: p.display_name,
            handle: p.profiles?.handle || null,
            avatar_url: p.avatar_url
          }));

        console.log('useCommunityMembers: Transformed search results:', transformedData);
        setMembers(transformedData);
      } else {
        console.log('useCommunityMembers: Fetching default members');
        // Fetch default visible community profiles with profile data including handle
        const { data, error } = await supabase
          .from('global_community_profiles')
          .select(`
            user_id, 
            display_name, 
            avatar_url,
            profiles!inner(handle, full_name, email)
          `)
          .eq('is_visible', true)
          .order('display_name', { ascending: true })
          .limit(20);

        if (error) throw error;
        console.log('useCommunityMembers: Default results:', data);

        const transformedData = (data || [])
          .filter((p: any) => !user || p.user_id !== user.id)
          .map((p: any) => ({
            user_id: p.user_id,
            full_name: p.profiles?.full_name || null,
            email: p.profiles?.email || null,
            display_name: p.display_name,
            handle: p.profiles?.handle || null,
            avatar_url: p.avatar_url
          }));

        console.log('useCommunityMembers: Transformed default results:', transformedData);
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
    console.log('useCommunityMembers: searchMembers called with term:', term);
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