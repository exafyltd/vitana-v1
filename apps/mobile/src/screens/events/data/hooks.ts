/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — React Query
 * hooks over the events and game data. Query keys follow the web hooks
 * (`global-community-events`, `following-feed`, `event-game`, …). The member
 * comes from the native auth context and the tenant from the native tenant context.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/AuthProvider';
import { useTenant } from '../../../identity/TenantProvider';
import {
  createCommunityEvent,
  deleteCommunityEvent,
  fetchCommunityEvents,
  fetchFollowingFeed,
  resolvePublicEvent,
  updateCommunityEvent,
  type EventInput,
} from './events';
import { fetchEventGame, fetchEventGameFlag, fetchJoinState, fetchLeaderboard, joinEventGame } from './eventGame';

const EVENTS_KEY = 'global-community-events';

export function useCommunityEvents() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: [EVENTS_KEY, userId ?? 'anonymous'],
    queryFn: () => fetchCommunityEvents(userId),
  });
  return {
    events: query.data ?? [],
    loading: query.isPending,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useFollowingFeed() {
  const { user } = useAuth();
  const viewer = user?.id;
  const query = useQuery({
    queryKey: ['following-feed', viewer],
    queryFn: () => fetchFollowingFeed(viewer),
    enabled: !!viewer,
    staleTime: 2 * 60 * 1000,
  });
  return {
    followingIds: query.data?.followingIds ?? [],
    profiles: query.data?.profiles ?? [],
    loading: !!viewer && query.isPending,
    isAuthenticated: !!viewer,
  };
}

export function useEventMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [EVENTS_KEY] });
  const requireUser = () => {
    if (!user) throw new Error('signed out');
    return user.id;
  };
  return {
    create: useMutation({ mutationFn: (input: EventInput) => createCommunityEvent(requireUser(), input), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, input }: { id: string; input: EventInput }) => updateCommunityEvent(id, input), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: string) => deleteCommunityEvent(id), onSuccess: invalidate }),
  };
}

export function usePublicEvent(identifier: string | undefined) {
  return useQuery({
    queryKey: ['public-event', identifier],
    queryFn: () => resolvePublicEvent(identifier ?? ''),
    enabled: !!identifier,
  });
}

export function useEventGame(slug?: string) {
  return useQuery({ queryKey: ['event-game', slug ?? 'current'], queryFn: () => fetchEventGame(slug) });
}

export function useEventGameFlag() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ['event-game-flag', activeTenantId],
    queryFn: () => fetchEventGameFlag(activeTenantId as string),
    enabled: !!activeTenantId,
    staleTime: 60 * 1000,
  });
}

export function useEventGameJoin(gameId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const joinedKey = ['event-game-joined', gameId, user?.id];
  const joined = useQuery({
    queryKey: joinedKey,
    queryFn: () => fetchJoinState(gameId as string, user?.id as string),
    enabled: !!gameId && !!user?.id,
  });
  const join = useMutation({
    mutationFn: () => {
      if (!gameId || !user?.id) throw new Error('signed out');
      return joinEventGame(gameId, user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: joinedKey }),
  });
  return { joined: joined.data === true, join };
}

export function useEventGameLeaderboard(gameId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['event-game-leaderboard', gameId],
    queryFn: () => fetchLeaderboard(gameId as string),
    enabled: !!gameId && enabled,
  });
}
