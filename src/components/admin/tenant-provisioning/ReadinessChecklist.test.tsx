/**
 * VTID-05221: ReadinessChecklist renders GET /:id/readiness — loading, ready,
 * missing items, error — and only ever reads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => {
  class TenantProvisioningError extends Error {
    code: string;
    status: number;
    i18nKey: string;
    constructor(code: string, status: number, i18nKey: string) {
      super(code);
      this.code = code;
      this.status = status;
      this.i18nKey = i18nKey;
    }
  }
  return {
    TenantProvisioningError,
    getTenantReadiness: vi.fn(),
    uploadTenantAsset: vi.fn(),
  };
});

vi.mock('@/lib/tenant-provisioning-api', () => ({
  ASSET_KINDS: ['logo', 'favicon', 'og_image'],
  ALLOWED_ASSET_MIME: ['image/png', 'image/jpeg', 'image/webp'],
  TenantProvisioningError: api.TenantProvisioningError,
  getTenantReadiness: api.getTenantReadiness,
  uploadTenantAsset: api.uploadTenantAsset,
}));

vi.mock('@/lib/i18n-toast', () => ({
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}|${JSON.stringify(params)}` : key),
}));

import { ReadinessChecklist } from './ReadinessChecklist';

const NS = 'tenantProvisioning.readiness';

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function readiness(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    tenant_id: 't-1',
    slug: 'acme',
    ready: true,
    legacy: false,
    schema_missing: false,
    checks: [
      { key: 'slug_valid_not_reserved', ok: true, detail: 'ok' },
      { key: 'assets_present', ok: true, detail: 'ok' },
      { key: 'persona_facts.community_name', ok: true, detail: 'ok' },
      { key: 'open_signup', ok: true, detail: 'invite-only', informational: true },
    ],
    ...over,
  };
}

beforeEach(() => {
  api.getTenantReadiness.mockReset();
  api.uploadTenantAsset.mockReset();
});

describe('ReadinessChecklist', () => {
  it('shows a skeleton while loading and only reads', () => {
    api.getTenantReadiness.mockReturnValue(new Promise(() => {}));
    wrap(<ReadinessChecklist tenantId="t-1" />);
    expect(screen.getByTestId('readiness-loading')).toHaveAttribute('aria-busy', 'true');
    expect(api.getTenantReadiness).toHaveBeenCalledTimes(1);
    expect(api.getTenantReadiness).toHaveBeenCalledWith('t-1');
    expect(api.uploadTenantAsset).not.toHaveBeenCalled();
  });

  it('renders a ready tenant with every status as text', async () => {
    api.getTenantReadiness.mockResolvedValue(readiness());
    wrap(<ReadinessChecklist tenantId="t-1" />);
    const summary = await screen.findByTestId('readiness-summary');
    expect(summary).toHaveAttribute('data-ready', 'true');
    expect(summary).toHaveTextContent(`${NS}.ready`);
    const assets = screen.getByTestId('readiness-check-assets_present');
    expect(assets).toHaveAttribute('data-state', 'ok');
    expect(within(assets).getByText(`${NS}.status.ok`)).toBeInTheDocument();
    // the dotted server key maps to an underscore i18n key
    expect(screen.getByText(`${NS}.checks.persona_facts_community_name`)).toBeInTheDocument();
    const signup = screen.getByTestId('readiness-check-open_signup');
    expect(signup).toHaveAttribute('data-state', 'info');
    expect(within(signup).getByText(`${NS}.status.info`)).toBeInTheDocument();
  });

  it('marks missing items and counts what is done', async () => {
    api.getTenantReadiness.mockResolvedValue(
      readiness({
        ready: false,
        checks: [
          { key: 'slug_valid_not_reserved', ok: true, detail: 'ok' },
          { key: 'assets_present', ok: false, detail: 'missing: logo, favicon' },
          { key: 'brand_colors', ok: false, detail: 'brand.colors missing' },
          { key: 'something_new', ok: false, detail: 'x' },
          { key: 'open_signup', ok: true, detail: 'invite-only', informational: true },
        ],
      }),
    );
    wrap(<ReadinessChecklist tenantId="t-1" />);
    const summary = await screen.findByTestId('readiness-summary');
    expect(summary).toHaveAttribute('data-ready', 'false');
    expect(summary).toHaveTextContent(`${NS}.notReady|${JSON.stringify({ done: 1, total: 4 })}`);
    const assets = screen.getByTestId('readiness-check-assets_present');
    expect(assets).toHaveAttribute('data-state', 'missing');
    expect(within(assets).getByText(`${NS}.status.missing`)).toBeInTheDocument();
    expect(screen.getByText(`${NS}.checks.unknown|${JSON.stringify({ key: 'something_new' })}`)).toBeInTheDocument();
  });

  it('flags a schema-missing tenant', async () => {
    api.getTenantReadiness.mockResolvedValue(readiness({ ready: false, schema_missing: true, legacy: true }));
    wrap(<ReadinessChecklist tenantId="t-1" />);
    expect(await screen.findByText(`${NS}.schemaMissing`)).toBeInTheDocument();
  });

  it('shows the mapped error instead of an empty list', async () => {
    api.getTenantReadiness.mockRejectedValue(
      new api.TenantProvisioningError('FORBIDDEN', 403, 'tenantProvisioning.errors.forbidden'),
    );
    wrap(<ReadinessChecklist tenantId="t-1" />);
    const alert = await screen.findByTestId('readiness-error');
    expect(alert).toHaveTextContent('tenantProvisioning.errors.forbidden');
    expect(screen.queryByTestId('readiness-summary')).toBeNull();
  });

  it('falls back to a generic error for an unknown failure', async () => {
    api.getTenantReadiness.mockRejectedValue(new Error('network'));
    wrap(<ReadinessChecklist tenantId="t-1" />);
    expect(await screen.findByTestId('readiness-error')).toHaveTextContent(`${NS}.loadFailed`);
  });

  it('re-reads on the refresh button', async () => {
    api.getTenantReadiness.mockResolvedValue(readiness());
    wrap(<ReadinessChecklist tenantId="t-1" />);
    await screen.findByTestId('readiness-summary');
    fireEvent.click(screen.getByRole('button', { name: `${NS}.refresh` }));
    await waitFor(() => expect(api.getTenantReadiness).toHaveBeenCalledTimes(2));
    expect(api.uploadTenantAsset).not.toHaveBeenCalled();
  });
});
