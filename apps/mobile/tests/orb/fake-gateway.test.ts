/**
 * VTID-05179 — a whole ORB session against the local fake gateway (N6a, Change 7).
 *
 * Loopback only (127.0.0.1): no session is ever opened on staging or production,
 * and the fake gateway opens no outbound connection.
 */
import { createFakeGateway, isAllowedBindHost, SCENARIOS, WebSocket as WsClient, type FakeGateway } from '../../tools/orb-fake-gateway/server';
import { createOrbSession } from '../../src/orb/session';
import { resetTransportLatchForTests } from '../../src/orb/select-transport';
import type { WebSocketCtor } from '../../src/orb/transport-ws';
import { FakeVoice, loopbackFetch } from './helpers';

function waitFor(cond: () => boolean, ms = 4000): Promise<void> {
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

describe('bind limits', () => {
  it('binds to loopback or a private range only', () => {
    for (const ok of ['127.0.0.1', '::1', 'localhost', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.20']) expect(isAllowedBindHost(ok)).toBe(true);
    for (const bad of ['0.0.0.0', '8.8.8.8', '172.32.0.1', '192.169.0.1', '::', 'example.org']) expect(isAllowedBindHost(bad)).toBe(false);
    expect(() => createFakeGateway({ host: '0.0.0.0' })).toThrow(/refuses to bind/);
  });

  it('every named scenario is a known shape', () => {
    expect(Object.keys(SCENARIOS)).toEqual(
      expect.arrayContaining(['full-duplex', 'half-duplex', 'sse', 'navigate', 'navigate-after-speech', 'navigate-overlay', 'session-ended', 'transport-failure', 'reject-start']),
    );
  });
});

describe('ORB session against the fake gateway (WS)', () => {
  let gw: FakeGateway;
  let url: string;
  beforeEach(async () => {
    resetTransportLatchForTests();
    gw = createFakeGateway({ scenario: SCENARIOS.navigate });
    url = (await gw.start()).url;
  });
  afterEach(async () => {
    await gw.stop();
  });

  it('greeting tone at 24 kHz and 16 kHz, frames recorded as 2048 bytes, navigate → nav_result, close', async () => {
    const voice = new FakeVoice();
    const navigate = jest.fn((route: string) => ({ status: 'opened', route }));
    const s = createOrbSession({
      gatewayUrl: url,
      getAccessToken: async () => 'tok',
      voice,
      navigate,
      lang: () => 'de',
      appVersion: 'test',
      fetchImpl: loopbackFetch(),
      WebSocketImpl: WsClient as unknown as WebSocketCtor,
    });
    await s.start({ current_route: '/home' });
    expect(s.getSnapshot()).toMatchObject({ transport: 'ws', fullDuplex: true, duplexMode: 'full_duplex' });
    expect(voice.started[0]).toEqual({ leadFirstOnly: true, playbackRate: 1.1 });

    // Two native frames while idle: real PCM length, one silent.
    voice.emit('onFrame', { b64: Buffer.alloc(2048, 1).toString('base64'), rms: 0.01, ts: Date.now() });
    voice.emit('onFrame', { b64: Buffer.alloc(2048).toString('base64'), rms: 0, ts: Date.now() + 64 });

    await waitFor(() => navigate.mock.calls.length > 0);
    expect(navigate.mock.calls[0][0]).toBe('/calendar');
    await waitFor(() => gw.frames.some((f) => f.type === 'nav_result'));
    await waitFor(() => s.getSnapshot().status === 'idle');

    const rates = [...new Set(voice.enqueued.map((e) => e.rate))];
    expect(rates).toEqual([24000, 16000]);
    const types = gw.frames.map((f) => f.type);
    expect(types.slice(0, 3)).toEqual(['start', 'context_update', 'audio_ready']);
    const audio = gw.frames.filter((f) => f.type === 'audio');
    expect(audio.map((f) => f.bytes)).toEqual([2048, 2048]);
    expect(audio.map((f) => f.silent)).toEqual([false, true]);
    expect(gw.frames.find((f) => f.type === 'nav_result')?.msg).toMatchObject({ status: 'opened', route: '/calendar', screen_id: 'CALENDAR.OVERVIEW' });
    expect(s.getSnapshot().endReason).toBe('navigate');
    await waitFor(() => gw.frames.some((f) => f.type === 'stop'));
    // The token never appeared in a URL; the upgrade carried it in the header.
    expect(gw.requests.every((r) => !r.url.includes('tok'))).toBe(true);
    expect(gw.requests.find((r) => r.method === 'UPGRADE')?.authorization).toBe('Bearer tok');
  });

  it('a start rejection ends the session without an SSE retry', async () => {
    gw.setScenario({ rejectStart: { code: 'AUTH_TOKEN_INVALID' } });
    const s = createOrbSession({
      gatewayUrl: url,
      getAccessToken: async () => 'tok',
      voice: new FakeVoice(),
      navigate: () => ({ status: 'opened' }),
      lang: () => 'en',
      appVersion: 'test',
      fetchImpl: loopbackFetch(),
      WebSocketImpl: WsClient as unknown as WebSocketCtor,
    });
    await s.start();
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'start_rejected' });
    expect(gw.requests.some((r) => r.path === '/api/v1/orb/live/session/start')).toBe(false);
  });
});
