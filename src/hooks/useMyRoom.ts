/**
 * Hook to fetch and manage the current user's permanent live room
 * VTID-01228: Session-based Live Room management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { liveRoomService, type MyRoomResponse, type CreateSessionRequest, type RoomStateResponse } from '@/services/liveRoomService';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';

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
      const isScheduled = !!variables.request.scheduled_for;
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
      toast({
        title: 'Failed to create session',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useEndRoom() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => liveRoomService.endRoom(roomId),
    onSuccess: () => {
      toast({ title: 'Room ended', description: 'Your session has ended' });
      queryClient.invalidateQueries({ queryKey: ['my-room'] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room-state'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to end room', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCancelRoom() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => liveRoomService.cancelRoom(roomId),
    onSuccess: () => {
      toast({ title: 'Session cancelled' });
      queryClient.invalidateQueries({ queryKey: ['my-room'] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room-state'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to cancel', description: error.message, variant: 'destructive' });
    },
  });
}
