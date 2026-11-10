/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — fixtures
 * for the auth-portal tests: registry / resolve_tenant rows, a Supabase double
 * with the extra query verbs and auth calls these screens use. No network.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseDouble, type DoubleOptions } from '../helpers/supabase-double';
import { configure } from '@testing-library/react-native';

// Screens load async (kit, catalogs, queries); give findBy/waitFor room on a loaded runner.
configure({ asyncUtilTimeout: 5000 });

export const G1_AUTH = 'https://g1-auth.example.org';

export function tenantRow(slug: string, extra: Record<string, unknown> = {}) {
  return {
    tenant_id: `t-${slug}`,
    slug,
    name: slug,
    display_name: slug === 'acme' ? 'Acme Circle' : slug,
    open_signup: true,
    brand: {},
    landing: { post_login_path: '/home' },
    ...extra,
  };
}

/** A double whose `resolve_tenant` answers from `rows` (keyed by slug) and whose registry lists them. */
export function portalDouble(opts: { rows?: Array<Record<string, any>>; session?: any; members?: Array<{ user_id: string; tenant_id: string }>; resolveError?: boolean } & DoubleOptions = {}) {
  const rows = opts.rows ?? [];
  const d = createSupabaseDouble({
    ...opts,
    session: opts.session,
    tables: { tenants: rows, user_tenants: opts.members ?? [], ...(opts.tables ?? {}) },
    rpc: {
      resolve_tenant: ({ p_slug }: { p_slug: string }) =>
        opts.resolveError ? { data: null, error: { message: 'boom' } } : { data: rows.filter((r) => r.slug === p_slug), error: null },
      switch_to_tenant_by_slug: () => ({ data: null, error: null }),
      ...(opts.rpc ?? {}),
    },
  });
  (d.client.auth as any).resend = jest.fn(async () => ({ error: null }));
  d.client.storage = { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `${G1_AUTH}/storage/${p}` } }) }) };
  return d;
}

/** Adds `user_discount_codes` with the is / gt / order verbs useDiscountCode.ts chains. */
export function withDiscountCodes(d: ReturnType<typeof createSupabaseDouble>, rows: Array<Record<string, any>>) {
  const base = d.client.from;
  const seen: Array<[string, unknown]> = [];
  d.client.from = jest.fn((table: string) => {
    if (table !== 'user_discount_codes') return base(table);
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => (seen.push([c, v]), b),
      is: (c: string, v: unknown) => (seen.push([`is:${c}`, v]), b),
      gt: (c: string, v: unknown) => (seen.push([`gt:${c}`, v]), b),
      order: () => b,
      limit: () => b,
      maybeSingle: async () => ({ data: rows.find((r) => seen.every(([c, v]) => (c.includes(':') ? true : r[c] === v))) ?? null, error: null }),
    };
    return b;
  });
  return seen;
}
