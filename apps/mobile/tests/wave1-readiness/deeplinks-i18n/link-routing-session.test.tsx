/**
 * VTID-05682 (native-wave1-readiness-tests/deeplinks-i18n, L2) — `useLinkRouting`
 * (src/linking/link-router.ts:113): a held route target is replayed after the session
 * signal turns non-null, and the hook detaches on unmount. The push-open half belongs to
 * the `push` lane. Mocks only; readiness evidence, not the Wave 1 exit (needs G1).
 */
import '../../helpers/no-network';
import { renderHook, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { getLinkRouter, setLinkRouter, useLinkRouting } from '../../../src/linking/link-router';
import { resetAuthPort, setSession } from '../../../src/linking/auth-port';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));

const push = router.push as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetAuthPort();
  setLinkRouter(null);
});
afterAll(() => {
  resetAuthPort();
  setLinkRouter(null);
});

describe('useLinkRouting — session replay', () => {
  it('holds a route while signed out and replays it once the session appears', () => {
    const hook = renderHook(() => useLinkRouting());
    getLinkRouter().handleLink('/inbox/42?tab=all');
    expect(push).not.toHaveBeenCalled();
    expect(getLinkRouter().heldHref()).toBe('/inbox/42?tab=all');

    act(() => setSession({ accessToken: 't1' }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/inbox/42?tab=all');
    expect(getLinkRouter().heldHref()).toBeNull();
    hook.unmount();
  });

  it('the latest held target wins', () => {
    const hook = renderHook(() => useLinkRouting());
    getLinkRouter().handleLink('/inbox');
    getLinkRouter().handleLink('/wallet');
    act(() => setSession({ accessToken: 't1' }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/wallet');
    hook.unmount();
  });

  it('a sign-out signal replays nothing', () => {
    const hook = renderHook(() => useLinkRouting());
    getLinkRouter().handleLink('/inbox');
    act(() => setSession(null));
    expect(push).not.toHaveBeenCalled();
    expect(getLinkRouter().heldHref()).toBe('/inbox');
    hook.unmount();
  });

  it('signed in, a link is pushed at once and nothing stays held', () => {
    setSession({ accessToken: 't1' });
    const hook = renderHook(() => useLinkRouting());
    getLinkRouter().handleLink('/inbox');
    expect(push).toHaveBeenCalledWith('/inbox');
    expect(getLinkRouter().heldHref()).toBeNull();
    hook.unmount();
  });

  it('a foreign link opens home', () => {
    setSession({ accessToken: 't1' });
    const hook = renderHook(() => useLinkRouting());
    getLinkRouter().handleLink('https://evil.example.com/inbox');
    expect(push).toHaveBeenCalledWith('/');
    hook.unmount();
  });
});

describe('useLinkRouting — unmount', () => {
  it('detaches the navigator: a later link is held, not pushed', () => {
    setSession({ accessToken: 't1' });
    const hook = renderHook(() => useLinkRouting());
    hook.unmount();
    getLinkRouter().handleLink('/inbox');
    expect(push).not.toHaveBeenCalled();
    expect(getLinkRouter().heldHref()).toBe('/inbox');
  });

  it('unsubscribes from the session signal: a later sign-in replays nothing', () => {
    const hook = renderHook(() => useLinkRouting());
    getLinkRouter().handleLink('/inbox');
    hook.unmount();
    act(() => setSession({ accessToken: 't1' }));
    expect(push).not.toHaveBeenCalled();
  });
});
