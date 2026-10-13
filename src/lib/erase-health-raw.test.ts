/**
 * VTID-05160 (Health Hub Phase 1 A3): account deletion reaches the health
 * raw-batch bucket through the gateway's POST /api/v1/health/internal/erase-raw.
 * Lives under src/ because supabase/functions/_shared has no Deno test harness
 * (same arrangement as erase-user-storage.test.ts). Pure unit tests: every
 * fetch is a mock and the base URL is a placeholder host, never a live service.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  eraseHealthRaw,
  healthRawFullyErased,
  HEALTH_STORE_DISABLED,
} from '../../supabase/functions/_shared/erase-health-raw';

const U = '00000000-0000-4000-8000-0000000000a3';
const BASE = 'http://gateway.test.invalid/api/v1';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
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
  const result = await eraseHealthRaw(U, { fetch: fetch as unknown as typeof globalThis.fetch, baseUrl: BASE, token });
  return { result, fetch };
}

describe('VTID-05160 eraseHealthRaw', () => {
  it('calls erase-raw for the member with the service credential, never the member JWT', async () => {
    const { fetch } = await run(jsonResponse(200, { deleted: 3, residual: 0 }));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/health/internal/erase-raw`);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer svc-token');
    expect(JSON.parse(String(init?.body))).toEqual({ user_id: U });
  });

  it('erased: residual 0 lets the account go', async () => {
    const { result } = await run(jsonResponse(200, { ok: true, deleted: 3, residual: 0 }));
    expect(result).toEqual({ deleted: 3, residual: 0, disabled: false });
    expect(healthRawFullyErased(result)).toBe(true);
  });

  it('404 HEALTH_STORE_DISABLED counts as erased (store never enabled, nothing stored)', async () => {
    const { result } = await run(jsonResponse(404, { error: HEALTH_STORE_DISABLED }));
    expect(result).toEqual({ deleted: 0, residual: 0, disabled: true });
    expect(healthRawFullyErased(result)).toBe(true);
  });

  it('residual > 0 keeps the account', async () => {
    const { result } = await run(jsonResponse(200, { deleted: 5, residual: 2 }));
    expect(result.residual).toBe(2);
    expect(healthRawFullyErased(result)).toBe(false);
  });

  it.each([
    ['500 from the gateway', jsonResponse(500, { error: 'STORE_UNAVAILABLE' })],
    ['403 (credential refused)', jsonResponse(403, { error: 'FORBIDDEN' })],
    ['404 without the disabled code (route not deployed)', jsonResponse(404, { error: 'NOT_FOUND' })],
    ['404 HTML page', new Response('<html>Not Found</html>', { status: 404, headers: { 'Content-Type': 'text/html' } })],
    ['200 without a residual count', jsonResponse(200, { deleted: 1 })],
    ['200 with a negative residual', jsonResponse(200, { deleted: 0, residual: -1 })],
    ['200 with a non-JSON body', new Response('ok', { status: 200 })],
  ])('error keeps the account: %s', async (_name, res) => {
    const { result } = await run(res);
    expect(result.error).toBeTruthy();
    expect(healthRawFullyErased(result)).toBe(false);
  });

  it('a network error keeps the account', async () => {
    const { result } = await run(new Error('connection reset'));
    expect(result.error).toContain('connection reset');
    expect(healthRawFullyErased(result)).toBe(false);
  });

  it('a missing service token keeps the account and sends nothing', async () => {
    const { result, fetch } = await run(jsonResponse(200, { deleted: 0, residual: 0 }), { token: null });
    expect(fetch).not.toHaveBeenCalled();
    expect(healthRawFullyErased(result)).toBe(false);
  });

  it('the edge function erases raw batches after erase_user_data and keeps the account unless erased', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('supabase/functions/request-account-deletion/index.ts', 'utf8');
    const erase = src.indexOf('rpc("erase_user_data"');
    const call = src.indexOf('await eraseHealthRaw(userId)');
    const gate = src.indexOf('!healthRawFullyErased(healthRaw)');
    const deleteUser = src.indexOf('auth.admin.deleteUser');
    expect(erase).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(erase);
    expect(gate).toBeGreaterThan(call);
    expect(gate).toBeLessThan(deleteUser);
    const gateBlock = src.slice(gate, src.indexOf('}', src.indexOf('return new Response', gate)));
    expect(gateBlock).toContain('status: "storage_incomplete"');
  });
});
