/**
 * Stripe payment flow hook
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { useMutation } from '@tanstack/react-query';
import { liveRoomService } from '@/services/liveRoomService';
import { useToast } from '@/hooks/use-toast';
import { notifyError } from '@/lib/i18n-toast';

export function useStripePayment(roomId: string, userId: string) {
  const { toast } = useToast();

  const purchaseMutation = useMutation({
    mutationFn: () => liveRoomService.purchaseAccess(roomId, userId),
    onError: (error: Error) => {
      notifyError('toasts.hooks.paymentFailed');
    },
  });

  return {
    initiatePurchase: purchaseMutation.mutate,
    clientSecret: purchaseMutation.data?.client_secret,
    amount: purchaseMutation.data?.amount,
    isPending: purchaseMutation.isPending,
    error: purchaseMutation.error,
  };
}
