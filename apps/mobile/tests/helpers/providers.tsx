/**
 * VTID-05186 — test wrapper: QueryClient → Theme → Auth (double) → Tenant →
 * Language/I18n. The double is also installed as the app client, so hooks
 * that call getSupabase() see it. No network anywhere.
 */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider, type ThemeMode } from '../../src/theme/ThemeProvider';

export type GatewayRoutes = Record<string, unknown>;

/** Clients created by makeWrapper; cleared after each test so no gc timer keeps jest alive. */
const clients: QueryClient[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.clear();
});

/** A fake gateway fetch: JSON per path, 404 otherwise. */
export function fakeGateway(routes: GatewayRoutes) {
  const calls: string[] = [];
  const f = async (path: string) => {
    calls.push(path);
    const body = routes[path];
    return { ok: body !== undefined, status: body !== undefined ? 200 : 404, text: async () => (body === undefined ? '' : JSON.stringify(body)) } as unknown as Response;
  };
  return { fetch: f, calls };
}

export function makeWrapper(opts: { client: unknown; gateway?: GatewayRoutes; language?: string; themeMode?: ThemeMode; queryClient?: QueryClient }) {
  __setSupabaseForTests(opts.client as never);
  __setGatewayForTests(fakeGateway(opts.gateway ?? {}).fetch);
  const qc = opts.queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  clients.push(qc);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider initialMode={opts.themeMode}>
          <AuthProvider client={opts.client as never}>
            <TenantProvider>
              <LanguageProvider initialLanguage={opts.language}>{children}</LanguageProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}
