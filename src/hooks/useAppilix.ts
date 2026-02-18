import { useEffect, useState, useCallback, useRef } from 'react';
import {
  isAppilix,
  openDrawer as appilixOpenDrawer,
  hideAppilixAppBar,
  setStatusBarStyle,
} from '@/lib/appilix';

/**
 * useAppilix – React hook for Appilix WebView integration.
 *
 * Solves the race condition where the Appilix native shell injects its
 * global `appilix` object *after* React has already mounted. The hook
 * polls for the global every 100 ms for up to 3 seconds, then forces
 * the App Bar / Navigation Drawer to be visible via `update_settings`.
 *
 * All state starts as `false` and updates inside `useEffect`, so there
 * is zero risk of hydration mismatch.
 */
export function useAppilix() {
  const [detected, setDetected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Quick check – the global may already exist
    if (isAppilix()) {
      console.log('[Appilix] Detected immediately');
      setDetected(true);
      hideAppilixAppBar();
      setStatusBarStyle('transparent', true);
      setIsReady(true);
      return;
    }

    // Poll for the global (Appilix may inject it after first paint)
    const MAX_WAIT = 3_000; // 3 seconds
    const INTERVAL = 100;   // 100 ms
    let elapsed = 0;

    timerRef.current = setInterval(() => {
      elapsed += INTERVAL;

      if (isAppilix()) {
        console.log(`[Appilix] Detected after ${elapsed}ms`);
        setDetected(true);
        hideAppilixAppBar();
        setStatusBarStyle('transparent', true);
        setIsReady(true);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      if (elapsed >= MAX_WAIT) {
        console.debug('[Appilix] Not detected after 3 s – not running inside Appilix');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const openDrawer = useCallback(() => {
    appilixOpenDrawer();
  }, []);

  return {
    /** Whether the Appilix WebView shell was detected. */
    isAppilix: detected,
    /** Whether the bridge is initialised and the App Bar has been forced visible. */
    isReady,
    /** Open the native navigation drawer. */
    openDrawer,
  };
}
