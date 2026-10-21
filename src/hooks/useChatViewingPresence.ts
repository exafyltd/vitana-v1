/**
 * VTID-05322 (messenger-ux-v2/ui-viewing-presence) — tell the gateway which
 * conversation this tab is looking at, so the member gets no push for it
 * (owner requirement R13; gateway side VTID-05312, POST /api/v1/chat/viewing).
 *
 * "Viewing" = the conversation is open AND the page is visible AND (outside the
 * Android/iOS app shell) the window has focus. While viewing: a heartbeat at
 * once and every 20 s (each row lives 45 s on the server). On blur, hide,
 * leaving the conversation or unmount: active:false. When the page is hidden
 * (tab switch, close, navigation — browsers hide the page before pagehide) the
 * active:false goes out at once with fetch keepalive and the last token
 * (sendBeacon cannot carry the Authorization header); if it is lost, the
 * server row simply expires within 45 s.
 * Posts are sent one after another (an active:true can never overtake the
 * active:false that follows it), a true is dropped if viewing ended while it
 * waited, and a failed post (signed out, offline, 4xx/5xx) arms no timer and
 * is retried on the next focus/visibility change.
 * One device id per tab (sessionStorage). A duplicated tab copies it; then one
 * tab's active:false clears the other's row — that only means a push arrives.
 * No gateway configured (no VITE_GATEWAY_BASE / VITE_GATEWAY_URL) → no call.
 * Never throws; never blocks the UI.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GATEWAY_API_URL } from '@/lib/gateway-base';

/** The build names a gateway (else GATEWAY_API_URL falls back to production: no presence writes there). */
export function gatewayConfigured(env: Record<string, unknown> = import.meta.env as Record<string, unknown>): boolean {
  const base = String(env.VITE_GATEWAY_BASE ?? '').trim();
  const url = String(env.VITE_GATEWAY_URL ?? '').trim();
  return !!(base || url);
}
import { isAppilix } from '@/lib/appilix';

export const VIEWING_HEARTBEAT_MS = 20_000;
const DEVICE_KEY = 'vitana:chat:device:v1';

let memoryDeviceId: string | null = null;
export function chatDeviceId(): string {
  try {
    const existing = sessionStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
  } catch { /* fall through */ }
  const id = memoryDeviceId ?? `tab-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`.slice(0, 32);
  memoryDeviceId = id;
  try { sessionStorage.setItem(DEVICE_KEY, id); } catch { /* memory only */ }
  return id;
}

function isViewingNow(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.visibilityState !== 'visible') return false;
  return isAppilix() ? true : document.hasFocus();
}

/** @param conversationKey `dm:<peerId>` | `group:<groupId>` | null (nothing open) */
export function useChatViewingPresence(conversationKey: string | null | undefined) {
  const tokenRef = useRef<string | null>(null);
  // One queue per tab for all keys: posts reach the gateway in the order made.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  // The keepalive call can't wait for getSession(): keep the token fresh.
  useEffect(() => {
    const auth = (supabase as { auth?: { onAuthStateChange?: typeof supabase.auth.onAuthStateChange } }).auth;
    if (!auth || typeof auth.onAuthStateChange !== 'function') return;
    try {
      const result = auth.onAuthStateChange((_event, session) => {
        tokenRef.current = session?.access_token ?? null;
      });
      return () => result?.data?.subscription?.unsubscribe();
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!conversationKey || typeof window === 'undefined' || !gatewayConfigured()) return;
    const key = conversationKey;
    const deviceId = chatDeviceId();
    let active = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    // Whether an active:true may have reached the gateway (then a false is owed).
    let mayBeOn = false;

    const send = async (body: Record<string, unknown>, token: string | null, keepalive: boolean): Promise<boolean> => {
      if (!token) return false;
      try {
        const res = await fetch(`${GATEWAY_API_URL}/chat/viewing`, {
          method: 'POST',
          keepalive,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ device_id: deviceId, ...body }),
        });
        return !!res && res.ok;
      } catch {
        /* best effort: a lost heartbeat only means a push may still arrive */
        return false;
      }
    };

    /** Queued post; `wanted()` is re-checked right before sending. */
    const post = (body: Record<string, unknown>, wanted: () => boolean = () => true): Promise<boolean> => {
      const run = queueRef.current.catch(() => undefined).then(async () => {
        if (!wanted()) return false;
        let token: string | null = null;
        try {
          const { data } = await supabase.auth.getSession();
          token = data?.session?.access_token ?? null;
        } catch { token = null; }
        tokenRef.current = token ?? tokenRef.current;
        if (!wanted()) return false;
        if (body.active === true && token) mayBeOn = true;
        return send(body, token, false);
      });
      queueRef.current = run;
      return run;
    };

    const stillViewing = () => active && !disposed;
    const start = () => {
      if (active || disposed) return;
      active = true;
      // The 20 s heartbeat starts once the first one went out. After a failed
      // first post the next focus/visibility change — or 20 s — tries again.
      void post({ conversation_key: key, active: true }, stillViewing).then((sent) => {
        if (!sent) {
          if (active && !disposed && !timer) {
            active = false;
            if (!retry) retry = setTimeout(() => { retry = null; if (!disposed) reevaluate(); }, VIEWING_HEARTBEAT_MS);
          }
          return;
        }
        if (stillViewing() && !timer) {
          timer = setInterval(() => { void post({ conversation_key: key, active: true }, stillViewing); }, VIEWING_HEARTBEAT_MS);
        }
      });
    };
    const stop = (unloading: boolean) => {
      if (timer) clearInterval(timer);
      timer = null;
      if (retry) clearTimeout(retry);
      retry = null;
      if (!active) return;
      active = false;
      if (!mayBeOn) return; // nothing was switched on (a waiting true is dropped)
      mayBeOn = false;
      if (unloading) {
        // Hidden / unloading: send now (no await before fetch), keepalive.
        void send({ active: false }, tokenRef.current, true);
      } else {
        void post({ active: false });
      }
    };
    const pageHidden = () => document.visibilityState !== 'visible';
    const reevaluate = () => (isViewingNow() ? start() : stop(pageHidden()));
    const onPageHide = () => stop(true);

    reevaluate();
    document.addEventListener('visibilitychange', reevaluate);
    window.addEventListener('focus', reevaluate);
    window.addEventListener('blur', reevaluate);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', reevaluate);
      window.removeEventListener('focus', reevaluate);
      window.removeEventListener('blur', reevaluate);
      window.removeEventListener('pagehide', onPageHide);
      stop(pageHidden());
    };
  }, [conversationKey]);
}
