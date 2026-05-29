/**
 * VTID-03107 · Live Room — 5-minute warning dialog.
 *
 * Full modal triggered when SessionTimer fires onWarn5(). Two CTAs: Upgrade
 * or Continue. Dismissable.
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
import { Clock, Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

interface SessionWarn5DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionWarn5Dialog({ open, onOpenChange }: SessionWarn5DialogProps) {
  const navigate = useNavigate();
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <ResponsiveDialogTitle>{t('paywall.live_room_minutes.title')}</ResponsiveDialogTitle>
          </div>
          <ResponsiveDialogDescription>{t('paywall.live_room_minutes.body')}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate('/wallet/subscriptions?from=live-room-5min');
            }}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('paywall.ctaUpgrade')}
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="ghost" className="w-full">
            {t('paywall.live_room_minutes.wrapUp')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
