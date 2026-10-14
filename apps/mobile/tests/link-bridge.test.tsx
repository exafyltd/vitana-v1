/** VTID-05186 — N3's side of N4's auth port: the session signal and the auth links. */
import './helpers/no-network';
import './helpers/mocks';
import { renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { createSupabaseDouble, fakeSession } from './helpers/supabase-double';
import { makeWrapper } from './helpers/providers';
import { handleAuthLink, useAuthLinkBridge } from '../src/auth/link-bridge';
import { getSession, resetAuthPort } from '../src/linking/auth-port';
import { __setSupabaseForTests } from '../src/auth/client';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), replace: jest.fn() }, usePathname: () => '/' }));

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  jest.clearAllMocks();
  resetAuthPort();
});

it('/oauth/complete?code= exchanges the code and lands on the post-sign-in path', async () => {
  const d = createSupabaseDouble();
  await expect(handleAuthLink({ kind: 'oauth_return', pathname: '/oauth/complete', params: { code: 'c1', redirectTo: '/inbox' } }, d.client)).resolves.toBe(
    '/onboarding/welcome?redirectTo=%2Finbox',
  );
  expect(d.client.auth.exchangeCodeForSession).toHaveBeenCalledWith('c1');
  expect(router.replace).toHaveBeenCalledWith('/onboarding/welcome?redirectTo=%2Finbox');
});

it('a /reset-password token pair becomes a session and opens the new-password form', async () => {
  const d = createSupabaseDouble({ auth: { setSession: () => ({ error: null }) } });
  (d.client.auth as Record<string, unknown>).setSession = jest.fn(async () => ({ error: null }));
  const target = await handleAuthLink(
    { kind: 'auth', path: '/reset-password', pathname: '/reset-password', params: {}, tokens: { access_token: 'a', refresh_token: 'r', type: 'recovery' } },
    d.client,
  );
  expect(target).toBe('/reset-password?type=recovery');
  expect(d.client.auth.setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
});

it('a link without a code or tokens does nothing', async () => {
  const d = createSupabaseDouble();
  await expect(handleAuthLink({ kind: 'oauth_return', pathname: '/oauth/complete', params: {} }, d.client)).resolves.toBeNull();
  expect(router.replace).not.toHaveBeenCalled();
});

it('the session signal follows sign-in', async () => {
  const d = createSupabaseDouble({ session: fakeSession('u-1') });
  renderHook(() => useAuthLinkBridge(), { wrapper: makeWrapper({ client: d.client }) });
  await waitFor(() => expect(getSession()).toEqual({ accessToken: 'token-u-1' }));
});
