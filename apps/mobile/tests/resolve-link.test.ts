/** VTID-05178 — the one link resolver, link routing and the N3 port (N4-APP Changes 11–12). */
import { hrefOf, parseQuery, resolveLink, resolvePushLink } from '../src/linking/resolve-link';
import { createLinkRouter } from '../src/linking/link-router';
import {
  deliverAuthLink,
  getSession,
  onAuthLink,
  onInviteLink,
  resetAuthPort,
  setSession,
  subscribeSession,
} from '../src/linking/auth-port';
import { redirectSystemPath } from '../app/+native-intent';
import { setLinkRouter, type LinkRouter } from '../src/linking/link-router';

afterEach(() => resetAuthPort());

describe('resolveLink — accepted inputs', () => {
  it('a relative path', () => {
    expect(resolveLink('/inbox/42?tab=all')).toEqual({ kind: 'route', pathname: '/inbox/42', params: { tab: 'all' } });
  });

  it.each(['https://vitanaland.com/inbox', 'https://www.vitanaland.com/inbox', 'https://VITANALAND.com./inbox', 'https://vitanaland.com:443/inbox'])(
    'an allowed web host: %s',
    (url) => {
      expect(resolveLink(url)).toEqual({ kind: 'route', pathname: '/inbox', params: {} });
    },
  );

  it("a profile link host from options", () => {
    expect(resolveLink('https://g1-test.example.org/inbox', { linkHosts: ['g1-test.example.org'] })?.pathname).toBe('/inbox');
    expect(resolveLink('https://g1-test.example.org/inbox')).toBeNull();
  });

  it.each([
    ['maxina://inbox/1', '/inbox/1'],
    ['maxina:///inbox/1', '/inbox/1'],
    ['MAXINA://inbox', '/inbox'],
    ['maxina://', '/'],
  ])('the custom scheme %s', (url, pathname) => {
    expect(resolveLink(url)?.pathname).toBe(pathname);
  });

  it('the bare host maps to home and a trailing slash is dropped', () => {
    expect(resolveLink('https://vitanaland.com')?.pathname).toBe('/');
    expect(resolveLink('/inbox/')?.pathname).toBe('/inbox');
  });

  it('decodes query parameters', () => {
    expect(parseQuery('?a=1&b=hello%20world&c=x+y&bad=%E0%A4%A')).toEqual({ a: '1', b: 'hello world', c: 'x y' });
  });
});

describe('resolveLink — rejected inputs (null → home, never opened in-app)', () => {
  it.each([
    'https://evil.example.com/inbox',
    'https://vitanaland.com.evil.example/inbox',
    'https://user:pw@vitanaland.com/inbox',
    'https://vitanaland.com:8443/inbox',
    'http://vitanaland.com/inbox',
    'javascript:alert(1)',
    'data:text/html,hi',
    'exp://127.0.0.1:8081',
    '//evil.example.com/inbox',
    '/\\evil.example.com',
    'maxina://\\evil',
    'inbox',
    '',
    '   ',
    '/in box',
    '/in\nbox',
    '/in\u0000box',
  ])('%j', (input) => {
    expect(resolveLink(input)).toBeNull();
  });

  it.each([undefined, null, 42, {}, ['/inbox']])('non-string %j', (input) => {
    expect(resolveLink(input)).toBeNull();
  });

  it('an over-long input', () => {
    expect(resolveLink(`/${'a'.repeat(5000)}`)).toBeNull();
  });
});

describe('auth, OAuth and invite links (tagged for N3)', () => {
  it('/auth/confirmed with tokens in the hash', () => {
    const link = resolveLink('https://vitanaland.com/auth/confirmed#access_token=at&refresh_token=rt&type=signup&expires_in=3600');
    expect(link).toEqual({
      kind: 'auth',
      path: '/auth/confirmed',
      pathname: '/auth/confirmed',
      params: {},
      tokens: { access_token: 'at', refresh_token: 'rt', type: 'signup', expires_in: '3600' },
    });
  });

  it('/reset-password with ?code= (PKCE); tokens never become route params', () => {
    const link = resolveLink('https://vitanaland.com/reset-password?code=abc123');
    expect(link).toMatchObject({ kind: 'auth', path: '/reset-password', params: {}, tokens: { code: 'abc123' } });
  });

  it('auth errors are passed through for N3 to show', () => {
    expect(resolveLink('/auth/confirmed#error=access_denied&error_description=Link+expired')).toMatchObject({
      kind: 'auth',
      tokens: { error: 'access_denied', error_description: 'Link expired' },
    });
  });

  it('/oauth/complete → oauth_return with its params', () => {
    expect(resolveLink('https://vitanaland.com/oauth/complete?return=mobile&provider=google&next=%2Fhome')).toEqual({
      kind: 'oauth_return',
      pathname: '/oauth/complete',
      params: { return: 'mobile', provider: 'google', next: '/home' },
    });
  });

  it('/i/:code → invite', () => {
    expect(resolveLink('https://vitanaland.com/i/AbC-12_x')).toEqual({ kind: 'invite', pathname: '/i/AbC-12_x', params: {}, code: 'AbC-12_x' });
    expect(resolveLink('maxina://i/xyz')).toMatchObject({ kind: 'invite', code: 'xyz' });
    expect(resolveLink('/i/a/b')?.kind).toBe('route');
    expect(resolveLink('/i/')?.kind).toBe('route');
  });
});

describe('push opens', () => {
  it('reads data.url', () => {
    expect(resolvePushLink({ url: '/inbox/7' })?.pathname).toBe('/inbox/7');
  });

  it('falls back to open_link_url (Appilix during the transition)', () => {
    expect(resolvePushLink({ open_link_url: 'https://vitanaland.com/community/events?id=3' })).toEqual({
      kind: 'route',
      pathname: '/community/events',
      params: { id: '3' },
    });
  });

  it('data.url wins; an invalid data.url falls back too', () => {
    expect(resolvePushLink({ url: '/a', open_link_url: 'https://vitanaland.com/b' })?.pathname).toBe('/a');
    expect(resolvePushLink({ url: 'https://evil.example.com/a', open_link_url: '/b' })?.pathname).toBe('/b');
  });

  it('nothing usable → null', () => {
    expect(resolvePushLink({})).toBeNull();
    expect(resolvePushLink(null)).toBeNull();
    expect(resolvePushLink({ url: 'https://evil.example.com' })).toBeNull();
  });
});

describe('hrefOf', () => {
  it('rebuilds pathname and query', () => {
    expect(hrefOf({ pathname: '/x', params: {} })).toBe('/x');
    expect(hrefOf({ pathname: '/x', params: { a: '1 2', 'b&': '/' } })).toBe('/x?a=1%202&b%26=%2F');
  });
});

describe('link router', () => {
  function router(signedIn = { value: false }) {
    const nav = jest.fn();
    const r = createLinkRouter({ linkHosts: [], isSignedIn: () => signedIn.value });
    return { r, nav, signedIn };
  }

  it('holds a route target before sign-in and replays it after', () => {
    const { r, nav, signedIn } = router();
    r.attachNavigator(nav);
    r.handleLink('https://vitanaland.com/inbox/9?x=1');
    expect(nav).not.toHaveBeenCalled();
    expect(r.heldHref()).toBe('/inbox/9?x=1');
    signedIn.value = true;
    r.onSignedIn();
    expect(nav).toHaveBeenCalledWith('/inbox/9?x=1');
    expect(r.heldHref()).toBeNull();
  });

  it('only the latest held target is replayed', () => {
    const { r, nav, signedIn } = router();
    r.attachNavigator(nav);
    r.handleLink('/a');
    r.handlePushOpen({ url: '/b' });
    signedIn.value = true;
    r.onSignedIn();
    expect(nav.mock.calls).toEqual([['/b']]);
  });

  it('a cold-start link waits for the navigator', () => {
    const { r, nav } = router({ value: true });
    r.handleLink('maxina://inbox');
    expect(nav).not.toHaveBeenCalled();
    r.attachNavigator(nav);
    expect(nav).toHaveBeenCalledWith('/inbox');
  });

  it('navigates straight away when signed in', () => {
    const { r, nav } = router({ value: true });
    r.attachNavigator(nav);
    r.handlePushOpen({ url: '/inbox' });
    expect(nav).toHaveBeenCalledWith('/inbox');
  });

  it('a foreign link opens home, never the link', () => {
    const { r, nav } = router({ value: true });
    r.attachNavigator(nav);
    expect(r.handleLink('https://evil.example.com/x')).toBeNull();
    expect(nav).toHaveBeenCalledWith('/');
  });

  it('auth / OAuth / invite links go to N3 handlers, not to the router, even signed out', () => {
    const { r, nav } = router();
    r.attachNavigator(nav);
    const auth = jest.fn();
    const invite = jest.fn();
    onAuthLink(auth);
    onInviteLink(invite);
    r.handleLink('https://vitanaland.com/reset-password?code=c1');
    r.handleLink('https://vitanaland.com/oauth/complete?provider=apple');
    r.handleLink('https://vitanaland.com/i/inv1');
    expect(auth.mock.calls.map(([l]) => l.kind)).toEqual(['auth', 'oauth_return']);
    expect(invite).toHaveBeenCalledWith(expect.objectContaining({ kind: 'invite', code: 'inv1' }));
    expect(nav).not.toHaveBeenCalled();
    expect(r.heldHref()).toBeNull();
  });
});

describe('N3 port stub', () => {
  it('a link that arrives before N3 registers is delivered on registration (latest only)', () => {
    deliverAuthLink({ kind: 'oauth_return', pathname: '/oauth/complete', params: { n: '1' } });
    deliverAuthLink({ kind: 'oauth_return', pathname: '/oauth/complete', params: { n: '2' } });
    const handler = jest.fn();
    onAuthLink(handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].params).toEqual({ n: '2' });
  });

  it('session changes are published; there is no session until N3 sets one', () => {
    expect(getSession()).toBeNull();
    const listener = jest.fn();
    const unsub = subscribeSession(listener);
    setSession({ accessToken: 't' });
    setSession(null);
    unsub();
    setSession({ accessToken: 'u' });
    expect(listener.mock.calls).toEqual([[{ accessToken: 't' }], [null]]);
  });
});

describe('app/+native-intent', () => {
  afterEach(() => setLinkRouter(null));

  it('hands every system path to the link router and keeps Expo Router where it is', () => {
    const handleLink = jest.fn();
    setLinkRouter({ handleLink } as unknown as LinkRouter);
    expect(redirectSystemPath({ path: 'maxina://inbox', initial: true })).toBeNull();
    expect(handleLink).toHaveBeenCalledWith('maxina://inbox');
  });

  it('never throws', () => {
    setLinkRouter({
      handleLink: () => {
        throw new Error('boom');
      },
    } as unknown as LinkRouter);
    expect(redirectSystemPath({ path: '/x', initial: false })).toBeNull();
  });
});
