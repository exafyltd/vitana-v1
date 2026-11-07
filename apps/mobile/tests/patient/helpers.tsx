/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — test harness for the
 * eight `/patient/*` screens. The shell's in-memory Supabase double (role
 * preference RPC, tenants, profiles) and a gateway fake behind the REAL
 * `createGatewayFetch` (so the bearer token is set exactly as in the app)
 * that records every request — method, path, headers — and answers by
 * `METHOD /path` or bare `/path`. Nothing reaches a network:
 * `../helpers/no-network` replaces `fetch` with a thrower. Patient health
 * data exists only as fixtures here; decisions are asserted as BUILT
 * requests against the fake, never sent to a live backend (R5.2).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactElement, ReactNode } from 'react';
import { act, configure, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { UIProvider, __clearToastsForTests } from '../../src/ports/ui';
import { createGatewayFetch } from '../../src/ports/core';
import { __resetPatientGateForTests } from '../../src/screens/patient/PatientGate';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import type { PatientHealthResult } from '../../src/screens/patient/data/requests';

// Every patient test imports this harness: give findBy*/waitFor 5 s instead
// of RNTL's 1 s default so the suite holds under default-worker load.
configure({ asyncUtilTimeout: 5000 });
// Chained 5 s waits must fit inside the test's own budget (Jest default 5 s).
jest.setTimeout(30000);

export function createPatientSupabase(opts: { role?: string | null; exafyAdmin?: boolean; roleLoads?: 'never' } = {}) {
  return createSupabaseDouble({
    session: fakeSession('u-1', {
      user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina', ...(opts.exafyAdmin ? { exafy_admin: true } : {}) }, user_metadata: {} },
    }),
    tables: {
      tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }],
      profiles: [{ user_id: 'u-1', display_name: 'Ana B', avatar_url: null, handle: null }],
      patient_profiles: opts.role === 'patient' ? [{ user_id: 'u-1' }] : [],
    },
    rpc: {
      get_role_preference: () =>
        opts.roleLoads === 'never' ? new Promise(() => undefined) : { data: opts.role === null ? [] : [{ role: opts.role ?? 'patient' }], error: null },
      get_my_permitted_roles: () => ({ data: { ok: true, roles: ['community', 'patient'] }, error: null }),
    },
  });
}

export type GatewayCall = { method: string; path: string; headers: Record<string, string> };

/** A route value of `{ __status }` answers that status; a function is called per request (so a refetch can see new data). */
export function createGateway(routes: Record<string, unknown> = {}) {
  const calls: GatewayCall[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const path = url.replace(/^https?:\/\/[^/]+\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({ method, path, headers: { ...((init.headers ?? {}) as Record<string, string>) } });
    const key = [`${method} ${path}`, path].find((k) => Object.prototype.hasOwnProperty.call(routes, k));
    let value = key ? routes[key] : undefined;
    if (typeof value === 'function') value = (value as () => unknown)();
    const status = value && typeof value === 'object' && '__status' in (value as any) ? (value as any).__status : value === undefined ? 404 : 200;
    const payload = value && typeof value === 'object' && '__status' in (value as any) ? { error: 'failed' } : value;
    return { ok: status >= 200 && status < 300, status, text: async () => (payload === undefined ? '' : JSON.stringify(payload)) } as unknown as Response;
  };
  const gatewayFetch = createGatewayFetch({ origin: 'https://gateway.test', getAccessToken: () => 'token-u-1', fetchImpl });
  return { gatewayFetch, calls, writes: () => calls.filter((c) => c.method !== 'GET') };
}

export const RESULTS: PatientHealthResult[] = [
  {
    id: 'r-1',
    report_date: '2026-10-05',
    source: 'partner',
    created_at: '2026-10-06T08:00:00Z',
    partner_result_id: 'p-1',
    org: { display_name: 'Labor Nord', self_registered_name: null, professional_user_id: null },
    biomarkers: [
      { id: 'b-1', biomarker_code: 'HBA1C', name: 'HbA1c', value: 6.1, unit: '%', ref_range_low: 4, ref_range_high: 5.6, status: 'high', measured_at: '2026-10-05' },
      { id: 'b-2', biomarker_code: 'LDL', name: null, value: 110, unit: 'mg/dL', ref_range_low: null, ref_range_high: null, status: 'normal', measured_at: '2026-10-05' },
      { id: 'b-3', biomarker_code: 'VITD', name: 'Vitamin D', value: null, unit: null, ref_range_low: 30, ref_range_high: 100, status: null, measured_at: '2026-10-05' },
    ],
  },
  {
    id: 'r-2',
    report_date: null,
    source: 'upload',
    created_at: '2026-09-01T08:00:00Z',
    partner_result_id: null,
    org: null,
    biomarkers: [{ id: 'b-4', biomarker_code: 'FE', name: 'Ferritin', value: 80, unit: 'ng/mL', ref_range_low: 30, ref_range_high: 400, status: 'normal', measured_at: '2026-09-01' }],
  },
  { id: 'r-3', report_date: '2026-08-01', source: 'partner', created_at: '2026-08-01T08:00:00Z', partner_result_id: null, org: { display_name: 'Praxis Süd', self_registered_name: 'Dr. Weber', professional_user_id: 'pro-1' }, biomarkers: [] },
  { id: 'r-4', report_date: '2026-07-01', source: 'partner', created_at: '2026-07-01T08:00:00Z', partner_result_id: null, org: null, biomarkers: [] },
];

export const LINK_REQUESTS = [
  { id: 'lr-1', partner_display_name: 'Labor Nord', test_name: 'Großes Blutbild', proposed_at: '2026-10-20T10:00:00Z' },
  { id: 'lr-2', partner_display_name: '', test_name: 'Vitamin D', proposed_at: null },
];

const clients: QueryClient[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.clear();
  __clearToastsForTests();
  __resetPatientGateForTests();
});

export function renderPatient(
  ui: ReactElement,
  opts: { supabase?: ReturnType<typeof createPatientSupabase>; gateway?: ReturnType<typeof createGateway>; language?: string; direction?: 'ltr' | 'rtl' } = {},
) {
  const supabase = opts.supabase ?? createPatientSupabase();
  const gateway = opts.gateway ?? createGateway();
  __setSupabaseForTests(supabase.client);
  __setGatewayForTests(gateway.gatewayFetch);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  clients.push(qc);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider initialMode="light">
          <AuthProvider client={supabase.client}>
            <TenantProvider>
              <LanguageProvider initialLanguage={opts.language ?? 'de-DE'}>
                <UIProvider colorScheme="light" direction={opts.direction ?? 'ltr'}>
                  {children}
                </UIProvider>
              </LanguageProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }
  return { ...render(ui, { wrapper: Wrapper }), gateway, supabase, qc };
}

/** Lets the providers (session, tenant, role, queries) settle inside act, so a synchronous assertion is not followed by stray updates. */
export async function settled(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}
