/**
 * VTID-05085 E6 — Connect Instagram. Starts the gateway OAuth flow
 * (GET /api/v1/social-accounts/connect/instagram) the connected-apps hub uses; the page
 * leaves for the provider's consent screen.
 */
import { Camera } from 'lucide-react';
import { notifyError } from '@/lib/i18n-toast';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useStartInstagramConnect } from '@/hooks/useGoogleConnect';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowConnect',
  titleKey: 'screens.vitanaCards.E6.title',
  descriptionKey: 'screens.vitanaCards.E6.description',
  actionKey: 'screens.vitanaCards.E6.action',
};

export function ConnectInstagramCard({ title, description, onDismiss }: VitanaCardProps) {
  const start = useStartInstagramConnect();
  const connect = () =>
    start.mutate(undefined, {
      onError: () => notifyError('toasts.vitanaCards.connectFailed'),
    });
  return (
    <VitanaActionCard
      cardType="E6"
      feature="social-connect"
      copy={COPY}
      icon={Camera}
      title={title}
      description={description}
      onAction={connect}
      onDismiss={onDismiss}
      busy={start.isPending}
    />
  );
}
