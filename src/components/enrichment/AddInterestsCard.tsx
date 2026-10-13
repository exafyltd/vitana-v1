/**
 * VTID-05085 E4 — Add Your Interests. Opens the InterestsPicker right here;
 * saving re-reads the card state so the card disappears once interests exist.
 */
import { useState } from 'react';
import { Target } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { InterestsPicker } from '@/components/profile/InterestsPicker';
import { useInvalidateEnrichmentCards } from '@/hooks/useEnrichmentCards';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowProfile',
  titleKey: 'screens.vitanaCards.E4.title',
  descriptionKey: 'screens.vitanaCards.E4.description',
  actionKey: 'screens.vitanaCards.E4.action',
};

export function AddInterestsCard({ title, description, onDismiss }: VitanaCardProps) {
  const [open, setOpen] = useState(false);
  const refresh = useInvalidateEnrichmentCards();
  return (
    <VitanaActionCard
      cardType="E4"
      feature="profile-setup"
      copy={COPY}
      icon={Target}
      title={title}
      description={description}
      onAction={() => setOpen(true)}
      onDismiss={onDismiss}
    >
      <InterestsPicker open={open} onOpenChange={setOpen} onSaved={refresh} />
    </VitanaActionCard>
  );
}
