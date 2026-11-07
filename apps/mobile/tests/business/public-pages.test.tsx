/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the public commerce
 * pages: `/commerce/join` (provider buttons first, the e-mail form on request,
 * the built sign-up with the commerce confirmation link and metadata, sign in,
 * `?oauth_error=`, a signed-in visitor sent to `?redirectTo=` only when it is
 * a `/commerce` path), `/commerce-login` (sign in, error, signed-in → portal),
 * `/commerce/connect` (address from this build's gateway, every served tool)
 * and `/commerce/connect/privacy` (German / English only, `?lang=` + toggle).
 */
import '../helpers/no-network';
import { mockParams, router } from './mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createCommerceSupabase, renderBusiness } from './helpers';
import { CommerceJoinScreen, commerceTarget } from '../../src/screens/business/CommerceJoinScreen';
import { CommercePortalLoginScreen } from '../../src/screens/business/CommercePortalLoginScreen';
import { CommerceConnectDocsScreen, CommerceConnectPrivacyScreen } from '../../src/screens/business/CommerceConnectDocsScreen';
import { COMMERCE_MCP_TOOL_NAMES } from '../../src/ports/commerce';
import { translate } from '../../src/i18n';

const de = (k: string, p?: Record<string, string>) => translate('de', k, p);
const en = (k: string) => translate('en', k);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = {};
});

describe('/commerce/join', () => {
  it('providers first; e-mail sign-up sends the web metadata and the commerce confirmation link, then "check your inbox"', async () => {
    const supabase = createCommerceSupabase({ signedIn: false });
    renderBusiness(<CommerceJoinScreen />, { supabase });
    expect(await screen.findByTestId('join-option-google')).toBeTruthy();
    expect(screen.getByTestId('join-option-apple')).toBeTruthy();
    expect(screen.queryByTestId('join-email-form')).toBeNull();
    fireEvent.press(screen.getByTestId('join-option-email'));
    fireEvent.changeText(screen.getByTestId('join-name'), 'Ana Berg');
    fireEvent.changeText(screen.getByTestId('join-email'), 'ana@shop.example');
    fireEvent.changeText(screen.getByTestId('join-password'), 'secret-123');
    fireEvent.press(screen.getByTestId('join-submit'));
    expect(await screen.findByTestId('join-check-inbox')).toHaveTextContent(de('screens.commerceportal.join.checkInboxBody', { email: 'ana@shop.example' }), { exact: false });
    expect(supabase.calls.find((c) => c.fn === 'auth.signUp')?.args).toEqual({
      email: 'ana@shop.example',
      password: 'secret-123',
      options: { emailRedirectTo: 'https://app.test/commerce?confirmed=true', data: { full_name: 'Ana Berg', tenant_slug: 'maxina', preferred_role: 'community' } },
    });
    fireEvent.press(screen.getByTestId('join-already-confirmed'));
    expect(await screen.findByTestId('join-title')).toHaveTextContent(de('screens.commerceportal.join.signinTitle'));
  });

  it('sign in shows the Supabase error; ?oauth_error=expired opens with the retry message', async () => {
    mockParams.current = { oauth_error: 'expired' };
    const supabase = createCommerceSupabase({ signedIn: false, auth: { signInWithPassword: () => ({ data: null, error: { message: 'Invalid login credentials' } }) } });
    renderBusiness(<CommerceJoinScreen />, { supabase });
    expect(await screen.findByTestId('join-error')).toHaveTextContent(de('screens.commerceportal.join.oauthExpired'));
    fireEvent.press(screen.getByTestId('join-toggle-mode'));
    fireEvent.press(screen.getByTestId('join-option-email'));
    expect(screen.queryByTestId('join-name')).toBeNull();
    fireEvent.changeText(screen.getByTestId('join-email'), 'ana@shop.example');
    fireEvent.changeText(screen.getByTestId('join-password'), 'x');
    fireEvent.press(screen.getByTestId('join-submit'));
    expect(await screen.findByTestId('join-error')).toHaveTextContent('Invalid login credentials');
  });

  it('a failed provider sign-in names the provider', async () => {
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(new Error('play services'));
    renderBusiness(<CommerceJoinScreen />, { supabase: createCommerceSupabase({ signedIn: false }) });
    fireEvent.press(await screen.findByTestId('join-option-google'));
    expect(await screen.findByTestId('join-error')).toHaveTextContent(de('screens.commerceportal.join.oauthFailed', { provider: 'Google' }));
  });

  it('a signed-in visitor goes on to ?redirectTo= (a /commerce path only)', async () => {
    mockParams.current = { redirectTo: '/commerce/invites/tok-1/accept' };
    renderBusiness(<CommerceJoinScreen />, { supabase: createCommerceSupabase() });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/commerce/invites/tok-1/accept'));
    expect(commerceTarget('https://evil.example')).toBe('/commerce');
    expect(commerceTarget('/home')).toBe('/commerce');
  });
});

describe('/commerce-login', () => {
  it('signs in with e-mail and password and shows the error', async () => {
    const supabase = createCommerceSupabase({ signedIn: false, auth: { signInWithPassword: () => ({ data: null, error: { message: 'Email not confirmed' } }) } });
    renderBusiness(<CommercePortalLoginScreen />, { supabase });
    fireEvent.changeText(await screen.findByTestId('commerce-login-email'), 'ana@shop.example');
    fireEvent.changeText(screen.getByTestId('commerce-login-password'), 'pw');
    fireEvent.press(screen.getByTestId('commerce-login-submit'));
    expect(await screen.findByTestId('commerce-login-error')).toHaveTextContent('Email not confirmed');
    expect(supabase.calls.find((c) => c.fn === 'auth.signInWithPassword')?.args).toEqual({ email: 'ana@shop.example', password: 'pw' });
  });

  it('a signed-in visitor goes straight to the portal', async () => {
    renderBusiness(<CommercePortalLoginScreen />, { supabase: createCommerceSupabase() });
    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith('/commerce'));
  });
});

describe('/commerce/connect and /privacy', () => {
  it('docs: the address of this build\'s gateway and every tool the gateway serves', async () => {
    renderBusiness(<CommerceConnectDocsScreen />, { supabase: createCommerceSupabase({ signedIn: false }) });
    expect(await screen.findByTestId('connect-address')).toHaveTextContent('https://gateway.test/mcp');
    for (const name of COMMERCE_MCP_TOOL_NAMES) expect(screen.getByTestId(`connect-tool-${name}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('connect-privacy-link'));
    expect(router.navigate).toHaveBeenCalledWith('/commerce/connect/privacy');
  });

  it('privacy: German for a German app language, English for every other one, ?lang= wins, the toggle sets it', async () => {
    const { unmount } = renderBusiness(<CommerceConnectPrivacyScreen />, { supabase: createCommerceSupabase({ signedIn: false }) });
    expect(await screen.findByTestId('privacy-title')).toHaveTextContent(de('commerceConnect.privacyTitle'));
    fireEvent.press(screen.getByTestId('legal-locale-en'));
    expect(router.setParams).toHaveBeenCalledWith({ lang: 'en' });
    unmount();
    renderBusiness(<CommerceConnectPrivacyScreen />, { supabase: createCommerceSupabase({ signedIn: false }), language: 'fr-FR' });
    expect(await screen.findByTestId('privacy-title')).toHaveTextContent(en('commerceConnect.privacyTitle'));
    screen.unmount();
    mockParams.current = { lang: 'de' };
    renderBusiness(<CommerceConnectPrivacyScreen />, { supabase: createCommerceSupabase({ signedIn: false }), language: 'fr-FR' });
    expect(await screen.findByTestId('privacy-title')).toHaveTextContent(de('commerceConnect.privacyTitle'));
  });
});
