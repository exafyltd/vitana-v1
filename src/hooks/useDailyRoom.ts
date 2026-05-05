/**
 * Daily.co video integration hook
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { liveRoomService } from '@/services/liveRoomService';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export function useDailyRoom(roomId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDailyRoomMutation = useMutation({
    mutationFn: () => liveRoomService.createDailyRoom(roomId),
    onSuccess: (data) => {
      notify('toasts.hooks.videoRoomReady');
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedCreateVideoRoom');
    },
  });

  const deleteDailyRoomMutation = useMutation({
    mutationFn: () => liveRoomService.deleteDailyRoom(roomId),
    onSuccess: () => {
      notify('toasts.hooks.videoRoomDeleted');
      queryClient.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.failedDeleteVideoRoom');
    },
  });

  return {
    createDailyRoom: createDailyRoomMutation.mutate,
    deleteDailyRoom: deleteDailyRoomMutation.mutate,
    isCreatingDaily: createDailyRoomMutation.isPending,
    isDeletingDaily: deleteDailyRoomMutation.isPending,
  };
}
