/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the return leg of a
 * hosted page (brief "External checkout / portal return leg").
 *
 * On the web, a connection's "Connect with Shopify" / "Connect SMART on FHIR"
 * sends the browser to the provider's authorize page (`window.location.href =
 * authorize_url`, ConnectionWorkbench.tsx connectOauth); the provider sends the
 * merchant back to the portal, which loads the connection afresh and shows its
 * new state. Natively the page opens in the in-app system browser
 * (`openHostedPage`, expo-web-browser). When it closes — and on AppState
 * `active` / screen focus while the flow is still pending (the member may
 * have switched apps instead of closing it) — the caller's `refresh` runs at
 * once and then a few more times (the provider's callback reaches the gateway
 * a little after the member is back: a bounded poll, cleared on unmount).
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { openHostedPage } from '../../../ports/business-ui';

/** How often and how many times the state is re-read after the member is back. */
export const RETURN_POLL_MS = 3000;
export const RETURN_POLL_COUNT = 4;

export function useHostedPageReturn(refresh: () => unknown) {
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const stopPoll = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const back = useCallback(() => {
    if (!pending.current) return;
    pending.current = false;
    void refreshRef.current();
    stopPoll();
    let left = RETURN_POLL_COUNT;
    timer.current = setInterval(() => {
      left -= 1;
      void refreshRef.current();
      if (left <= 0) stopPoll();
    }, RETURN_POLL_MS);
  }, [stopPoll]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') back();
    });
    return () => {
      sub.remove();
      stopPoll();
    };
  }, [back, stopPoll]);

  useFocusEffect(
    useCallback(() => {
      back();
    }, [back]),
  );

  /** Opens `url`; the refresh runs when the member is back. */
  const open = useCallback(
    async (url: string) => {
      pending.current = true;
      try {
        await openHostedPage(url);
      } finally {
        back();
      }
    },
    [back],
  );

  return { open, isPending: () => pending.current };
}
