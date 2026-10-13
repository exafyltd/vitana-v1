/** VTID-05086 F4 — Talk to Vitana — the assistant (`/assistant`). */
import { MessageCircle } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.F4.eyebrow',
  titleKey: 'screens.vitanaCards.F4.title',
  descriptionKey: 'screens.vitanaCards.F4.description',
  actionKey: 'screens.vitanaCards.F4.action',
};

export function TalkToVitanaCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('F4');
  return (
    <VitanaActionCard
      cardType="F4"
      feature="talk-to-vitana"
      copy={COPY}
      icon={MessageCircle}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
