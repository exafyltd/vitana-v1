/**
 * VTID-05179 — the ORB session state machine (N6a, Changes 4–5).
 *
 * Driven by the recorded transcript `src/orb/__fixtures__/ws-session.json`
 * through an in-memory WebSocket, a fake voice engine and a fetch double.
 * Nothing here opens a connection to any gateway.
 */
import { BLOCKED_HOSTS } from '../../src/config/env';
import { SILENT_FRAME_B64 } from '../../src/orb/duplex-gate';
import { createOrbSession, type OrbEvent, type OrbSessionDeps } from '../../src/orb/session';
import { isSseLatched, resetTransportLatchForTests } from '../../src/orb/select-transport';
import type { WebSocketCtor } from '../../src/orb/transport-ws';
import type { XhrLike } from '../../src/orb/transport-sse';
import fixture from '../../src/orb/__fixtures__/ws-session.json';
import { FakeSocket, FakeVoice, SAFE_CAPS, fakeFetch, flush } from './helpers';

const GW = 'http://127.0.0.1:8787';

function makeDeps(over: Partial<OrbSessionDeps> = {}, routes: Parameters<typeof fakeFetch>[0] = {}) {
  const voice = (over.voice as FakeVoice) ?? new FakeVoice();
  const f = fakeFetch({
    '/api/v1/auth/me': () => ({ json: { ok: true } }),
    '/api/v1/orb/live/transport': () => ({ json: { ok: true, transport: 'ws' } }),
    ...routes,
  });
  const navigate = jest.fn((route: string) => ({ status: 'opened', route }));
  const deps: OrbSessionDeps = {
    gatewayUrl: GW,
    getAccessToken: async () => 'tok',
    voice,
    navigate,
    lang: () => 'en',
    appVersion: 'test',
    fetchImpl: f.impl,
    WebSocketImpl: FakeSocket as unknown as WebSocketCtor,
    ...over,
  };
  return { deps, voice, fetch: f, navigate };
}

async function settle(n = 5) {
  for (let i = 0; i < n; i++) await flush();
}

const serverSteps = fixture.steps.filter((s) => s.dir === 'server' && s.msg && !['connected', 'session_started'].includes(String(s.msg.type)));

beforeEach(() => {
  FakeSocket.reset();
  resetTransportLatchForTests();
});

describe('production safety', () => {
  it.each([...BLOCKED_HOSTS.map((h) => `https://${h}`), 'https://preview-aws.vitanaland.com', 'https://preview-aws-gateway.vitanaland.com/api/v1'])(
    'refuses %s',
    (url) => {
      expect(() => createOrbSession(makeDeps({ gatewayUrl: url }).deps)).toThrow(/never reach production or staging/);
    },
  );
});

describe('start (WS, recorded transcript)', () => {
  it('handshakes, reports the duplex mode once, then signals audio_ready', async () => {
    const { deps, voice } = makeDeps();
    const s = createOrbSession(deps);
    await s.start({ current_route: '/home', surface: 'vitanaland', view_role: 'community' });
    const sock = FakeSocket.last();
    expect(sock.url).toBe('ws://127.0.0.1:8787/api/v1/orb/live/ws');
    expect(sock.options?.headers?.Authorization).toBe('Bearer tok');
    expect(sock.types()).toEqual(['start', 'context_update', 'audio_ready']);
    expect(sock.sent[0]).toMatchObject({ type: 'start', lang: 'en', is_mobile: true, current_route: '/home', surface: 'vitanaland', view_role: 'community', vad_silence_ms: 600 });
    expect(sock.sent[1]).toMatchObject({ type: 'context_update', app_state: { orb_duplex: 'full_duplex' } });
    expect(voice.started).toEqual([{ leadFirstOnly: true, playbackRate: 1.05 }]);
    expect(s.getSnapshot()).toMatchObject({ status: 'started', transport: 'ws', sessionId: 'sess-1', fullDuplex: true, duplexMode: 'full_duplex' });
    s.stop();
  });

  it('replays the transcript: rates from mime, transcripts buffered, interrupted clears the queue, session_ended ends', async () => {
    const { deps, voice } = makeDeps({ lang: () => 'de' });
    const s = createOrbSession(deps);
    const statuses: string[] = [];
    s.subscribe((e: OrbEvent) => e.kind === 'state' && statuses.push(e.snapshot.status));
    await s.start();
    expect(voice.started[0].playbackRate).toBe(1.1);
    for (const step of serverSteps) FakeSocket.last().serverSend(step.msg as Record<string, unknown>);
    expect(voice.enqueued.map((e) => e.rate)).toEqual([24000, 16000, 24000]);
    expect(voice.calls).toContain('stopPlayback');
    const snap = s.getSnapshot();
    expect(snap.status).toBe('idle');
    expect(snap.endReason).toBe('session_ended');
    expect(snap.transcripts).toEqual([
      { role: 'assistant', text: '<assistant-transcript>' },
      { role: 'user', text: '<user-transcript>' },
    ]);
    expect(statuses).toEqual(expect.arrayContaining(['connecting', 'started', 'greeting', 'listening', 'ending', 'idle']));
    expect(voice.calls).toContain('stop');
    expect(voice.listenerCount()).toBe(0);
    expect(FakeSocket.last().types()).toContain('stop');
  });

  it('every native frame becomes an audio message; barge-in sends frame, stops playback, then interrupt', async () => {
    const { deps, voice } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    sock.sent.length = 0;
    voice.emit('onFrame', { b64: 'idle', rms: 0.001, ts: 1000 });
    voice.emit('onPlaybackState', { playing: true, startedAt: 2000 });
    voice.emit('onFrame', { b64: 'warm', rms: 0.3, ts: 2050 });
    voice.emit('onFrame', { b64: 'echo', rms: 0.03, ts: 2400 });
    voice.calls.length = 0;
    voice.emit('onFrame', { b64: 'speech1', rms: 0.2, ts: 2500 });
    voice.emit('onFrame', { b64: 'speech2', rms: 0.2, ts: 2564 });
    expect(sock.sent.map((m) => (m.type === 'audio' ? (m.data_b64 === SILENT_FRAME_B64 ? 'silent' : m.data_b64) : m.type))).toEqual([
      'idle',
      'silent',
      'silent',
      'speech1',
      'speech2',
      'interrupt',
    ]);
    expect(sock.sent[0]).toMatchObject({ mime: 'audio/pcm;rate=16000' });
    expect(voice.calls).toEqual(['stopPlayback']);
    s.stop();
  });
});

describe('capability override (Change 5, R2-F14/F15)', () => {
  it('server full_duplex:true + Android without AEC ⇒ legacy gated path, orb_duplex reported once', async () => {
    const voice = new FakeVoice({ ...SAFE_CAPS, aec: false, aecPath: 'none', fullDuplexSafe: false });
    const { deps } = makeDeps({ voice });
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    expect(sock.sent.filter((m) => m.type === 'context_update')).toEqual([
      expect.objectContaining({ app_state: { orb_duplex: 'half_duplex:no_aec' } }),
    ]);
    expect(s.getSnapshot()).toMatchObject({ fullDuplex: false, duplexMode: 'half_duplex:no_aec' });
    sock.sent.length = 0;
    voice.emit('onPlaybackState', { playing: true, startedAt: 1000 });
    for (let i = 0; i < 5; i++) voice.emit('onFrame', { b64: `e${i}`, rms: 0.059, ts: 2000 + i * 64 });
    expect(sock.sent).toEqual([]);
    for (let i = 0; i < 6; i++) voice.emit('onFrame', { b64: `s${i}`, rms: 0.2, ts: 3000 + i * 64 });
    expect(sock.types()[0]).toBe('interrupt');
    expect(sock.sent.slice(1).map((m) => m.data_b64)).toEqual(['e3', 'e4', 's0', 's1', 's2', 's3', 's4', 's5']);
    // A live_api_ready later does not report again.
    sock.serverSend({ type: 'live_api_ready', full_duplex: true });
    expect(sock.sent.filter((m) => m.type === 'context_update')).toHaveLength(0);
    s.stop();
  });

  it('iOS 16.x unverified path reports half_duplex:ios16_path_unverified', async () => {
    const voice = new FakeVoice({ ...SAFE_CAPS, aecPath: 'session-voicechat', fullDuplexSafe: false });
    const { deps } = makeDeps({ voice });
    const s = createOrbSession(deps);
    await s.start();
    expect(FakeSocket.last().sent.find((m) => m.type === 'context_update')).toMatchObject({ app_state: { orb_duplex: 'half_duplex:ios16_path_unverified' } });
    s.stop();
  });

  it('server full_duplex:false + safe device stays half duplex and reports nothing', async () => {
    FakeSocket.script.onStart = { type: 'session_started', session_id: 'sess-2', full_duplex: false };
    const { deps } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    expect(FakeSocket.last().types()).toEqual(['start', 'audio_ready']);
    expect(s.getSnapshot()).toMatchObject({ fullDuplex: false, duplexMode: null });
    s.stop();
  });
});

describe('start failures', () => {
  it('a server rejection ends the session and is never retried on SSE', async () => {
    FakeSocket.script.onStart = { type: 'error', code: 'AUTH_TOKEN_INVALID' };
    const { deps, fetch } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'start_rejected' });
    expect(fetch.calls.some((c) => c.url.includes('/live/session/start'))).toBe(false);
    expect(isSseLatched()).toBe(false);
  });

  it('a WS transport failure latches SSE and starts over SSE', async () => {
    FakeSocket.script.failOnCreate = true;
    const xhr: XhrLike = {
      readyState: 0,
      status: 0,
      responseText: '',
      open: () => undefined,
      setRequestHeader: () => undefined,
      send: () => undefined,
      abort: () => undefined,
      onprogress: null,
      onreadystatechange: null,
      onerror: null,
    };
    const { deps, fetch } = makeDeps(
      { xhrFactory: () => xhr },
      {
        '/api/v1/orb/live/session/start': () => ({ json: { ok: true, session_id: 'sse-1', playback_lead_first_only: false } }),
        '/api/v1/orb/session/sse-1/audio-ready': () => ({ json: { ok: true } }),
        '/api/v1/orb/live/stream/send': () => ({ json: { ok: true } }),
        '/api/v1/orb/live/session/stop': () => ({ json: { ok: true } }),
      },
    );
    const s = createOrbSession(deps);
    await s.start();
    await settle();
    expect(isSseLatched()).toBe(true);
    expect(s.getSnapshot()).toMatchObject({ status: 'started', transport: 'sse', sessionId: 'sse-1' });
    expect(fetch.calls.map((c) => c.url.replace(GW, ''))).toEqual(
      expect.arrayContaining(['/api/v1/orb/live/session/start', '/api/v1/orb/session/sse-1/audio-ready']),
    );
    s.stop();
  });

  it('auth/me 401 ⇒ no signed-in start; no socket is opened', async () => {
    const { deps } = makeDeps({}, { '/api/v1/auth/me': () => ({ status: 401, json: {} }) });
    const s = createOrbSession(deps);
    await s.start();
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'auth_rejected' });
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('auth/me network error stays optimistic', async () => {
    const { deps } = makeDeps({}, { '/api/v1/auth/me': () => { throw new Error('offline'); } });
    const s = createOrbSession(deps);
    await s.start();
    expect(s.getSnapshot().status).toBe('started');
    s.stop();
  });

  it('no token ⇒ no anonymous session in N6', async () => {
    const { deps } = makeDeps({ getAccessToken: async () => null });
    const s = createOrbSession(deps);
    await s.start();
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'no_token' });
    expect(FakeSocket.instances).toHaveLength(0);
  });
});

describe('lifecycle (fake timers)', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate', 'nextTick'] }));
  afterEach(() => jest.useRealTimers());

  it('the 30 s watchdog ends a silent session; a heartbeat resets it', async () => {
    const { deps } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    jest.advanceTimersByTime(20_000);
    FakeSocket.last().serverSend({ type: 'heartbeat' });
    jest.advanceTimersByTime(20_000);
    expect(s.getSnapshot().status).toBe('started');
    jest.advanceTimersByTime(10_001);
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'watchdog' });
  });

  it('stop() during connecting makes the late start a no-op (generation guard)', async () => {
    let release: (t: string) => void = () => undefined;
    const { deps } = makeDeps({ getAccessToken: () => new Promise<string>((r) => (release = r)) });
    const s = createOrbSession(deps);
    const p = s.start();
    s.stop();
    release('tok');
    await p;
    expect(FakeSocket.instances).toHaveLength(0);
    expect(s.getSnapshot().status).toBe('idle');
  });

  it('navigate: drain poll, 200 ms grace, host navigation, nav_result, then close', async () => {
    const { deps, voice, navigate } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    voice.emit('onPlaybackState', { playing: true, startedAt: 1 });
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/calendar', screen_id: 'CALENDAR.OVERVIEW', title: 'Calendar' });
    jest.advanceTimersByTime(900);
    expect(navigate).not.toHaveBeenCalled();
    voice.emit('onPlaybackState', { playing: false, startedAt: 0 });
    jest.advanceTimersByTime(300 + 200);
    expect(navigate).toHaveBeenCalledWith('/calendar', { screen_id: 'CALENDAR.OVERVIEW', reason: undefined, title: 'Calendar', entry_kind: 'route', params: null });
    expect(sock.sent.find((m) => m.type === 'nav_result')).toEqual({
      type: 'nav_result',
      screen_id: 'CALENDAR.OVERVIEW',
      route: '/calendar',
      status: 'opened',
      reason: null,
      entry_kind: 'route',
    });
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'navigate' });
  });

  it('navigate with keep_orb_open or entry_kind overlay keeps the session open', async () => {
    const { deps, navigate } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'navigate', route: '/home', entry_kind: 'overlay', screen_id: 'X' });
    jest.advanceTimersByTime(500);
    expect(navigate).toHaveBeenCalled();
    expect(s.getSnapshot().status).toBe('started');
    s.stop();
  });

  it('after_speech waits for turn_complete (or 15 s)', async () => {
    const { deps, navigate } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/a', after_speech: true });
    jest.advanceTimersByTime(5_000);
    expect(navigate).not.toHaveBeenCalled();
    sock.serverSend({ type: 'turn_complete' });
    jest.advanceTimersByTime(500);
    expect(navigate).toHaveBeenCalledWith('/a', expect.anything());
  });

  it('after_speech safety timer fires after 15 s without turn_complete', async () => {
    const { deps, navigate } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'navigate', route: '/a', after_speech: true });
    FakeSocket.last().serverSend({ type: 'heartbeat' });
    jest.advanceTimersByTime(14_999);
    expect(navigate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1 + 500);
    expect(navigate).toHaveBeenCalled();
  });

  it('stop() cancels a pending navigation', async () => {
    const { deps, navigate } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'navigate', route: '/a' });
    s.stop();
    jest.advanceTimersByTime(20_000);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('an async host answer slower than 1.5 s is reported as unknown', async () => {
    const { deps } = makeDeps({ navigate: () => new Promise(() => undefined) });
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/slow', keep_orb_open: true });
    jest.advanceTimersByTime(500 + 1500);
    expect(sock.sent.find((m) => m.type === 'nav_result')).toMatchObject({ status: 'unknown', reason: 'host did not answer in time' });
    s.stop();
  });

  it('context updates are debounced 250 ms, deduplicated, and only sent while a session is active', async () => {
    const { deps } = makeDeps();
    const s = createOrbSession(deps);
    s.updateContext({ current_route: '/before' });
    await s.start();
    const sock = FakeSocket.last();
    sock.sent.length = 0;
    s.updateContext({ current_route: '/a' });
    s.updateContext({ current_route: '/b', screen_title: 'B' });
    jest.advanceTimersByTime(249);
    expect(sock.sent).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(sock.sent).toEqual([{ type: 'context_update', current_route: '/b', screen_title: 'B', is_mobile: true }]);
    s.updateContext({ current_route: '/b' });
    jest.advanceTimersByTime(300);
    expect(sock.sent).toHaveLength(1);
    s.stop();
    s.updateContext({ current_route: '/c' });
    jest.advanceTimersByTime(300);
    expect(sock.sent.filter((m) => m.type === 'context_update')).toHaveLength(1);
  });

  it('end directives drain, then close', async () => {
    const { deps } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'end_conversation' });
    jest.advanceTimersByTime(500);
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'end_directive' });
  });
});

describe('native events and directives', () => {
  it.each([
    ['onInterruption', { kind: 'began' }, 'interruption'],
    ['onBackground', undefined, 'background'],
  ])('%s ends the session', async (event, payload, reason) => {
    const { deps, voice } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    voice.emit(event, payload);
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: reason });
  });

  it('an interruption "ended" does not resume or end anything', async () => {
    const { deps, voice } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    voice.emit('onInterruption', { kind: 'ended' });
    expect(s.getSnapshot().status).toBe('started');
    s.stop();
  });

  it('a route change is surfaced; audio logic is untouched', async () => {
    const { deps, voice } = makeDeps();
    const s = createOrbSession(deps);
    const events: OrbEvent[] = [];
    s.subscribe((e) => events.push(e));
    await s.start();
    voice.emit('onRouteChange', { reason: 'newDeviceAvailable', output: 'bluetooth' });
    expect(events).toContainEqual({ kind: 'route_change', output: 'bluetooth', reason: 'newDeviceAvailable' });
    expect(s.getSnapshot().status).toBe('started');
    s.stop();
  });

  it('open_url is surfaced for https only', async () => {
    const { deps } = makeDeps();
    const s = createOrbSession(deps);
    const urls: string[] = [];
    s.subscribe((e) => e.kind === 'open_url' && urls.push(e.url));
    await s.start();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'open_url', url: 'https://music.example.org/x' });
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'open_url', url: 'javascript:alert(1)' });
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'open_url', url: 'http://plain.example.org' });
    expect(urls).toEqual(['https://music.example.org/x']);
    s.stop();
  });

  it('reconnecting / reconnected change the status only', async () => {
    const { deps, voice } = makeDeps();
    const s = createOrbSession(deps);
    await s.start();
    FakeSocket.last().serverSend({ type: 'reconnecting' });
    expect(s.getSnapshot().reconnecting).toBe(true);
    FakeSocket.last().serverSend({ type: 'persona_swap_reconnected' });
    expect(s.getSnapshot().reconnecting).toBe(false);
    expect(voice.calls.filter((c) => c === 'stopPlayback')).toHaveLength(0);
    s.stop();
  });
});
