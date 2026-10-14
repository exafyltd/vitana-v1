/**
 * VTID-05186 (N3, plan change 9) — the app's one Supabase client.
 *
 * Built lazily from `endpoints(config)` (host and key checks, no default) by
 * N1's `createSupabaseClient` with the SecureStore session storage and the
 * PKCE flow the Android Apple sign-in needs (I-N1.1 additive `auth` option).
 * Never built at module load: an unset config surfaces as ConfigMissingError
 * where it is used, and renders the ConfigMissing screen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '../ports/core';
import { config, endpoints } from '../ports/env';
import { secureStorage } from './secure-storage';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const e = endpoints(config);
    client = createSupabaseClient({
      url: e.supabaseUrl,
      publishableKey: e.supabasePublishableKey,
      dataApiUrl: e.dataApiUrl,
      storage: secureStorage,
      auth: { flowType: 'pkce' },
    }) as SupabaseClient;
  }
  return client;
}

/** Test seam: a double in place of the real client (null resets). */
export function __setSupabaseForTests(c: SupabaseClient | null): void {
  client = c;
}

/**
 * The current access token, or null (signed out or not configured). Used by
 * the gateway client (I-N1.2), N4 (push token registration) and N6 (ORB).
 */
export async function getAccessToken(): Promise<string | null> {
  let c: SupabaseClient;
  try {
    c = getSupabase();
  } catch {
    return null;
  }
  try {
    const { data } = await c.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
