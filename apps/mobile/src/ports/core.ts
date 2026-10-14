/**
 * VTID-05186 (N3, plan changes 2 + 20–21) — the ONE door to N1's `@vitana/core`
 * (VTID-05183).
 *
 * Every shell, auth and identity file imports N1 code from here, never from
 * a lane package directly (tests/ports.test.ts). Every name is a plain
 * re-export of an `@vitana/core/<subpath>` export, with one exception:
 *
 * I-N1.1 — N1's `createSupabaseClient` has no `auth.flowType` option yet (the
 * additive request to N1 is still open). The wrapper below calls N1's
 * factory unchanged (same checks, same data-API routing) and then sets the
 * flow on the client's auth module. supabase-js reads `flowType` only when a
 * flow runs (sign-in, code exchange), never in the constructor, so the
 * result is the client `createClient(…, { auth: { flowType } })` would give.
 * When N1 takes the option, this wrapper becomes a plain re-export.
 */
import { createSupabaseClient as createCoreSupabaseClient, type SupabaseClientOptions, type VitanaSupabaseClient } from '@vitana/core/supabase';

export * from '@vitana/core/config';
export * from '@vitana/core/storage';
export * from '@vitana/core/gateway';
export type { Database, SupabaseClientOptions, VitanaSupabaseClient } from '@vitana/core/supabase';
export * from '@vitana/core/roles';
export * from '@vitana/core/nav';
export * from '@vitana/core/business-mode';
export * from '@vitana/core/tenants';
export * from '@vitana/core/language';
export * from '@vitana/core/registry';

export type AuthFlowType = 'pkce' | 'implicit';

/** N1's options plus the I-N1.1 request. */
export type ShellSupabaseClientOptions = SupabaseClientOptions & { auth?: { flowType?: AuthFlowType } };

/** Sets the auth flow on a client N1 built. Throws when supabase-js no longer has the field (fail loudly, never a silent implicit flow). */
export function setAuthFlowType(client: VitanaSupabaseClient, flowType: AuthFlowType): void {
  const auth = client.auth as unknown as { flowType?: unknown };
  if (typeof auth.flowType !== 'string') {
    throw new Error('createSupabaseClient: this supabase-js auth client has no flowType field; @vitana/core must take auth.flowType (I-N1.1).');
  }
  auth.flowType = flowType;
}

export function createSupabaseClient({ auth, ...options }: ShellSupabaseClientOptions): VitanaSupabaseClient {
  const client = createCoreSupabaseClient(options);
  if (auth?.flowType) setAuthFlowType(client, auth.flowType);
  return client;
}
