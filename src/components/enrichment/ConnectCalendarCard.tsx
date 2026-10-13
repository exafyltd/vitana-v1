/** VTID-05085 E8 — Connect Your Calendar — the connected-apps hub (`/connectors`). */
import { CalendarDays } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowConnect',
  titleKey: 'screens.vitanaCards.E8.title',
  descriptionKey: 'screens.vitanaCards.E8.description',
  actionKey: 'screens.vitanaCards.E8.action',
};

export function ConnectCalendarCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('E8');
  return (
    <VitanaActionCard
      cardType="E8"
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
