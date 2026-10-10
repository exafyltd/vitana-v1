import { useCallback, useEffect, useState } from 'react';
import { BellOff, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { isAppilix, registerAppilixIdentity } from '@/lib/appilix';
import { pushNotificationManager } from '@/lib/pushNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';

/**
 * VTID-05028 — "Turn on notifications" card.
 *
 * Shown only inside the Appilix app, on the notifications panel, when the
 * signed-in member has no live (non-revoked) `user_device_tokens` row — i.e.
 * the app never managed to register this phone for push. Browsers never see
 * it (web push depends on FCM, which is out of scope here).
 *
 * "Try again" re-sends the Appilix identity and re-runs the push manager's
 * subscribe(), then re-checks. Dismiss hides it for 7 days (localStorage).
 */

export const TURN_ON_NOTIFICATIONS_DISMISS_KEY = 'vitana.turnOnNotificationsCard.dismissedAt';
export const TURN_ON_NOTIFICATIONS_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function isTurnOnNotificationsDismissed(now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(TURN_ON_NOTIFICATIONS_DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && now - at < TURN_ON_NOTIFICATIONS_DISMISS_MS;
  } catch {
    return false;
  }
}

function rememberDismissed(): void {
  try {
    localStorage.setItem(TURN_ON_NOTIFICATIONS_DISMISS_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — the card simply hides for this session */
  }
}

export function TurnOnNotificationsCard() {
  const { user } = useAuth();
  const [inApp] = useState(() => isAppilix());
  const [dismissed, setDismissed] = useState(() => isTurnOnNotificationsDismissed());
  // null = unknown (not checked yet, or the read failed) → card stays hidden.
  const [hasLiveToken, setHasLiveToken] = useState<boolean | null>(null);
  const [retrying, setRetrying] = useState(false);

  const userId = user?.id;

  const checkToken = useCallback(async () => {
    if (!userId) return;
    try {
      // Same cast as PushDiagnostics.tsx: revoked_at is not in the generated types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('user_device_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .limit(1);
      if (error) {
        setHasLiveToken(null);
        return;
      }
      setHasLiveToken((data?.length ?? 0) > 0);
    } catch {
      setHasLiveToken(null);
    }
  }, [userId]);

  useEffect(() => {
    if (!inApp || dismissed) return;
    void checkToken();
  }, [inApp, dismissed, checkToken]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (userId) registerAppilixIdentity(userId);
      await pushNotificationManager.subscribe();
    } catch {
      /* subscribe() already logs; the re-check below decides visibility */
    }
    await checkToken();
    setRetrying(false);
  };

  const handleDismiss = () => {
    rememberDismissed();
    setDismissed(true);
  };

  if (!inApp || dismissed || !userId || hasLiveToken !== false) return null;

  return (
    <div className="shrink-0 px-3 pt-3" data-testid="turn-on-notifications-card">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <BellOff className="h-5 w-5 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex-1 min-w-0 text-start space-y-1">
              <p className="text-sm font-semibold">{t('screens.notifications.turnOnTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('screens.notifications.turnOnBody')}</p>
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={retrying}
                  data-testid="turn-on-notifications-retry"
                >
                  <RefreshCw className={`h-3.5 w-3.5 me-1.5 ${retrying ? 'animate-spin' : ''}`} />
                  {t('screens.notifications.turnOnTryAgain')}
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 -me-1 -mt-1"
              onClick={handleDismiss}
              title={t('screens.notifications.turnOnDismiss')}
              aria-label={t('screens.notifications.turnOnDismiss')}
              data-testid="turn-on-notifications-dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TurnOnNotificationsCard;
