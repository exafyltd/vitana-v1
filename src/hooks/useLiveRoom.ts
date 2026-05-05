/**
 * Manage single live room state with mutations
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { liveRoomService, LiveRoom, CreateRoomRequest } from '@/services/liveRoomService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export function useLiveRoom(roomId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch room details
  const { data: room, isLoading } = useQuery({
    queryKey: ['live-room', roomId],
    queryFn: async (): Promise<LiveRoom> => {
      const { data, error } = await supabase
        .from('live_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      return data as LiveRoom;
    },
    enabled: !!roomId,
  });

  // Start room mutation
  const startRoomMutation = useMutation({
    mutationFn: () => liveRoomService.startRoom(roomId),
    onSuccess: () => {
      notify('toasts.hooks.roomStarted');
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedStartRoom');
    },
  });

  // End room mutation
  const endRoomMutation = useMutation({
    mutationFn: () => liveRoomService.endRoom(roomId),
    onSuccess: () => {
      notify('toasts.hooks.roomEnded');
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedEndRoom');
    },
  });

  // Join room mutation
  const joinRoomMutation = useMutation({
    mutationFn: (userId: string) => liveRoomService.joinRoom(roomId, userId),
    onSuccess: () => {
      notify('toasts.hooks.joinedRoom');
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedJoinRoom');
    },
  });

  // Leave room mutation
  const leaveRoomMutation = useMutation({
    mutationFn: () => liveRoomService.leaveRoom(roomId),
    onSuccess: () => {
      notify('toasts.hooks.leftRoom');
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedLeaveRoom');
    },
  });

  return {
    room,
    isLoading,
    startRoom: startRoomMutation.mutate,
    endRoom: endRoomMutation.mutate,
    joinRoom: joinRoomMutation.mutate,
    leaveRoom: leaveRoomMutation.mutate,
    isStarting: startRoomMutation.isPending,
    isEnding: endRoomMutation.isPending,
    isJoining: joinRoomMutation.isPending,
    isLeaving: leaveRoomMutation.isPending,
  };
}

export function useCreateLiveRoom() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateRoomRequest) => liveRoomService.createRoom(request),
    onSuccess: (room) => {
      notify('toasts.hooks.roomCreated');
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedCreateRoom');
    },
  });
}
