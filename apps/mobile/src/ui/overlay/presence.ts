/**
 * VTID-05176 — mount/unmount with an open/close animation (plan change 10).
 * `progress` runs 0 → 1 on open and 1 → 0 on close; the overlay unmounts when
 * the close animation ends. Under reduced motion (SR-22) there is no animation.
 */
import { useEffect, useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

export function usePresence(open: boolean, durationMs: number, reducedMotion: boolean): { mounted: boolean; progress: SharedValue<number> } {
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(open && reducedMotion ? 1 : 0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = reducedMotion || durationMs <= 0 ? 1 : withTiming(1, { duration: durationMs });
      return undefined;
    }
    if (reducedMotion || durationMs <= 0) {
      progress.value = 0;
      setMounted(false);
      return undefined;
    }
    progress.value = withTiming(0, { duration: durationMs });
    const timer = setTimeout(() => setMounted(false), durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs, reducedMotion, progress]);

  return { mounted: mounted || open, progress };
}
