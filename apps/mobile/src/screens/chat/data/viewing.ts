/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — "I am
 * looking at this conversation" (VTID-05322: no push for an open chat), native
 * twin of web `src/hooks/useChatViewingPresence.ts`: `POST /api/v1/chat/viewing`
 * `{ device_id, conversation_key, active }` when the chat is on screen and the
 * app is in the foreground, a heartbeat every 20 s, `active: false` when the
 * app goes to the background or the chat closes. A failed post is retried after
 * one heartbeat. The device id lives for the app session (the web keeps it per
 * tab in sessionStorage). Best effort: a lost heartbeat only means a push may
 * still arrive.
 */
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getGateway } from '../../../auth/gateway';

export const VIEWING_HEARTBEAT_MS = 20_000;

let sessionDeviceId: string | null = null;

export function chatDeviceId(): string {
  if (!sessionDeviceId) sessionDeviceId = `app-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`.slice(0, 32);
  return sessionDeviceId;
}

async function postViewing(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await getGateway()('/chat/viewing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: chatDeviceId(), ...body }),
    });
    return !!res && res.ok;
  } catch {
    return false;
  }
}

export function useChatViewingPresence(conversationKey: string | null | undefined): void {
  useEffect(() => {
    if (!conversationKey) return undefined;
    const key = conversationKey;
    let active = false;
    let switchedOn = false;
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const start = () => {
      if (active || disposed) return;
      active = true;
      void postViewing({ conversation_key: key, active: true }).then((sent) => {
        if (disposed || !active) return;
        if (!sent) {
          active = false;
          if (!retry) retry = setTimeout(() => {
            retry = null;
            if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') start();
          }, VIEWING_HEARTBEAT_MS);
          return;
        }
        switchedOn = true;
        if (!timer) timer = setInterval(() => void postViewing({ conversation_key: key, active: true }), VIEWING_HEARTBEAT_MS);
      });
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      if (retry) clearTimeout(retry);
      timer = null;
      retry = null;
      active = false;
      if (!switchedOn) return;
      switchedOn = false;
      void postViewing({ conversation_key: key, active: false });
    };

    // Foreground unless the OS says otherwise (the web checks visibility + focus).
    if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') start();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => (state === 'active' ? start() : stop()));
    return () => {
      sub.remove();
      stop();
      disposed = true;
    };
  }, [conversationKey]);
}
