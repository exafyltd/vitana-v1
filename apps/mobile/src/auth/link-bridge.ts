/**
 * VTID-05186 (N3, Interfaces I-N4) — N3's side of N4's auth port
 * (src/linking/auth-port.ts, VTID-05178):
 *   - the session signal: `setSession({ accessToken })` on sign-in, `null` on
 *     sign-out, so N4's link router releases held route targets only when
 *     signed in;
 *   - the auth links: `/oauth/complete` (PKCE return) and `/auth/confirmed`,
 *     `/reset-password` (code or token pair) become a session, then the same
 *     landing the web uses.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';
import type { SupabaseClient } from '@supabase/supabase-js';
import { onAuthLink, setSession, type AuthLink } from '../linking/auth-port';
import { exchangeCode, postSignInTarget } from './sign-in';
import { useAuth } from './AuthProvider';
import { getSupabase } from './client';

/** Where an auth link lands once its session is in. */
export function authLinkTarget(link: AuthLink): string {
  if (link.kind === 'auth' && link.path === '/reset-password') return '/reset-password?type=recovery';
  const redirectTo = typeof link.params?.redirectTo === 'string' ? link.params.redirectTo : null;
  return postSignInTarget(redirectTo);
}

export async function handleAuthLink(link: AuthLink, supabase: SupabaseClient = getSupabase()): Promise<string | null> {
  const tokens = link.kind === 'auth' ? link.tokens : { code: typeof link.params?.code === 'string' ? link.params.code : undefined };
  let ok = false;
  if (tokens.code) ok = (await exchangeCode(tokens.code, supabase)).ok;
  else if (link.kind === 'auth' && link.tokens.access_token && link.tokens.refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token: link.tokens.access_token, refresh_token: link.tokens.refresh_token });
    ok = !error;
  }
  if (!ok) return null;
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
