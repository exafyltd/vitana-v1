/**
 * VTID-05143 Phase 3 G2 — Unread Matches. Shown while the member has unread
 * match notifications (gateway trigger); shows how many when the gateway
 * sends `params.count` and opens the matches page (`/me/matches`).
 */
import { MessageCircle } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';
import { boostSubtext, readPositiveCount } from './boost-metric';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.G2.eyebrow',
  titleKey: 'screens.vitanaCards.G2.title',
  descriptionKey: 'screens.vitanaCards.G2.description',
  actionKey: 'screens.vitanaCards.G2.action',
};

export function UnreadMatchesCard({ title, description, params, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('G2');
  const message = description?.trim() || t(COPY.descriptionKey);
  return (
    <VitanaActionCard
      cardType="G2"
      feature="find-a-match"
      copy={COPY}
      icon={MessageCircle}
      title={title}
      description={boostSubtext('screens.vitanaCards.G2.metric', message, readPositiveCount(params, 'count'), 'count')}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
