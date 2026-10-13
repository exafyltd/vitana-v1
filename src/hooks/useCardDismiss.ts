/**
 * VTID-05085 — one dismiss for every Unified Card System card.
 *
 * - Feature cards (F*): per device, `localStorage` key
 *   `vitana.card.<type>.dismissed_at`, back after 7 days. Every access is
 *   wrapped in try/catch (private mode, blocked storage), like
 *   EnableRemindersPrompt — no storage simply means "not dismissed".
 * - Enrichment / boost cards (E*, G*): `POST /api/v1/enrichment-cards/dismiss`
 *   (server cooldown, every device) and the card query is invalidated.
 */
import { useCallback, useState } from 'react';
import { useEnrichmentCardDismiss } from '@/hooks/useEnrichmentCards';
import {
  FEATURE_CARD_DISMISS_TTL_MS,
  featureCardDismissKey,
  isServerDismissedCard,
  type VitanaCardType,
} from '@/components/vitana/vitana-card-catalog';

export function isFeatureCardDismissed(cardType: VitanaCardType, now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(featureCardDismissKey(cardType));
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && now - at < FEATURE_CARD_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function rememberFeatureCardDismissed(cardType: VitanaCardType, now: number = Date.now()): void {
  try {
    localStorage.setItem(featureCardDismissKey(cardType), String(now));
  } catch {
    /* storage unavailable — the card hides for this render only */
  }
}

export function useCardDismiss(cardType: VitanaCardType): { isDismissed: boolean; dismiss: () => void } {
  const serverDismiss = useEnrichmentCardDismiss();
  const server = isServerDismissedCard(cardType);
  const [isDismissed, setDismissed] = useState(() => (server ? false : isFeatureCardDismissed(cardType)));

  const dismiss = useCallback(() => {
    if (server) serverDismiss(cardType);
    else rememberFeatureCardDismissed(cardType);
    setDismissed(true);
  }, [server, serverDismiss, cardType]);

  return { isDismissed, dismiss };
}
