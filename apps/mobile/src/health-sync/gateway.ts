/**
 * VTID-05184 — the Health Sync gateway client (N5a, "Interfaces / Gateway").
 *
 * The base URL comes only from `requireUrl(config, 'gatewayUrl')`, which has
 * no default and refuses production and staging hosts — no N5 build can reach
 * production. Tests inject a mocked HttpPort; nothing here runs in CI against
 * a network.
 */
import { requireUrl, type AppConfig } from '../config/env';
import type { SourceKind } from './contract/v1/wire';
import type { Category } from './contract/v1/catalogue';
import type { AuthPort, HttpPort, HttpResponse } from './ports';

export const PATHS = {
  contract: '/api/v1/health/ingest/contract',
  ingest: '/api/v1/health/ingest',
  status: '/api/v1/health/ingest/status',
  sourceState: '/api/v1/health/ingest/source-state',
  consents: '/api/v1/health/consents',
  grant: '/api/v1/health/consents/grant',
  revoke: '/api/v1/health/consents/revoke',
} as const;

export const TIMEOUT_MS = 20_000;

export interface GatewayClient {
  get(path: string, query?: Record<string, string>): Promise<HttpResponse>;
  postJson(path: string, body: unknown): Promise<HttpResponse>;
  postBatch(body: string | Uint8Array, gzip: boolean): Promise<HttpResponse>;
}

export function createGatewayClient(config: AppConfig, http: HttpPort, auth: AuthPort): GatewayClient {
  const base = () => requireUrl(config, 'gatewayUrl').replace(/\/+$/, '');
  const headers = async (extra: Record<string, string> = {}) => {
    const token = await auth.getAccessToken();
    const h: Record<string, string> = { Accept: 'application/json', ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };
  return {
    async get(path, query) {
      const qs = query ? `?${Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}` : '';
      return http.request({ method: 'GET', url: `${base()}${path}${qs}`, headers: await headers(), timeoutMs: TIMEOUT_MS });
    },
    async postJson(path, body) {
      return http.request({ method: 'POST', url: `${base()}${path}`, headers: await headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(body), timeoutMs: TIMEOUT_MS });
    },
    async postBatch(body, gzip) {
      const extra: Record<string, string> = { 'Content-Type': 'application/json' };
      if (gzip) extra['Content-Encoding'] = 'gzip';
      return http.request({ method: 'POST', url: `${base()}${PATHS.ingest}`, headers: await headers(extra), body, timeoutMs: TIMEOUT_MS });
    },
  };
}

export interface ConsentCatalogueEntry {
  key: string;
  current_text_version: string;
  processing_active?: boolean;
}

export interface MemberConsent {
  category: string;
  resource_id: string;
  active: boolean;
}

export interface ConsentsView {
  categories: ConsentCatalogueEntry[];
  consents: MemberConsent[];
}

export function parseConsents(res: HttpResponse): ConsentsView | null {
  if ('error' in res || res.status !== 200) return null;
  const body = res.json as { ok?: boolean; categories?: unknown; consents?: unknown } | undefined;
  if (!body || body.ok !== true || !Array.isArray(body.categories) || !Array.isArray(body.consents)) return null;
  return { categories: body.categories as ConsentCatalogueEntry[], consents: body.consents as MemberConsent[] };
}

export function resourceFor(kind: SourceKind): 'apple_health' | 'health_connect' {
  return kind;
}

export function statusQuery(kind: SourceKind, installId: string): Record<string, string> {
  return { source_kind: kind, install_id: installId };
}

export type SourceStateBody = { source_kind: SourceKind; install_id: string; state: 'os_permission_revoked' | 'active'; permitted_categories: Category[] };
