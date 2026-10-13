/** VTID-05086 F9 — Calendar — the member's calendar (`/calendar`). */
import { CalendarDays } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.F9.eyebrow',
  titleKey: 'screens.vitanaCards.F9.title',
  descriptionKey: 'screens.vitanaCards.F9.description',
  actionKey: 'screens.vitanaCards.F9.action',
};

export function CalendarCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('F9');
  return (
    <VitanaActionCard
      cardType="F9"
      feature="calendar"
      copy={COPY}
      icon={CalendarDays}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
