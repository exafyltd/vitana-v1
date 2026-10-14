/**
 * VTID-05183 — the Supabase client, built only from injected configuration.
 * Unlike the web client (src/integrations/supabase/client.ts) there is no
 * fallback URL or key, no localStorage, and nothing is created at module load.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database';
import { createDataFetch } from './data-routing';
import type { KeyValueStorage } from './storage';

export type { Database } from './database';

export interface SupabaseClientOptions {
  url: string;
  publishableKey: string;
  /** PostgREST-Aurora proxy; unset = PostgREST stays on `url`. */
  dataApiUrl?: string;
  /** Where the auth session lives (required — native has no localStorage). */
  storage: KeyValueStorage;
  /** The fetch the client uses; defaults to the runtime's fetch at call time. */
  fetchImpl?: typeof fetch;
}

export type VitanaSupabaseClient = SupabaseClient<Database>;

export function createSupabaseClient({ url, publishableKey, dataApiUrl, storage, fetchImpl }: SupabaseClientOptions): VitanaSupabaseClient {
  if (!url || !url.trim()) throw new Error('@vitana/core: createSupabaseClient needs url. There is no default project (VTID-05183); pass endpoints(config).supabaseUrl.');
  if (!publishableKey || !publishableKey.trim()) throw new Error('@vitana/core: createSupabaseClient needs publishableKey (endpoints(config).supabasePublishableKey).');
  if (!storage || typeof storage.getItem !== 'function') throw new Error('@vitana/core: createSupabaseClient needs a storage (KeyValueStorage).');
  const base: typeof fetch = fetchImpl ?? ((input, init) => fetch(input, init));
  return createClient<Database>(url.trim(), publishableKey.trim(), {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createDataFetch(url.trim(), dataApiUrl, base),
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}
