/** VTID-05186 (N3, plan changes 10 + 16) — the portal's functional surface and the post-sign-in path. */
import './helpers/no-network';
import './helpers/mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { createSupabaseDouble, fakeSession } from './helpers/supabase-double';
import { makeWrapper } from './helpers/providers';
import { PortalScreen } from '../src/screens/auth/PortalScreen';
import { translate } from '../src/i18n';
import { __setSupabaseForTests } from '../src/auth/client';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn() },
  usePathname: () => '/maxina',
  useLocalSearchParams: () => mockParams,
}));

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

function tenantDouble(slug: 'maxina' | 'alkalma') {
  return createSupabaseDouble({
    tables: { tenants: [{ tenant_id: `t-${slug}`, slug, name: slug }] },
    rpc: { switch_to_tenant_by_slug: () => ({ data: null, error: null }) },
  });
}

it.each(['maxina', 'alkalma'] as const)('%s: password sign-in → switch_to_tenant_by_slug + refreshSession → /onboarding/welcome?redirectTo=', async (slug) => {
  mockParams = { redirectTo: '/inbox' };
  const d = tenantDouble(slug);
  render(<PortalScreen tenant={slug} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
  fireEvent.changeText(await screen.findByTestId('portal-email'), ' a@b.c ');
  fireEvent.changeText(screen.getByTestId('portal-password'), 'pw');
  await act(async () => {
    fireEvent.press(screen.getByTestId('portal-submit'));
  });
  expect(d.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pw' });
  // The auth server reports the session; the portal then switches tenant and moves on.
  await act(async () => d.emit('SIGNED_IN', fakeSession('u-7')));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/onboarding/welcome?redirectTo=%2Finbox'));
  expect(d.client.rpc).toHaveBeenCalledWith('switch_to_tenant_by_slug', { p_tenant_slug: slug });
  expect(d.client.auth.refreshSession).toHaveBeenCalled();
});

it('uses the portal catalog keys (no raw key on screen)', async () => {
  const d = tenantDouble('maxina');
  render(<PortalScreen tenant="maxina" />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
  expect(await screen.findByText(translate('de', 'portals.maxina.welcomeBack'))).toBeTruthy();
  expect(screen.getAllByText(translate('de', 'authPage.signIn')).length).toBeGreaterThan(0);
  fireEvent.press(screen.getByTestId('portal-tab-signup'));
  expect(screen.getByText(translate('de', 'portals.maxina.joinCommunity'))).toBeTruthy();
});

it('sign-up without authRedirectUrl shows ConfigMissing, never a production link', async () => {
  const d = tenantDouble('maxina');
  render(<PortalScreen tenant="maxina" />, { wrapper: makeWrapper({ client: d.client, language: 'en-US' }) });
  fireEvent.press(await screen.findByTestId('portal-tab-signup'));
  fireEvent.changeText(screen.getByTestId('portal-email'), 'a@b.c');
  await act(async () => {
    fireEvent.press(screen.getByTestId('portal-submit'));
  });
  expect(screen.getByTestId('config-missing-authRedirectUrl')).toBeTruthy();
  expect(screen.getByText(translate('en', 'native.configMissing.title'))).toBeTruthy();
  expect(d.client.auth.signUp).not.toHaveBeenCalled();
});
