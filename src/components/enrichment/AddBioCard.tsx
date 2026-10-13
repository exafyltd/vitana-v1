/** VTID-05085 E2 — Add Your Bio — opens the About editor (`/me/profile#about`). */
import { PenLine } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowProfile',
  titleKey: 'screens.vitanaCards.E2.title',
  descriptionKey: 'screens.vitanaCards.E2.description',
  actionKey: 'screens.vitanaCards.E2.action',
};

export function AddBioCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('E2');
  return (
    <VitanaActionCard
      cardType="E2"
      feature="profile-setup"
      copy={COPY}
      icon={PenLine}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
