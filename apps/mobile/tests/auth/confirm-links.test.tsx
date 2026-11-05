/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the three
 * confirm screens (loaded / expired, CTA, auto-redirect, Maxina discount,
 * Alkalma Arabic copy) and the deep-link seam they sit on: `resolve-link`
 * tags `/auth/confirmed` + `/reset-password` → `auth`, `/oauth/complete` →
 * `oauth_return`; the link router delivers them through `auth-port`;
 * link-bridge opens `/auth/confirmed` (or its expired state). No network.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { withDiscountCodes } from './helpers';
import { ConfirmedScreen, CONFIRMED_REDIRECT_MS } from '../../src/screens/auth/ConfirmedScreen';
import { confirmationState, roleRedirectUrl } from '../../src/auth/post-confirm';
import { handleAuthLink, authLinkTarget } from '../../src/auth/link-bridge';
import { resolveLink } from '../../src/linking/resolve-link';
import { createLinkRouter } from '../../src/linking/link-router';
import { onAuthLink, resetAuthPort, type AuthLink } from '../../src/linking/auth-port';
import { postSignInTarget } from '../../src/auth/sign-in';
import { FALLBACK_REGISTRY } from '../../src/ports/core';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn() },
  usePathname: () => '/auth/confirmed',
  useLocalSearchParams: () => mockParams,
}));

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockParams = {};
  resetAuthPort();
});

const de = (k: string, p?: Record<string, string | number>) => translate('de', k, p);

describe('deep-link resolution (resolve-link → link-router → auth-port)', () => {
  it.each([
    ['maxina:///auth/confirmed#access_token=a&refresh_token=r', 'auth'],
    ['maxina:///reset-password?code=c1', 'auth'],
    ['maxina:///oauth/complete?code=c2', 'oauth_return'],
  ])('%s → %s', (url, kind) => {
    expect(resolveLink(url)?.kind).toBe(kind);
  });

  it('the router hands auth links to auth-port, never to a screen route', () => {
    const got: AuthLink[] = [];
    onAuthLink((l) => got.push(l));
    const navigate = jest.fn();
    const r = createLinkRouter({ linkHosts: [], isSignedIn: () => false });
    r.attachNavigator(navigate);
    r.handleLink('maxina:///auth/confirmed?code=c9');
    r.handleLink('maxina:///oauth/complete?code=c8');
    expect(got.map((l) => l.kind)).toEqual(['auth', 'oauth_return']);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('postSignInTarget is /onboarding/welcome (the onboarding lane seam)', () => {
    expect(postSignInTarget()).toBe('/onboarding/welcome');
    expect(postSignInTarget('/inbox')).toBe('/onboarding/welcome?redirectTo=%2Finbox');
  });
});

describe('link-bridge opens the confirm screen', () => {
  it('a confirmation code becomes a session and opens /auth/confirmed', async () => {
    const d = createSupabaseDouble();
    const link = { kind: 'auth', path: '/auth/confirmed', pathname: '/auth/confirmed', params: {}, tokens: { code: 'c1' } } as const;
    expect(authLinkTarget(link)).toBe('/auth/confirmed');
    await expect(handleAuthLink(link, d.client)).resolves.toBe('/auth/confirmed');
    expect(d.client.auth.exchangeCodeForSession).toHaveBeenCalledWith('c1');
    expect(router.replace).toHaveBeenCalledWith('/auth/confirmed');
  });

  it('an error link (expired) opens the expired state without any auth call', async () => {
    const d = createSupabaseDouble();
    const link = { kind: 'auth', path: '/auth/confirmed', pathname: '/auth/confirmed', params: {}, tokens: { error: 'access_denied', error_description: 'Email link is invalid or has expired' } } as const;
    await expect(handleAuthLink(link, d.client)).resolves.toBe('/auth/confirmed?error=access_denied&error_description=Email+link+is+invalid+or+has+expired');
    expect(d.client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('a code that cannot be exchanged opens the expired state', async () => {
    const d = createSupabaseDouble({ auth: { exchangeCodeForSession: () => ({ data: {}, error: { message: 'invalid' } }) } });
    const link = { kind: 'auth', path: '/auth/confirmed', pathname: '/auth/confirmed', params: {}, tokens: { code: 'bad' } } as const;
    await expect(handleAuthLink(link, d.client)).resolves.toBe('/auth/confirmed?error=access_denied');
  });
});

describe('confirmationState / roleRedirectUrl (useEmailConfirmation.ts, useSmartRouting.tsx)', () => {
  it('maps the link errors and the session to the states', () => {
    expect(confirmationState({ error: 'access_denied' }, true)).toEqual({ kind: 'error', messageKey: 'authPortalsNative.confirm.errors.cancelledOrExpired' });
    expect(confirmationState({ error: 'server_error', error_description: 'Email link is invalid or has expired' }, true)).toEqual({ kind: 'error', messageKey: 'authPortalsNative.confirm.errors.linkExpired' });
    expect(confirmationState({ error: 'x' }, true)).toEqual({ kind: 'error', messageKey: 'authPortalsNative.confirm.errors.generic' });
    expect(confirmationState({}, false)).toEqual({ kind: 'error', messageKey: 'authPortalsNative.confirm.errors.signInToContinue' });
    expect(confirmationState({}, true)).toEqual({ kind: 'confirmed' });
  });

  it('routes by role, community to the tenant landing', () => {
    expect(roleRedirectUrl('admin', 'maxina', FALLBACK_REGISTRY)).toBe('/admin');
    expect(roleRedirectUrl('backoffice', 'maxina', FALLBACK_REGISTRY)).toBe('/home');
    expect(roleRedirectUrl('patient', 'maxina', FALLBACK_REGISTRY)).toBe('/patient/dashboard');
    expect(roleRedirectUrl('community', 'maxina', FALLBACK_REGISTRY)).toBe('/onboarding/welcome');
    expect(roleRedirectUrl('community', null, FALLBACK_REGISTRY)).toBe('/home');
  });
});

describe('confirm screens', () => {
  it('/auth/confirmed loaded: thank-you card, Continue, and the 3 s auto-redirect', async () => {
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    render(<ConfirmedScreen variant="vitana" />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByText(de('screens.auth.thankYouForJoiningVitana'))).toBeTruthy();
    expect(screen.getByText(de('screens.auth.youLlRedirectedYourDashboardFew'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirmed-continue'));
    expect(router.replace).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(2), { timeout: CONFIRMED_REDIRECT_MS.vitana + 2000 });
  }, 10000);

  it('/auth/confirmed expired: the error card and the way back', async () => {
    mockParams = { error: 'access_denied' };
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    render(<ConfirmedScreen variant="vitana" />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByTestId('confirmed-error-vitana')).toBeTruthy();
    expect(screen.getByText(de('screens.auth.confirmationError'))).toBeTruthy();
    expect(screen.getByText(de('authPortalsNative.confirm.errors.cancelledOrExpired'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('confirmed-back'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('signed out on /auth/confirmed: "please sign in"', async () => {
    render(<ConfirmedScreen variant="vitana" />, { wrapper: makeWrapper({ client: createSupabaseDouble().client, language: 'de-DE' }) });
    expect(await screen.findByText(de('authPortalsNative.confirm.errors.signInToContinue'))).toBeTruthy();
  });

  it('/maxina/confirmed: switches into maxina and shows the welcome discount', async () => {
    const d = createSupabaseDouble({ session: fakeSession('u-1'), tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }] } });
    const seen = withDiscountCodes(d, [{ id: 'd1', code: 'MAXINA-10', discount_percent: 10, valid_for: 'event', tenant_slug: 'maxina', user_id: 'u-1', expires_at: '2099-01-01' }]);
    render(<ConfirmedScreen variant="maxina" />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByText(de('screens.portals.welcomeMaxina'))).toBeTruthy();
    expect(await screen.findByText('MAXINA-10')).toBeTruthy();
    expect(screen.getByText(de('discount.welcomeTitle'))).toBeTruthy();
    expect(seen).toEqual(expect.arrayContaining([['user_id', 'u-1'], ['tenant_slug', 'maxina'], ['is:used_at', null]]));
    await waitFor(() => expect(d.client.rpc).toHaveBeenCalledWith('switch_to_tenant_by_slug', { p_tenant_slug: 'maxina' }));
    expect(screen.getByTestId('confirmed-continue')).toBeTruthy();
    await act(async () => undefined);
  });

  it('/alkalma/confirmed shows the Arabic page in every UI language; its error state follows the UI language', async () => {
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    const { unmount } = render(<ConfirmedScreen variant="alkalma" />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByText(translate('ar', 'authPortalsNative.alkalmaConfirmed.title'))).toBeTruthy();
    expect(translate('ar', 'authPortalsNative.alkalmaConfirmed.title')).toBe('أهلاً بك في الكلمة!');
    unmount();
    mockParams = { error: 'access_denied' };
    render(<ConfirmedScreen variant="alkalma" />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByText(de('screens.portals.backAlkalmaPortal'))).toBeTruthy();
  });
});
