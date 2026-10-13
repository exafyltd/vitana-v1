/**
 * VTID-05143 — a Unified Card System card inside a chat message.
 *
 * Versioned payload on the message: `content_data.card = { kind: 'vitana_card',
 * v: 1, card_type, params }`. Renders the SAME component the strip uses for
 * that card_type (one registry). An unknown card_type or payload renders
 * nothing. Feature cards (F*) show no X in a chat; enrichment cards (E*) keep
 * theirs and dismiss on the server (7-day cooldown) like everywhere else.
 */
import { useState } from 'react';
import { getVitanaCardComponent } from '@/components/vitana/card-registry';
import { useCardDismiss } from '@/hooks/useCardDismiss';
import { isServerDismissedCard, isVitanaCardType, type VitanaCardType } from '@/components/vitana/vitana-card-catalog';

export interface VitanaCardPayloadV1 {
  kind: 'vitana_card';
  v: 1;
  card_type: VitanaCardType;
  params?: Record<string, unknown>;
}

export function isVitanaCardPayload(value: unknown): value is VitanaCardPayloadV1 {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  if (p.kind !== 'vitana_card' || p.v !== 1 || !isVitanaCardType(p.card_type)) return false;
  return p.params === undefined || (typeof p.params === 'object' && p.params !== null && !Array.isArray(p.params));
}

export interface VitanaChatCardProps {
  card_type: string;
  params?: Record<string, unknown>;
  /**
   * VTID-05100 — false: no X on any card. A Vitana companion message in the
   * Messenger is part of the conversation history, so its card stays with it.
   * Defaults to true (E* cards keep their server dismiss, VTID-05143).
   */
  dismissible?: boolean;
}

function DismissibleChatCard({ cardType, params }: { cardType: VitanaCardType; params?: Record<string, unknown> }) {
  const Card = getVitanaCardComponent(cardType)!;
  const { dismiss } = useCardDismiss(cardType);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <Card
      params={params}
      onDismiss={() => {
        dismiss();
        setHidden(true);
      }}
    />
  );
}

export function VitanaChatCard({ card_type, params, dismissible = true }: VitanaChatCardProps) {
  if (!isVitanaCardType(card_type)) return null;
  const Card = getVitanaCardComponent(card_type);
  if (!Card) return null;
  if (dismissible && isServerDismissedCard(card_type)) return <DismissibleChatCard cardType={card_type} params={params} />;
  return <Card params={params} />;
}
