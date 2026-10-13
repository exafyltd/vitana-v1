/** VTID-05186 (N3, plan changes 9–10) — sign-in call shapes, AuthProvider, sign-out. */
import './helpers/no-network';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createSupabaseDouble, fakeSession } from './helpers/supabase-double';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({ AFTER_FIRST_UNLOCK: 'x', getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: jest.fn(() => 'raw-nonce'),
  digestStringAsync: jest.fn(async (_a: string, v: string) => `sha256(${v})`),
}));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: (p: string) => `maxina://${p}` }));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(async () => true), signIn: jest.fn() },
  isSuccessResponse: (r: { type: string }) => r.type === 'success',
}));
// Config for these tests only: G1-shaped values, never a production host.
jest.mock('../src/ports/env', () => {
  const actual = jest.requireActual('../src/ports/env');
  return {
    ...actual,
    config: {
      authRedirectUrl: 'https://g1-auth.example.org/',
      googleWebClientId: 'web-1.apps.googleusercontent.com',
      googleIosClientId: 'ios-1.apps.googleusercontent.com',
    },
  };
});

import { Platform } from 'react-native';
import {
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  signInWithAppleIOS,
  signInWithAppleAndroid,
  signInWithGoogle,
  postSignInTarget,
  codeFromReturnUrl,
  SIGN_IN_DEADLINE_MS,
} from '../src/auth/sign-in';
import { AuthProvider, useAuth, AUTH_BOOTSTRAP_TIMEOUT_MS } from '../src/auth/AuthProvider';
import { activeOrgStore } from '../src/identity/device-storage';

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('email and password (MaxinaPortal.tsx shapes)', () => {
  it('signs in with signInWithPassword', async () => {
    const d = createSupabaseDouble();
    await expect(signInWithPassword('a@b.c', 'pw', d.client)).resolves.toEqual({ ok: true });
    expect(d.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pw' });
  });

  it('signs up with data.tenant_slug and emailRedirectTo from authRedirectUrl', async () => {
    const d = createSupabaseDouble();
    await signUpWithPassword({ email: 'a@b.c', password: 'pw', fullName: 'Ana', tenant: 'alkalma' }, d.client);
    expect(d.client.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'pw',
      options: { emailRedirectTo: 'https://g1-auth.example.org/alkalma?confirmed=true', data: { full_name: 'Ana', tenant_slug: 'alkalma' } },
    });
  });

  it('password reset redirects to authRedirectUrl/reset-password?type=recovery (ResetPassword.tsx)', async () => {
    const d = createSupabaseDouble();
    await sendPasswordReset('a@b.c', d.client);
    expect(d.client.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.c', { redirectTo: 'https://g1-auth.example.org/reset-password?type=recovery' });
  });

  it('a stalled sign-in resolves at the 15 s deadline with the portal key', async () => {
    jest.useFakeTimers();
    const d = createSupabaseDouble({ auth: { signInWithPassword: () => new Promise(() => undefined) } });
    const p = signInWithPassword('a@b.c', 'pw', d.client);
    await act(async () => {
      jest.advanceTimersByTime(SIGN_IN_DEADLINE_MS);
    });
    await expect(p).resolves.toEqual({ ok: false, errorKey: 'screens.portals.signinTakingLongerThanExpected' });
  });
});

describe('Apple and Google', () => {
  const setOS = (os: 'ios' | 'android') => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });

  it('Apple (iOS) passes the hashed nonce to Apple and the raw nonce to Supabase, and keeps the first-time name', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'apple-jwt', fullName: { givenName: 'Ana', familyName: 'B' } });
    const d = createSupabaseDouble();
    await expect(signInWithAppleIOS(d.client)).resolves.toEqual({ ok: true });
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith('SHA-256', 'raw-nonce');
    expect((AppleAuthentication.signInAsync as jest.Mock).mock.calls[0][0].nonce).toBe('sha256(raw-nonce)');
    expect(d.client.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-jwt', nonce: 'raw-nonce' });
    expect(d.client.auth.updateUser).toHaveBeenCalledWith({ data: { full_name: 'Ana B' } });
  });

  it('Apple (iOS) cancel is not an error', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(Object.assign(new Error('cancel'), { code: 'ERR_REQUEST_CANCELED' }));
    await expect(signInWithAppleIOS(createSupabaseDouble().client)).resolves.toEqual({ ok: false, cancelled: true });
  });

  it('Google passes the id token, configured with the client ids from config', async () => {
    setOS('ios');
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ type: 'success', data: { idToken: 'google-jwt' } });
    const d = createSupabaseDouble();
    await expect(signInWithGoogle(d.client)).resolves.toEqual({ ok: true });
    expect(GoogleSignin.configure).toHaveBeenCalledWith({ webClientId: 'web-1.apps.googleusercontent.com', iosClientId: 'ios-1.apps.googleusercontent.com' });
    expect(d.client.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'google-jwt' });
  });

  it('Apple (Android) runs the PKCE browser flow and exchanges the code', async () => {
    setOS('android');
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'success', url: 'maxina://oauth/complete?code=abc123' });
    const d = createSupabaseDouble();
    await expect(signInWithAppleAndroid('maxina', d.client)).resolves.toEqual({ ok: true });
    expect(d.client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'apple',
      options: { redirectTo: 'maxina://oauth/complete', skipBrowserRedirect: true, queryParams: { tenant_slug: 'maxina' } },
    });
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith('https://g1-auth.example.org/authorize', 'maxina://oauth/complete');
    expect(d.client.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('parses the code from a return URL', () => {
    expect(codeFromReturnUrl('maxina://oauth/complete?code=a%2Bb&state=1')).toBe('a+b');
    expect(codeFromReturnUrl('maxina://oauth/complete#code=z')).toBe('z');
    expect(codeFromReturnUrl('maxina://oauth/complete')).toBeNull();
  });

  it('the post-sign-in target is /onboarding/welcome with redirectTo', () => {
    expect(postSignInTarget(null)).toBe('/onboarding/welcome');
    expect(postSignInTarget('/inbox?tab=x')).toBe('/onboarding/welcome?redirectTo=%2Finbox%3Ftab%3Dx');
  });
});

function Probe() {
  const { loading, user, configMissing } = useAuth();
  return <Text testID="probe">{`${loading}|${user?.id ?? '-'}|${configMissing?.join(',') ?? '-'}`}</Text>;
}

function wrap(client: unknown, qc = new QueryClient()) {
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider client={client as never}>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthProvider', () => {
  it('resolves the stored session', async () => {
    const d = createSupabaseDouble({ session: fakeSession('u-9') });
    wrap(d.client);
    await waitFor(() => expect(screen.getByTestId('probe').props.children).toBe('false|u-9|-'));
    // AppState drives auto-refresh: one of the two is applied for the current state.
    expect(d.client.auth.startAutoRefresh.mock.calls.length + d.client.auth.stopAutoRefresh.mock.calls.length).toBe(1);
  });

  it('loading resolves within the pinned timeout when getSession hangs', async () => {
    jest.useFakeTimers();
    const d = createSupabaseDouble({ auth: { getSession: () => new Promise(() => undefined) } });
    wrap(d.client);
    expect(screen.getByTestId('probe').props.children).toBe('true|-|-');
    await act(async () => {
      jest.advanceTimersByTime(AUTH_BOOTSTRAP_TIMEOUT_MS);
    });
    expect(screen.getByTestId('probe').props.children).toBe('false|-|-');
    expect(AUTH_BOOTSTRAP_TIMEOUT_MS).toBe(10_000);
  });

  it('with no config it reports the missing keys instead of building a client', () => {
    wrap(undefined);
    expect(screen.getByTestId('probe').props.children).toBe('false|-|gatewayUrl,supabaseUrl,supabasePublishableKey');
  });

  it("signOut uses scope 'local' and clears the query cache, org id and tenant slug", async () => {
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    const qc = new QueryClient();
    qc.setQueryData(['anything'], 1);
    await AsyncStorage.multiSet([
      ['tenant_slug', 'alkalma'],
      ['vitana-query-cache', '{}'],
      ['vitana.businessOrgId', 'org-1'],
      ['orb_conversation_id', 'c'],
      ['vitana.lang', 'de-DE'],
    ]);
    activeOrgStore.set('org-1');
    let signOut: () => Promise<void> = async () => undefined;
    function Grab() {
      signOut = useAuth().signOut;
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider client={d.client}>
          <Grab />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await act(async () => {
      await signOut();
    });
    expect(d.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(qc.getQueryData(['anything'])).toBeUndefined();
    expect(activeOrgStore.getSnapshot()).toBeNull();
    const left = await AsyncStorage.getAllKeys();
    expect([...left].sort()).toEqual(['vitana.lang']);
  });
});
