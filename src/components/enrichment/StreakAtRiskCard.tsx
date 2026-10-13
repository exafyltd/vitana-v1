/**
 * VTID-05143 Phase 3 G3 — Streak at Risk. Shown when the member's diary
 * streak is over 3 days and yesterday has no entry (gateway trigger); shows
 * the streak when the gateway sends `params.streak` and opens today's diary
 * (`/daily-diary`).
 */
import { Mic } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';
import { boostSubtext, readPositiveCount } from './boost-metric';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.G3.eyebrow',
  titleKey: 'screens.vitanaCards.G3.title',
  descriptionKey: 'screens.vitanaCards.G3.description',
  actionKey: 'screens.vitanaCards.G3.action',
};

export function StreakAtRiskCard({ title, description, params, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('G3');
  const message = description?.trim() || t(COPY.descriptionKey);
  return (
    <VitanaActionCard
      cardType="G3"
      feature="daily-diary"
      copy={COPY}
      icon={Mic}
      title={title}
      description={boostSubtext('screens.vitanaCards.G3.metric', message, readPositiveCount(params, 'streak'), 'count')}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
