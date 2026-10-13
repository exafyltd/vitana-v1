/** VTID-05085 E1 — Upload Profile Photo — opens the profile editor on the photo (`/me/profile#avatar`). */
import { Camera } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowProfile',
  titleKey: 'screens.vitanaCards.E1.title',
  descriptionKey: 'screens.vitanaCards.E1.description',
  actionKey: 'screens.vitanaCards.E1.action',
};

export function UploadPhotoCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('E1');
  return (
    <VitanaActionCard
      cardType="E1"
      feature="profile-photo"
      copy={COPY}
      icon={Camera}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
