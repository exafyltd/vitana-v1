/**
 * VTID-05179 — WS and SSE transports (N6a, Change 3).
 *
 * The WS transport runs against the local fake gateway on 127.0.0.1 (no other
 * host, no outbound connection). The SSE transport runs against in-memory
 * fetch / XHR doubles so delayed responses can be controlled exactly.
 */
import { createFakeGateway, WebSocket as WsClient, type FakeGateway } from '../../tools/orb-fake-gateway/server';
import { ORB_AUDIO, buildStartPayload, type ServerMessage } from '../../src/orb/protocol';
import { OrbStartError } from '../../src/orb/transport';
import { createWsTransport, type WebSocketCtor } from '../../src/orb/transport-ws';
import { createSseTransport, OrderedSendQueue, streamUrl, type XhrLike } from '../../src/orb/transport-sse';
import {
  isSseLatched,
  latchSse,
  resetTransportLatchForTests,
  selectTransport,
  devTransportOverride,
} from '../../src/orb/select-transport';
import { fakeFetch, flush } from './helpers';

const TOKEN = 'test-token-abc';
const payload = buildStartPayload({ lang: 'en', timeZone: 'UTC', appVersion: 'test' });
const Ws = WsClient as unknown as WebSocketCtor;

function waitFor(cond: () => boolean, ms = 3000): Promise<void> {
  const until = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (cond()) return resolve();
      if (Date.now() > until) return reject(new Error('timed out waiting'));
      setTimeout(tick, 10);
    };
    tick();
  });
}

describe('WS transport against the fake gateway (loopback only)', () => {
  let gw: FakeGateway;
  let base: string;

  beforeEach(async () => {
    gw = createFakeGateway({ scenario: { afterAudioReady: [] } });
    base = (await gw.start()).url;
    expect(base).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });
  afterEach(async () => {
    await gw.stop();
  });

  it('authenticates with the Bearer header, never the URL; connected → start → session_started → audio_ready', async () => {
    const received: ServerMessage[] = [];
    const t = createWsTransport({ base, token: TOKEN, WebSocketImpl: Ws, events: { onMessage: (m) => received.push(m), onClose: () => undefined } });
    const r = await t.start(payload);
    expect(r).toEqual({ sessionId: 'fake-1', conversationId: 'conv-fake-1', fullDuplex: true, playbackLeadFirstOnly: true });
    const upgrade = gw.requests.find((q) => q.method === 'UPGRADE')!;
    expect(upgrade.authorization).toBe(`Bearer ${TOKEN}`);
    expect(upgrade.url).toBe('/api/v1/orb/live/ws');
    expect(upgrade.url).not.toContain(TOKEN);

    t.signalAudioReady();
    t.send({ type: 'audio', data_b64: Buffer.alloc(2048).toString('base64'), mime: 'audio/pcm;rate=16000' });
    t.send({ type: 'interrupt' });
    await waitFor(() => gw.frames.some((f) => f.type === 'interrupt'));
    expect(gw.frames.map((f) => f.type)).toEqual(['start', 'audio_ready', 'audio', 'interrupt']);
    expect(gw.frames[2]).toMatchObject({ bytes: 2048, silent: true, mime: 'audio/pcm;rate=16000' });
    await waitFor(() => received.some((m) => m.type === 'interrupted'));
  });

  it('sends stop before closing the socket', async () => {
    const t = createWsTransport({ base, token: TOKEN, WebSocketImpl: Ws, events: { onMessage: () => undefined, onClose: () => undefined } });
    await t.start(payload);
    t.close();
    await waitFor(() => gw.frames.some((f) => f.type === 'stop'));
    expect(gw.frames[gw.frames.length - 1].type).toBe('stop');
  });

  it('a server error at start is a rejection (never retried on SSE)', async () => {
    gw.setScenario({ rejectStart: { code: 'AUTH_TOKEN_INVALID' } });
    const t = createWsTransport({ base, token: TOKEN, WebSocketImpl: Ws, events: { onMessage: () => undefined, onClose: () => undefined } });
    await expect(t.start(payload)).rejects.toMatchObject({ kind: 'rejected', code: 'AUTH_TOKEN_INVALID' });
  });

  it('a destroyed upgrade is a transport failure', async () => {
    gw.setScenario({ transportFailure: true });
    const t = createWsTransport({ base, token: TOKEN, WebSocketImpl: Ws, events: { onMessage: () => undefined, onClose: () => undefined } });
    await expect(t.start(payload)).rejects.toMatchObject({ kind: 'transport' });
  });

  it('a missing session_started within the start budget is a transport failure (budget 8 s, shortened here)', async () => {
    expect(ORB_AUDIO.START_TIMEOUT_MS).toBe(8000);
    gw.setScenario({ silentHandshake: true });
    const t = createWsTransport({
      base,
      token: TOKEN,
      WebSocketImpl: Ws,
      startTimeoutMs: 150,
      events: { onMessage: () => undefined, onClose: () => undefined },
    });
    await expect(t.start(payload)).rejects.toMatchObject({ kind: 'transport', code: 'timeout' });
  });
});

class FakeXhr implements XhrLike {
  static last: FakeXhr | null = null;
  readyState = 0;
  status = 0;
  responseText = '';
  url = '';
  headers: Record<string, string> = {};
  aborted = false;
  onprogress: ((ev: unknown) => void) | null = null;
  onreadystatechange: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(_m: string, url: string) {
    this.url = url;
  }
  setRequestHeader(n: string, v: string) {
    this.headers[n] = v;
  }
  send() {
    this.readyState = 2;
  }
  abort() {
    this.aborted = true;
  }
  feed(chunk: string) {
    this.status = 200;
    this.readyState = 3;
    this.responseText += chunk;
    this.onprogress?.({});
  }
  end() {
    this.readyState = 4;
    this.onreadystatechange?.({});
  }
}

describe('SSE transport', () => {
  function setup(sendDelays: number[] = []) {
    const sent: string[] = [];
    const startBody = { ok: true, session_id: 's-1', conversation_id: 'c-1', playback_lead_first_only: false };
    const { impl, calls } = fakeFetch({
      '/api/v1/orb/live/session/start': () => ({ json: startBody }),
      '/api/v1/orb/session/s-1/audio-ready': () => ({ json: { ok: true } }),
      '/api/v1/orb/live/session/stop': () => ({ json: { ok: true } }),
    });
    let i = 0;
    const fetchImpl = async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
      if (url.includes('/api/v1/orb/live/stream/send')) {
        const delay = sendDelays[i++] ?? 0;
        await new Promise((r) => setTimeout(r, delay));
        sent.push(JSON.parse(init!.body!).type);
        return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' };
      }
      return impl(url, init);
    };
    const received: ServerMessage[] = [];
    const closes: string[] = [];
    const t = createSseTransport({
      base: 'http://127.0.0.1:9',
      token: TOKEN,
      fetchImpl,
      xhrFactory: () => new FakeXhr(),
      events: { onMessage: (m) => received.push(m), onClose: (c) => closes.push(c.reason) },
    });
    return { t, sent, calls, received, closes };
  }

  it('starts with header auth; the stream URL is the only place with the token', async () => {
    const { t, calls } = setup();
    const r = await t.start(payload);
    expect(r).toEqual({ sessionId: 's-1', conversationId: 'c-1', playbackLeadFirstOnly: false });
    expect(calls[0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(calls[0].url).not.toContain(TOKEN);
    expect(FakeXhr.last!.url).toBe(streamUrl('http://127.0.0.1:9', 's-1', TOKEN));
    expect(FakeXhr.last!.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('parses stream chunks into server messages and reports the end of the stream', async () => {
    const { t, received, closes } = setup();
    await t.start(payload);
    const x = FakeXhr.last!;
    x.feed('data: {"type":"live_api_ready","full_du');
    x.feed('plex":true}\n\ndata: {"type":"heartbeat"}\n');
    x.feed('\n');
    x.end();
    expect(received.map((m) => m.type)).toEqual(['live_api_ready', 'heartbeat']);
    expect(received[0].full_duplex).toBe(true);
    expect(closes).toEqual(['sse_closed:200']);
  });

  it('the ordered queue keeps frame-then-interrupt order under delayed responses', async () => {
    const { t, sent } = setup([60, 0, 30, 0]);
    await t.start(payload);
    t.send({ type: 'audio', data_b64: 'AAAA', mime: 'audio/pcm;rate=16000' });
    t.send({ type: 'interrupt' });
    t.send({ type: 'audio', data_b64: 'AQAB', mime: 'audio/pcm;rate=16000' });
    t.send({ type: 'context_update', current_route: '/home' });
    await (t as unknown as { queue: OrderedSendQueue }).queue.drain();
    expect(sent).toEqual(['audio', 'interrupt', 'audio', 'context_update']);
  });

  it('posts audio-ready and stops with a fire-and-forget POST', async () => {
    const { t, calls } = setup();
    await t.start(payload);
    t.signalAudioReady();
    t.close();
    await flush();
    expect(calls.map((c) => c.url.replace('http://127.0.0.1:9', ''))).toEqual([
      '/api/v1/orb/live/session/start',
      '/api/v1/orb/session/s-1/audio-ready',
      '/api/v1/orb/live/session/stop',
    ]);
    expect(FakeXhr.last!.aborted).toBe(true);
  });

  it('ok:false and 401 are rejections; a network error is a transport failure', async () => {
    const reject = createSseTransport({
      base: 'http://127.0.0.1:9',
      token: TOKEN,
      fetchImpl: fakeFetch({ '/api/v1/orb/live/session/start': () => ({ json: { ok: false, error: 'QUOTA' } }) }).impl,
      xhrFactory: () => new FakeXhr(),
      events: { onMessage: () => undefined, onClose: () => undefined },
    });
    await expect(reject.start(payload)).rejects.toMatchObject({ kind: 'rejected', code: 'QUOTA' });
    const unauth = createSseTransport({
      base: 'http://127.0.0.1:9',
      token: TOKEN,
      fetchImpl: fakeFetch({ '/api/v1/orb/live/session/start': () => ({ status: 401, json: {} }) }).impl,
      xhrFactory: () => new FakeXhr(),
      events: { onMessage: () => undefined, onClose: () => undefined },
    });
    await expect(unauth.start(payload)).rejects.toMatchObject({ kind: 'rejected' });
    const down = createSseTransport({
      base: 'http://127.0.0.1:9',
      token: TOKEN,
      fetchImpl: fakeFetch({}).impl,
      xhrFactory: () => new FakeXhr(),
      events: { onMessage: () => undefined, onClose: () => undefined },
    });
    await expect(down.start(payload)).rejects.toBeInstanceOf(OrbStartError);
    await expect(down.start(payload)).rejects.toMatchObject({ kind: 'transport' });
  });
});

describe('transport selection (F3)', () => {
  beforeEach(() => resetTransportLatchForTests());

  it('follows the server answer, defaults to sse when it is missing', async () => {
    const ws = fakeFetch({ '/api/v1/orb/live/transport': () => ({ json: { ok: true, transport: 'ws' } }) });
    expect(await selectTransport({ base: 'http://x', fetchImpl: ws.impl })).toBe('ws');
    const sse = fakeFetch({ '/api/v1/orb/live/transport': () => ({ json: { ok: true, transport: 'sse' } }) });
    expect(await selectTransport({ base: 'http://x', fetchImpl: sse.impl })).toBe('sse');
    const err = fakeFetch({ '/api/v1/orb/live/transport': () => ({ status: 500, json: {} }) });
    expect(await selectTransport({ base: 'http://x', fetchImpl: err.impl })).toBe('sse');
    expect(await selectTransport({ base: 'http://x', fetchImpl: fakeFetch({}).impl })).toBe('sse');
  });

  it('the SSE latch holds for the rest of the process', async () => {
    latchSse();
    expect(isSseLatched()).toBe(true);
    const ws = fakeFetch({ '/api/v1/orb/live/transport': () => ({ json: { ok: true, transport: 'ws' } }) });
    expect(await selectTransport({ base: 'http://x', fetchImpl: ws.impl })).toBe('sse');
  });

  it('the developer override applies to the development profile only', () => {
    expect(devTransportOverride('development', 'ws')).toBe('ws');
    expect(devTransportOverride('test-g1', 'ws')).toBeUndefined();
    expect(devTransportOverride('development', 'bogus')).toBeUndefined();
  });
});
