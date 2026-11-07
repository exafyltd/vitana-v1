/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — test harness for the
 * Talk-to-Vitana screen: RNTL's async timeout raised to 5 s (lane tests never
 * lean on the 1 s default), a MOCKED gateway that answers by `METHOD /path`
 * (query kept, so a test can pin it) and records every call with its method,
 * headers and JSON body, a Supabase double for the Vitana Index reads, and the
 * provider wrapper. Nothing reaches a network: `../helpers/no-network`
 * replaces the global fetch with a thrower and the native gateway fetch is
 * swapped for this fake.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { configure } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { createCommunitySupabaseDouble } from '../community/helpers';

configure({ asyncUtilTimeout: 5000 });

export type Call = { method: string; path: string; body: any; headers: Record<string, string> };
type Reply = unknown | ((call: Call) => unknown);

/** A reply with that HTTP status; anything else is a 200 JSON body. */
export const status = (code: number, body: unknown = { ok: false, error: 'failed' }) => ({ __status: code, body });

export function mockGateway(routes: Record<string, Reply>) {
  const calls: Call[] = [];
  const fetch = async (path: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    let body: any = undefined;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const headers: Record<string, string> = {};
    new Headers(init.headers ?? undefined).forEach((v, k) => {
      headers[k] = v;
    });
    const call: Call = { method, path, body, headers };
    calls.push(call);
    const key = [`${method} ${path}`, `${method} ${path.split('?')[0]}`].find((k) => Object.prototype.hasOwnProperty.call(routes, k));
    let reply: any = key ? routes[key] : undefined;
    if (typeof reply === 'function') reply = reply(call);
    const code = reply === undefined ? 404 : reply && typeof reply === 'object' && '__status' in reply ? reply.__status : 200;
    const payload = reply && typeof reply === 'object' && '__status' in reply ? reply.body : reply;
    return {
      ok: code >= 200 && code < 300,
      status: code,
      text: async () => (payload === undefined ? '' : JSON.stringify(payload)),
    } as unknown as Response;
  };
  return {
    fetch,
    calls,
    writes: () => calls.filter((c) => c.method !== 'GET'),
    count: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path).length,
  };
}

/** `vitana_index_scores` rows (filtered by user + `gte('date')`) and the compute RPC, recorded. */
export function indexSupabase(rows: Array<{ user_id: string; date: string; score_total: number }>, opts: { computeRows?: typeof rows } = {}) {
  const base = createCommunitySupabaseDouble();
  const table = [...rows];
  const rpcCalls: Array<{ name: string; args: unknown }> = [];
  const from = jest.fn((name: string) => {
    const filters: Array<(r: any) => boolean> = [];
    let asc = true;
    let limitN: number | null = null;
    const run = () => {
      if (name !== 'vitana_index_scores') return { data: [], error: null };
      let out = table.filter((r) => filters.every((f) => f(r)));
      out = out.sort((a, b) => (asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
      if (limitN !== null) out = out.slice(0, limitN);
      return { data: out, error: null };
    };
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      gte: (c: string, v: string) => (filters.push((r) => r[c] >= v), b),
      order: (_c: string, o?: { ascending?: boolean }) => ((asc = o?.ascending !== false), b),
      limit: (n: number) => ((limitN = n), b),
      then: (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return b;
  });
  const rpc = jest.fn(async (name: string, args: unknown) => {
    rpcCalls.push({ name, args });
    if (name === 'health_compute_vitana_index' && opts.computeRows) table.push(...opts.computeRows);
    return { data: null, error: null };
  });
  base.client.from = from;
  base.client.rpc = rpc;
  return { client: base.client, rpcCalls, from };
}

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

export function makeWrapper(routes: Record<string, Reply>, opts: { language?: string; supabase?: ReturnType<typeof indexSupabase> } = {}) {
  const supabase = opts.supabase ?? indexSupabase([]);
  const gateway = mockGateway(routes);
  __setSupabaseForTests(supabase.client as never);
  __setGatewayForTests(gateway.fetch as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  qcs.push(qc);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider client={supabase.client as never}>
            <TenantProvider>
              <LanguageProvider initialLanguage={opts.language ?? 'en-US'}>{children}</LanguageProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }
  return { wrapper: Wrapper, gateway, supabase, queryClient: qc };
}

/** ISO day `n` days before today (UTC, as the hook's `toISOString().slice(0, 10)`). */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
