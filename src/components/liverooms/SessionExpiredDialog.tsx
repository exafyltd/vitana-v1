/**
 * VTID-03107 · Live Room — session-expired dialog.
 *
 * Fullscreen, NON-dismissable. Triggers when SessionTimer hits 0. Caller
 * (parent room session) should:
 *   1. Mount this dialog with open=true
 *   2. Call DailyIframe.getCallInstance()?.leave() in onClose handler
 *   3. Navigate back to /comm/live-rooms after dismiss
 */

import { useNavigate } from 'react-router-dom';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Radio, Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

interface SessionExpiredDialogProps {
  open: boolean;
  /** Called when the user dismisses. Caller should leave the room + navigate. */
  onClose: () => void;
}

export function SessionExpiredDialog({ open, onClose }: SessionExpiredDialogProps) {
  const navigate = useNavigate();
  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-w-md" hideCloseButton>
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Radio className="h-5 w-5 text-destructive" aria-hidden="true" />
            <ResponsiveDialogTitle>{t('paywall.live_room_minutes.title')}</ResponsiveDialogTitle>
          </div>
          <ResponsiveDialogDescription>{t('paywall.live_room_minutes.body')}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => {
              onClose();
              navigate('/wallet/subscriptions?from=live-room-expired');
            }}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('paywall.ctaUpgrade')}
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full">
            {t('paywall.live_room_minutes.wrapUp')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
