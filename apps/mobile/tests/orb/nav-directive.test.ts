/**
 * VTID-05182 — navigation directives on the native app (N6d, plan Change 17).
 *
 * The mapping (`runNativeNavigation`) against N3's real resolver and the web's
 * real registry planner, then the whole path through the N6a session over an
 * in-memory WebSocket: the gateway is told exactly what happened
 * (`nav_result`), never "opened" for a screen the app does not have.
 * No network: FakeSocket and a fetch double only.
 */
import { createOrbSession, type NavCtx, type OrbSessionDeps } from '../../src/orb/session';
import { NAV_REASON, runNativeNavigation, VOICE_BLOCKED_ROUTES, type NativeNavDeps } from '../../src/orb/nav-directive';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { resetTransportLatchForTests } from '../../src/orb/select-transport';
import type { WebSocketCtor } from '../../src/orb/transport-ws';
import { FakeSocket, FakeVoice, fakeFetch } from './helpers';

const ctx = (over: Partial<NavCtx> = {}): NavCtx => ({ entry_kind: 'route', params: null, ...over });

function navDeps(overlays: Record<string, number> = {}) {
  const pushed: string[] = [];
  const emitted: Array<{ event: string; detail: Record<string, string> }> = [];
  const deps: NativeNavDeps = {
    resolve: resolveWebPath,
    push: (href) => pushed.push(href),
    overlayListeners: (event) => overlays[event] ?? 0,
    emitOverlay: (event, detail) => emitted.push({ event, detail }),
  };
  return { deps, pushed, emitted };
}

describe('runNativeNavigation (pure mapping)', () => {
  it('opens a route the Expo Router tree has, and only then', () => {
    const { deps, pushed } = navDeps();
    expect(runNativeNavigation('/maxina', ctx(), deps)).toEqual({ status: 'opened', route: '/maxina' });
    expect(pushed).toEqual(['/maxina']);
  });

  it('a registry screen that is not ported yet ⇒ not_found native_screen_not_ported, nothing pushed', () => {
    const { deps, pushed } = navDeps();
    // MEMORY.DIARY: the planner picks its mobile route (/daily-diary?tab=health), which has no native screen yet.
    expect(runNativeNavigation('/memory/diary', ctx({ screen_id: 'MEMORY.DIARY' }), deps)).toEqual({
      status: 'not_found',
      route: '/daily-diary?tab=health',
      reason: NAV_REASON.SCREEN_NOT_PORTED,
    });
    expect(runNativeNavigation('/somewhere-unknown', ctx(), deps)).toMatchObject({ status: 'not_found', reason: NAV_REASON.SCREEN_NOT_PORTED });
    expect(pushed).toEqual([]);
  });

  it('refuse ⇒ refused with the planner reason', () => {
    const { deps, pushed } = navDeps();
    expect(runNativeNavigation('/command-hub/tasks', ctx(), deps)).toMatchObject({ status: 'refused', reason: 'command-hub is developer-only' });
    expect(runNativeNavigation('/inbox/archived', ctx(), deps)).toMatchObject({ status: 'refused', reason: 'desktop-only route on mobile' });
    expect(pushed).toEqual([]);
  });

  it('never opens an auth flow or the dev bench by voice, although they are native routes', () => {
    const { deps, pushed } = navDeps();
    for (const route of VOICE_BLOCKED_ROUTES) {
      expect(NATIVE_ROUTES).toContain(route);
      expect(runNativeNavigation(route, ctx(), deps)).toEqual({ status: 'refused', route, reason: NAV_REASON.NOT_A_VOICE_DESTINATION });
    }
    expect(pushed).toEqual([]);
  });

  it('an overlay no native screen registered ⇒ not_found native_overlay_not_ported', () => {
    const { deps, emitted } = navDeps();
    expect(runNativeNavigation('/home?open=wallet', ctx({ screen_id: 'OVERLAY.WALLET_POPUP', entry_kind: 'overlay' }), deps)).toEqual({
      status: 'not_found',
      route: '/home?open=wallet',
      reason: NAV_REASON.OVERLAY_NOT_PORTED,
    });
    expect(emitted).toEqual([]);
  });

  it('a registered overlay opens on the native bus with the web event name and the query as detail', () => {
    const { deps, emitted, pushed } = navDeps({ 'wallet:open': 1 });
    expect(runNativeNavigation('/home?open=wallet', ctx({ screen_id: 'OVERLAY.WALLET_POPUP', entry_kind: 'overlay' }), deps)).toEqual({
      status: 'opened',
      route: '/home?open=wallet',
    });
    expect(emitted).toEqual([{ event: 'wallet:open', detail: { open: 'wallet' } }]);
    expect(pushed).toEqual([]);
  });

  it('an overlay whose owning screen is not native ⇒ not_found native_screen_not_ported', () => {
    const { deps, emitted } = navDeps({ 'vitana:settings-navigate': 1 });
    expect(runNativeNavigation('/settings?open=settings_section&section=privacy.security', ctx(), deps)).toEqual({
      status: 'not_found',
      route: '/settings?open=settings_section&section=privacy.security',
      reason: NAV_REASON.SCREEN_NOT_PORTED,
    });
    expect(emitted).toEqual([]);
  });
});

// ── Through the N6a session (in-memory gateway) ─────────────────────────────

const GW = 'http://127.0.0.1:8787';

function sessionDeps(overlays: Record<string, number> = {}) {
  const voice = new FakeVoice();
  const nav = navDeps(overlays);
  const f = fakeFetch({
    '/api/v1/auth/me': () => ({ json: { ok: true } }),
    '/api/v1/orb/live/transport': () => ({ json: { ok: true, transport: 'ws' } }),
  });
  const deps: OrbSessionDeps = {
    gatewayUrl: GW,
    getAccessToken: async () => 'tok',
    voice,
    navigate: (route, c) => runNativeNavigation(route, c, nav.deps),
    lang: () => 'de-DE',
    appVersion: 'test',
    fetchImpl: f.impl,
    WebSocketImpl: FakeSocket as unknown as WebSocketCtor,
  };
  return { deps, voice, nav };
}

describe('directives through the session', () => {
  beforeEach(() => {
    FakeSocket.reset();
    resetTransportLatchForTests();
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate', 'nextTick'] });
  });
  afterEach(() => jest.useRealTimers());

  it('unported screen: nav_result not_found with the reason, then the ORB closes', async () => {
    const { deps, nav } = sessionDeps();
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/memory/diary', screen_id: 'MEMORY.DIARY' });
    jest.advanceTimersByTime(300 + 200);
    expect(sock.sent.find((m) => m.type === 'nav_result')).toEqual({
      type: 'nav_result',
      screen_id: 'MEMORY.DIARY',
      route: '/daily-diary?tab=health',
      status: 'not_found',
      reason: NAV_REASON.SCREEN_NOT_PORTED,
      entry_kind: 'route',
    });
    expect(nav.pushed).toEqual([]);
    expect(s.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'navigate' });
  });

  it('ported screen: router push, nav_result opened', async () => {
    const { deps, nav } = sessionDeps();
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/maxina' });
    jest.advanceTimersByTime(500);
    expect(nav.pushed).toEqual(['/maxina']);
    expect(sock.sent.find((m) => m.type === 'nav_result')).toMatchObject({ status: 'opened', route: '/maxina' });
  });

  it('registered overlay: opened and the ORB stays open (entry_kind overlay)', async () => {
    const { deps, nav } = sessionDeps({ 'wallet:open': 1 });
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/home?open=wallet', screen_id: 'OVERLAY.WALLET_POPUP', entry_kind: 'overlay' });
    jest.advanceTimersByTime(500);
    expect(nav.emitted).toEqual([{ event: 'wallet:open', detail: { open: 'wallet' } }]);
    expect(sock.sent.find((m) => m.type === 'nav_result')).toMatchObject({ status: 'opened', entry_kind: 'overlay' });
    expect(s.getSnapshot().status).toBe('started');
    s.stop();
  });

  it('unknown overlay: not_found, and the ORB still stays open for an overlay entry', async () => {
    const { deps } = sessionDeps();
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/home?open=wallet', screen_id: 'OVERLAY.WALLET_POPUP', entry_kind: 'overlay' });
    jest.advanceTimersByTime(500);
    expect(sock.sent.find((m) => m.type === 'nav_result')).toMatchObject({ status: 'not_found', reason: NAV_REASON.OVERLAY_NOT_PORTED });
    expect(s.getSnapshot().status).toBe('started');
    s.stop();
  });

  it('refused: nav_result refused', async () => {
    const { deps } = sessionDeps();
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/command-hub/x' });
    jest.advanceTimersByTime(500);
    expect(sock.sent.find((m) => m.type === 'nav_result')).toMatchObject({ status: 'refused', reason: 'command-hub is developer-only' });
  });

  it('after_speech waits for turn_complete, then drains, then answers', async () => {
    const { deps, voice } = sessionDeps();
    const s = createOrbSession(deps);
    await s.start();
    const sock = FakeSocket.last();
    voice.emit('onPlaybackState', { playing: true, startedAt: 1 });
    sock.serverSend({ type: 'orb_directive', directive: 'navigate', route: '/memory/diary', screen_id: 'MEMORY.DIARY', after_speech: true });
    jest.advanceTimersByTime(5_000);
    expect(sock.sent.find((m) => m.type === 'nav_result')).toBeUndefined();
    sock.serverSend({ type: 'turn_complete' });
    voice.emit('onPlaybackState', { playing: false, startedAt: 0 });
    jest.advanceTimersByTime(500);
    expect(sock.sent.find((m) => m.type === 'nav_result')).toMatchObject({ status: 'not_found' });
  });
});
