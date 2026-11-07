/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — native twin of the
 * feature-card half of the web `useCardDismiss` (`src/hooks/useCardDismiss.ts`):
 * a feature card (F*) hidden with its X stays hidden on this device for
 * `FEATURE_CARD_DISMISS_TTL_MS` (7 days), under the web's key
 * `vitana.card.<type>.dismissed_at`. The web keeps it in localStorage; the
 * native device keeps it in AsyncStorage (`deviceStorage`, every call guarded).
 * A write that fails is held in memory for the session, like the web.
 */
import { useCallback, useEffect, useState } from 'react';
import { deviceStorage } from '../../../identity/device-storage';
import { FEATURE_CARD_DISMISS_TTL_MS, featureCardDismissKey } from '../../../ports/ai-chat';
import type { VitanaCardType } from '../../../ports/feed';

const sessionDismissedAt = new Map<string, number>();

const withinTtl = (at: number, now: number) => Number.isFinite(at) && now - at < FEATURE_CARD_DISMISS_TTL_MS;

export async function isFeatureCardDismissed(type: VitanaCardType, now: number = Date.now()): Promise<boolean> {
  const inSession = sessionDismissedAt.get(type);
  if (inSession !== undefined && withinTtl(inSession, now)) return true;
  const raw = await deviceStorage.getItem(featureCardDismissKey(type));
  return raw ? withinTtl(Number(raw), now) : false;
}

export async function rememberFeatureCardDismissed(type: VitanaCardType, now: number = Date.now()): Promise<void> {
  sessionDismissedAt.set(type, now);
  await deviceStorage.setItem(featureCardDismissKey(type), String(now));
}

/** Test-only: forget the in-memory record. */
export function __resetFeatureCardDismissMemory(): void {
  sessionDismissedAt.clear();
}

/**
 * The dismissed feature cards among `types`; `ready` is false until storage
 * has been read (the strip waits, so a hidden card never flashes in).
 */
export function useDismissedFeatureCards(types: readonly VitanaCardType[]) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string> | null>(null);
  const key = types.join(',');
  useEffect(() => {
    let live = true;
    void Promise.all(types.map(async (tp) => ((await isFeatureCardDismissed(tp)) ? tp : null))).then((hits) => {
      if (live) setDismissed(new Set(hits.filter((h): h is VitanaCardType => !!h)));
    });
    return () => {
      live = false;
    };
    // `key` stands for `types` (a new array each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const dismiss = useCallback((type: VitanaCardType) => {
    setDismissed((prev) => new Set([...(prev ?? []), type]));
    void rememberFeatureCardDismissed(type);
  }, []);
  return { ready: dismissed !== null, dismissed: dismissed ?? new Set<string>(), dismiss };
}
