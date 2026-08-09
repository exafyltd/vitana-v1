/**
 * Hook to fetch and manage the current user's permanent live room
 * VTID-01228: Session-based Live Room management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { liveRoomService, type MyRoomResponse, type CreateSessionRequest, type RoomStateResponse } from '@/services/liveRoomService';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export function useMyRoom() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-room'],
    queryFn: () => liveRoomService.getMyRoom(),
    enabled: !!user,
    staleTime: 30_000,
    retry: 2,
    meta: { errorMessage: 'Failed to fetch permanent room from gateway' },
  });
}

export function useRoomState(roomId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['room-state', roomId],
    queryFn: (): Promise<RoomStateResponse> => liveRoomService.getRoomState(roomId!),
    enabled: !!roomId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.room?.status;
      // Poll every 5s while live or lobby, stop otherwise
      return status === 'live' || status === 'lobby' ? 5_000 : false;
    },
    staleTime: 3_000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, request }: { roomId: string; request: CreateSessionRequest }) =>
      liveRoomService.createSession(roomId, request),
    // User-facing success/error messaging is owned by the caller (GoLivePopup):
    // it shows a localized "scheduled" toast (or navigates the host into the room),
    // and runs the 409 "room not idle" cancel-and-retry recovery. Surfacing toasts
    // here was wrong on both ends: the onError fired a premature
    // "Sitzung konnte nicht erstellt werden" while the popup was about to retry and
    // succeed, and the onSuccess fired a duplicate, hardcoded-English
    // "Session scheduled!". We only own cache invalidation here.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-room'] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room-state'] });
      // The community Live Rooms list reads ['live-streams', 'scheduled'|'live'].
      // Without invalidating it the CREATOR keeps her stale pre-create cache
      // (global staleTime 2m, refetchOnWindowFocus off) and never sees her own
      // just-scheduled room — while everyone else fetches fresh on mount and sees
      // it immediately. Invalidate so the host's open list refetches too.
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useEndRoom() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => liveRoomService.endRoom(roomId),
    onSuccess: (_data, roomId) => {
      notify('toasts.hooks.roomEnded', 'toasts.hooks.yourSessionHasEnded');
      // Gateway handles DB cleanup (current_session_id + community_live_streams)
      // Removed redundant direct DB writes that caused deadlock (40P01)
      queryClient.invalidateQueries({ queryKey: ['my-room'] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room-state'] });
      // Refresh the community Live Rooms list so the ended room drops off the host's view.
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedEndRoom');
    },
  });
}

export function useCancelRoom() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (roomId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return liveRoomService.cancelRoom(roomId, user.id);
    },
    onSuccess: () => {
      notify('toasts.hooks.sessionCancelled');
      queryClient.invalidateQueries({ queryKey: ['my-room'] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room-state'] });
      // Refresh the community Live Rooms list so the cancelled room drops off the host's view.
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedCancel');
    },
  });
}
