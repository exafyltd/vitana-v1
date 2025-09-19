/**
 * Secure React hooks that use the hardened accessor functions
 * Migration helpers for existing components
 */

import { useState, useEffect, useCallback } from 'react';
import { Threads, ProfileDirectory, type ThreadParticipant, type MinimalProfile } from './secure-accessors';

/**
 * Hook for fetching thread participants securely
 * Replaces direct queries to global_thread_participants/thread_participants
 */
export function useThreadParticipants(threadId?: string | null, context: 'global' | 'tenant' = 'global') {
  const [participants, setParticipants] = useState<ThreadParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    if (!threadId) {
      setParticipants([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await Threads.getParticipants(threadId, context);
      setParticipants(data);
    } catch (err) {
      console.error('Error fetching thread participants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch participants');
      setParticipants([]);
    } finally {
      setIsLoading(false);
    }
  }, [threadId, context]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    isLoading,
    error,
    refetch: fetchParticipants
  };
}

/**
 * Hook for searching profiles securely  
 * Replaces open-ended profile directory queries
 */
export function useProfileSearch() {
  const [results, setResults] = useState<MinimalProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(async (query: string, scope: 'global' | 'tenant' = 'global') => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const data = await ProfileDirectory.searchMinimal(query.trim(), scope);
      setResults(data);
    } catch (err) {
      console.error('Error searching profiles:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isLoading,
    search,
    clear
  };
}

/**
 * Hook for fetching minimal profiles by IDs
 * Replaces direct global_community_profiles queries
 */
export function useMinimalProfiles(userIds: string[]) {
  const [profiles, setProfiles] = useState<MinimalProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfiles = useCallback(async () => {
    if (!userIds.length) {
      setProfiles([]);
      return;
    }

    try {
      setIsLoading(true);
      const data = await ProfileDirectory.getMinimalByIds(userIds);
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching minimal profiles:', err);
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [userIds]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles,
    isLoading,
    refetch: fetchProfiles
  };
}