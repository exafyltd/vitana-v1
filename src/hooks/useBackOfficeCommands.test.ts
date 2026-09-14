/**
 * VTID-03849 — BackOffice Read-tier data hooks.
 *
 * Pins: the idempotency key shape the gateway accepts and its per-minute
 * bucketing, the error → i18n-key mapping, and that `useErpRead` posts one
 * typed Read command and hands back `receipt.result` (or a typed error).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-jwt' } } })) } },
}));
vi.mock('@/hooks/useTenant', () => ({ useTenant: () => ({ activeTenantId: 'tenant-1' }) }));

import {
  BackOfficeCommandError,
  READ_KEY_BUCKET_MS,
  commandAsOf,
  commandResult,
  errorKeyFor,
  errorKeyOf,
  hasAnyCapability,
  payloadHash,
  readIdempotencyKey,
  shortId,
  useErpRead,
  type BackOfficeCommand,
} from '@/hooks/useBackOfficeCommands';

const GATEWAY_KEY_RE = /^[A-Za-z0-9_.:-]{8,128}$/; // services/gateway/src/routes/backoffice-commands.ts CommandBody

describe('readIdempotencyKey', () => {
  it('matches the gateway regex for every wave-1 Read type', () => {
    for (const type of ['erp.health.read', 'erp.health.read.check_installation', 'audit.erp_log.read', 'settings.company.list', 'settings.company.get', 'accounting.period.list']) {
      expect(readIdempotencyKey(type, { limit: 50 })).toMatch(GATEWAY_KEY_RE);
    }
  });
  it('is stable inside a minute bucket and changes across buckets', () => {
    const t0 = 1_800_000_000_000;
    expect(readIdempotencyKey('settings.company.list', { limit: 50 }, t0)).toBe(readIdempotencyKey('settings.company.list', { limit: 50 }, t0 + READ_KEY_BUCKET_MS - 1));
    expect(readIdempotencyKey('settings.company.list', { limit: 50 }, t0)).not.toBe(readIdempotencyKey('settings.company.list', { limit: 50 }, t0 + READ_KEY_BUCKET_MS));
  });
  it('never collides across types or payloads', () => {
    const t0 = 1_800_000_000_000;
    expect(readIdempotencyKey('settings.company.list', {}, t0)).not.toBe(readIdempotencyKey('settings.company.get', {}, t0));
    expect(readIdempotencyKey('audit.erp_log.read', { limit: 100 }, t0)).not.toBe(readIdempotencyKey('audit.erp_log.read', { limit: 50 }, t0));
  });
  it('hashes payloads independent of key order', () => {
    expect(payloadHash({ a: 1, b: 'x' })).toBe(payloadHash({ b: 'x', a: 1 }));
  });
});

describe('error mapping', () => {
  it('maps gateway outcomes to the screens.backoffice.errors.* keys', () => {
    expect(errorKeyFor(503, { ok: false, error: 'bridge_not_configured' })).toBe('bridgeUnavailable');
    expect(errorKeyFor(403, { ok: false, error: 'FORBIDDEN' })).toBe('noCapability');
    expect(errorKeyFor(200, { ok: false, command: { reason: 'missing_capability' } as BackOfficeCommand })).toBe('noCapability');
    expect(errorKeyFor(502, { ok: false, command: { reason: 'erp_action_failed' } as BackOfficeCommand })).toBe('erpFailed');
    expect(errorKeyFor(401, null)).toBe('unauthorized');
    expect(errorKeyFor(400, { ok: false, error: 'NO_TENANT_CONTEXT' })).toBe('noTenant');
    expect(errorKeyFor(500, { ok: false, error: 'INTERNAL_ERROR' })).toBe('generic');
  });
  it('maps adminFetch-style thrown errors too', () => {
    expect(errorKeyOf(new Error('FORBIDDEN'))).toBe('noCapability');
    expect(errorKeyOf(new Error('NO_AUTH_TOKEN'))).toBe('unauthorized');
    expect(errorKeyOf(new Error('HTTP 503'))).toBe('bridgeUnavailable');
    expect(errorKeyOf(new BackOfficeCommandError(502, null, 'erpFailed'))).toBe('erpFailed');
    expect(errorKeyOf('boom')).toBe('generic');
  });
});

describe('helpers', () => {
  const cmd = { receipt: { result: { companies: [] } }, executed_at: '2026-09-13T10:00:00Z', created_at: '2026-09-13T09:59:00Z' } as unknown as BackOfficeCommand;
  it('commandResult reads receipt.result and commandAsOf prefers executed_at', () => {
    expect(commandResult(cmd)).toEqual({ companies: [] });
    expect(commandResult({ receipt: null } as BackOfficeCommand)).toBeNull();
    expect(commandAsOf(cmd)).toBe('2026-09-13T10:00:00Z');
    expect(commandAsOf(null)).toBeNull();
  });
  it('hasAnyCapability is any-of and false on unknown', () => {
    expect(hasAnyCapability(['audit.view'], ['erp.admin', 'audit.view'])).toBe(true);
    expect(hasAnyCapability(['crm.view'], ['erp.admin', 'audit.view'])).toBe(false);
    expect(hasAnyCapability(null, ['erp.admin'])).toBe(false);
  });
  it('shortId truncates and dashes null', () => {
    expect(shortId('f1de441f-7cdb-4842-9ce3-8830294b71e5')).toBe('f1de441f');
    expect(shortId(null)).toBe('—');
  });
});

describe('useErpRead', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  function wrapper() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
  }

  it('posts one Read command with channel web, confirm false, and returns receipt.result', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ ok: true, command: { command_id: 'c1', type: 'settings.company.list', tier: 'read', status: 'executed', receipt: { status: 'executed', result: { companies: [{ id: 'x' }] } }, created_at: '2026-09-13T10:00:00Z', executed_at: '2026-09-13T10:00:01Z' } }),
    });
    const { result } = renderHook(() => useErpRead<{ companies: unknown[] }>('settings.company.list', { limit: 50 }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.result.companies).toHaveLength(1);
    expect(result.current.data?.command.command_id).toBe('c1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/backoffice\/commands$/);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-jwt');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ type: 'settings.company.list', payload: { limit: 50 }, channel: 'web', confirm: false });
    expect(body.idempotency_key).toMatch(GATEWAY_KEY_RE);
  });

  it('surfaces a rejected command as a typed error, not as data', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 403,
      json: async () => ({ ok: false, command: { command_id: 'c2', status: 'rejected', reason: 'missing_capability', receipt: null }, required_capability: 'audit.view' }),
    });
    const { result } = renderHook(() => useErpRead('audit.erp_log.read'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BackOfficeCommandError);
    expect(result.current.error?.key).toBe('noCapability');
  });

  it('does not call the gateway while disabled', async () => {
    const { result } = renderHook(() => useErpRead('erp.health.read', {}, { enabled: false }), { wrapper: wrapper() });
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
