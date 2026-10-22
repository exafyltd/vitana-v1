/**
 * VTID-05221: AssetUpload — png/jpeg/webp only, nothing sent until the admin
 * presses the row's upload button.
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

import { AssetUpload } from './AssetUpload';

const NS = 'tenantProvisioning.steps.assets';

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function pick(kind: string, file: File) {
  const row = screen.getByTestId(`asset-row-${kind}`);
  const input = within(row).getByLabelText(`${NS}.kinds.${kind}.label`) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  return row;
}

beforeEach(() => {
  api.uploadTenantAsset.mockReset();
  api.getTenantReadiness.mockReset();
});

describe('AssetUpload', () => {
  it('renders one labelled row per asset kind and sends nothing on render', () => {
    wrap(<AssetUpload tenantId="t-1" onUploaded={vi.fn()} />);
    for (const kind of ['logo', 'favicon', 'og_image']) {
      const row = screen.getByTestId(`asset-row-${kind}`);
      const input = within(row).getByLabelText(`${NS}.kinds.${kind}.label`);
      expect(input).toHaveAttribute('type', 'file');
      expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');
      expect(within(row).getByRole('button', { name: `${NS}.upload` })).toBeDisabled();
    }
    expect(api.uploadTenantAsset).not.toHaveBeenCalled();
    expect(api.getTenantReadiness).not.toHaveBeenCalled();
  });

  it.each([
    ['image/gif', 'logo.gif'],
    ['image/svg+xml', 'logo.svg'],
    ['application/pdf', 'logo.pdf'],
  ])('refuses %s before anything is sent', (type, name) => {
    wrap(<AssetUpload tenantId="t-1" onUploaded={vi.fn()} />);
    const row = pick('logo', new File(['x'], name, { type }));
    expect(within(row).getByRole('alert')).toHaveTextContent(`${NS}.invalidType`);
    const button = within(row).getByRole('button', { name: `${NS}.upload` });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(api.uploadTenantAsset).not.toHaveBeenCalled();
  });

  it('uploads an allowed file only after the button press', async () => {
    api.uploadTenantAsset.mockResolvedValue({ ok: true, path: 'acme/favicon.png', mime_type: 'image/png', size_bytes: 1 });
    const onUploaded = vi.fn();
    wrap(<AssetUpload tenantId="t-1" onUploaded={onUploaded} />);
    const file = new File(['png'], 'favicon.png', { type: 'image/png' });
    const row = pick('favicon', file);
    expect(within(row).queryByRole('alert')).toBeNull();
    expect(api.uploadTenantAsset).not.toHaveBeenCalled();

    fireEvent.click(within(row).getByRole('button', { name: `${NS}.upload` }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(api.uploadTenantAsset).toHaveBeenCalledTimes(1);
    expect(api.uploadTenantAsset).toHaveBeenCalledWith('t-1', 'favicon', file);
    expect(within(row).getByText(`${NS}.uploaded`)).toBeInTheDocument();
  });

  it('shows the mapped server error and does not report success', async () => {
    api.uploadTenantAsset.mockRejectedValue(
      new api.TenantProvisioningError('UNSUPPORTED_TYPE', 415, 'tenantProvisioning.errors.unsupportedType'),
    );
    const onUploaded = vi.fn();
    wrap(<AssetUpload tenantId="t-1" onUploaded={onUploaded} />);
    const row = pick('og_image', new File(['jpg'], 'og.jpg', { type: 'image/jpeg' }));
    fireEvent.click(within(row).getByRole('button', { name: `${NS}.upload` }));
    expect(await within(row).findByRole('alert')).toHaveTextContent('tenantProvisioning.errors.unsupportedType');
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
