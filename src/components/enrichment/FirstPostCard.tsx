/**
 * VTID-05085 E3 — Make Your First Post. Opens the existing composer
 * (CreateContentPopup / MobileCreatePostSheet); there is no create-post route.
 */
import { MessageSquarePlus } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCreatePostLauncher } from '@/components/vitana/create-post-launcher';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowCommunity',
  titleKey: 'screens.vitanaCards.E3.title',
  descriptionKey: 'screens.vitanaCards.E3.description',
  actionKey: 'screens.vitanaCards.E3.action',
};

export function FirstPostCard({ title, description, onDismiss }: VitanaCardProps) {
  const { open, composer } = useCreatePostLauncher();
  return (
    <VitanaActionCard
      cardType="E3"
      feature="upload-media"
      copy={COPY}
      icon={MessageSquarePlus}
      title={title}
      description={description}
      onAction={() => open('post')}
      onDismiss={onDismiss}
    >
      {composer}
    </VitanaActionCard>
  );
}
