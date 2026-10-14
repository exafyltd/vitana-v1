/**
 * VTID-05179 — SSE transport (N6a, Change 3; widget `_sessionStart` SSE branch, orb-widget.js:2690-2775).
 *
 *   POST /live/session/start            → {ok, session_id, conversation_id, playback_lead_first_only}
 *   GET  /live/stream?session_id&token  → text/event-stream (read through XMLHttpRequest progress events)
 *   POST /live/stream/send?session_id=  → audio / interrupt / context_update / nav_result
 *   POST /orb/session/:id/audio-ready   → releases the deferred greeting
 *   POST /live/session/stop             → fire-and-forget
 *
 * The stream URL is the only place the token appears in a URL (as in the
 * widget, F5); every request also carries the `Authorization` header.
 *
 * Sends go through an ORDERED queue: one request in flight, FIFO. A socket is
 * ordered by definition; separate HTTP requests are not, and the gateway must
 * see a barge-in's frame before its `interrupt` (full duplex) and the
 * `interrupt` before the pre-roll flush (half duplex).
 */
import { ORB_AUDIO, ORB_ROUTES, type ClientMessage, type ServerMessage, type StartPayload } from './protocol';
import { SseParser } from './sse-parser';
import {
  OrbStartError,
  defaultFetch,
  withTimeout,
  type FetchLike,
  type OrbTransport,
  type StartResult,
  type TransportEvents,
} from './transport';

/** The subset of `XMLHttpRequest` the stream reader uses (injectable for tests). */
export interface XhrLike {
  readyState: number;
  status: number;
  responseText: string;
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body?: string | null): void;
  abort(): void;
  onprogress: ((ev: unknown) => void) | null;
  onreadystatechange: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export type XhrFactory = () => XhrLike;

export function streamUrl(base: string, sessionId: string, token: string): string {
  return `${base}${ORB_ROUTES.sseStream}?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;
}

/** FIFO, one in flight. Failures resolve so a dropped request never wedges the queue. */
export class OrderedSendQueue {
  private chain: Promise<void> = Promise.resolve();
  private pending = 0;

  constructor(private readonly run: (body: string) => Promise<unknown>) {}

  get size(): number {
    return this.pending;
  }

  enqueue(body: string): Promise<void> {
    this.pending++;
    this.chain = this.chain.then(() =>
      this.run(body).then(
        () => {
          this.pending--;
        },
        () => {
          this.pending--;
        },
      ),
    );
    return this.chain;
  }

  /** Resolves once every request queued so far has settled. */
  drain(): Promise<void> {
    return this.chain;
  }
}

export function createSseTransport(opts: {
  base: string;
  token: string;
  events: TransportEvents;
  fetchImpl?: FetchLike;
  xhrFactory?: XhrFactory;
  startTimeoutMs?: number;
}): OrbTransport & { readonly queue: OrderedSendQueue } {
  const doFetch = opts.fetchImpl ?? defaultFetch();
  const makeXhr: XhrFactory =
    opts.xhrFactory ?? (() => new (globalThis as unknown as { XMLHttpRequest: new () => XhrLike }).XMLHttpRequest());
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.token}` };
  let sessionId: string | null = null;
  let xhr: XhrLike | null = null;
  let open = false;

  const queue = new OrderedSendQueue((body) => {
    if (!sessionId) return Promise.resolve();
    return doFetch(`${opts.base}${ORB_ROUTES.sseSend}?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      headers,
      body,
    });
  });

  function ended(reason: string): void {
    if (!open) return;
    open = false;
    opts.events.onClose({ reason });
  }

  function openStream(id: string): void {
    const parser = new SseParser();
    const req = makeXhr();
    xhr = req;
    let seen = 0;
    const consume = () => {
      const text = req.responseText || '';
      if (text.length <= seen) return;
      const chunk = text.slice(seen);
      seen = text.length;
      for (const ev of parser.push(chunk)) {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(ev.data) as ServerMessage;
        } catch {
          continue;
        }
        if (msg && typeof msg.type === 'string') opts.events.onMessage(msg);
      }
    };
    req.onprogress = consume;
    req.onreadystatechange = () => {
      if (req.readyState >= 3) consume();
      if (req.readyState === 4 && xhr === req) ended(`sse_closed:${req.status}`);
    };
    req.onerror = () => {
      if (xhr === req) ended('sse_error');
    };
    req.open('GET', streamUrl(opts.base, id, opts.token));
    req.setRequestHeader('Accept', 'text/event-stream');
    req.setRequestHeader('Authorization', `Bearer ${opts.token}`);
    req.send(null);
  }

  return {
    kind: 'sse',
    queue,

    async start(payload: StartPayload): Promise<StartResult> {
      let res: Awaited<ReturnType<FetchLike>>;
      try {
        res = await withTimeout(
          doFetch(`${opts.base}${ORB_ROUTES.sseStart}`, { method: 'POST', headers, body: JSON.stringify(payload) }),
          opts.startTimeoutMs ?? ORB_AUDIO.START_TIMEOUT_MS,
          'SSE session start',
        );
      } catch (e) {
        if (e instanceof OrbStartError) throw e;
        throw new OrbStartError(`SSE session start failed: ${String(e)}`, 'transport', 'network');
      }
      if (res.status === 401 || res.status === 403) {
        throw new OrbStartError(`SSE session start rejected (${res.status})`, 'rejected', String(res.status));
      }
      let data: Record<string, unknown>;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        throw new OrbStartError(`SSE session start answered ${res.status} without JSON`, 'transport', 'bad_json');
      }
      if (!data || data.ok !== true || typeof data.session_id !== 'string') {
        const code = typeof data?.error === 'string' ? data.error : 'start_failed';
        throw new OrbStartError(`SSE session start rejected: ${code}`, 'rejected', code);
      }
      sessionId = data.session_id;
      open = true;
      openStream(data.session_id);
      return {
        sessionId: data.session_id,
        conversationId: typeof data.conversation_id === 'string' ? data.conversation_id : undefined,
        playbackLeadFirstOnly: data.playback_lead_first_only === true,
      };
    },

    send(msg: ClientMessage): void {
      if (!sessionId) return;
      void queue.enqueue(JSON.stringify(msg));
    },

    signalAudioReady(): void {
      if (!sessionId) return;
      doFetch(`${opts.base}${ORB_ROUTES.audioReady(sessionId)}`, { method: 'POST', headers, body: '{}' }).catch(() => {
        // The server releases the greeting after its own timeout.
      });
    },

    close(): void {
      const id = sessionId;
      open = false;
      sessionId = null;
      const req = xhr;
      xhr = null;
      try {
        req?.abort();
      } catch {
        /* noop */
      }
      if (id) {
        doFetch(`${opts.base}${ORB_ROUTES.sseStop}`, { method: 'POST', headers, body: JSON.stringify({ session_id: id }) }).catch(
          () => {
            /* best-effort server cleanup */
          },
        );
      }
    },
  };
}
