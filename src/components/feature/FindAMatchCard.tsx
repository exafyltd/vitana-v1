/** VTID-05086 F5 — Find a Match for every screen except Home (Home keeps its NewsFeedItemCard match item) — `/me/matches`. */
import { Users } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.F5.eyebrow',
  titleKey: 'screens.vitanaCards.F5.title',
  descriptionKey: 'screens.vitanaCards.F5.description',
  actionKey: 'screens.vitanaCards.F5.action',
};

export function FindAMatchCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('F5');
  return (
    <VitanaActionCard
      cardType="F5"
      feature="find-a-match"
      copy={COPY}
      icon={Users}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
