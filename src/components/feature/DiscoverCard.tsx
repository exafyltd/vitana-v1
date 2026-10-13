/** VTID-05086 F11 — Discover — the marketplace (`/discover`). */
import { Compass } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.F11.eyebrow',
  titleKey: 'screens.vitanaCards.F11.title',
  descriptionKey: 'screens.vitanaCards.F11.description',
  actionKey: 'screens.vitanaCards.F11.action',
};

export function DiscoverCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('F11');
  return (
    <VitanaActionCard
      cardType="F11"
      feature="discover"
      copy={COPY}
      icon={Compass}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
