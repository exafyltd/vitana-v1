/**
 * VTID-03279 — Guided Journey: Guided vs Full app mode (P4, vitana-v1).
 *
 * Additive UX layer. Reads the durable mode/progress state from the gateway
 * (P1: GET /api/v1/journey/state, POST /api/v1/journey/mode) and exposes
 * `isGuided` to the app shell + My Journey.
 *
 * MOBILE-ONLY (for now): the Guided Journey chrome ships on the mobile app
 * only. On desktop `isGuided` is forced false so the platform keeps its normal
 * sidebar/Full-App look — Guided Mode must not alter the desktop experience yet.
 * `mode` is still tracked/persisted, so resizing to a mobile width activates it.
 *
 * SAFETY — never auto-flip existing users into Guided. The P1 table defaults
 * mode='guided', so a brand-new row reads guided. We treat guided as effective
 * ONLY when the user has genuinely engaged the guided journey (an interaction
 * timestamp / non-`not_started` status), OR they are a fresh registration
 * (not yet onboarded). Established, onboarded users who never touched it resolve
 * to Full — and we persist that to the server once so it stays Full.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useIsMobile } from '@/hooks/use-mobile';
import { communityFetch } from '@/lib/community-gateway';

export type JourneyMode = 'guided' | 'full';

interface JourneyState {
  mode: JourneyMode;
  onboardingStatus: string;
  enteredFullModeAt: string | null;
  returnedToGuidedAt: string | null;
  qualifiedAt: string | null;
}

interface GuidedModeContextValue {
  mode: JourneyMode;
  isGuided: boolean;
  /**
   * True only while the mode is genuinely unknown (first-ever load, no cached
   * resolution). Returning users resolve from the localStorage cache and start
   * `false`, so the shell can paint the correct chrome without a loading gate.
   */
  loading: boolean;
  setMode: (mode: JourneyMode) => Promise<void>;
}

const GuidedModeContext = createContext<GuidedModeContextValue>({
  mode: 'full',
  isGuided: false,
  loading: true,
  setMode: async () => {},
});

export function useGuidedMode(): GuidedModeContextValue {
  return useContext(GuidedModeContext);
}

/**
 * Mode resolution requires a round-trip to GET /api/v1/journey/state. Until it
 * lands, `mode` defaults to 'full', so the app shell would paint the Full-app
 * chrome first and then snap to Guided once the fetch resolves — the "jumping
 * between screens" the user sees on My Journey. We cache the last resolved mode
 * in localStorage so every load after the first paints the correct shell
 * immediately (and skips the loading gate), reconciling with the server in the
 * background. The very first load (no cache) shows a clean spinner instead.
 */
const MODE_CACHE_PREFIX = 'vitana.journeyMode';
const MODE_CACHE_LAST = 'vitana.journeyMode.last';

function isJourneyMode(v: unknown): v is JourneyMode {
  return v === 'guided' || v === 'full';
}

/** Last resolved mode for ANY user on this device — used for the first paint. */
function readLastMode(): JourneyMode | null {
  try {
    const v = localStorage.getItem(MODE_CACHE_LAST);
    return isJourneyMode(v) ? v : null;
  } catch {
    return null;
  }
}

/** Resolved mode for a specific user — authoritative once we know who they are. */
function readUserMode(userId: string): JourneyMode | null {
  try {
    const v = localStorage.getItem(`${MODE_CACHE_PREFIX}.${userId}`);
    return isJourneyMode(v) ? v : null;
  } catch {
    return null;
  }
}

function writeCachedMode(userId: string, m: JourneyMode) {
  try {
    localStorage.setItem(`${MODE_CACHE_PREFIX}.${userId}`, m);
    localStorage.setItem(MODE_CACHE_LAST, m);
  } catch {
    /* localStorage unavailable (private mode / quota) — degrade silently */
  }
}

/** Has the user demonstrably interacted with the guided/full choice? */
function hasInteracted(s: JourneyState): boolean {
  if (s.enteredFullModeAt || s.returnedToGuidedAt || s.qualifiedAt) return true;
  return !!s.onboardingStatus && s.onboardingStatus !== 'not_started';
}

function resolveEffectiveMode(s: JourneyState, isOnboarded: boolean): JourneyMode {
  if (hasInteracted(s)) return s.mode;
  // Never interacted: established users stay Full; fresh registrations get Guided.
  if (isOnboarded) return 'full';
  return s.mode === 'guided' ? 'guided' : 'full';
}

export function GuidedModeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingStatus();
  const isMobile = useIsMobile();
  // Seed the first paint from the last cached resolution so the correct shell
  // renders immediately for returning users (no Full→Guided flash).
  const [mode, setModeState] = useState<JourneyMode>(() => readLastMode() ?? 'full');
  const [loading, setLoading] = useState<boolean>(() => readLastMode() === null);
  const resolvedFor = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading || onboardingLoading) return;

    if (!user?.id) {
      setModeState('full');
      setLoading(false);
      resolvedFor.current = null;
      return;
    }
    if (resolvedFor.current === user.id) return;
    resolvedFor.current = user.id;

    // If we already know THIS user's mode, paint it now and reconcile silently
    // (no loading gate). Only a genuinely unknown user shows the spinner.
    const cached = readUserMode(user.id);
    if (cached) {
      setModeState(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;
    (async () => {
      try {
        const resp = await communityFetch('/api/v1/journey/state');
        const json = await resp.json();
        if (cancelled) return;
        if (resp.ok && json?.ok && json.state) {
          const state = json.state as JourneyState;
          const effective = resolveEffectiveMode(state, !needsOnboarding);
          setModeState(effective);
          writeCachedMode(user.id, effective);
          // Persist the resolved default ONCE (when the user has no interaction
          // marker yet) so it survives later reads:
          //  - established users → pinned Full (default-guided row can't re-flip them)
          //  - fresh registrations → pinned Guided (survives onboarding completion,
          //    which flips them to "onboarded" and would otherwise resolve Full)
          if (!hasInteracted(state) && state.mode !== effective) {
            communityFetch('/api/v1/journey/mode', {
              method: 'POST',
              body: JSON.stringify({ mode: effective }),
            }).catch(() => {});
          } else if (!hasInteracted(state) && effective === 'guided') {
            // mode already 'guided' (DB default) but no marker yet — stamp the
            // interaction so it persists past onboarding.
            communityFetch('/api/v1/journey/mode', {
              method: 'POST',
              body: JSON.stringify({ mode: 'guided' }),
            }).catch(() => {});
          }
        } else if (!cached) {
          // Server gave us nothing usable and we have no cached value to fall
          // back on — default to Full. (If we DID have a cache, keep showing it.)
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
  }, [user?.id, authLoading, onboardingLoading, needsOnboarding]);

  const setMode = useCallback(async (next: JourneyMode) => {
    setModeState(next); // optimistic
    if (user?.id) writeCachedMode(user.id, next); // keep the cached shell in sync
    try {
      await communityFetch('/api/v1/journey/mode', {
        method: 'POST',
        body: JSON.stringify({ mode: next }),
      });
    } catch {
      /* keep optimistic value; reconciles on next load */
    }
  }, [user?.id]);

  return (
    <GuidedModeContext.Provider value={{ mode, isGuided: mode === 'guided' && isMobile, loading, setMode }}>
      {children}
    </GuidedModeContext.Provider>
  );
}
