/** VTID-05085 E9 — Import Your Contacts — the contacts section of the hub (`/connectors#contacts`). */
import { Users } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.eyebrowConnect',
  titleKey: 'screens.vitanaCards.E9.title',
  descriptionKey: 'screens.vitanaCards.E9.description',
  actionKey: 'screens.vitanaCards.E9.action',
};

export function ImportContactsCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('E9');
  return (
    <VitanaActionCard
      cardType="E9"
      feature="import-contacts"
      copy={COPY}
      icon={Users}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
