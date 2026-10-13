/**
 * VTID-05085 E10 — Enable Notifications.
 *
 * Reuses the existing push flow, nothing new:
 * - browser: `pushNotificationManager.initialize()` then `subscribe()` — one
 *   tap, the OS prompt, the FCM token registered with the gateway
 *   (EnableRemindersPrompt);
 * - Appilix app: re-send the Appilix identity and `subscribe()`
 *   (TurnOnNotificationsCard, VTID-05028).
 * The card disappears once the server sees a live device token.
 */
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { isAppilix, registerAppilixIdentity } from '@/lib/appilix';
import { pushNotificationManager } from '@/lib/pushNotifications';
import { notifyError, notifySuccess } from '@/lib/i18n-toast';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useInvalidateEnrichmentCards } from '@/hooks/useEnrichmentCards';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowNotifications',
  titleKey: 'screens.vitanaCards.E10.title',
  descriptionKey: 'screens.vitanaCards.E10.description',
  actionKey: 'screens.vitanaCards.E10.action',
};

export async function enableNotifications(userId: string | undefined): Promise<boolean> {
  if (isAppilix()) {
    if (userId) registerAppilixIdentity(userId);
    return !!(await pushNotificationManager.subscribe());
  }
  const ok = await pushNotificationManager.initialize();
  if (!ok) return false;
  return !!(await pushNotificationManager.subscribe());
}

export function EnableNotificationsCard({ title, description, onDismiss }: VitanaCardProps) {
  const { user } = useAuth();
  const refresh = useInvalidateEnrichmentCards();
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    setBusy(true);
    try {
      const on = await enableNotifications(user?.id);
      if (on) notifySuccess('toasts.vitanaCards.notificationsEnabled');
      else notifyError('toasts.vitanaCards.notificationsFailed');
    } catch {
      notifyError('toasts.vitanaCards.notificationsFailed');
    } finally {
      setBusy(false);
      refresh();
    }
  };

  return (
    <VitanaActionCard
      cardType="E10"
      feature="profile-setup"
      copy={COPY}
      icon={Bell}
      title={title}
      description={description}
      onAction={() => void enable()}
      onDismiss={onDismiss}
      busy={busy}
    />
  );
}
