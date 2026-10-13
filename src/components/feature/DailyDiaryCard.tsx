/** VTID-05086 F3 — Daily Diary — record today's entry (`/daily-diary`). */
import { Mic } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.F3.eyebrow',
  titleKey: 'screens.vitanaCards.F3.title',
  descriptionKey: 'screens.vitanaCards.F3.description',
  actionKey: 'screens.vitanaCards.F3.action',
};

export function DailyDiaryCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('F3');
  return (
    <VitanaActionCard
      cardType="F3"
      feature="daily-diary"
      copy={COPY}
      icon={Mic}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
