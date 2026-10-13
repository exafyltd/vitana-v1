/**
 * VTID-05086 F10 — Upload Video/Music. Opens the existing composer in media
 * mode (CreateContentPopup on its media tab / MobileCreatePostSheet with the
 * picker open); there is no create-post route.
 */
import { Clapperboard } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCreatePostLauncher } from '@/components/vitana/create-post-launcher';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.F10.eyebrow',
  titleKey: 'screens.vitanaCards.F10.title',
  descriptionKey: 'screens.vitanaCards.F10.description',
  actionKey: 'screens.vitanaCards.F10.action',
};

export function UploadMediaCard({ title, description, onDismiss }: VitanaCardProps) {
  const { open, composer } = useCreatePostLauncher();
  return (
    <VitanaActionCard
      cardType="F10"
      feature="upload-media"
      copy={COPY}
      icon={Clapperboard}
      title={title}
      description={description}
      onAction={() => open('media')}
      onDismiss={onDismiss}
    >
      {composer}
    </VitanaActionCard>
  );
}
