/** VTID-05086 F6 — Autopilot — My Journey and its plan (`/autopilot`). */
import { Zap } from 'lucide-react';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { useCardNavigate } from '@/components/vitana/useCardNavigate';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.F6.eyebrow',
  titleKey: 'screens.vitanaCards.F6.title',
  descriptionKey: 'screens.vitanaCards.F6.description',
  actionKey: 'screens.vitanaCards.F6.action',
};

export function AutopilotCard({ title, description, onDismiss }: VitanaCardProps) {
  const go = useCardNavigate('F6');
  return (
    <VitanaActionCard
      cardType="F6"
      feature="autopilot"
      copy={COPY}
      icon={Zap}
      title={title}
      description={description}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
