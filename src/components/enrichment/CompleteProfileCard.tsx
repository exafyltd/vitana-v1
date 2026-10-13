/**
 * VTID-05143 Phase 3 G1 — Complete Your Profile. Shown while the member's
 * profile is under 80 % (gateway trigger); shows the completion percentage
 * when the gateway sends `params.percentage` and opens the profile editor
 * (`/me/profile` — `/me/edit` is not a route, plan §1 corrections).
 */
import { Rocket } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';
import { boostSubtext, readPercentage } from './boost-metric';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.G1.eyebrow',
  titleKey: 'screens.vitanaCards.G1.title',
  descriptionKey: 'screens.vitanaCards.G1.description',
  actionKey: 'screens.vitanaCards.G1.action',
};

export function CompleteProfileCard({ title, description, params, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('G1');
  const message = description?.trim() || t(COPY.descriptionKey);
  return (
    <VitanaActionCard
      cardType="G1"
      feature="complete-profile"
      copy={COPY}
      icon={Rocket}
      title={title}
      description={boostSubtext('screens.vitanaCards.G1.metric', message, readPercentage(params), 'percent')}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
