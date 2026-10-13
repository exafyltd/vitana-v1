/**
 * VTID-05186 (N3, plan change 10) — sign-in methods.
 *
 * Email/password mirrors MaxinaPortal.tsx:300-400 (15 s deadline, sign-up
 * metadata `tenant_slug`, confirmation link from config); Apple and Google use
 * the native SDKs + `signInWithIdToken`; Apple on Android uses the browser PKCE
 * flow back to `/oauth/complete` (the web's own path, F22).
 *
 * Every link base comes from `authRedirectUrl` (no default, never the web's
 * hardcoded PUBLIC_BASE_URL): unset → ConfigMissingError → ConfigMissing.
 * Nothing here is configured for the production auth tenant; the providers
 * exist only on the G1 test project.
 */
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { config, requireUrl, requireValue, ConfigMissingError } from '../ports/env';
import { appLink } from '../ports/links';
import { getSupabase } from './client';

export type PortalTenant = 'maxina' | 'alkalma';

/** MaxinaPortal.tsx / AlkalmaPortal.tsx deadline (VTID-03652). */
export const SIGN_IN_DEADLINE_MS = 15_000;

/** src/utils/redirectUrls.ts CONFIRMATION_PATHS for the two portals. */
export const CONFIRMATION_PATHS: Record<PortalTenant, string> = {
  maxina: '/maxina?confirmed=true',
  alkalma: '/alkalma?confirmed=true',
};

export type SignInResult = { ok: true } | { ok: false; errorKey?: string; message?: string; cancelled?: boolean };

export class SignInTimeoutError extends Error {
  constructor() {
    super('sign-in timed out');
    this.name = 'SignInTimeoutError';
  }
}

function withDeadline<T>(work: Promise<T>, ms = SIGN_IN_DEADLINE_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SignInTimeoutError()), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

function failure(err: unknown): SignInResult {
  if (err instanceof SignInTimeoutError) return { ok: false, errorKey: 'screens.portals.signinTakingLongerThanExpected' };
  if (err instanceof ConfigMissingError) throw err;
  return { ok: false, errorKey: oauthErrorKey(err) };
}

/**
 * Existing catalog keys for an OAuth/SDK failure. The web's friendlyOAuthError
 * (src/lib/oauthErrors.ts) returns raw English; native maps the same cases to
 * the keys the portals already ship.
 */
export function oauthErrorKey(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ((err as { message?: string })?.message ?? '');
  const lc = raw.toLowerCase();
  if (lc.includes('timed out')) return 'screens.portals.signinTakingLongerThanExpected';
  if (lc.includes('apple') && (lc.includes('cancel') || lc.includes('expired'))) return 'screens.portals.tryAppleSigninAgain';
  return 'screens.portals.somethingWentWrong';
}

/** `/onboarding/welcome[?redirectTo=]` — MaxinaPortal.tsx:175-181. */
export function postSignInTarget(redirectTo?: string | null): string {
  return redirectTo ? `/onboarding/welcome?redirectTo=${encodeURIComponent(redirectTo)}` : '/onboarding/welcome';
}

function linkBase(): string {
  return requireUrl(config, 'authRedirectUrl').replace(/\/+$/, '');
}

export function emailRedirectFor(tenant: PortalTenant): string {
  return `${linkBase()}${CONFIRMATION_PATHS[tenant]}`;
}

export function resetRedirect(): string {
  return `${linkBase()}/reset-password`;
}

export async function signInWithPassword(email: string, password: string, supabase: SupabaseClient = getSupabase()): Promise<SignInResult> {
  try {
    const { error } = await withDeadline(supabase.auth.signInWithPassword({ email, password }));
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function signUpWithPassword(
  input: { email: string; password: string; fullName: string; tenant: PortalTenant; preferredRole?: string },
  supabase: SupabaseClient = getSupabase(),
): Promise<SignInResult> {
  const emailRedirectTo = emailRedirectFor(input.tenant);
  try {
    const { error } = await withDeadline(
      supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo,
          data: { full_name: input.fullName, tenant_slug: input.tenant, ...(input.preferredRole ? { preferred_role: input.preferredRole } : {}) },
        },
      }),
    );
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function sendPasswordReset(email: string, supabase: SupabaseClient = getSupabase()): Promise<SignInResult> {
  const redirectTo = resetRedirect();
  try {
    const { error } = await withDeadline(supabase.auth.resetPasswordForEmail(email, { redirectTo }));
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** iOS: SHA-256 hashed nonce to Apple, the raw nonce to Supabase. */
export async function signInWithAppleIOS(supabase: SupabaseClient = getSupabase()): Promise<SignInResult> {
  try {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) return { ok: false, errorKey: 'screens.portals.tryAppleSigninAgain' };
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce });
    if (error) return { ok: false, message: error.message };
    // Apple sends the name only on the first sign-in: keep it once.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
    if (fullName) await supabase.auth.updateUser({ data: { full_name: fullName } });
    return { ok: true };
  } catch (err) {
    if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return { ok: false, cancelled: true };
    return failure(err);
  }
}

/**
 * Google on both platforms. The pinned @react-native-google-signin (16.1.5,
 * free API) cannot pass a nonce, so the id token goes without one; the G1
 * project enables "skip nonce check" for Google (plan open question 4, recorded
 * in the G1 config notes; never on production auth).
 */
export async function signInWithGoogle(supabase: SupabaseClient = getSupabase()): Promise<SignInResult> {
  const webClientId = requireValue(config, 'googleWebClientId');
  const iosClientId = Platform.OS === 'ios' ? requireValue(config, 'googleIosClientId') : undefined;
  try {
    GoogleSignin.configure({ webClientId, ...(iosClientId ? { iosClientId } : {}) });
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { ok: false, cancelled: true };
    const idToken = response.data.idToken;
    if (!idToken) return { ok: false, errorKey: 'screens.portals.somethingWentWrong' };
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** The `code` of a PKCE return URL (query or hash), or null. */
export function codeFromReturnUrl(url: string): string | null {
  const m = /[?#&]code=([^&#]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Android has no Apple SDK: browser PKCE round trip to `/oauth/complete` (web F22). */
export async function signInWithAppleAndroid(tenant: PortalTenant, supabase: SupabaseClient = getSupabase()): Promise<SignInResult> {
  try {
    const redirectTo = appLink('/oauth/complete');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { tenant_slug: tenant } },
    });
    if (error || !data?.url) return { ok: false, message: error?.message, errorKey: error ? undefined : 'screens.portals.somethingWentWrong' };
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return { ok: false, cancelled: true };
    const code = codeFromReturnUrl(result.url);
    if (!code) return { ok: false, errorKey: 'screens.portals.tryAppleSigninAgain' };
    return exchangeCode(code, supabase);
  } catch (err) {
    return failure(err);
  }
}

/** The native `/oauth/complete` route and the Android Apple flow share this. */
export async function exchangeCode(code: string, supabase: SupabaseClient = getSupabase()): Promise<SignInResult> {
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export function signInWithApple(tenant: PortalTenant, supabase?: SupabaseClient): Promise<SignInResult> {
  return Platform.OS === 'ios' ? signInWithAppleIOS(supabase) : signInWithAppleAndroid(tenant, supabase);
}
