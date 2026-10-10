/**
 * VTID-05062 — measures SCREEN_READY / IMG_REFETCH for every in-app route
 * change (see src/lib/screen-ready.ts). Mounted once inside <BrowserRouter>
 * (AppHooksInitializer in App.tsx).
 *
 * The navigation start is taken in the first render that sees the new
 * pathname — the earliest point a hook can observe a router location change —
 * and the measurement starts after that render has committed.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { onRouteChange } from '@/lib/screen-ready';

export function useScreenReadyTracking(): void {
  const { pathname } = useLocation();
  const nav = useRef<{ pathname: string; start: number } | null>(null);
  if (nav.current?.pathname !== pathname) {
    nav.current = { pathname, start: performance.now() };
  }
  const start = nav.current.start;

  useEffect(() => {
    try {
      onRouteChange(pathname, start);
    } catch {
      // telemetry must never break navigation
    }
  }, [pathname, start]);
}
