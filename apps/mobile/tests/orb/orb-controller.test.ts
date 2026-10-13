/**
 * VTID-05182 — the ORB overlay controller (N6d, plan Changes 15, 16, 18).
 *
 * Permission flow, mute, context and role changes, and which session ends
 * close the overlay — driven over the real N6a session, an in-memory
 * WebSocket and a fake voice module. No network.
 */
import { createOrbSession } from '../../src/orb/session';
import { resetTransportLatchForTests } from '../../src/orb/select-transport';
import type { WebSocketCtor } from '../../src/orb/transport-ws';
import type { MicPermission } from '../../modules/vitana-voice/src/VitanaVoice';
import { createOrbController, withMicMute, type OrbControllerDeps, type OrbVoice } from '../../src/orb/ui/orb-controller';
import { FakeSocket, FakeVoice, fakeFetch, flush } from './helpers';

class PermVoice extends FakeVoice implements OrbVoice {
  requests = 0;
  constructor(
    public current: MicPermission = { status: 'granted', canAskAgain: true },
    public onRequest: MicPermission = { status: 'granted', canAskAgain: true },
  ) {
    super();
  }
  async getMicrophonePermission(): Promise<MicPermission> {
    return this.current;
  }
  async requestMicrophonePermission(): Promise<MicPermission> {
    this.requests++;
    this.current = this.onRequest;
    return this.onRequest;
  }
}

async function settle(n = 6) {
  for (let i = 0; i < n; i++) await flush();
}

function make(over: Partial<OrbControllerDeps> = {}, voice = new PermVoice()) {
  const f = fakeFetch({
    '/api/v1/auth/me': () => ({ json: { ok: true } }),
    '/api/v1/orb/live/transport': () => ({ json: { ok: true, transport: 'ws' } }),
  });
  const openUrl = jest.fn();
  const openSettings = jest.fn();
  const createSession = jest.fn((d: Parameters<typeof createOrbSession>[0]) =>
    createOrbSession({ ...d, fetchImpl: f.impl, WebSocketImpl: FakeSocket as unknown as WebSocketCtor }),
  );
  const c = createOrbController({
    gatewayUrl: 'http://127.0.0.1:8787',
    voice: () => voice,
    createSession,
    getAccessToken: async () => 'tok',
    navigate: () => ({ status: 'opened' }),
    lang: () => 'de-DE',
    appVersion: 'test',
    openUrl,
    openSettings,
    ...over,
  });
  return { c, voice, createSession, openUrl, openSettings, fetch: f };
}

beforeEach(() => {
  FakeSocket.reset();
  resetTransportLatchForTests();
});

describe('without a gateway URL', () => {
  it('opens and says Vitana is not reachable; asks for nothing, connects to nothing', async () => {
    const { c, voice, createSession } = make({ gatewayUrl: null });
    await c.open();
    expect(c.getState()).toMatchObject({ open: true, phase: 'unavailable' });
    expect(voice.requests).toBe(0);
    expect(createSession).not.toHaveBeenCalled();
    expect(FakeSocket.instances).toHaveLength(0);
  });
});

describe('permission flow (Change 16)', () => {
  it('undetermined ⇒ in-app rationale first; the OS prompt only on "continue"; granted ⇒ session', async () => {
    const voice = new PermVoice({ status: 'undetermined', canAskAgain: true });
    const { c } = make({}, voice);
    await c.open();
    expect(c.getState()).toMatchObject({ open: true, phase: 'rationale' });
    expect(voice.requests).toBe(0);
    expect(FakeSocket.instances).toHaveLength(0);
    await c.continueRationale();
    await settle();
    expect(voice.requests).toBe(1);
    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.last().types()).toContain('start');
  });

  it('declining at the OS prompt ⇒ denied, no session', async () => {
    const voice = new PermVoice({ status: 'undetermined', canAskAgain: true }, { status: 'denied', canAskAgain: false });
    const { c } = make({}, voice);
    await c.open();
    await c.continueRationale();
    expect(c.getState().phase).toBe('denied');
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('permanently denied ⇒ the settings state straight away; "open settings" opens the OS settings', async () => {
    const voice = new PermVoice({ status: 'denied', canAskAgain: false });
    const { c, openSettings } = make({}, voice);
    await c.open();
    expect(c.getState().phase).toBe('denied');
    c.openSettings();
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(voice.requests).toBe(0);
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('denied but askable (Android after one "no") ⇒ the rationale again', async () => {
    const { c } = make({}, new PermVoice({ status: 'denied', canAskAgain: true }));
    await c.open();
    expect(c.getState().phase).toBe('rationale');
  });

  it('"not now" closes; a late OS answer after close starts nothing', async () => {
    const voice = new PermVoice({ status: 'undetermined', canAskAgain: true });
    let release: (p: MicPermission) => void = () => undefined;
    voice.requestMicrophonePermission = () => new Promise<MicPermission>((r) => (release = r));
    const { c } = make({}, voice);
    await c.open();
    const pending = c.continueRationale();
    c.close();
    release({ status: 'granted', canAskAgain: true });
    await pending;
    await settle();
    expect(c.getState()).toMatchObject({ open: false, phase: null });
    expect(FakeSocket.instances).toHaveLength(0);
  });
});

describe('session binding', () => {
  it('granted ⇒ connects with the route, recent routes and view profile in the start payload', async () => {
    const { c } = make();
    c.setContext({ route: '/home', role: 'community' });
    c.setContext({ route: '/inbox', role: 'community' });
    await c.open();
    await settle();
    const start = FakeSocket.last().sent.find((m) => m.type === 'start');
    expect(start).toMatchObject({ current_route: '/inbox', recent_routes: ['/inbox', '/home'], surface: 'vitanaland', view_role: 'community', is_mobile: true, lang: 'de-DE' });
    expect(Object.keys(start ?? {}).some((k) => /voice.?id/i.test(k))).toBe(false);
  });

  it('shows the session state: speaking on audio, listening after turn_complete', async () => {
    const { c } = make();
    await c.open();
    await settle();
    const sock = FakeSocket.last();
    sock.serverSend({ type: 'audio', data_b64: 'AAAA', mime: 'audio/pcm;rate=24000' });
    expect(c.getState().phase).toBe('speaking');
    sock.serverSend({ type: 'turn_complete' });
    expect(c.getState().phase).toBe('listening');
    sock.serverSend({ type: 'thinking' });
    expect(c.getState().phase).toBe('thinking');
    sock.serverSend({ type: 'output_transcript', text: 'Hallo' });
    expect(c.getState().liveText).toBe('Hallo');
  });

  it('mute stops frames reaching the gateway; unmute resumes', async () => {
    const { c, voice } = make();
    await c.open();
    await settle();
    const sock = FakeSocket.last();
    const audio = () => sock.sent.filter((m) => m.type === 'audio').length;
    voice.emit('onFrame', { b64: 'a', rms: 0.01, ts: 1 });
    const before = audio();
    expect(before).toBe(1);
    c.toggleMute();
    expect(c.getState()).toMatchObject({ muted: true, phase: 'muted' });
    voice.emit('onFrame', { b64: 'b', rms: 0.3, ts: 2 });
    expect(audio()).toBe(before);
    c.toggleMute();
    voice.emit('onFrame', { b64: 'c', rms: 0.01, ts: 3 });
    expect(audio()).toBe(before + 1);
    expect(c.getState().phase).toBe('listening');
  });

  it('a route change is a context_update; a role change ends the session and starts a new one', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate', 'nextTick'] });
    try {
      const { c } = make();
      c.setContext({ route: '/home', role: 'community' });
      await c.open();
      await settle();
      const first = FakeSocket.last();
      c.setContext({ route: '/inbox', role: 'community' });
      jest.advanceTimersByTime(300);
      expect(first.sent.filter((m) => m.type === 'context_update').pop()).toMatchObject({ current_route: '/inbox', recent_routes: ['/inbox', '/home'] });
      c.setContext({ route: '/inbox', role: 'patient' });
      await settle();
      expect(first.closed).toBe(true);
      expect(FakeSocket.instances).toHaveLength(2);
      expect(FakeSocket.last().sent.find((m) => m.type === 'start')).toMatchObject({ view_role: 'patient' });
      expect(c.getState().open).toBe(true);
      c.close();
    } finally {
      jest.useRealTimers();
    }
  });

  it('close() stops the session and closes the overlay', async () => {
    const { c } = make();
    await c.open();
    await settle();
    const sock = FakeSocket.last();
    c.close();
    expect(sock.closed).toBe(true);
    expect(c.getState()).toMatchObject({ open: false, phase: null });
  });

  it('a navigate or end directive closes the overlay; a dropped session stays open with a restart', async () => {
    const { c } = make();
    await c.open();
    await settle();
    FakeSocket.last().serverSend({ type: 'session_ended' });
    expect(c.getState()).toMatchObject({ open: true, phase: 'ended' });
    await c.restart();
    await settle();
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.last().serverSend({ type: 'connection_issue' });
    expect(c.getState().phase).toBe('error');
  });

  it('open_url directives are handed to the host (https only)', async () => {
    const { c, openUrl } = make();
    await c.open();
    await settle();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'open_url', url: 'https://example.org/x' });
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'open_url', url: 'javascript:alert(1)' });
    expect(openUrl.mock.calls).toEqual([['https://example.org/x']]);
  });

  it('dispose() stops an open session', async () => {
    const { c } = make();
    await c.open();
    await settle();
    const sock = FakeSocket.last();
    c.dispose();
    expect(sock.closed).toBe(true);
  });
});

describe('withMicMute', () => {
  it('drops frames only, and only while muted', () => {
    const voice = new FakeVoice();
    const m = withMicMute(voice);
    const frames: string[] = [];
    const states: boolean[] = [];
    m.addListener('onFrame', (f) => frames.push(f.b64));
    m.addListener('onPlaybackState', (s) => states.push(s.playing));
    voice.emit('onFrame', { b64: '1', rms: 0, ts: 0 });
    m.setMuted(true);
    voice.emit('onFrame', { b64: '2', rms: 0, ts: 0 });
    voice.emit('onPlaybackState', { playing: true, startedAt: 1 });
    m.setMuted(false);
    voice.emit('onFrame', { b64: '3', rms: 0, ts: 0 });
    expect(frames).toEqual(['1', '3']);
    expect(states).toEqual([true]);
    m.stopPlayback();
    expect(voice.calls).toContain('stopPlayback');
  });
});
