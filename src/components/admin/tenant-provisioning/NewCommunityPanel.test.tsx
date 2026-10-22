/**
 * VTID-05221: NewCommunityPanel — three explicit steps, and no write request
 * on render (only the readiness GET may run on its own, and only at step 3).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

vi.mock('./ProvisionTenantForm', () => ({
  ProvisionTenantForm: ({ onProvisioned }: { onProvisioned: (tenant: { id: string; slug: string }) => void }) => (
    <button type="button" data-testid="stub-provision" onClick={() => onProvisioned({ id: 't-1', slug: 'acme' })} />
  ),
}));

vi.mock('./BrandPackForm', () => ({
  BrandPackForm: ({ tenantId, onSaved }: { tenantId: string; onSaved: () => void }) => (
    <button type="button" data-testid="stub-brand" data-tenant={tenantId} onClick={onSaved} />
  ),
}));

import { NewCommunityPanel } from './NewCommunityPanel';

const fetchSpy = vi.fn();

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NewCommunityPanel />
    </QueryClientProvider>,
  );
}

function readiness() {
  return {
    ok: true,
    tenant_id: 't-1',
    slug: 'acme',
    ready: false,
    legacy: false,
    schema_missing: false,
    checks: [{ key: 'assets_present', ok: false, detail: 'missing: logo, favicon' }],
  };
}

beforeEach(() => {
  api.getTenantReadiness.mockReset();
  api.uploadTenantAsset.mockReset();
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NewCommunityPanel', () => {
  it('starts at step 1 and sends no request on render', () => {
    renderPanel();
    const panel = screen.getByTestId('new-community-panel');
    expect(panel).toBeInTheDocument();
    expect(screen.getByTestId('stub-provision')).toBeInTheDocument();
    const current = screen.getByTestId('new-community-steps').querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent('tenantProvisioning.panel.steps.1');
    expect(api.getTenantReadiness).not.toHaveBeenCalled();
    expect(api.uploadTenantAsset).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('walks step 1 → 2 → 3 and only reads readiness on its own', async () => {
    api.getTenantReadiness.mockResolvedValue(readiness());
    renderPanel();

    fireEvent.click(screen.getByTestId('stub-provision'));
    expect(screen.getByTestId('stub-brand')).toHaveAttribute('data-tenant', 't-1');
    expect(screen.getByTestId('new-community-tenant')).toHaveTextContent('acme');
    expect(screen.getByTestId('new-community-steps').querySelector('[aria-current="step"]')).toHaveTextContent(
      'tenantProvisioning.panel.steps.2',
    );
    expect(api.getTenantReadiness).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('stub-brand'));
    expect(screen.getByTestId('asset-upload')).toBeInTheDocument();
    expect(screen.getByTestId('readiness-checklist')).toBeInTheDocument();
    await screen.findByTestId('readiness-summary');
    expect(api.getTenantReadiness).toHaveBeenCalledWith('t-1');
    expect(api.getTenantReadiness).toHaveBeenCalledTimes(1);
    expect(api.uploadTenantAsset).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('re-reads readiness after an upload', async () => {
    api.getTenantReadiness.mockResolvedValue(readiness());
    api.uploadTenantAsset.mockResolvedValue({ ok: true, path: 'acme/logo.png', mime_type: 'image/png', size_bytes: 1 });
    renderPanel();
    fireEvent.click(screen.getByTestId('stub-provision'));
    fireEvent.click(screen.getByTestId('stub-brand'));
    await screen.findByTestId('readiness-summary');

    const input = screen.getByLabelText('tenantProvisioning.steps.assets.kinds.logo.label');
    fireEvent.change(input, { target: { files: [new File(['png'], 'logo.png', { type: 'image/png' })] } });
    const row = screen.getByTestId('asset-row-logo');
    fireEvent.click(row.querySelector('button')!);
    await waitFor(() => expect(api.uploadTenantAsset).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(api.getTenantReadiness).toHaveBeenCalledTimes(2));
  });
});
