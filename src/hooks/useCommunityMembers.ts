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
      
      let query = supabase
        .from('profiles')
        .select('user_id, full_name, email, display_name, handle, avatar_url')
        .not('full_name', 'is', null);

      // Exclude current user from results
      if (user) {
        query = query.neq('user_id', user.id);
      }

      // Add search functionality
      if (search && search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%,handle.ilike.%${search}%`);
      }

      const { data, error } = await query
        .order('full_name', { ascending: true })
        .limit(20);

      if (error) throw error;

      setMembers(data || []);
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