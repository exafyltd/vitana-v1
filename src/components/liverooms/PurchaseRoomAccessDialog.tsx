/**
 * Stripe payment dialog for purchasing room access
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStripePayment } from '@/hooks/useStripePayment';
import { LiveRoom } from '@/services/liveRoomService';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { StripePaymentForm } from '@/components/billing/StripePaymentForm';
import { isIAPRestricted } from '@/lib/appilix';
import { t } from '@/lib/i18n-toast';

// Load Stripe publishable key from env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PurchaseRoomAccessDialogProps {
  room: LiveRoom;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PurchaseRoomAccessDialog({
  room,
  userId,
  open,
  onOpenChange,
  onSuccess,
}: PurchaseRoomAccessDialogProps) {
  const { initiatePurchase, clientSecret, amount, isPending } = useStripePayment(room.id, userId);

  // Block paid room access on iOS (App Store Guideline 3.1.1)
  if (isIAPRestricted()) return null;

  const handlePurchase = () => {
    initiatePurchase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('screens.liverooms.purchaseAccessTitle', { title: room.title })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold">${amount?.toFixed(2) || room.metadata.price?.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">{t('screens.liverooms.onetimeAccessFee')}</p>
          </div>

          {!clientSecret && (
            <Button onClick={handlePurchase} disabled={isPending} className="w-full">
              {isPending ? 'Processing...' : 'Continue to Payment'}
            </Button>
          )}

          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripePaymentForm
                onSuccess={() => {
                  onOpenChange(false);
                  onSuccess();
                }}
              />
            </Elements>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
