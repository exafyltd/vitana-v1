/**
 * Wave 1 readiness (push, P3) — the push-open path of useLinkRouting, mocks only (expo-router is mocked in this file).
 * Readiness evidence only: it does not prove the Wave 1 exit ("opens its deep link"), which needs G1.
 * Subject: src/linking/link-router.ts:113 useLinkRouting (cold start getInitialOpen, onOpen, session replay, cleanup),
 * with resolvePushLink (resolve-link.ts:182) behind it.
 */
import '../../helpers/no-network';
import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { setLinkRouter, useLinkRouting } from '../../../src/linking/link-router';
import { resetAuthPort, setSession } from '../../../src/linking/auth-port';
import { NoopPushProvider, setPushProvider, type PushOpen, type PushProvider } from '../../../src/push/provider';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const push = router.push as unknown as jest.Mock;
const SESSION = { accessToken: 'jwt-1' };

function provider(initial: Promise<PushOpen | null> = Promise.resolve(null)) {
  const unsubOpen = jest.fn();
  let live: ((o: PushOpen) => void) | null = null;
  const p: PushProvider = {
    ...NoopPushProvider,
    isAvailable: () => true,
    getInitialOpen: () => initial,
    onOpen: (l) => {
      live = l;
      return unsubOpen;
    },
  };
  return { p, unsubOpen, open: (o: PushOpen) => live?.(o) };
}

async function mount(initial?: Promise<PushOpen | null>) {
  const prov = provider(initial);
  setPushProvider(prov.p);
  const view = renderHook(() => useLinkRouting());
  await act(async () => {
    await Promise.resolve();
  });
  return { ...prov, ...view };
}

describe('useLinkRouting: push opens (link-router.ts:113)', () => {
  beforeEach(() => {
    push.mockClear();
    setLinkRouter(null);
    resetAuthPort();
  });
  afterEach(() => {
    setPushProvider(NoopPushProvider);
    setLinkRouter(null);
    resetAuthPort();
  });

  it('a cold-start push with data.url navigates to it (signed in)', async () => {
    setSession(SESSION);
    await mount(Promise.resolve({ data: { url: '/inbox' } }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/inbox');
  });

  it('a live onOpen navigates, keeping the query string', async () => {
    setSession(SESSION);
    const m = await mount();
    expect(push).not.toHaveBeenCalled();
    act(() => m.open({ data: { url: '/inbox?thread=7' } }));
    expect(push).toHaveBeenCalledWith('/inbox?thread=7');
  });

  it('an https URL on the web link host is routed by its path', async () => {
    setSession(SESSION);
    const m = await mount();
    act(() => m.open({ data: { url: 'https://vitanaland.com/inbox' } }));
    expect(push).toHaveBeenCalledWith('/inbox');
  });

  it('the Appilix open_link_url is the fallback when data.url is absent', async () => {
    setSession(SESSION);
    const m = await mount();
    act(() => m.open({ data: { open_link_url: '/events' } }));
    expect(push).toHaveBeenCalledWith('/events');
  });

  it('data.url wins over open_link_url when both resolve', async () => {
    setSession(SESSION);
    const m = await mount();
    act(() => m.open({ data: { url: '/inbox', open_link_url: '/events' } }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/inbox');
  });

  it.each([
    ['a foreign host', { url: 'https://evil.example.com/inbox' }],
    ['a javascript: URL', { url: 'javascript:alert(1)' }],
    ['a protocol-relative URL', { url: '//evil.example.com/x' }],
    ['no usable url at all', { other: 1 }],
    ['an empty payload', {}],
  ])('%s opens home and never the link', async (_name, data) => {
    setSession(SESSION);
    const m = await mount();
    act(() => m.open({ data }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/');
  });

  it('a foreign cold-start push opens home', async () => {
    setSession(SESSION);
    await mount(Promise.resolve({ data: { url: 'https://evil.example.com/inbox' } }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/');
  });

  it('a rejected getInitialOpen is swallowed: no navigation, no unhandled rejection, live opens still work', async () => {
    setSession(SESSION);
    const m = await mount(Promise.reject(new Error('native module gone')));
    expect(push).not.toHaveBeenCalled();
    act(() => m.open({ data: { url: '/inbox' } }));
    expect(push).toHaveBeenCalledWith('/inbox');
  });

  it('a push open while signed out is held, not navigated, and replayed after sign-in', async () => {
    const m = await mount();
    act(() => m.open({ data: { url: '/inbox' } }));
    expect(push).not.toHaveBeenCalled();
    act(() => setSession(SESSION));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/inbox');
    // replayed once only
    act(() => setSession({ accessToken: 'jwt-2' }));
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('a cold-start push held while signed out is replayed after sign-in', async () => {
    await mount(Promise.resolve({ data: { url: '/events' } }));
    expect(push).not.toHaveBeenCalled();
    act(() => setSession(SESSION));
    expect(push).toHaveBeenCalledWith('/events');
  });

  it('while signed out the latest held push wins', async () => {
    const m = await mount();
    act(() => m.open({ data: { url: '/inbox' } }));
    act(() => m.open({ data: { url: '/events' } }));
    act(() => setSession(SESSION));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/events');
  });

  // Current behaviour (link-router.ts:55-58): a foreign/unusable payload opens home as soon as the navigator is attached, signed in or not.
  it('observation: a foreign payload while signed out opens home immediately (not held)', async () => {
    const m = await mount();
    act(() => m.open({ data: { url: 'https://evil.example.com/x' } }));
    expect(push).toHaveBeenCalledWith('/');
  });

  it('unmount removes the live listener, detaches the navigator and stops the sign-in replay', async () => {
    const m = await mount();
    expect(m.unsubOpen).not.toHaveBeenCalled();
    m.unmount();
    expect(m.unsubOpen).toHaveBeenCalledTimes(1);
    // navigator detached: a push handled after unmount is held, never pushed
    const { getLinkRouter } = jest.requireActual('../../../src/linking/link-router') as typeof import('../../../src/linking/link-router');
    getLinkRouter().handlePushOpen({ url: '/inbox' });
    act(() => setSession(SESSION));
    expect(push).not.toHaveBeenCalled();
  });

  it('a cold-start result that resolves after unmount is ignored', async () => {
    setSession(SESSION);
    let resolve!: (o: PushOpen | null) => void;
    const late = new Promise<PushOpen | null>((r) => {
      resolve = r;
    });
    const prov = provider(late);
    setPushProvider(prov.p);
    const view = renderHook(() => useLinkRouting());
    view.unmount();
    await act(async () => {
      resolve({ data: { url: '/inbox' } });
      await Promise.resolve();
    });
    expect(push).not.toHaveBeenCalled();
  });

  it('with the Noop provider there are no push opens and nothing navigates', async () => {
    setSession(SESSION);
    renderHook(() => useLinkRouting());
    await act(async () => {
      await Promise.resolve();
    });
    expect(push).not.toHaveBeenCalled();
  });
});

describe('needs G1 / G2 (skipped, NOT counted toward the Wave 1 exit)', () => {
  // needs G2 (Firebase push project): a real notification tap delivering the FCM data payload to the app on a device
  it.skip('tapping a delivered notification on a device opens its deep link', () => undefined);
});
