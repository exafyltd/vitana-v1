/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — OAuth
 * return (processing / success / gateway error / missing code / deadline),
 * `/oauth/consent` (invalid, scopes ticked, untick, approve / deny decision,
 * nothing selected, AS unset → ConfigMissing, production AS refused), the
 * reset-request and new-password flows, and logout. Fake Supabase double and a
 * fake AS fetch; the real OAuth browser round-trip is a G1 device task.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { G1_AUTH } from './helpers';
import { OAuthCompleteScreen, OAUTH_COMPLETE_TIMEOUT_MS } from '../../src/screens/auth/OAuthCompleteScreen';
import { OAuthConsentScreen } from '../../src/screens/auth/OAuthConsentScreen';
import { ResetPasswordScreen } from '../../src/screens/auth/ResetPasswordScreen';
import { LogoutScreen } from '../../src/screens/auth/LogoutScreen';
import { consentAsBase, parseConsentRequest, submitConsentDecision } from '../../src/auth/oauth-consent';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  usePathname: () => '/oauth/complete',
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../../src/ports/env', () => {
  const actual = jest.requireActual('../../src/ports/env');
  return { ...actual, config: { authRedirectUrl: 'https://g1-auth.example.org/' } };
});

const AS = 'https://g1-mcp.example.org';
const ORIGINAL_AS = process.env.EXPO_PUBLIC_MCP_AS_URL;
/** The no-network guard's fetch; one test swaps in a fake AS and it is put back after every test. */
const blockedFetch = (globalThis as { fetch: unknown }).fetch;
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = blockedFetch;
});
afterAll(() => {
  __setSupabaseForTests(null);
  process.env.EXPO_PUBLIC_MCP_AS_URL = ORIGINAL_AS;
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockParams = {};
  delete process.env.EXPO_PUBLIC_MCP_AS_URL;
});

const de = (k: string, p?: Record<string, string | number>) => translate('de', k, p);

describe('/oauth/complete (OAuthComplete.tsx)', () => {
  it('shows "Finishing sign-in…", exchanges the code and lands on postSignInTarget', async () => {
    mockParams = { code: 'c1', redirectTo: '/inbox' };
    const d = createSupabaseDouble();
    render(<OAuthCompleteScreen />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(screen.getByText(de('screens.auth.finishingSignin'))).toBeTruthy();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/onboarding/welcome?redirectTo=%2Finbox'));
    expect(d.client.auth.exchangeCodeForSession).toHaveBeenCalledWith('c1');
  });

  it('a gateway ?error= shows the error state with its detail, no exchange', async () => {
    mockParams = { error: 'access_denied', error_detail: 'The user denied access' };
    const d = createSupabaseDouble();
    render(<OAuthCompleteScreen />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByText(de('screens.auth.signinCouldnTComplete'))).toBeTruthy();
    expect(screen.getByText('The user denied access')).toBeTruthy();
    expect(d.client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('oauth-retry'));
    expect(router.back).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('oauth-back'));
    expect(router.replace).toHaveBeenCalledWith('/maxina');
  });

  it('no code → error; a refused code → error with the reason', async () => {
    const d = createSupabaseDouble({ auth: { exchangeCodeForSession: () => ({ data: {}, error: { message: 'code expired' } }) } });
    const { unmount } = render(<OAuthCompleteScreen />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByTestId('oauth-failed')).toBeTruthy();
    unmount();
    mockParams = { code: 'old' };
    render(<OAuthCompleteScreen />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(await screen.findByText('code expired')).toBeTruthy();
  });

  it('a stalled exchange fails at the 10 s deadline', async () => {
    jest.useFakeTimers();
    mockParams = { code: 'slow' };
    const d = createSupabaseDouble({ auth: { exchangeCodeForSession: () => new Promise(() => undefined) } });
    render(<OAuthCompleteScreen />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    await act(async () => {
      jest.advanceTimersByTime(OAUTH_COMPLETE_TIMEOUT_MS + 1);
    });
    expect(screen.getByText(de('screens.portals.signinTakingLongerThanExpected'))).toBeTruthy();
  });
});

describe('/oauth/consent (OAuthConsent.tsx)', () => {
  const request = { client_id: 'claude', client_name: 'Claude', redirect_uri: 'https://client.example.org/cb', code_challenge: 'cc', scope: 'vitana:cart:read vitana:orders:read', state: 's1' };

  it('parses only the forwarded parameters', () => {
    const r = parseConsentRequest({ ...request, evil: 'x' });
    expect(r.params).toEqual({ client_id: 'claude', redirect_uri: 'https://client.example.org/cb', code_challenge: 'cc', scope: 'vitana:cart:read vitana:orders:read', state: 's1' });
    expect(r.valid).toBe(true);
    expect(parseConsentRequest({ client_id: 'x' }).valid).toBe(false);
  });

  it('an invalid request says so', async () => {
    mockParams = { client_id: 'x' };
    render(<OAuthConsentScreen />, { wrapper: makeWrapper({ client: createSupabaseDouble({ session: fakeSession('u-1') }).client, language: 'de-DE' }) });
    expect(await screen.findByText(de('screens.oauthconsent.invalidRequest'))).toBeTruthy();
  });

  it('lists the scopes ticked, approves only the ticked ones and opens the client redirect', async () => {
    process.env.EXPO_PUBLIC_MCP_AS_URL = AS;
    mockParams = request;
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ redirect_to: 'https://client.example.org/cb?code=xyz' }) }) as unknown as Response);
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    render(<OAuthConsentScreen />, { wrapper: makeWrapper({ client: createSupabaseDouble({ session: fakeSession('u-1') }).client, language: 'de-DE' }) });
    expect(await screen.findByText(de('screens.oauthconsent.clientWants', { client: 'Claude' }))).toBeTruthy();
    expect(screen.getByText(de('screens.oauthconsent.scopes.vitana:cart:read'))).toBeTruthy();
    expect(screen.getByTestId('scope-vitana:cart:read').props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByTestId('scope-vitana:orders:read'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('oauth-consent-approve'));
    });
    expect(fetchMock).toHaveBeenCalledWith(`${AS}/oauth/authorize/decision`, expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body).toEqual({ params: expect.objectContaining({ client_id: 'claude' }), supabase_access_token: 'token-u-1', approved: true, approved_scopes: ['vitana:cart:read'] });
    expect(open).toHaveBeenCalledWith('https://client.example.org/cb?code=xyz');
  });

  it('nothing ticked → "select at least one"; the AS unset → ConfigMissing (never a production default)', async () => {
    mockParams = { ...request, scope: 'vitana:cart:read' };
    render(<OAuthConsentScreen />, { wrapper: makeWrapper({ client: createSupabaseDouble({ session: fakeSession('u-1') }).client, language: 'de-DE' }) });
    fireEvent.press(await screen.findByTestId('scope-vitana:cart:read'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('oauth-consent-approve'));
    });
    expect(screen.getByText(de('screens.oauthconsent.nothingSelected'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('scope-vitana:cart:read'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('oauth-consent-deny'));
    });
    expect(screen.getByTestId('config-missing-mcpAsUrl')).toBeTruthy();
  });

  it('refuses the production AS and reports a failed decision', async () => {
    expect(() => consentAsBase('https://mcp.vitanaland.com')).toThrow(/Refusing/);
    expect(() => consentAsBase('https://vitanaland.com')).toThrow(/Refusing/);
    expect(consentAsBase(`${AS}/`)).toBe(AS);
    const bad = jest.fn(async () => ({ ok: false, json: async () => ({}) }) as unknown as Response);
    await expect(submitConsentDecision({ asBase: AS, params: {}, accessToken: 't', approved: false, approvedScopes: [] }, bad)).resolves.toEqual({ ok: false });
    expect(JSON.parse((bad.mock.calls[0] as unknown as [string, { body: string }])[1].body).supabase_access_token).toBe('');
  });
});

describe('/reset-password (ResetPassword.tsx)', () => {
  it('request: disabled until an email is typed, then sends the reset link and shows check-email', async () => {
    const d = createSupabaseDouble();
    render(<ResetPasswordScreen />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect((await screen.findByTestId('reset-submit')).props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByTestId('reset-email'), ' ana@example.org ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('reset-submit'));
    });
    expect(d.client.auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@example.org', { redirectTo: `${G1_AUTH}/reset-password?type=recovery` });
    expect(screen.getByTestId('reset-done')).toBeTruthy();
    expect(screen.getByText(de('screens.auth.weVeSentPasswordResetLink'))).toBeTruthy();
  });

  it('recovery: at least 6 characters and both equal, inline mismatch, show / hide, then updateUser', async () => {
    mockParams = { type: 'recovery' };
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    render(<ResetPasswordScreen />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    const pw = await screen.findByTestId('reset-new-password');
    expect(pw.props.placeholder).toBe(de('screens.auth.atLeast6Characters'));
    fireEvent.changeText(pw, '12345');
    fireEvent.changeText(screen.getByTestId('reset-confirm-password'), '12345');
    expect(screen.getByTestId('reset-submit').props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByTestId('reset-new-password'), '123456');
    fireEvent.changeText(screen.getByTestId('reset-confirm-password'), '123457');
    expect(screen.getByTestId('reset-mismatch')).toBeTruthy();
    expect(screen.getByTestId('reset-new-password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByTestId('reset-toggle-password'));
    expect(screen.getByTestId('reset-new-password').props.secureTextEntry).toBe(false);
    fireEvent.changeText(screen.getByTestId('reset-confirm-password'), '123456');
    expect(screen.queryByTestId('reset-mismatch')).toBeNull();
    expect(screen.getByText(de('authPortalsNative.reset.updatePassword'))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('reset-submit'));
    });
    expect(d.client.auth.updateUser).toHaveBeenCalledWith({ password: '123456' });
    expect(screen.getByText(de('screens.auth.passwordUpdated'))).toBeTruthy();
  });
});

describe('/logout (Logout.tsx)', () => {
  it('shows "Signing out...", signs out locally and lands on /maxina', async () => {
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    render(<LogoutScreen />, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    expect(screen.getByText(de('screens.logout.signingOut'))).toBeTruthy();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/maxina'));
    expect(d.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
