/**
 * VTID-05322 (messenger-ux-v2/ui-viewing-presence) — tell the gateway which
 * conversation this tab is looking at, so the member gets no push for it
 * (owner requirement R13; gateway side VTID-05312, POST /api/v1/chat/viewing).
 *
 * "Viewing" = the conversation is open AND the page is visible AND (outside the
 * Android/iOS app shell) the window has focus. While viewing: a heartbeat at
 * once and every 20 s (each row lives 45 s on the server). On blur, hide,
 * leaving the conversation or unmount: active:false. On pagehide the last call
 * uses fetch keepalive with the normal Authorization header (sendBeacon cannot
 * carry it); if it is lost, the server row simply expires within 45 s.
 * One device id per tab (sessionStorage). Never throws; never blocks the UI.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GATEWAY_API_URL } from '@/lib/gateway-base';
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

  useEffect(() => {
    if (!conversationKey || typeof window === 'undefined') return;
    const key = conversationKey;
    const deviceId = chatDeviceId();
    let active = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const post = async (body: Record<string, unknown>, keepalive = false): Promise<boolean> => {
      try {
        let token = tokenRef.current;
        if (!keepalive) {
          const { data } = await supabase.auth.getSession();
          token = data?.session?.access_token ?? null;
          tokenRef.current = token;
        }
        if (!token) return false;
        await fetch(`${GATEWAY_API_URL}/chat/viewing`, {
          method: 'POST',
          keepalive,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ device_id: deviceId, ...body }),
        });
        return true;
      } catch {
        /* best effort: a lost heartbeat only means a push may still arrive */
        return false;
      }
    };

    const start = () => {
      if (active || disposed) return;
      active = true;
      // The 20 s heartbeat starts once the first one went out (signed out /
      // no gateway → nothing to keep alive, no timer).
      void post({ conversation_key: key, active: true }).then((sent) => {
        if (sent && active && !disposed && !timer) {
          timer = setInterval(() => { void post({ conversation_key: key, active: true }); }, VIEWING_HEARTBEAT_MS);
        }
      });
    };
    const stop = (keepalive = false) => {
      if (timer) clearInterval(timer);
      timer = null;
      if (!active) return;
      active = false;
      void post({ active: false }, keepalive);
    };
    const reevaluate = () => (isViewingNow() ? start() : stop());
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
      stop();
    };
  }, [conversationKey]);
}
