/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the Maxina
 * portal chrome and the generic community portal (`/:tenantSlug`, `/alkalma`):
 * tab switch, field validation, sign-in success → postSignInTarget /
 * portal landing, sign-up → check-email + resend, invite-only, unknown /
 * error / retired / static-route slugs, member switch and join.
 * Fake Supabase double only; the one auth write runs against it.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { G1_AUTH, portalDouble, tenantRow } from './helpers';
import { PortalScreen } from '../../src/screens/auth/PortalScreen';
import { TenantPortalScreen } from '../../src/screens/auth/TenantPortalScreen';
import { translate } from '../../src/i18n';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { __setSupabaseForTests } from '../../src/auth/client';

let mockParams: Record<string, string> = {};
let mockPath = '/maxina';
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  usePathname: () => mockPath,
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));
jest.mock('../../src/ports/env', () => {
  const actual = jest.requireActual('../../src/ports/env');
  return { ...actual, config: { authRedirectUrl: 'https://g1-auth.example.org/' } };
});
const mockOpen = jest.fn(async () => undefined);
let mockOrbController: { open: () => Promise<void> } | null = null;
jest.mock('../../src/orb/ui/OrbProvider', () => ({
  useOrbSession: () => ({ controller: mockOrbController, state: { open: false } }),
}));

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockPath = '/maxina';
  mockOrbController = null;
  __clearToastsForTests();
});

const de = (k: string, p?: Record<string, string | number>) => translate('de', k, p);

describe('Maxina portal chrome (MaxinaPortal.tsx mobile branch)', () => {
  const maxina = () => portalDouble({ rows: [tenantRow('maxina', { landing: { post_login_path: '/onboarding/welcome' } })] });

  it('wraps the sign-in card in the backdrop, the translucent card and the footer', async () => {
    render(<PortalScreen tenant="maxina" />, { wrapper: makeWrapper({ client: maxina().client, language: 'de-DE' }) });
    expect(await screen.findByTestId('portal-backdrop')).toBeTruthy();
    expect(screen.getByTestId('portal-card')).toBeTruthy();
    expect(screen.getByText(de('portals.maxina.partOfVitana'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('portal-privacy'));
    expect(router.navigate).toHaveBeenCalledWith('/privacy');
    fireEvent.press(screen.getByTestId('portal-terms'));
    expect(router.navigate).toHaveBeenCalledWith('/terms');
    expect(screen.getByTestId('portal-help')).toBeTruthy();
  });

  it('switches between the sign-in and sign-up tabs', async () => {
    render(<PortalScreen tenant="maxina" />, { wrapper: makeWrapper({ client: maxina().client, language: 'de-DE' }) });
    expect(await screen.findByText(de('portals.maxina.welcomeBack'))).toBeTruthy();
    expect(screen.queryByTestId('portal-full-name')).toBeNull();
    fireEvent.press(screen.getByTestId('portal-tab-signup'));
    expect(screen.getByText(de('portals.maxina.joinCommunity'))).toBeTruthy();
    expect(screen.getByTestId('portal-full-name')).toBeTruthy();
    expect(screen.getByTestId('portal-tab-signup').props.accessibilityState).toEqual({ selected: true });
  });

  it('password sign-in (the one auth write, against the double) lands on postSignInTarget /onboarding/welcome', async () => {
    const d = maxina();
    render(<PortalScreen tenant="maxina" />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    fireEvent.changeText(await screen.findByTestId('portal-email'), 'ana@example.org');
    fireEvent.changeText(screen.getByTestId('portal-password'), 'pw-123456');
    await act(async () => {
      fireEvent.press(screen.getByTestId('portal-submit'));
    });
    expect(d.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@example.org', password: 'pw-123456' });
    await act(async () => d.emit('SIGNED_IN', fakeSession('u-1')));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/onboarding/welcome'));
  });

  it('?confirmed=true shows the "Email confirmed" toast once; ?diag=1 shows the runtime badge', async () => {
    mockParams = { confirmed: 'true', diag: '1' };
    render(<PortalScreen tenant="maxina" />, { wrapper: makeWrapper({ client: maxina().client, language: 'de-DE' }) });
    expect(await screen.findByTestId('portal-diag')).toBeTruthy();
    expect(__toastsForTests().filter((t) => t.titleKey === 'portals.maxina.emailConfirmed')).toHaveLength(1);
  });

  it('the Orb hint shows only with an ORB, and a tap opens it and dismisses the hint', async () => {
    const { unmount } = render(<PortalScreen tenant="maxina" />, { wrapper: makeWrapper({ client: maxina().client, language: 'de-DE' }) });
    await screen.findByTestId('portal-card');
    expect(screen.queryByTestId('orb-hint')).toBeNull();
    unmount();
    mockOrbController = { open: mockOpen };
    render(<PortalScreen tenant="maxina" />, { wrapper: makeWrapper({ client: maxina().client, language: 'de-DE' }) });
    const hint = await screen.findByTestId('orb-hint');
    expect(hint.props.accessibilityLabel).toBe(de('orbHint.tapToTalk'));
    fireEvent.press(hint);
    expect(mockOpen).toHaveBeenCalled();
    expect(screen.queryByTestId('orb-hint')).toBeNull();
  });
});

describe('generic community portal (TenantPortal.tsx, /:tenantSlug)', () => {
  const Fallback = () => <Text testID="resolver-fallback">resolver</Text>;

  it('renders the hero, the tabs and the sign-in form for a registry tenant', async () => {
    mockParams = { tenantSlug: 'acme' };
    mockPath = '/acme';
    const d = portalDouble({ rows: [tenantRow('acme')] });
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByTestId('tenant-name')).toBeTruthy();
    expect(screen.getByText('Acme Circle')).toBeTruthy();
    expect(screen.getByText(de('tenantPortal.tagline', { brand: 'Acme Circle' }))).toBeTruthy();
    expect(d.client.rpc).toHaveBeenCalledWith('resolve_tenant', { p_slug: 'acme' }, { get: true });
    expect(screen.getByTestId('tenant-signin')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tenant-tab-signup'));
    expect(screen.getByTestId('tenant-signup')).toBeTruthy();
  });

  it('field validation: submit stays disabled until the required fields hold (sign-up password ≥ 6)', async () => {
    mockParams = { tenantSlug: 'acme' };
    mockPath = '/acme';
    const d = portalDouble({ rows: [tenantRow('acme')] });
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    const submit = await screen.findByTestId('tenant-signin-submit');
    expect(submit.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByTestId('tenant-signin-email'), 'a@b.c');
    fireEvent.changeText(screen.getByTestId('tenant-signin-password'), 'x');
    expect(screen.getByTestId('tenant-signin-submit').props.accessibilityState).toEqual({ disabled: false });

    fireEvent.press(screen.getByTestId('tenant-tab-signup'));
    fireEvent.changeText(screen.getByTestId('tenant-signup-name'), 'Ana');
    fireEvent.changeText(screen.getByTestId('tenant-signup-email'), 'a@b.c');
    fireEvent.changeText(screen.getByTestId('tenant-signup-password'), '12345');
    expect(screen.getByTestId('tenant-signup-submit').props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByTestId('tenant-signup-password'), '123456');
    expect(screen.getByTestId('tenant-signup-submit').props.accessibilityState).toEqual({ disabled: false });
  });

  it('a failed sign-in shows the portal error; a successful one switches into the tenant and lands on its post_login_path', async () => {
    mockParams = { tenantSlug: 'acme' };
    mockPath = '/acme';
    const d = portalDouble({ rows: [tenantRow('acme')], auth: { signInWithPassword: () => ({ data: {}, error: { message: 'Invalid login credentials' } }) } });
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    fireEvent.changeText(await screen.findByTestId('tenant-signin-email'), 'a@b.c');
    fireEvent.changeText(screen.getByTestId('tenant-signin-password'), 'bad');
    await act(async () => {
      fireEvent.press(screen.getByTestId('tenant-signin-submit'));
    });
    expect(screen.getByTestId('auth-error')).toBeTruthy();
    expect(screen.getByText(de('tenantPortal.errors.signInFailed'))).toBeTruthy();

    (d.client.auth.signInWithPassword as jest.Mock).mockImplementation(async () => ({ data: {}, error: null }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('tenant-signin-submit'));
    });
    await act(async () => d.emit('SIGNED_IN', fakeSession('u-9')));
    await waitFor(() => expect(d.client.rpc).toHaveBeenCalledWith('switch_to_tenant_by_slug', { p_tenant_slug: 'acme' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
  });

  it('sign-up sends the tenant confirmation link, shows check-email, and resend starts the cooldown', async () => {
    mockParams = { tenantSlug: 'acme' };
    mockPath = '/acme';
    const d = portalDouble({ rows: [tenantRow('acme')] });
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    fireEvent.press(await screen.findByTestId('tenant-tab-signup'));
    fireEvent.changeText(screen.getByTestId('tenant-signup-name'), ' Ana ');
    fireEvent.changeText(screen.getByTestId('tenant-signup-email'), 'ana@example.org');
    fireEvent.changeText(screen.getByTestId('tenant-signup-password'), '123456');
    await act(async () => {
      fireEvent.press(screen.getByTestId('tenant-signup-submit'));
    });
    expect(d.client.auth.signUp).toHaveBeenCalledWith({
      email: 'ana@example.org',
      password: '123456',
      options: { emailRedirectTo: `${G1_AUTH}/acme?confirmed=true`, data: { full_name: 'Ana', tenant_slug: 'acme' } },
    });
    expect(screen.getByTestId('tenant-signup-sent')).toBeTruthy();
    expect(screen.getByText(de('tenantPortal.checkEmail', { email: 'ana@example.org' }))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('tenant-resend'));
    });
    expect((d.client.auth as unknown as { resend: jest.Mock }).resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'ana@example.org',
      options: { emailRedirectTo: `${G1_AUTH}/acme?confirmed=true` },
    });
    expect(within(screen.getByTestId('tenant-resend')).getByText(de('screens.auth.resendAvailableCooldownS', { cooldown: 60 }))).toBeTruthy();
  });

  it('an invite-only tenant offers no sign-up; OAuth buttons only with landing.oauth', async () => {
    mockParams = { tenantSlug: 'acme' };
    mockPath = '/acme';
    const d = portalDouble({ rows: [tenantRow('acme', { open_signup: false, landing: { oauth: true } })] });
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByTestId('tenant-oauth')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tenant-tab-signup'));
    expect(screen.getByTestId('tenant-invite-only')).toBeTruthy();
    expect(screen.getByText(de('tenantPortal.inviteOnly', { brand: 'Acme Circle' }))).toBeTruthy();
    expect(screen.queryByTestId('tenant-signup')).toBeNull();
  });

  it('?confirmed=true shows the confirmed notice', async () => {
    mockParams = { tenantSlug: 'acme', confirmed: 'true' };
    mockPath = '/acme';
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: portalDouble({ rows: [tenantRow('acme')] }).client, language: 'de-DE' }) });
    expect(await screen.findByTestId('tenant-confirmed')).toBeTruthy();
    expect(screen.getByText(de('tenantPortal.confirmed'))).toBeTruthy();
  });

  it('unknown slug → not found; a failed resolve → the error state with Retry (no Maxina fallback)', async () => {
    mockParams = { tenantSlug: 'nobody' };
    mockPath = '/nobody';
    const { unmount } = render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: portalDouble({ rows: [] }).client, language: 'de-DE' }) });
    expect(await screen.findByTestId('not-found')).toBeTruthy();
    unmount();

    const d = portalDouble({ rows: [tenantRow('acme')], resolveError: true });
    mockParams = { tenantSlug: 'acme' };
    mockPath = '/acme';
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByTestId('tenant-portal-error', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText(de('tenantPortal.loadError.title'))).toBeTruthy();
    expect(screen.queryByTestId('portal-maxina')).toBeNull();
  }, 15000);

  it('a path the web routes statically renders the resolver, with no tenant call; a retired slug redirects', async () => {
    mockParams = { tenantSlug: 'settings' };
    mockPath = '/settings';
    const d = portalDouble({ rows: [tenantRow('acme')] });
    const { unmount } = render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(screen.getByTestId('resolver-fallback')).toBeTruthy();
    expect(d.client.rpc).not.toHaveBeenCalledWith('resolve_tenant', expect.anything(), expect.anything());
    unmount();

    mockParams = { tenantSlug: 'Earthlinks' };
    mockPath = '/Earthlinks';
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(mockRedirect).toHaveBeenCalledWith('/maxina');
  });

  it('a signed-in member of the active tenant goes straight to the landing; a non-member of an open tenant can join', async () => {
    mockParams = { tenantSlug: 'acme' };
    mockPath = '/acme';
    const member = portalDouble({
      rows: [tenantRow('acme')],
      session: fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-acme' }, user_metadata: {} } }),
      members: [{ user_id: 'u-1', tenant_id: 't-acme' }],
    });
    const { unmount } = render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: member.client, language: 'de-DE' }) });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    unmount();
    (router.replace as jest.Mock).mockClear();

    const outsider = portalDouble({ rows: [tenantRow('acme')], session: fakeSession('u-2'), members: [] });
    render(<TenantPortalScreen fallback={<Fallback />} />, { wrapper: makeWrapper({ client: outsider.client, language: 'de-DE' }) });
    expect(await screen.findByText(de('tenantPortal.joinIntro', { brand: 'Acme Circle' }))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('tenant-join-button'));
    });
    expect(outsider.client.rpc).toHaveBeenCalledWith('switch_to_tenant_by_slug', { p_tenant_slug: 'acme' });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
  });

  it('/alkalma is the generic portal with the fixed slug', async () => {
    mockPath = '/alkalma';
    const d = portalDouble({ rows: [tenantRow('alkalma', { display_name: 'AlKalma' })] });
    render(<TenantPortalScreen slug="alkalma" />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByTestId('tenant-portal-alkalma')).toBeTruthy();
    expect(screen.getByText('AlKalma')).toBeTruthy();
  });
});
