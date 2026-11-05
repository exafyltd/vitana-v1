/**
 * VTID-05450 (native-wave2-public-auth-onboarding-r3/onboarding) — the data
 * side of `/onboarding/welcome`, the native twin of
 * src/hooks/useOnboardingStatus.ts, the queries in
 * src/components/onboarding/OnboardingNameForm.tsx and
 * src/lib/community-intro.ts `setCommunityIntroOptIn`. Same PostgREST tables,
 * columns and order, RE-IMPLEMENTED against the injected native Supabase
 * client (`getSupabase()`): those web modules import the web Supabase client,
 * so they are class-B and do not go through `@vitana/core`.
 *
 * No auth write: the account already exists here. The form writes the
 * member's own `profiles` / `app_users` / `global_community_profiles` rows
 * (owner RLS), exactly as the web page does; tests run it against the fake
 * Supabase double only.
 */
import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../auth/client';
import { useAuth } from '../../auth/AuthProvider';
import { deviceStorage } from '../../identity/device-storage';

/** useOnboardingStatus.ts ONBOARDING_KEY — same key, so a value means the same thing on both. */
export const ONBOARDING_KEY = 'vitana_onboarding_completed';

/** OnboardingNameForm.tsx handle rules. */
export const HANDLE_PATTERN = /^[a-zA-Z0-9_]+$/;
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 100;
/** OnboardingNameForm.tsx debounce before the availability query. */
export const HANDLE_CHECK_DEBOUNCE_MS = 400;

/** OnboardingWelcome.tsx `AUDIOBOOK_START_ROUTE`: My Journey with Episode 1 started. */
export const AUDIOBOOK_START_ROUTE = '/autopilot?audiobook=play';
/** OnboardingWelcome.tsx `getDefaultTarget()`: the "All News" home feed. */
export const DEFAULT_TARGET = '/home';
export const ONBOARDING_PATH = '/onboarding/welcome';

export type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/** OnboardingNameForm.tsx `slugify`. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, HANDLE_MAX);
}

/** OnboardingNameForm.tsx `handleHandleChange`: lower-case, strip anything but a-z 0-9 _, cap the length. */
export function cleanHandle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, HANDLE_MAX);
}

/** The local part of the rule (no query): idle under the minimum, invalid on a bad character. */
export function localHandleStatus(handle: string): 'idle' | 'invalid' | null {
  if (!handle || handle.length < HANDLE_MIN) return 'idle';
  if (!HANDLE_PATTERN.test(handle)) return 'invalid';
  return null;
}

/** OnboardingNameForm.tsx `canSubmit`. */
export function canSubmitForm(displayName: string, handle: string, status: HandleStatus, saving: boolean): boolean {
  return (
    displayName.trim().length >= DISPLAY_NAME_MIN &&
    handle.length >= HANDLE_MIN &&
    HANDLE_PATTERN.test(handle) &&
    status !== 'taken' &&
    status !== 'checking' &&
    !saving
  );
}

/**
 * The web reads `redirectTo` as-is. Native keeps an in-app path only (no
 * scheme, no `//host`), and drops a redirect back to this page: the AuthGate
 * sends a signed-out visitor to `/maxina?redirectTo=/onboarding/welcome`, so
 * the post-sign-in target would otherwise point the finished form at itself.
 */
export function safeRedirect(raw: unknown): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  const path = value.split(/[?#]/)[0].replace(/\/+$/, '');
  if (path === ONBOARDING_PATH) return null;
  return value;
}

/** OnboardingNameForm.tsx `checkHandleAvailability` query: free, or the member's own handle. */
export async function checkHandleAvailability(handle: string, userId: string | undefined, supabase: SupabaseClient = getSupabase()): Promise<HandleStatus> {
  const local = localHandleStatus(handle);
  if (local) return local;
  try {
    const { data, error } = await supabase.from('profiles').select('user_id').eq('handle', handle.toLowerCase()).maybeSingle();
    if (error) return 'idle';
    const row = data as { user_id?: string } | null;
    return !row || row.user_id === userId ? 'available' : 'taken';
  } catch {
    return 'idle';
  }
}

export type SaveResult = { ok: true } | { ok: false; handleTaken?: boolean; message?: string };

/**
 * OnboardingNameForm.tsx `handleSubmit`: upsert the profile (a unique-handle
 * conflict is "taken"), then the non-fatal `app_users.display_name` mirror and
 * — only on an explicit "no" — the community-intro opt-out (VTID-05206), then
 * the completion flag.
 */
export async function saveOnboardingProfile(
  input: { userId: string; displayName: string; handle: string; introduceMe: boolean },
  supabase: SupabaseClient = getSupabase(),
): Promise<SaveResult> {
  const displayName = input.displayName.trim();
  const now = new Date().toISOString();
  try {
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ user_id: input.userId, display_name: displayName, handle: input.handle.toLowerCase(), updated_at: now }, { onConflict: 'user_id' });
    if (upsertError) {
      if (upsertError.code === '23505' && upsertError.message?.includes('handle')) return { ok: false, handleTaken: true };
      return { ok: false, message: upsertError.message };
    }
    try {
      await supabase.from('app_users').update({ display_name: displayName, updated_at: now }).eq('user_id', input.userId);
    } catch {
      /* non-fatal, as on the web */
    }
    if (!input.introduceMe) {
      try {
        await supabase.from('global_community_profiles').update({ community_intro_opt_in: false }).eq('user_id', input.userId);
      } catch {
        /* non-fatal; the member can change it in Settings → Privacy */
      }
    }
    await markOnboardingComplete(input.userId);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : undefined };
  }
}

/** useOnboardingStatus.ts `markOnboardingComplete`, on device storage. */
export async function markOnboardingComplete(userId: string): Promise<void> {
  await deviceStorage.setItem(ONBOARDING_KEY, userId);
}

/**
 * useOnboardingStatus.ts: no user → nothing to do; the device flag → done;
 * else the profile's `display_name` + `handle` (both set → done, flag
 * stored); a query error → show onboarding (the web's safer default).
 */
export function useOnboardingStatus(): { needsOnboarding: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<{ needsOnboarding: boolean; loading: boolean }>({ needsOnboarding: false, loading: true });

  useEffect(() => {
    if (authLoading) return undefined;
    if (!userId) {
      setState({ needsOnboarding: false, loading: false });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    void (async () => {
      let needs = true;
      try {
        if ((await deviceStorage.getItem(ONBOARDING_KEY)) === userId) {
          needs = false;
        } else {
          const { data, error } = await getSupabase().from('profiles').select('display_name, handle').eq('user_id', userId).maybeSingle();
          const row = data as { display_name?: string | null; handle?: string | null } | null;
          if (!error && row?.display_name?.trim() && row?.handle?.trim()) {
            await deviceStorage.setItem(ONBOARDING_KEY, userId);
            needs = false;
          }
        }
      } catch {
        needs = true;
      }
      if (!cancelled) setState({ needsOnboarding: needs, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  return state;
}
