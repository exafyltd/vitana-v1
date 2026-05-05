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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, request }: { roomId: string; request: CreateSessionRequest }) =>
      liveRoomService.createSession(roomId, request),
    onSuccess: (data, variables) => {
      const isScheduled = data.status === 'scheduled';
      toast({
        title: isScheduled ? 'Session scheduled!' : 'You are live!',
        description: isScheduled
          ? 'Your live room has been scheduled'
          : 'Your session has started',
      });
      queryClient.invalidateQueries({ queryKey: ['my-room'] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room-state'] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedCreateSession');
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
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedCancel');
    },
  });
}
