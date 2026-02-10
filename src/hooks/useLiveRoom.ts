/**
 * Manage single live room state with mutations
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { liveRoomService, LiveRoom, CreateRoomRequest } from '@/services/liveRoomService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      toast({ title: 'Room started!' });
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to start room', description: error.message, variant: 'destructive' });
    },
  });

  // End room mutation
  const endRoomMutation = useMutation({
    mutationFn: () => liveRoomService.endRoom(roomId),
    onSuccess: () => {
      toast({ title: 'Room ended' });
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to end room', description: error.message, variant: 'destructive' });
    },
  });

  // Join room mutation
  const joinRoomMutation = useMutation({
    mutationFn: (userId: string) => liveRoomService.joinRoom(roomId, userId),
    onSuccess: () => {
      toast({ title: 'Joined room!' });
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to join room', description: error.message, variant: 'destructive' });
    },
  });

  // Leave room mutation
  const leaveRoomMutation = useMutation({
    mutationFn: () => liveRoomService.leaveRoom(roomId),
    onSuccess: () => {
      toast({ title: 'Left room' });
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to leave room', description: error.message, variant: 'destructive' });
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
      toast({ title: 'Room created!', description: `"${room.title}" is ready` });
      queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create room', description: error.message, variant: 'destructive' });
    },
  });
}
