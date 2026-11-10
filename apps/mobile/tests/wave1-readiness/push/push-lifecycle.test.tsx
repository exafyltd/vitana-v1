/**
 * Wave 1 readiness (native-wave1-readiness-tests/push, P1) — usePushLifecycle, mocks only.
 * Readiness evidence only: it does not prove the Wave 1 exit ("receives a push"), which needs G1.
 * Subject: src/push/registration.ts:205 usePushLifecycle (token refresh, sign-in badge sync, foreground badge sync, cleanup).
 */
import '../../helpers/no-network';
import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { setPushClient, usePushLifecycle, type PushClient } from '../../../src/push/registration';
import { NoopPushProvider, setPushProvider, type PushProvider } from '../../../src/push/provider';
import { resetAuthPort, setSession } from '../../../src/linking/auth-port';

const SESSION = { accessToken: 'jwt-1' };

function fakeClient() {
  return {
    registerPushToken: jest.fn(async () => ({ status: 'ok' as const })),
    unregisterPushToken: jest.fn(async () => ({ status: 'ok' as const })),
    syncBadge: jest.fn(async () => ({ status: 'ok' as const })),
    requestPushPermission: jest.fn(async () => 'granted' as const),
    registeredToken: jest.fn(() => null),
  };
}

function fakeProvider() {
  const unsubRefresh = jest.fn();
  let refresh: ((t: string) => void) | null = null;
  const provider: PushProvider = {
    ...NoopPushProvider,
    isAvailable: () => true,
    onTokenRefresh: (l) => {
      refresh = l;
      return unsubRefresh;
    },
  };
  return { provider, unsubRefresh, emitRefresh: (t: string) => refresh?.(t) };
}

describe('usePushLifecycle (registration.ts:205)', () => {
  let client: ReturnType<typeof fakeClient>;
  let prov: ReturnType<typeof fakeProvider>;
  let appStateHandler: ((s: string) => void) | null;
  let removeAppState: jest.Mock;
  let addSpy: jest.SpyInstance;

  beforeEach(() => {
    resetAuthPort();
    client = fakeClient();
    prov = fakeProvider();
    setPushClient(client as unknown as PushClient);
    setPushProvider(prov.provider);
    appStateHandler = null;
    removeAppState = jest.fn();
    addSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((type: string, h: (s: string) => void) => {
      if (type === 'change') appStateHandler = h;
      return { remove: removeAppState };
    }) as never);
  });

  afterEach(() => {
    addSpy.mockRestore();
    setPushProvider(NoopPushProvider);
    setPushClient(null);
    resetAuthPort();
  });

  it('a provider token refresh registers the new token with the current session (registration.ts:209-211)', () => {
    setSession(SESSION);
    renderHook(() => usePushLifecycle());
    act(() => prov.emitRefresh('fresh-token'));
    expect(client.registerPushToken).toHaveBeenCalledTimes(1);
    expect(client.registerPushToken).toHaveBeenCalledWith(SESSION, 'fresh-token');
  });

  it('a token refresh while signed out is still handed to the client with a null session (the client gate skips it)', () => {
    renderHook(() => usePushLifecycle());
    act(() => prov.emitRefresh('t'));
    expect(client.registerPushToken).toHaveBeenCalledWith(null, 't');
  });

  it('a session change to non-null syncs the badge with that session; to null it does not (registration.ts:212-214)', () => {
    renderHook(() => usePushLifecycle());
    expect(client.syncBadge).not.toHaveBeenCalled();
    act(() => setSession(SESSION));
    expect(client.syncBadge).toHaveBeenCalledTimes(1);
    expect(client.syncBadge).toHaveBeenCalledWith(SESSION);
    act(() => setSession(null));
    expect(client.syncBadge).toHaveBeenCalledTimes(1);
  });

  it('AppState change to active syncs the badge with the current session; background and inactive do not (registration.ts:215-217)', () => {
    setSession(SESSION);
    renderHook(() => usePushLifecycle());
    expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function));
    act(() => appStateHandler?.('background'));
    act(() => appStateHandler?.('inactive'));
    expect(client.syncBadge).not.toHaveBeenCalled();
    act(() => appStateHandler?.('active'));
    expect(client.syncBadge).toHaveBeenCalledTimes(1);
    expect(client.syncBadge).toHaveBeenCalledWith(SESSION);
  });

  it('returning to the foreground signed out still calls syncBadge with null (the client gate skips it)', () => {
    renderHook(() => usePushLifecycle());
    act(() => appStateHandler?.('active'));
    expect(client.syncBadge).toHaveBeenCalledWith(null);
  });

  it('unmount unsubscribes all three: the provider refresh, the session listener and the AppState subscription', () => {
    const { unmount } = renderHook(() => usePushLifecycle());
    expect(prov.unsubRefresh).not.toHaveBeenCalled();
    expect(removeAppState).not.toHaveBeenCalled();
    unmount();
    expect(prov.unsubRefresh).toHaveBeenCalledTimes(1);
    expect(removeAppState).toHaveBeenCalledTimes(1);
    // the session listener is gone: a sign-in after unmount syncs nothing
    act(() => setSession(SESSION));
    expect(client.syncBadge).not.toHaveBeenCalled();
  });

  it('with the Noop provider and the real client the hook mounts and unmounts without a call or a throw', () => {
    setPushClient(null);
    setPushProvider(NoopPushProvider);
    const { unmount } = renderHook(() => usePushLifecycle());
    expect(() => unmount()).not.toThrow();
  });
});
