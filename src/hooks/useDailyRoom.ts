/**
 * Daily.co video integration hook
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { liveRoomService } from '@/services/liveRoomService';
import { useToast } from '@/hooks/use-toast';

export function useDailyRoom(roomId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDailyRoomMutation = useMutation({
    mutationFn: () => liveRoomService.createDailyRoom(roomId),
    onSuccess: (data) => {
      toast({
        title: 'Video room ready!',
        description: data.already_existed ? 'Using existing room' : 'Created new video room',
      });
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create video room', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDailyRoomMutation = useMutation({
    mutationFn: () => liveRoomService.deleteDailyRoom(roomId),
    onSuccess: () => {
      toast({ title: 'Video room deleted' });
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete video room', description: error.message, variant: 'destructive' });
    },
  });

  return {
    createDailyRoom: createDailyRoomMutation.mutate,
    deleteDailyRoom: deleteDailyRoomMutation.mutate,
    isCreatingDaily: createDailyRoomMutation.isPending,
    isDeletingDaily: deleteDailyRoomMutation.isPending,
  };
}
