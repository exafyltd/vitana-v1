/**
 * VTID-05450 (native-wave2-public-auth-onboarding-r3/onboarding) — fixtures for
 * the onboarding welcome tests: the shared Supabase double plus the `upsert`
 * verb OnboardingNameForm.tsx uses on `profiles`. Every write is recorded,
 * nothing leaves the process.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';

export type Upsert = { table: string; values: Record<string, any>; options: any };

export function onboardingDouble(
  opts: {
    userId?: string;
    meta?: Record<string, unknown>;
    profiles?: Array<Record<string, any>>;
    upsertError?: { code?: string; message: string } | null;
    profileQueryError?: boolean;
    signedOut?: boolean;
  } = {},
) {
  const userId = opts.userId ?? 'u-new';
  const session = fakeSession(userId);
  session.user.user_metadata = opts.meta ?? {};
  const d = createSupabaseDouble({
    session: opts.signedOut ? null : session,
    tables: { profiles: opts.profiles ?? [], app_users: [{ user_id: userId }], global_community_profiles: [{ user_id: userId, community_intro_opt_in: true }] },
  });
  const upserts: Upsert[] = [];
  const base = d.client.from;
  d.client.from = jest.fn((table: string) => {
    const b = base(table);
    if (opts.profileQueryError && table === 'profiles') {
      b.maybeSingle = async () => ({ data: null, error: { message: 'boom' } });
    }
    b.upsert = async (values: Record<string, any>, options: any) => {
      upserts.push({ table, values, options });
      return { data: null, error: opts.upsertError ?? null };
    };
    return b;
  });
  return { ...d, client: d.client, upserts, userId };
}
