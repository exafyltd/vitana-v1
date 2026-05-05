import { useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Video, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreatorStatus } from '@/hooks/useCreator';
import { Link } from 'react-router-dom';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface CreateLiveRoomDialogProps {
  userId: string;
  onRoomCreated: (roomId: string, roomName: string, accessLevel?: string, price?: number) => void;
}

export const CreateLiveRoomDialog = ({ userId, onRoomCreated }: CreateLiveRoomDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: creatorStatus } = useCreatorStatus();

  const canCreatePaidRoom = creatorStatus?.charges_enabled === true;

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      notifyError('toasts.common.roomNameRequired', 'toasts.common.pleaseEnterNameForYourLive');
      return;
    }

    const effectiveIsPaid = isPaid && !isIAPRestricted();

    if (effectiveIsPaid && !canCreatePaidRoom) {
      notifyError('toasts.common.paymentSetupRequired', 'toasts.common.pleaseEnablePaymentsSettingsBeforeCreating');
      return;
    }

    if (effectiveIsPaid && (!price || parseFloat(price) < 1)) {
      notifyError('toasts.common.priceRequired', 'toasts.common.pleaseEnterPriceAtLeast1');
      return;
    }

    setIsLoading(true);
    
    try {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      onRoomCreated(
        roomId,
        roomName,
        effectiveIsPaid ? 'paid' : 'free',
        effectiveIsPaid ? parseFloat(price) : undefined
      );
      setIsOpen(false);
      setRoomName('');
      setIsPaid(false);
      setPrice('');
      
      notify('toasts.common.liveRoomCreated');
    } catch (error) {
      notifyError('toasts.common.failedCreateRoom', 'toasts.common.pleaseTryAgain');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button className="gap-2">
          <Video className="h-4 w-4" />
          {t('screens.common.createLiveRoom')}
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('screens.common.createLiveRoom')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        
        <ResponsiveDialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">{t('screens.common.roomName')}</Label>
              <Input
                id="room-name"
                placeholder={t('screens.common.eGWeeklyHealthCoaching')}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>

            {!isIAPRestricted() && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="paid-toggle">{t('screens.common.paidRoom')}</Label>
                  <p className="text-xs text-muted-foreground">{t('screens.common.chargeParticipantsJoin')}</p>
                </div>
                <Switch
                  id="paid-toggle"
                  checked={isPaid}
                  onCheckedChange={setIsPaid}
                />
              </div>
            )}

            {!isIAPRestricted() && isPaid && !canCreatePaidRoom && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 p-3">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">{t('screens.common.paymentSetupRequired')}</p>
                  <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                    <Link to="/settings/billing" className="underline" onClick={() => setIsOpen(false)}>
                      {t('screens.common.enablePayments')}
                    </Link>{' '}
                    in Settings to create paid rooms.
                  </p>
                </div>
              </div>
            )}

            {!isIAPRestricted() && isPaid && canCreatePaidRoom && (
              <div className="space-y-2">
                <Label htmlFor="room-price">{t('screens.common.price')}</Label>
                <Input
                  id="room-price"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="9.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                {price && parseFloat(price) >= 1 && (
                  <p className="text-xs text-muted-foreground">
                    You'll receive ${(parseFloat(price) * 0.9).toFixed(2)} (90%)
                  </p>
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              {t('screens.common.createMultiparticipantVideoRoomForEvents')}
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={isLoading || (!isIAPRestricted() && isPaid && !canCreatePaidRoom)}
              className="w-full"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
