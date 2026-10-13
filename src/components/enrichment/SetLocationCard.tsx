/** VTID-05085 E5 — Set Your Location — opens the About editor (`/me/profile#location`). */
import { MapPin } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowProfile',
  titleKey: 'screens.vitanaCards.E5.title',
  descriptionKey: 'screens.vitanaCards.E5.description',
  actionKey: 'screens.vitanaCards.E5.action',
};

export function SetLocationCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('E5');
  return (
    <VitanaActionCard
      cardType="E5"
      feature="profile-setup"
      copy={COPY}
      icon={MapPin}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
