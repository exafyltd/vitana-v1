/**
 * VTID-05175 (Health Hub Phase 0 / WP4 remainder, V1-D5R): account deletion
 * reaches the member's health residue (vendor links, webhook log, partner
 * inbox) through the gateway's POST /api/v1/internal/health-erasure/member-residue
 * (VTID-05174), before any table is erased.
 * Lives under src/ because supabase/functions/_shared has no Deno test harness
 * (same arrangement as erase-health-raw / erase-user-storage tests). Pure unit
 * tests: every fetch is a mock and the base URL is a placeholder host, never a
 * live service.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  eraseHealthResidue,
  healthResidueErased,
  vendorRevokeFailures,
  ERASE_HEALTH_RESIDUE_TIMEOUT_MS,
} from '../../supabase/functions/_shared/erase-health-residue';

const U = '00000000-0000-4000-8000-0000000005d5';
const BASE = 'http://gateway.test.invalid/api/v1';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function completeBody(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    vendor_revoke: [
      { connector_id: 'terra', status: 'ok' },
      { connector_id: 'oura', status: 'failed' },
    ],
    webhook_log: { deleted: 4, residual: 0 },
    partner_inbox: { deleted: 1, scrubbed: 2, residual: 0 },
    complete: true,
    ...over,
  };
}

function mockFetch(res: Response | Error) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    if (res instanceof Error) throw res;
    return res;
  });
}

async function run(res: Response | Error, opts: { token?: string | null } = {}) {
  const fetch = mockFetch(res);
  const token = opts.token === null ? undefined : (opts.token ?? 'svc-token');
  const result = await eraseHealthResidue(U, { fetch: fetch as unknown as typeof globalThis.fetch, baseUrl: BASE, token });
  return { result, fetch };
}

describe('VTID-05175 eraseHealthResidue', () => {
  it('calls member-residue for the member with the service credential, never the member JWT', async () => {
    const { fetch } = await run(jsonResponse(200, completeBody()));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/internal/health-erasure/member-residue`);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer svc-token');
    expect(JSON.parse(String(init?.body))).toEqual({ user_id: U });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(ERASE_HEALTH_RESIDUE_TIMEOUT_MS).toBe(30_000);
  });

  it('a trailing slash on the base URL does not double the path', async () => {
    const fetch = mockFetch(jsonResponse(200, completeBody()));
    await eraseHealthResidue(U, { fetch: fetch as unknown as typeof globalThis.fetch, baseUrl: `${BASE}/`, token: 't' });
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/internal/health-erasure/member-residue`);
  });

  it('erased: complete 200 with zero residuals lets the account go and reports the counts', async () => {
    const { result } = await run(jsonResponse(200, completeBody()));
    expect(healthResidueErased(result)).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.webhook_log).toEqual({ deleted: 4, residual: 0 });
    expect(result.partner_inbox).toEqual({ deleted: 1, scrubbed: 2, residual: 0 });
  });

  it('a failed vendor revoke is reported but never blocks', async () => {
    const { result } = await run(jsonResponse(200, completeBody()));
    expect(healthResidueErased(result)).toBe(true);
    expect(vendorRevokeFailures(result)).toBe(1);
    expect(result.vendor_revoke).toEqual([
      { connector_id: 'terra', status: 'ok' },
      { connector_id: 'oura', status: 'failed' },
    ]);
  });

  it.each([
    ['complete:false', jsonResponse(200, completeBody({ complete: false }))],
    ['complete missing', jsonResponse(200, completeBody({ complete: undefined }))],
    ['complete as a string', jsonResponse(200, completeBody({ complete: 'true' }))],
    ['webhook_log residual > 0', jsonResponse(200, completeBody({ webhook_log: { deleted: 1, residual: 2 } }))],
    ['partner_inbox residual > 0', jsonResponse(200, completeBody({ partner_inbox: { deleted: 0, scrubbed: 0, residual: 1 } }))],
    ['webhook_log residual missing', jsonResponse(200, completeBody({ webhook_log: { deleted: 1 } }))],
    ['partner_inbox missing', jsonResponse(200, completeBody({ partner_inbox: undefined }))],
    ['residual as a string', jsonResponse(200, completeBody({ webhook_log: { deleted: 0, residual: '0' } }))],
    ['negative residual', jsonResponse(200, completeBody({ partner_inbox: { deleted: 0, scrubbed: 0, residual: -1 } }))],
    ['404 (route not deployed)', jsonResponse(404, { error: 'NOT_FOUND' })],
    ['404 HTML page', new Response('<html>Not Found</html>', { status: 404, headers: { 'Content-Type': 'text/html' } })],
    ['409 STAGING_READ_ONLY', jsonResponse(409, { error: 'STAGING_READ_ONLY' })],
    ['401 (credential refused)', jsonResponse(401, { error: 'UNAUTHORIZED' })],
    ['500 from the gateway', jsonResponse(500, { error: 'INTERNAL' })],
    ['503 DB_UNAVAILABLE', jsonResponse(503, { error: 'DB_UNAVAILABLE' })],
    ['201 with a complete body (not 200)', jsonResponse(201, completeBody())],
    ['200 with a non-JSON body', new Response('ok', { status: 200 })],
    ['200 with a JSON null body', jsonResponse(200, null)],
  ])('not erased, account kept: %s', async (_name, res) => {
    const { result } = await run(res);
    expect(result.error).toBeTruthy();
    expect(healthResidueErased(result)).toBe(false);
  });

  it('a network error keeps the account', async () => {
    const { result } = await run(new Error('connection reset'));
    expect(result.error).toContain('connection reset');
    expect(healthResidueErased(result)).toBe(false);
  });

  it('a timeout keeps the account', async () => {
    const fetch = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation timed out.', 'TimeoutError')));
        }),
    );
    const result = await eraseHealthResidue(U, {
      fetch: fetch as unknown as typeof globalThis.fetch,
      baseUrl: BASE,
      token: 'svc-token',
      timeoutMs: 5,
    });
    expect(result.error).toContain('timed out');
    expect(healthResidueErased(result)).toBe(false);
  });

  it('a missing service token keeps the account and sends nothing', async () => {
    const { result, fetch } = await run(jsonResponse(200, completeBody()), { token: null });
    expect(fetch).not.toHaveBeenCalled();
    expect(healthResidueErased(result)).toBe(false);
  });

  it('the edge function erases the residue as Step 0b, before any table, and keeps the account unless erased', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('supabase/functions/request-account-deletion/index.ts', 'utf8');
    const call = src.indexOf('await eraseHealthResidue(userId)');
    const gate = src.indexOf('!healthResidueErased(healthResidue)');
    const step1 = src.indexOf('await deleteUserTableData(serviceClient, userId)');
    const erase = src.indexOf('rpc("erase_user_data"');
    const deleteUser = src.indexOf('auth.admin.deleteUser');
    expect(call).toBeGreaterThan(-1);
    expect(erase).toBeGreaterThan(-1);
    expect(call).toBeLessThan(step1);
    expect(call).toBeLessThan(erase);
    expect(gate).toBeGreaterThan(call);
    expect(gate).toBeLessThan(step1);
    expect(gate).toBeLessThan(deleteUser);
    const gateBlock = src.slice(gate, src.indexOf('vendorRevokeFailures(healthResidue)', gate));
    expect(gateBlock).toContain('status: "storage_incomplete"');
    expect(gateBlock).toContain('status: 500');
    expect(src).toMatch(/health_residue:\s*\{[^}]*vendor_revoke_failed[^}]*webhook_log_deleted[^}]*partner_inbox_deleted[^}]*partner_inbox_scrubbed/);
  });
});
