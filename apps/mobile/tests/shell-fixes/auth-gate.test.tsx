/**
 * VTID-05647 (native-shell-fixes-r2/shell-fixes) — AuthGate: a signed-out visitor on a `/commerce/*` path goes to
 * the supplier front door `/commerce/join` (web AuthGuard.tsx:65, :204) once that native route exists; every other
 * signed-out path keeps `/maxina`; `/commerce` is a guest path. The commerce target is used only when
 * `/commerce/join` is a native route, so the redirect can never land on the (app) catch-all and loop.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AuthGate } from '../../src/shell/AuthGate';
import { NATIVE_ROUTES } from '../../src/navigation/resolve';

let mockPathname = '/home';
jest.mock('expo-router', () => {
  const { Text: T } = jest.requireActual('react-native');
  return {
    usePathname: () => mockPathname,
    useGlobalSearchParams: () => ({}),
    Redirect: ({ href }: { href: string }) => <T testID="redirect">{href}</T>,
  };
});
jest.mock('../../src/navigation/resolve', () => {
  const actual = jest.requireActual('../../src/navigation/resolve');
  return { ...actual, NATIVE_ROUTES: [...actual.NATIVE_ROUTES] };
});
jest.mock('../../src/auth/AuthProvider', () => ({ useAuth: () => ({ user: null, loading: false }) }));
jest.mock('../../src/identity/useRole', () => ({ useRole: () => ({ dbRole: null, isLoading: false }) }));
jest.mock('../../src/identity/TenantProvider', () => ({ useTenant: () => ({ registry: [] }) }));
jest.mock('../../src/i18n/I18nProvider', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

function gate(path: string) {
  mockPathname = path;
  return render(<AuthGate member={<Text testID="member">m</Text>} guest={<Text testID="guest">g</Text>} />);
}

afterEach(() => {
  const i = NATIVE_ROUTES.indexOf('/commerce/join');
  if (i >= 0) (NATIVE_ROUTES as string[]).splice(i, 1);
});

describe('AuthGate signed out', () => {
  it('/commerce/team → /commerce/join?redirectTo=… when /commerce/join is a native route', () => {
    (NATIVE_ROUTES as string[]).push('/commerce/join');
    expect(gate('/commerce/team').getByTestId('redirect').props.children).toBe('/commerce/join?redirectTo=%2Fcommerce%2Fteam');
  });

  it('/commerce/team → /maxina while /commerce/join is not a native route (no loop through the catch-all)', () => {
    expect(gate('/commerce/team').getByTestId('redirect').props.children).toBe('/maxina?redirectTo=%2Fcommerce%2Fteam');
  });

  it('/home → /maxina?redirectTo=%2Fhome (unchanged)', () => {
    (NATIVE_ROUTES as string[]).push('/commerce/join');
    expect(gate('/home').getByTestId('redirect').props.children).toBe('/maxina?redirectTo=%2Fhome');
  });

  it('/commerce stays a guest path', () => {
    (NATIVE_ROUTES as string[]).push('/commerce/join');
    const r = gate('/commerce');
    expect(r.getByTestId('guest')).toBeTruthy();
    expect(r.queryByTestId('redirect')).toBeNull();
  });
});
