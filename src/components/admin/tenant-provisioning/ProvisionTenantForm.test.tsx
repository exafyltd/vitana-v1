/**
 * VTID-05221 — step 1 form: client validation blocks the POST, the POST
 * carries exactly the ProvisionTenantSchema body, and nothing is sent on render.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => {
  class TenantProvisioningError extends Error {
    code: string;
    status: number;
    i18nKey: string;
    details?: unknown;
    // Same signature as the real class; the real i18nKey comes from errorI18nKey().
    constructor(code: string, status: number, details?: unknown) {
      super(code);
      this.code = code;
      this.status = status;
      this.i18nKey = `tenantProvisioning.errors.${code}`;
      this.details = details;
    }
  }
  return { provisionTenant: vi.fn(), patchTenantBrandPack: vi.fn(), TenantProvisioningError };
});
const toast = vi.hoisted(() => ({ notify: vi.fn(), notifyError: vi.fn() }));

vi.mock('@/lib/tenant-provisioning-api', () => ({
  provisionTenant: api.provisionTenant,
  patchTenantBrandPack: api.patchTenantBrandPack,
  TenantProvisioningError: api.TenantProvisioningError,
  TENANT_SLUG_REGEX: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
  JEV_MONTHLY_BUDGET_MAX_USD: 500,
}));
vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string) => k,
  notify: toast.notify,
  notifyError: toast.notifyError,
}));

import { ProvisionTenantForm } from './ProvisionTenantForm';

const NS = 'tenantProvisioning';
const fetchSpy = vi.fn();

function type(field: string, value: string) {
  fireEvent.change(screen.getByTestId(`provision-${field}`), { target: { value } });
}

function fillRequired() {
  type('slug', 'longevity-club');
  type('name', 'Longevity Club');
  type('adminEmail', 'owner@example.com');
  type('allMembersGroupName', 'Alle Mitglieder');
}

beforeEach(() => {
  api.provisionTenant.mockReset();
  toast.notify.mockReset();
  toast.notifyError.mockReset();
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProvisionTenantForm', () => {
  it('sends nothing on render', () => {
    render(<ProvisionTenantForm onProvisioned={vi.fn()} />);
    expect(api.provisionTenant).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ties every label to its input', () => {
    render(<ProvisionTenantForm onProvisioned={vi.fn()} />);
    expect(screen.getByLabelText(`${NS}.steps.provision.fields.slug.label`)).toBe(screen.getByTestId('provision-slug'));
    expect(screen.getByLabelText(`${NS}.steps.provision.fields.adminEmail.label`)).toBe(
      screen.getByTestId('provision-adminEmail'),
    );
  });

  it('blocks the submit while required fields are empty and marks them invalid', () => {
    render(<ProvisionTenantForm onProvisioned={vi.fn()} />);
    fireEvent.click(screen.getByTestId('provision-submit'));
    expect(api.provisionTenant).not.toHaveBeenCalled();
    const slug = screen.getByTestId('provision-slug');
    expect(slug).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByTestId('provision-error-slug');
    expect(error).toHaveTextContent(`${NS}.validation.required`);
    expect(slug.getAttribute('aria-describedby')).toContain(error.id);
    expect(slug).toHaveFocus();
    for (const f of ['name', 'adminEmail', 'allMembersGroupName']) {
      expect(screen.getByTestId(`provision-${f}`)).toHaveAttribute('aria-invalid', 'true');
    }
    expect(screen.getByTestId('provision-displayName')).not.toHaveAttribute('aria-invalid');
  });

  it.each([
    ['slug', 'admin', 'slugReserved'],
    ['slug', '1club', 'slugFormat'],
    ['adminEmail', 'not-an-email', 'email'],
    ['jevBudget', '501', 'budgetRange'],
    ['jevBudget', '-5', 'budgetRange'],
    ['currency', 'EURO', 'currency'],
  ])('blocks the submit when %s is %j', (field, value, key) => {
    render(<ProvisionTenantForm onProvisioned={vi.fn()} />);
    fillRequired();
    type(field, value);
    fireEvent.click(screen.getByTestId('provision-submit'));
    expect(api.provisionTenant).not.toHaveBeenCalled();
    expect(screen.getByTestId(`provision-error-${field}`)).toHaveTextContent(`${NS}.validation.${key}`);
  });

  it('posts exactly the required schema fields on submit', async () => {
    const tenant = { id: 't-1', slug: 'longevity-club' };
    api.provisionTenant.mockResolvedValue(tenant);
    const onProvisioned = vi.fn();
    render(<ProvisionTenantForm onProvisioned={onProvisioned} />);
    fillRequired();
    expect(api.provisionTenant).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('provision-submit'));
    await waitFor(() => expect(onProvisioned).toHaveBeenCalledWith(tenant));
    expect(api.provisionTenant).toHaveBeenCalledTimes(1);
    expect(api.provisionTenant).toHaveBeenCalledWith({
      slug: 'longevity-club',
      name: 'Longevity Club',
      admin_email: 'owner@example.com',
      all_members_group_name: 'Alle Mitglieder',
    });
    expect(toast.notify).toHaveBeenCalledWith(`${NS}.steps.provision.success`, undefined, { slug: 'longevity-club' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts the optional fields when set', async () => {
    api.provisionTenant.mockResolvedValue({ id: 't-1', slug: 'longevity-club' });
    const onProvisioned = vi.fn();
    render(<ProvisionTenantForm onProvisioned={onProvisioned} />);
    fillRequired();
    type('displayName', 'Longevity');
    type('defaultLocale', 'de');
    type('enabledLocales', 'de, en');
    type('timezone', 'Europe/Berlin');
    type('currency', 'eur');
    type('jevBudget', '500');
    fireEvent.click(screen.getByTestId('provision-submit'));
    await waitFor(() => expect(onProvisioned).toHaveBeenCalled());
    expect(api.provisionTenant).toHaveBeenCalledWith({
      slug: 'longevity-club',
      name: 'Longevity Club',
      admin_email: 'owner@example.com',
      all_members_group_name: 'Alle Mitglieder',
      display_name: 'Longevity',
      default_locale: 'de',
      enabled_locales: ['de', 'en'],
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      jev_monthly_budget_usd: 500,
    });
  });

  it('shows the server error key and stays on step 1', async () => {
    api.provisionTenant.mockRejectedValue(
      new api.TenantProvisioningError('NOT_EXAFY_ADMIN', 403),
    );
    const onProvisioned = vi.fn();
    render(<ProvisionTenantForm onProvisioned={onProvisioned} />);
    fillRequired();
    fireEvent.click(screen.getByTestId('provision-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${NS}.errors.NOT_EXAFY_ADMIN`);
    expect(toast.notifyError).toHaveBeenCalledWith(`${NS}.errors.NOT_EXAFY_ADMIN`);
    expect(onProvisioned).not.toHaveBeenCalled();
  });

  it('shows a taken slug at the slug field', async () => {
    api.provisionTenant.mockRejectedValue(new api.TenantProvisioningError('SLUG_TAKEN', 409));
    render(<ProvisionTenantForm onProvisioned={vi.fn()} />);
    fillRequired();
    fireEvent.click(screen.getByTestId('provision-submit'));
    const error = await screen.findByTestId('provision-error-slug');
    expect(error).toHaveTextContent(`${NS}.errors.SLUG_TAKEN`);
    expect(screen.getByTestId('provision-slug')).toHaveAttribute('aria-invalid', 'true');
  });

  it('falls back to a generic error for an unexpected failure', async () => {
    api.provisionTenant.mockRejectedValue(new Error('network'));
    render(<ProvisionTenantForm onProvisioned={vi.fn()} />);
    fillRequired();
    fireEvent.click(screen.getByTestId('provision-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${NS}.steps.provision.failed`);
  });
});
