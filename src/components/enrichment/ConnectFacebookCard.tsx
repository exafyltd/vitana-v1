/**
 * VTID-05085 E7 — Connect Facebook. Starts the gateway OAuth flow
 * (GET /api/v1/social-accounts/connect/facebook) the connected-apps hub uses; the page
 * leaves for the provider's consent screen.
 */
import { Link2 } from 'lucide-react';
import { notifyError } from '@/lib/i18n-toast';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useStartFacebookConnect } from '@/hooks/useGoogleConnect';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowConnect',
  titleKey: 'screens.vitanaCards.E7.title',
  descriptionKey: 'screens.vitanaCards.E7.description',
  actionKey: 'screens.vitanaCards.E7.action',
};

export function ConnectFacebookCard({ title, description, onDismiss }: VitanaCardProps) {
  const start = useStartFacebookConnect();
  const connect = () =>
    start.mutate(undefined, {
      onError: () => notifyError('toasts.vitanaCards.connectFailed'),
    });
  return (
    <VitanaActionCard
      cardType="E7"
      feature="social-connect"
      copy={COPY}
      icon={Link2}
      title={title}
      description={description}
      onAction={connect}
      onDismiss={onDismiss}
      busy={start.isPending}
    />
  );
}
