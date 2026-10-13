/**
 * VTID-05186 (N3, plan change 11) — src/context/GuidedModeProvider.tsx on native:
 * `GET /api/v1/journey/state`, cached per user in AsyncStorage so returning
 * members paint the right chrome at once; the first-ever load shows the
 * delayed loader until the first resolution (AppLayout.tsx:512-516).
 *
 * Read-only on purpose: the web also POSTs `/journey/mode` to persist a
 * resolved default; native does not write it (conservative choice, the web
 * persists it on its next load), and treats the member as onboarded (never
 * auto-flips into Guided) because the onboarding status is a later lane.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { gatewayGet } from '../auth/gateway';
import { deviceStorage, STORAGE_KEYS } from './device-storage';

export type JourneyMode = 'guided' | 'full';

interface JourneyState {
  mode: JourneyMode;
  onboardingStatus: string;
  enteredFullModeAt: string | null;
  returnedToGuidedAt: string | null;
  qualifiedAt: string | null;
}

/** GuidedModeProvider.tsx:113-123. */
export function hasInteracted(s: JourneyState): boolean {
  if (s.enteredFullModeAt || s.returnedToGuidedAt || s.qualifiedAt) return true;
  return !!s.onboardingStatus && s.onboardingStatus !== 'not_started';
}

export function resolveEffectiveMode(s: JourneyState, isOnboarded: boolean): JourneyMode {
  if (hasInteracted(s)) return s.mode;
  if (isOnboarded) return 'full';
  return s.mode === 'guided' ? 'guided' : 'full';
}

const isMode = (v: unknown): v is JourneyMode => v === 'guided' || v === 'full';

type Value = { mode: JourneyMode; isGuided: boolean; loading: boolean };

const GuidedModeContext = createContext<Value>({ mode: 'full', isGuided: false, loading: false });

export function GuidedModeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<JourneyMode>('full');
  const [loading, setLoading] = useState(true);
  const resolvedFor = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user?.id) {
      resolvedFor.current = null;
      setMode('full');
      setLoading(false);
      return undefined;
    }
    if (resolvedFor.current === user.id) return undefined;
    resolvedFor.current = user.id;
    let cancelled = false;
    const cacheKey = `${STORAGE_KEYS.journeyModePrefix}.${user.id}`;
    void (async () => {
      const cached = await deviceStorage.getItem(cacheKey);
      if (cancelled) return;
      if (isMode(cached)) {
        setMode(cached);
        setLoading(false);
      } else setLoading(true);
      try {
        const json = await gatewayGet<{ ok?: boolean; state?: JourneyState }>('/api/v1/journey/state');
        if (cancelled) return;
        if (json?.ok && json.state) {
          const effective = resolveEffectiveMode(json.state, true);
          setMode(effective);
          await deviceStorage.setItem(cacheKey, effective);
        } else if (!isMode(cached)) setMode('full');
      } catch {
        if (!cancelled && !isMode(cached)) setMode('full');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const value = useMemo(() => ({ mode, isGuided: mode === 'guided', loading }), [mode, loading]);
  return <GuidedModeContext.Provider value={value}>{children}</GuidedModeContext.Provider>;
}

export function useGuidedMode(): Value {
  return useContext(GuidedModeContext);
}
