/**
 * VTID-05179 — WebSocket transport (N6a, Change 3; widget `_sessionStartWs`, orb-widget.js:2870-2960).
 *
 * The token travels in the `Authorization: Bearer` header of the upgrade
 * request, never in the URL, so it stays out of access logs. The gateway
 * reads `?token=`, then the Bearer header, then `Sec-WebSocket-Protocol`
 * (orb-live.ts:17706-17715). React Native's `WebSocket(url, protocols,
 * { headers })` and the `ws` package used in tests share that signature.
 *
 * Flow: `connected` → `start` → `session_started` within 8 s →
 * `audio_ready` → frames. `close()` sends `stop` before closing the socket.
 */
import { ORB_AUDIO, ORB_ROUTES, type ClientMessage, type ServerMessage, type StartPayload } from './protocol';
import { OrbStartError, type OrbTransport, type StartResult, type TransportEvents } from './transport';

export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: { code?: number; reason?: string }) => void) | null;
}

export type WebSocketCtor = new (
  url: string,
  protocols?: string | string[],
  options?: { headers?: Record<string, string> },
) => WebSocketLike;

const OPEN = 1;

export function wsUrl(base: string): string {
  return base.replace(/^http/i, 'ws') + ORB_ROUTES.ws;
}

export function createWsTransport(opts: {
  base: string;
  token: string;
  events: TransportEvents;
  WebSocketImpl?: WebSocketCtor;
  startTimeoutMs?: number;
}): OrbTransport {
  const Impl: WebSocketCtor = opts.WebSocketImpl ?? (globalThis as unknown as { WebSocket: WebSocketCtor }).WebSocket;
  const timeoutMs = opts.startTimeoutMs ?? ORB_AUDIO.START_TIMEOUT_MS;
  let ws: WebSocketLike | null = null;
  let started = false;
  let closedByUs = false;

  function rawSend(msg: ClientMessage): void {
    if (!ws || ws.readyState !== OPEN) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // The close handler reports the failure.
    }
  }

  return {
    kind: 'ws',

    start(payload: StartPayload): Promise<StartResult> {
      return new Promise<StartResult>((resolve, reject) => {
        let settled = false;
        const fail = (err: OrbStartError) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try {
            ws?.close();
          } catch {
            /* noop */
          }
          ws = null;
          reject(err);
        };
        let socket: WebSocketLike;
        try {
          socket = new Impl(wsUrl(opts.base), undefined, { headers: { Authorization: `Bearer ${opts.token}` } });
        } catch (e) {
          reject(new OrbStartError(`WebSocket could not be created: ${String(e)}`, 'transport', 'ws_create'));
          return;
        }
        ws = socket;
        const timer = setTimeout(
          () => fail(new OrbStartError(`WS session start timed out after ${timeoutMs} ms`, 'transport', 'timeout')),
          timeoutMs,
        );

        socket.onmessage = (event) => {
          let msg: ServerMessage;
          try {
            msg = JSON.parse(String(event.data)) as ServerMessage;
          } catch {
            return;
          }
          if (!settled) {
            if (msg.type === 'connected') {
              rawSend({ type: 'start', ...payload });
              return;
            }
            if (msg.type === 'error') {
              const code = typeof msg.code === 'string' ? msg.code : null;
              const text = typeof msg.message === 'string' ? msg.message : 'WS session start rejected';
              fail(new OrbStartError(code || text, 'rejected', code));
              return;
            }
            if (msg.type === 'session_started') {
              settled = true;
              started = true;
              clearTimeout(timer);
              resolve({
                sessionId: String(msg.session_id ?? ''),
                conversationId: typeof msg.conversation_id === 'string' ? msg.conversation_id : undefined,
                fullDuplex: msg.full_duplex === true,
                playbackLeadFirstOnly: msg.playback_lead_first_only === true,
              });
              return;
            }
            return;
          }
          opts.events.onMessage(msg);
        };
        socket.onerror = () => {
          if (!settled) fail(new OrbStartError('WebSocket error before the session started', 'transport', 'ws_error'));
        };
        socket.onclose = (ev) => {
          if (!settled) {
            fail(new OrbStartError(`WebSocket closed before the session started (${ev?.code ?? '?'})`, 'transport', 'ws_closed'));
            return;
          }
          if (started && !closedByUs) {
            started = false;
            opts.events.onClose({ reason: `ws_closed:${ev?.code ?? ''}` });
          }
        };
      });
    },

    send(msg: ClientMessage): void {
      rawSend(msg);
    },

    signalAudioReady(): void {
      rawSend({ type: 'audio_ready' });
    },

    close(): void {
      closedByUs = true;
      started = false;
      const socket = ws;
      ws = null;
      if (!socket) return;
      try {
        if (socket.readyState === OPEN) socket.send(JSON.stringify({ type: 'stop' }));
      } catch {
        /* noop */
      }
      try {
        socket.close();
      } catch {
        /* noop */
      }
    },
  };
}
