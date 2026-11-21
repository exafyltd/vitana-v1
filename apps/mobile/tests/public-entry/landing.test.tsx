/**
 * VTID-05650 (native-wave2-fix-forward-r2/public-entry) — `/` renders the
 * storefront (PUBLIC.LANDING) for a signed-out user; a member goes to /home;
 * a resolving session shows the loader.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { render, screen } from '@testing-library/react-native';
import Landing from '../../app/index';
import { PORTAL_IDS } from '../../src/screens/public/PublicLandingScreen';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
    router: { navigate: jest.fn(), replace: jest.fn(), push: jest.fn() },
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
  };
});

afterAll(() => __setSupabaseForTests(null));

describe('landing at /', () => {
  it('signed out renders the storefront, not a redirect', async () => {
    const d = createSupabaseDouble();
    render(<Landing />, { wrapper: makeWrapper({ client: d.client }) });
    expect(await screen.findByTestId('public-landing')).toBeTruthy();
    for (const id of PORTAL_IDS) expect(screen.getByTestId(`landing-portal-${id}`)).toBeTruthy();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('a resolving session shows the loader, never the grid or a redirect', () => {
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    render(<Landing />, { wrapper: makeWrapper({ client: d.client }) });
    expect(screen.queryByTestId('public-landing')).toBeNull();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('signed in redirects to /home', async () => {
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    render(<Landing />, { wrapper: makeWrapper({ client: d.client }) });
    expect((await screen.findByTestId('redirect')).props.children).toBe('/home');
  });
});
