/**
 * VTID-05085 — one dismiss for every Unified Card System card.
 *
 * - Feature cards (F*): per device, `localStorage` key
 *   `vitana.card.<type>.dismissed_at`, back after 7 days. Every access is
 *   wrapped in try/catch (private mode, blocked storage), like
 *   EnableRemindersPrompt. A write that fails is kept in memory for the rest
 *   of the session, so the X still holds until the page reloads.
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

/**
 * Dismissals whose `localStorage` write failed (private mode, quota, blocked
 * storage). Kept for the rest of this page session so the strip, which
 * re-reads after a dismiss, does not bring the card straight back.
 */
const sessionDismissedAt = new Map<VitanaCardType, number>();

const withinTtl = (at: number, now: number) => Number.isFinite(at) && now - at < FEATURE_CARD_DISMISS_TTL_MS;

export function isFeatureCardDismissed(cardType: VitanaCardType, now: number = Date.now()): boolean {
  const inSession = sessionDismissedAt.get(cardType);
  if (inSession !== undefined && withinTtl(inSession, now)) return true;
  try {
    const raw = localStorage.getItem(featureCardDismissKey(cardType));
    if (!raw) return false;
    return withinTtl(Number(raw), now);
  } catch {
    return false;
  }
}

export function rememberFeatureCardDismissed(cardType: VitanaCardType, now: number = Date.now()): void {
  try {
    localStorage.setItem(featureCardDismissKey(cardType), String(now));
    sessionDismissedAt.delete(cardType);
  } catch {
    // storage unavailable — hide it for the rest of this session instead
    sessionDismissedAt.set(cardType, now);
  }
}

/** Test-only: forget the in-memory fallback. */
export function __resetFeatureCardDismissMemory(): void {
  sessionDismissedAt.clear();
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
