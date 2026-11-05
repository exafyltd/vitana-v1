/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — native twin of
 * `src/context/GuidedModeProvider.tsx` (VTID-03279/03280) for My Journey: the
 * Guided Journey / Full App mode WITH the switch's write path, which the
 * shell's read-only provider (`src/identity/GuidedModeProvider.tsx`, it only
 * gates the first paint) does not offer. Class-B on the web (community
 * gateway + localStorage), so re-implemented here, not core-extracted.
 *
 * Same behaviour as the web provider:
 *  - first paint from the per-device cache (`vitana.journeyMode.last`, then
 *    `vitana.journeyMode.<user>`), in AsyncStorage instead of localStorage;
 *    `loading` only while the mode is genuinely unknown;
 *  - `GET /journey/state` resolves the effective mode (never auto-flip an
 *    established member into Guided) and persists a resolved default ONCE with
 *    `POST /journey/mode` (web :172-187);
 *  - `setMode` is optimistic, writes the cache, then `POST /journey/mode`.
 * The member counts as onboarded (the onboarding status is a later lane's
 * hook; the shell provider makes the same choice). Mobile only: `isGuided` is
 * `mode === 'guided'` (the web adds `&& isMobile`; native is always mobile).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { deviceStorage } from '../../../identity/device-storage';
import { hasInteracted, resolveEffectiveMode, type JourneyMode } from '../../../identity/GuidedModeProvider';
import { communityFetch } from '../data/client';

export type { JourneyMode };

export const MODE_CACHE_PREFIX = 'vitana.journeyMode';
export const MODE_CACHE_LAST = 'vitana.journeyMode.last';

const isJourneyMode = (v: unknown): v is JourneyMode => v === 'guided' || v === 'full';

export interface GuidedModeValue {
  mode: JourneyMode;
  isGuided: boolean;
  loading: boolean;
  setMode: (mode: JourneyMode) => Promise<void>;
}

const GuidedModeContext = createContext<GuidedModeValue>({ mode: 'full', isGuided: false, loading: true, setMode: async () => {} });

export function useGuidedMode(): GuidedModeValue {
  return useContext(GuidedModeContext);
}

async function writeCachedMode(userId: string, m: JourneyMode) {
  await deviceStorage.setItem(`${MODE_CACHE_PREFIX}.${userId}`, m);
  await deviceStorage.setItem(MODE_CACHE_LAST, m);
}

function postMode(mode: JourneyMode) {
  return communityFetch('/journey/mode', { method: 'POST', body: JSON.stringify({ mode }) });
}

export function GuidedModeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [mode, setModeState] = useState<JourneyMode>('full');
  const [loading, setLoading] = useState(true);
  const resolvedFor = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user?.id) {
      setModeState('full');
      setLoading(false);
      resolvedFor.current = null;
      return undefined;
    }
    if (resolvedFor.current === user.id) return undefined;
    resolvedFor.current = user.id;
    const userId = user.id;
    let cancelled = false;
    void (async () => {
      const last = await deviceStorage.getItem(MODE_CACHE_LAST);
      const cachedRaw = await deviceStorage.getItem(`${MODE_CACHE_PREFIX}.${userId}`);
      const cached = isJourneyMode(cachedRaw) ? cachedRaw : null;
      if (cancelled) return;
      if (cached) {
        setModeState(cached);
        setLoading(false);
      } else if (isJourneyMode(last)) {
        setModeState(last);
      }
      try {
        const resp = await communityFetch('/journey/state');
        const json = await resp.json<{ ok?: boolean; state?: Parameters<typeof resolveEffectiveMode>[0] }>();
        if (cancelled) return;
        if (resp.ok && json?.ok && json.state) {
          const state = json.state;
          const effective = resolveEffectiveMode(state, true);
          setModeState(effective);
          await writeCachedMode(userId, effective);
          if (!hasInteracted(state) && state.mode !== effective) {
            postMode(effective).catch(() => undefined);
          } else if (!hasInteracted(state) && effective === 'guided') {
            postMode('guided').catch(() => undefined);
          }
        } else if (!cached) {
          setModeState('full');
        }
      } catch {
        if (!cancelled && !cached) setModeState('full');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const setMode = useCallback(
    async (next: JourneyMode) => {
      setModeState(next);
      if (user?.id) await writeCachedMode(user.id, next);
      try {
        await postMode(next);
      } catch {
        /* keep the optimistic value; reconciles on the next load */
      }
    },
    [user?.id],
  );

  const value = useMemo(() => ({ mode, isGuided: mode === 'guided', loading, setMode }), [mode, loading, setMode]);
  return <GuidedModeContext.Provider value={value}>{children}</GuidedModeContext.Provider>;
}
