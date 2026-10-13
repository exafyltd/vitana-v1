/** VTID-05179 — test doubles for the ORB client: a fake voice engine and an in-memory WebSocket. */
import type { WebSocketLike } from '../../src/orb/transport-ws';
import type {
  PlaybackState,
  RouteChange,
  Subscription,
  VoiceCapabilities,
  VoiceEngine,
  VoiceFrame,
} from '../../src/orb/voice-engine';

type Listener = (payload: never) => void;

export const SAFE_CAPS: VoiceCapabilities = {
  aec: true,
  ns: true,
  agc: true,
  voiceProcessing: true,
  aecPath: 'vpio-engine',
  fullDuplexSafe: true,
  playbackRateMode: 'varispeed',
};

export class FakeVoice implements VoiceEngine {
  calls: string[] = [];
  enqueued: Array<{ b64: string; rate: number }> = [];
  started: Array<{ leadFirstOnly: boolean; playbackRate: number }> = [];
  private listeners = new Map<string, Set<Listener>>();

  constructor(public caps: VoiceCapabilities = SAFE_CAPS) {}

  async start(opts: { leadFirstOnly: boolean; playbackRate: number }): Promise<void> {
    this.calls.push('start');
    this.started.push(opts);
  }
  async stop(): Promise<void> {
    this.calls.push('stop');
  }
  enqueue(b64: string, sampleRate: number): void {
    this.calls.push('enqueue');
    this.enqueued.push({ b64, rate: sampleRate });
  }
  stopPlayback(): void {
    this.calls.push('stopPlayback');
  }
  setPlaybackRate(): void {
    this.calls.push('setPlaybackRate');
  }
  async getCapabilities(): Promise<VoiceCapabilities> {
    return this.caps;
  }
  addListener(e: 'onFrame', cb: (f: VoiceFrame) => void): Subscription;
  addListener(e: 'onPlaybackState', cb: (s: PlaybackState) => void): Subscription;
  addListener(e: 'onInterruption', cb: (i: { kind: 'began' | 'ended' }) => void): Subscription;
  addListener(e: 'onRouteChange', cb: (r: RouteChange) => void): Subscription;
  addListener(e: 'onBackground', cb: () => void): Subscription;
  addListener(e: string, cb: (p: never) => void): Subscription {
    if (!this.listeners.has(e)) this.listeners.set(e, new Set());
    this.listeners.get(e)!.add(cb);
    return { remove: () => this.listeners.get(e)!.delete(cb) };
  }
  emit(e: string, payload?: unknown): void {
    for (const cb of this.listeners.get(e) ?? []) (cb as (p: unknown) => void)(payload);
  }
  listenerCount(): number {
    let n = 0;
    for (const s of this.listeners.values()) n += s.size;
    return n;
  }
}

/** In-memory WebSocket: answers `connected` on open and `session_started` on `start` unless told otherwise. */
export class FakeSocket implements WebSocketLike {
  static instances: FakeSocket[] = [];
  static script: {
    connected: boolean;
    onStart: Record<string, unknown> | null;
    failOnCreate: boolean;
  } = { connected: true, onStart: null, failOnCreate: false };

  readyState = 0;
  sent: Array<Record<string, unknown>> = [];
  closed = false;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onclose: ((ev: { code?: number; reason?: string }) => void) | null = null;

  constructor(
    public url: string,
    public protocols?: string | string[],
    public options?: { headers?: Record<string, string> },
  ) {
    if (FakeSocket.script.failOnCreate) throw new Error('blocked upgrade');
    FakeSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = 1;
      this.onopen?.({});
      if (FakeSocket.script.connected) this.serverSend({ type: 'connected', session_id: 'c1' });
    });
  }

  static reset(): void {
    FakeSocket.instances = [];
    FakeSocket.script = {
      connected: true,
      onStart: { type: 'session_started', session_id: 'sess-1', full_duplex: true, playback_lead_first_only: true },
      failOnCreate: false,
    };
  }

  static last(): FakeSocket {
    return FakeSocket.instances[FakeSocket.instances.length - 1];
  }

  send(data: string): void {
    const msg = JSON.parse(data) as Record<string, unknown>;
    this.sent.push(msg);
    if (msg.type === 'start' && FakeSocket.script.onStart) {
      const reply = FakeSocket.script.onStart;
      queueMicrotask(() => this.serverSend(reply));
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.readyState = 3;
    this.onclose?.({ code: 1000 });
  }

  serverSend(msg: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  types(): string[] {
    return this.sent.map((m) => String(m.type));
  }
}

/** A fetch double: routes by path, records every call. */
export function fakeFetch(routes: Record<string, (body: string | undefined) => { status?: number; json?: unknown }>) {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body?: string }> = [];
  const impl = async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    calls.push({ url, method: init?.method ?? 'GET', headers: init?.headers ?? {}, body: init?.body });
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const handler = routes[path];
    if (!handler) throw new Error(`network error (no route for ${path})`);
    const r = handler(init?.body);
    const status = r.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => r.json, text: async () => JSON.stringify(r.json) };
  };
  return { impl, calls };
}

export const flush = () => new Promise<void>((r) => setImmediate(r));

/** A minimal fetch over node:http for loopback tests against the fake gateway (never another host). */
export function loopbackFetch() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const http = require('http') as typeof import('http');
  return (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) =>
    new Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>((resolve, reject) => {
      const u = new URL(url);
      if (u.hostname !== '127.0.0.1') return reject(new Error(`loopbackFetch refuses ${u.hostname}`));
      const req = http.request(
        { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: init?.method ?? 'GET', headers: init?.headers },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            const status = res.statusCode ?? 0;
            resolve({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(data), text: async () => data });
          });
        },
      );
      req.on('error', reject);
      if (init?.body) req.write(init.body);
      req.end();
    });
}
