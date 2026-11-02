/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — test harness for the
 * support / connectors screens: a MOCKED gateway that answers by
 * `METHOD /path` (query string kept, so a test can pin it) and records every
 * call with its method and JSON body, plus the provider wrapper. Nothing
 * reaches a network: `../helpers/no-network` replaces the global fetch with a
 * thrower, and the native gateway fetch is swapped for this fake.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { createCommunitySupabaseDouble } from '../community/helpers';

export type Call = { method: string; path: string; body: any; headers: Record<string, string> };
type Reply = unknown | { status: number; body?: unknown } | ((call: Call) => unknown);

/** `{ status, body }` replies with that status; anything else is a 200 JSON body. */
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
  return { fetch, calls, writes: () => calls.filter((c) => c.method !== 'GET') };
}

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

export function makeWrapper(routes: Record<string, Reply>, opts: { language?: string } = {}) {
  const supabase = createCommunitySupabaseDouble();
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
  return { wrapper: Wrapper, gateway, supabase };
}
