/**
 * VTID-05186 (N3, Interfaces I-N4) — N3's side of N4's auth port
 * (src/linking/auth-port.ts, VTID-05178):
 *   - the session signal: `setSession({ accessToken })` on sign-in, `null` on
 *     sign-out, so N4's link router releases held route targets only when
 *     signed in;
 *   - the auth links: `/oauth/complete` (PKCE return) and `/auth/confirmed`,
 *     `/reset-password` (code or token pair) become a session, then the same
 *     landing the web uses.
 *   - VTID-05449: an `/auth/confirmed` link opens the native confirm screen
 *     (src/pages/auth/EmailConfirmed.tsx) — with the session on success, with
 *     the link's `error` / `error_description` (or `error=access_denied` when
 *     the code could not be exchanged) on failure, so the screen shows the
 *     confirmed or the expired state. The screen never re-parses the link.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';
import type { SupabaseClient } from '@supabase/supabase-js';
import { onAuthLink, setSession, type AuthLink } from '../linking/auth-port';
import { exchangeCode, postSignInTarget } from './sign-in';
import { useAuth } from './AuthProvider';
import { getSupabase } from './client';

export const EMAIL_CONFIRMED_PATH = '/auth/confirmed';

/** Where an auth link lands once its session is in. */
export function authLinkTarget(link: AuthLink): string {
  if (link.kind === 'auth' && link.path === '/reset-password') return '/reset-password?type=recovery';
  if (link.kind === 'auth' && link.path === EMAIL_CONFIRMED_PATH) return EMAIL_CONFIRMED_PATH;
  const redirectTo = typeof link.params?.redirectTo === 'string' ? link.params.redirectTo : null;
  return postSignInTarget(redirectTo);
}

/** `/auth/confirmed?error=…` for a confirmation link that did not become a session. */
export function confirmationFailureTarget(link: AuthLink): string | null {
  if (link.kind !== 'auth' || link.path !== EMAIL_CONFIRMED_PATH) return null;
  const q = new URLSearchParams();
  q.set('error', link.tokens.error ?? 'access_denied');
  if (link.tokens.error_description) q.set('error_description', link.tokens.error_description);
  return `${EMAIL_CONFIRMED_PATH}?${q.toString()}`;
}

export async function handleAuthLink(link: AuthLink, supabase: SupabaseClient = getSupabase()): Promise<string | null> {
  const failed = confirmationFailureTarget(link);
  if (failed && link.kind === 'auth' && link.tokens.error) {
    router.replace(failed as never);
    return failed;
  }
  const tokens = link.kind === 'auth' ? link.tokens : { code: typeof link.params?.code === 'string' ? link.params.code : undefined };
  let ok = false;
  if (tokens.code) ok = (await exchangeCode(tokens.code, supabase)).ok;
  else if (link.kind === 'auth' && link.tokens.access_token && link.tokens.refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token: link.tokens.access_token, refresh_token: link.tokens.refresh_token });
    ok = !error;
  }
  if (!ok) {
    if (failed && (tokens.code || (link.kind === 'auth' && link.tokens.access_token))) {
      router.replace(failed as never);
      return failed;
    }
    return null;
  }
  const target = authLinkTarget(link);
  router.replace(target as never);
  return target;
}

export function useAuthLinkBridge(): void {
  const { session, configMissing } = useAuth();
  useEffect(() => {
    setSession(session?.access_token ? { accessToken: session.access_token } : null);
  }, [session?.access_token]);
  useEffect(() => {
    if (configMissing) return undefined;
    return onAuthLink((link) => {
      void handleAuthLink(link).catch(() => null);
    });
  }, [configMissing]);
}
