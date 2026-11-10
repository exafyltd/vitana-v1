/**
 * VTID-05681 (native-wave1-readiness-tests/auth, A3) — readiness evidence only; mocks only, no network.
 * Does NOT prove the Wave 1 exit (needs G1, NATIVE-APP-PLAN.md §5).
 *
 * isGuestPath (src/shell/AuthGate.tsx:19), useCurrentHref (:24) and AuthGate (:36). expo-router and the auth,
 * role, tenant and i18n hooks are mocked in this file; routeGuard, GUEST_PATHS and matchPattern are the real ones.
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AuthGate, isGuestPath } from '../../../src/shell/AuthGate';
import { GUEST_PATHS } from '../../../src/navigation/guest-paths';

const mockState: {
  user: { id: string } | null;
  loading: boolean;
  dbRole: string;
  roleLoading: boolean;
  pathname: string;
  params: Record<string, string | string[] | undefined>;
} = { user: null, loading: false, dbRole: 'community', roleLoading: false, pathname: '/home', params: {} };

jest.mock('expo-router', () => {
  const { View: V } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    Redirect: ({ href }: { href: string }) => createElement(V, { testID: 'redirect', accessibilityLabel: href }),
    usePathname: () => mockState.pathname,
    useGlobalSearchParams: () => mockState.params,
  };
});
jest.mock('../../../src/auth/AuthProvider', () => ({ useAuth: () => ({ user: mockState.user, loading: mockState.loading }) }));
jest.mock('../../../src/identity/useRole', () => ({ useRole: () => ({ dbRole: mockState.dbRole, isLoading: mockState.roleLoading }) }));
jest.mock('../../../src/identity/TenantProvider', () => ({ useTenant: () => ({ registry: { tenants: [] } }) }));
jest.mock('../../../src/i18n/I18nProvider', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

const member = <Text testID="member">member</Text>;
const guest = <Text testID="guest">guest</Text>;
const gate = () => render(<AuthGate member={member} guest={guest} />);
const redirectTo = () => screen.getByTestId('redirect').props.accessibilityLabel as string;
const none = (...ids: string[]) => ids.forEach((id) => expect(screen.queryByTestId(id)).toBeNull());

beforeEach(() => {
  Object.assign(mockState, { user: null, loading: false, dbRole: 'community', roleLoading: false, pathname: '/home', params: {} });
});

describe('isGuestPath (AuthGate.tsx:19)', () => {
  it('lists the guest destinations from GUEST_PATHS', () => {
    expect(GUEST_PATHS.length).toBeGreaterThan(0);
  });

  it.each([...GUEST_PATHS])('GUEST_PATHS entry %s matches a concrete path', (pattern) => {
    const concrete = pattern.replace(/:[A-Za-z]+/g, 'sample');
    expect(isGuestPath(concrete)).toBe(true);
  });

  it.each(['/home', '/wallet', '/inbox', '/admin', '/health', '/discoverx', '/commerce/orders/extra/deep', '/', ''])('member path %p is not a guest path', (p) => {
    expect(isGuestPath(p)).toBe(false);
  });
});

describe('AuthGate (AuthGate.tsx:36)', () => {
  it('loading: shows the loader and neither child', () => {
    mockState.loading = true;
    gate();
    expect(screen.getByTestId('delayed-loader')).toBeTruthy();
    none('member', 'guest', 'redirect');
  });

  it('loading wins over a signed-out guest path', () => {
    mockState.loading = true;
    mockState.pathname = '/discover';
    gate();
    expect(screen.getByTestId('delayed-loader')).toBeTruthy();
    none('guest');
  });

  it('signed out on a guest path: renders guest', () => {
    mockState.pathname = '/discover';
    gate();
    expect(screen.getByTestId('guest')).toBeTruthy();
    none('member', 'redirect');
  });

  it('signed out on a member path: redirects to /maxina?redirectTo=<encoded path>', () => {
    mockState.pathname = '/wallet';
    gate();
    expect(redirectTo()).toBe('/maxina?redirectTo=%2Fwallet');
    none('member', 'guest');
  });

  it('keeps the query in the encoded href', () => {
    mockState.pathname = '/inbox';
    mockState.params = { tab: 'groups', id: '7' };
    gate();
    expect(redirectTo()).toBe(`/maxina?redirectTo=${encodeURIComponent('/inbox?tab=groups&id=7')}`);
  });

  it('drops the catch-all `path` param and undefined values', () => {
    mockState.pathname = '/wallet';
    mockState.params = { path: ['wallet', 'x'], tab: undefined, a: 'b' };
    gate();
    expect(redirectTo()).toBe(`/maxina?redirectTo=${encodeURIComponent('/wallet?a=b')}`);
  });

  it('repeats an array param once per value', () => {
    mockState.pathname = '/wallet';
    mockState.params = { tag: ['a', 'b'] };
    gate();
    expect(redirectTo()).toBe(`/maxina?redirectTo=${encodeURIComponent('/wallet?tag=a&tag=b')}`);
  });

  it('signed in: renders member', () => {
    mockState.user = { id: 'u-1' };
    gate();
    expect(screen.getByTestId('member')).toBeTruthy();
    none('guest', 'redirect');
  });

  it('signed in on a guest path still renders member, not guest', () => {
    mockState.user = { id: 'u-1' };
    mockState.pathname = '/discover';
    gate();
    expect(screen.getByTestId('member')).toBeTruthy();
    none('guest');
  });

  it('signed in with a bouncing routeGuard result: redirects there', () => {
    mockState.user = { id: 'u-1' };
    mockState.dbRole = 'community';
    mockState.pathname = '/admin';
    gate();
    expect(redirectTo()).toBe('/home');
    none('member');
  });

  it('a role-specific bounce: admin on a community path goes to /admin', () => {
    mockState.user = { id: 'u-1' };
    mockState.dbRole = 'admin';
    mockState.pathname = '/home';
    gate();
    expect(redirectTo()).toBe('/admin');
  });

  it('role still loading: renders member without a bounce', () => {
    mockState.user = { id: 'u-1' };
    mockState.roleLoading = true;
    mockState.pathname = '/admin';
    gate();
    expect(screen.getByTestId('member')).toBeTruthy();
    none('redirect');
  });

  it('signed in and allowed on the path: renders member', () => {
    mockState.user = { id: 'u-1' };
    mockState.dbRole = 'community';
    mockState.pathname = '/wallet';
    gate();
    expect(screen.getByTestId('member')).toBeTruthy();
    none('redirect');
  });
});
