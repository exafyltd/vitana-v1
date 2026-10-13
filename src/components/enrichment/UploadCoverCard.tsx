/** VTID-05085 E11 — Upload Cover Photo — opens the cover library (`/me/profile#cover`). */
import { ImagePlus } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowProfile',
  titleKey: 'screens.vitanaCards.E11.title',
  descriptionKey: 'screens.vitanaCards.E11.description',
  actionKey: 'screens.vitanaCards.E11.action',
};

export function UploadCoverCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('E11');
  return (
    <VitanaActionCard
      cardType="E11"
      feature="profile-photo"
      copy={COPY}
      icon={ImagePlus}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
