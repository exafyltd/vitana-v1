/**
 * VTID-05682 (native-wave1-readiness-tests/deeplinks-i18n, L1) — `configuredLinkHosts`
 * (src/linking/link-router.ts:89) with expo-constants mocked in this file, and what the
 * router does with a link on a configured / unconfigured host. Readiness evidence only:
 * mocks, no network; it does not prove the Wave 1 exit (needs G1).
 */
import '../../helpers/no-network';

let mockExtra: unknown;
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExtra === undefined ? undefined : { extra: mockExtra };
    },
  },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { configuredLinkHosts, createLinkRouter } from '../../../src/linking/link-router';

const HOST = 'g1-test.example.org';

beforeEach(() => {
  mockExtra = undefined;
});

describe('configuredLinkHosts', () => {
  it('no expoConfig → []', () => {
    expect(configuredLinkHosts()).toEqual([]);
  });

  it('no extra.linkHosts → []', () => {
    mockExtra = {};
    expect(configuredLinkHosts()).toEqual([]);
  });

  it('an array keeps the strings only', () => {
    mockExtra = { linkHosts: [HOST, 42, null, 'www.example.org', { host: 'x' }, undefined] };
    expect(configuredLinkHosts()).toEqual([HOST, 'www.example.org']);
  });

  it.each([['a string', HOST], ['an object', { [HOST]: true }], ['a number', 7], ['null', null]])('a non-array (%s) → []', (_n, value) => {
    mockExtra = { linkHosts: value };
    expect(configuredLinkHosts()).toEqual([]);
  });
});

describe('the router with the configured hosts', () => {
  function routerFor(hosts: string[]) {
    const nav = jest.fn();
    const r = createLinkRouter({ linkHosts: hosts, isSignedIn: () => true });
    r.attachNavigator(nav);
    return { r, nav };
  }

  it('a link on a configured host resolves to its route', () => {
    mockExtra = { linkHosts: [HOST] };
    const { r, nav } = routerFor(configuredLinkHosts());
    expect(r.handleLink(`https://${HOST}/inbox`)).toEqual({ kind: 'route', pathname: '/inbox', params: {} });
    expect(nav).toHaveBeenCalledWith('/inbox');
  });

  it('a link on an unconfigured host opens home, never the link', () => {
    mockExtra = {};
    const { r, nav } = routerFor(configuredLinkHosts());
    expect(r.handleLink(`https://${HOST}/inbox`)).toBeNull();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav).toHaveBeenCalledWith('/');
  });

  it('a configured host does not widen to a look-alike host', () => {
    mockExtra = { linkHosts: [HOST] };
    const { r, nav } = routerFor(configuredLinkHosts());
    expect(r.handleLink(`https://${HOST}.evil.example/inbox`)).toBeNull();
    expect(nav).toHaveBeenCalledWith('/');
  });
});

describe('universal links on the real associated domain', () => {
  // needs G1 (isolated test backend): the web host that serves the associated-domain files does not exist before G1 (src/linking/link-router.ts:88)
  it.skip('a universal link on the real associated domain opens the app', () => undefined);

  // needs G1 (isolated test backend): apple-app-site-association / assetlinks.json must be served by a real host and verified by the OS
  it.skip('apple-app-site-association and assetlinks.json are served and verified', () => undefined);

  // needs G1 (isolated test backend): needs a signed-in G1 member on a device and a real gateway
  it.skip('a deep link opened on a signed-in G1 member lands on its screen', () => undefined);
});
