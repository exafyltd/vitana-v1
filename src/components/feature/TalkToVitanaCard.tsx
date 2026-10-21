/**
 * VTID-05086 F4 — Talk to Vitana ("Got a question? — Ask Vitana").
 *
 * VTID-05212: the button opens a conversation with Vitana (the ORB, via the
 * shared `activateOrb()`), instead of the assistant *settings* page
 * (`/assistant`), where nobody can ask anything. When the ORB widget is not
 * available it opens the Talk to Vitana page (`CARD_DEEP_LINKS.F4`,
 * `/comm/talk-to-vitana`). The registry maps F4 to this component on every
 * surface, chat included, so this one place covers them all.
 */
import { MessageCircle } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import { activateOrb } from '@/lib/orbActivate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.F4.eyebrow',
  titleKey: 'screens.vitanaCards.F4.title',
  descriptionKey: 'screens.vitanaCards.F4.description',
  actionKey: 'screens.vitanaCards.F4.action',
};

export function TalkToVitanaCard({ title, description, onDismiss }: VitanaCardProps) {
  const openPage = useCardNavigate('F4');
  const ask = () => {
    if (!activateOrb()) openPage();
  };
  return (
    <VitanaActionCard
      cardType="F4"
      feature="talk-to-vitana"
      copy={COPY}
      icon={MessageCircle}
      title={title}
      description={description}
      onAction={ask}
      onDismiss={onDismiss}
    />
  );
}
