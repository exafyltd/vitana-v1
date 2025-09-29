import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';
import { debounce } from '@/utils/performanceOptimization';

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
  const { user, loading: authLoading } = useAuth();
  
  // Cache for search results (5 minutes)
  const searchCache = useRef<Map<string, {data: CommunityMember[], timestamp: number}>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchMembers = useCallback(async (search?: string) => {
    try {
      // Check cache first
      const cacheKey = search?.trim() || 'default';
      const cachedResult = searchCache.current.get(cacheKey);
      const now = Date.now();
      
      if (cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
        console.log('useCommunityMembers: Using cached results for:', cacheKey);
        setMembers(cachedResult.data);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      console.log('useCommunityMembers: fetchMembers called with search:', search);
      
      // Get current user to exclude from results
      const { data: { user } } = await supabase.auth.getUser();

      if (search && search.trim()) {
        console.log('useCommunityMembers: Performing search for:', search.trim());
        // Search visible global community profiles
        const { data, error } = await supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url')
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
            full_name: null,
            email: null,
            display_name: p.display_name,
            handle: null,
            avatar_url: p.avatar_url
          }));

        console.log('useCommunityMembers: Transformed search results:', transformedData);
        setMembers(transformedData);
        
        // Cache the results
        searchCache.current.set(cacheKey, {
          data: transformedData,
          timestamp: now
        });
      } else {
        console.log('useCommunityMembers: Fetching default members');
        // Fetch default visible community profiles
        const { data, error } = await supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url')
          .eq('is_visible', true)
          .order('display_name', { ascending: true })
          .limit(20);

        if (error) throw error;
        console.log('useCommunityMembers: Default results:', data);

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

        console.log('useCommunityMembers: Transformed default results:', transformedData);
        setMembers(transformedData);
        
        // Cache the results
        searchCache.current.set(cacheKey, {
          data: transformedData,
          timestamp: now
        });
      }

    } catch (error) {
      console.error('Error fetching community members:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      toast({
        title: 'Failed to load members',
        description: `Could not fetch community members: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch members when user is authenticated
    if (!authLoading && user) {
      fetchMembers();
    } else if (!authLoading && !user) {
      // User is not authenticated, clear members and set loading to false
      setMembers([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  // Debounced search function
  const debouncedFetchMembers = useCallback(
    debounce((term: string) => {
      if (user && term.length >= 2) {
        fetchMembers(term);
      } else if (user && term.length === 0) {
        fetchMembers();
      }
    }, 300),
    [user, fetchMembers]
  );

  const searchMembers = useCallback((term: string) => {
    console.log('useCommunityMembers: searchMembers called with term:', term);
    setSearchTerm(term);
    
    // Only search if user is authenticated and term is long enough
    if (user) {
      if (term.trim().length >= 2 || term.trim().length === 0) {
        debouncedFetchMembers(term);
      }
    }
  }, [user, debouncedFetchMembers]);

  const getDisplayName = (member: CommunityMember): string => {
    return member.display_name || 'Unknown User';
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
    loading: loading || authLoading,
    searchTerm,
    searchMembers,
    getDisplayName,
    getInitials,
    refreshMembers: () => {
      if (user) {
        fetchMembers(searchTerm);
      }
    }
  };
}