import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecipientData {
  id: string;
  name: string;
  avatar?: string;
}

// Global cache for recipient data to prevent redundant fetches
const recipientCache = new Map<string, { data: RecipientData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Batch requests to avoid multiple simultaneous fetches for the same user
const pendingRequests = new Map<string, Promise<RecipientData | null>>();

export const useRecipientData = (recipientId?: string | null, threadId?: string, preloadedData?: RecipientData | null) => {
  const [recipient, setRecipient] = useState<RecipientData | null>(preloadedData || null);
  const [loading, setLoading] = useState(false);

  const fetchRecipientFromCache = useCallback(async (userId: string): Promise<RecipientData | null> => {
    const cacheKey = userId;
    const cached = recipientCache.get(cacheKey);
    
    // Return cached data if it's still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Check if there's already a pending request for this user
    if (pendingRequests.has(cacheKey)) {
      return await pendingRequests.get(cacheKey)!;
    }

    // Create new request promise
    const requestPromise = (async (): Promise<RecipientData | null> => {
      try {
        // Try global profiles first, then fallback to regular profiles (parallel requests)
        const [globalResult, profilesResult] = await Promise.allSettled([
          supabase
            .from('global_community_profiles')
            .select('user_id, display_name, avatar_url')
            .eq('user_id', userId)
            .eq('is_visible', true)
            .limit(1),
          supabase
            .from('profiles')
            .select('user_id, display_name, full_name, avatar_url')
            .eq('user_id', userId)
            .limit(1)
        ]);

        let recipientData: RecipientData | null = null;

        // Check global profiles first
        if (globalResult.status === 'fulfilled' && globalResult.value.data && globalResult.value.data.length > 0) {
          const profile = globalResult.value.data[0];
          recipientData = {
            id: userId,
            name: profile.display_name || 'Unknown User',
            avatar: profile.avatar_url
          };
        } 
        // Fallback to regular profiles
        else if (profilesResult.status === 'fulfilled' && profilesResult.value.data && profilesResult.value.data.length > 0) {
          const profile = profilesResult.value.data[0];
          recipientData = {
            id: userId,
            name: profile.display_name || profile.full_name || 'Unknown User',
            avatar: profile.avatar_url
          };
        } else {
          // Final fallback
          recipientData = {
            id: userId,
            name: 'Unknown User',
            avatar: undefined
          };
        }

        // Cache the result
        if (recipientData) {
          recipientCache.set(cacheKey, { data: recipientData, timestamp: Date.now() });
        }

        return recipientData;
      } catch (error) {
        console.error('Error fetching recipient data:', error);
        return null;
      } finally {
        // Clean up pending request
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store the promise to batch identical requests
    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }, []);

  useEffect(() => {
    // If preloaded data is provided, use it immediately
    if (preloadedData) {
      setRecipient(preloadedData);
      return;
    }

    const fetchRecipientData = async () => {
      if (!recipientId && !threadId) {
        setRecipient(null);
        return;
      }

      setLoading(true);
      try {
        let targetUserId = recipientId;
        
        // If no direct recipientId but we have a threadId, get other participants
        if (!targetUserId && threadId) {
          // Try global context first, then tenant context (parallel requests)
          const [globalResult, tenantResult] = await Promise.allSettled([
            supabase.rpc('get_thread_participants_text', {
              thread_id_param: threadId,
              context_param: 'global'
            }),
            supabase.rpc('get_thread_participants_text', {
              thread_id_param: threadId,
              context_param: 'tenant'
            })
          ]);

          let participants = null;
          if (globalResult.status === 'fulfilled' && globalResult.value.data) {
            participants = globalResult.value.data;
          } else if (tenantResult.status === 'fulfilled' && tenantResult.value.data) {
            participants = tenantResult.value.data;
          }
          
          if (participants && participants.length > 0) {
            // Find the other participant (not current user)
            const { data: { user } } = await supabase.auth.getUser();
            const otherParticipant = participants.find(p => p.user_id !== user?.id);
            if (otherParticipant) {
              targetUserId = otherParticipant.user_id;
            }
          }
        }

        if (targetUserId) {
          const recipientData = await fetchRecipientFromCache(targetUserId);
          setRecipient(recipientData);
        }
      } catch (error) {
        console.error('Error fetching recipient data:', error);
        setRecipient(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipientData();
  }, [recipientId, threadId, preloadedData, fetchRecipientFromCache]);

  return { recipient, loading };
};