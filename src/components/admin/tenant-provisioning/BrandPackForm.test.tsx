/**
 * VTID-05221 — step 2 form: open sign-up starts off, only fields the admin
 * set are sent, persona facts are optional, override_reason appears only when
 * the server asks for it, and nothing is sent on render.
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

import { BrandPackForm } from './BrandPackForm';

const NS = 'tenantProvisioning';
const fetchSpy = vi.fn();

function type(field: string, value: string) {
  fireEvent.change(screen.getByTestId(`brand-pack-${field}`), { target: { value } });
}
const submit = () => fireEvent.click(screen.getByTestId('brand-pack-submit'));

// jsdom has no ResizeObserver; the Radix Switch measures its thumb with one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  api.patchTenantBrandPack.mockReset();
  toast.notify.mockReset();
  toast.notifyError.mockReset();
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BrandPackForm', () => {
  it('sends nothing on render and starts with open sign-up off', () => {
    render(<BrandPackForm tenantId="t-1" onSaved={vi.fn()} />);
    expect(api.patchTenantBrandPack).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    const signup = screen.getByTestId('brand-pack-openSignup');
    expect(signup).toHaveAttribute('role', 'switch');
    expect(signup).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText(`${NS}.steps.brandPack.fields.openSignup.label`)).toBe(signup);
  });

  it('does not repeat the step-1 fields', () => {
    render(<BrandPackForm tenantId="t-1" onSaved={vi.fn()} />);
    for (const f of ['displayName', 'defaultLocale', 'enabledLocales', 'timezone', 'currency']) {
      expect(screen.queryByTestId(`brand-pack-${f}`)).toBeNull();
    }
  });

  it('blocks an empty save', () => {
    render(<BrandPackForm tenantId="t-1" onSaved={vi.fn()} />);
    submit();
    expect(api.patchTenantBrandPack).not.toHaveBeenCalled();
    expect(screen.getByTestId('brand-pack-form-error')).toHaveTextContent(`${NS}.validation.nothingToUpdate`);
  });

  it('blocks an invalid hex colour and marks the field', () => {
    render(<BrandPackForm tenantId="t-1" onSaved={vi.fn()} />);
    type('colorAccent', '#12345');
    type('colorBg', '#ffffff');
    type('colorFg', '#000000');
    submit();
    expect(api.patchTenantBrandPack).not.toHaveBeenCalled();
    const accent = screen.getByTestId('brand-pack-colorAccent');
    expect(accent).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByTestId('brand-pack-error-colorAccent');
    expect(error).toHaveTextContent(`${NS}.validation.hexColor`);
    expect(accent.getAttribute('aria-describedby')).toContain(error.id);
    expect(accent).toHaveFocus();
  });

  it('blocks an invalid support email', () => {
    render(<BrandPackForm tenantId="t-1" onSaved={vi.fn()} />);
    type('supportEmail', 'support@');
    submit();
    expect(api.patchTenantBrandPack).not.toHaveBeenCalled();
    expect(screen.getByTestId('brand-pack-error-supportEmail')).toHaveTextContent(`${NS}.validation.email`);
  });

  it('patches only the fields the admin set', async () => {
    api.patchTenantBrandPack.mockResolvedValue({});
    const onSaved = vi.fn();
    render(<BrandPackForm tenantId="t-1" onSaved={onSaved} />);
    type('colorAccent', '#112233');
    type('colorBg', '#FFFFFF');
    type('colorFg', '#000000');
    type('legalEntityLine', 'Longevity Club GmbH, Berlin');
    type('senderEmail', 'hello@example.com');
    fireEvent.change(screen.getByTestId('brand-pack-landingCta'), { target: { value: 'waitlist' } });
    expect(api.patchTenantBrandPack).not.toHaveBeenCalled();
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.patchTenantBrandPack).toHaveBeenCalledTimes(1);
    expect(api.patchTenantBrandPack).toHaveBeenCalledWith('t-1', {
      brand: { colors: { accent: '#112233', bg: '#FFFFFF', fg: '#000000' } },
      legal_entity_line: 'Longevity Club GmbH, Berlin',
      sender_email: 'hello@example.com',
      landing: { cta: 'waitlist' },
    });
    expect(toast.notify).toHaveBeenCalledWith(`${NS}.steps.brandPack.success`);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends open sign-up once the admin switches it on', async () => {
    api.patchTenantBrandPack.mockResolvedValue({});
    const onSaved = vi.fn();
    render(<BrandPackForm tenantId="t-1" onSaved={onSaved} />);
    fireEvent.click(screen.getByTestId('brand-pack-openSignup'));
    expect(screen.getByTestId('brand-pack-openSignup')).toHaveAttribute('aria-checked', 'true');
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.patchTenantBrandPack).toHaveBeenCalledWith('t-1', { open_signup: true });
  });

  it('keeps persona facts collapsed until opened and sends them as facts', async () => {
    api.patchTenantBrandPack.mockResolvedValue({});
    const onSaved = vi.fn();
    render(<BrandPackForm tenantId="t-1" onSaved={onSaved} />);
    expect(screen.queryByTestId('brand-pack-communityName')).toBeNull();
    const toggle = screen.getByTestId('brand-pack-persona-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    type('communityName', 'Longevity Club');
    type('communityPronunciation', 'LON-jev-i-tee club');
    type('anchorName', 'Dana');
    type('anchorRole', 'Gründerin');
    type('storyFacts', 'Founded in 2020\n\n  Started in Berlin  ');
    type('tone', 'warm\ncalm');
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.patchTenantBrandPack).toHaveBeenCalledWith('t-1', {
      persona_facts: {
        community_name: 'Longevity Club',
        community_pronunciation: 'LON-jev-i-tee club',
        anchor_person: { name: 'Dana', role: 'Gründerin' },
        story_facts: ['Founded in 2020', 'Started in Berlin'],
        tone: ['warm', 'calm'],
      },
    });
  });

  it('opens persona facts to show an invalid entry', () => {
    render(<BrandPackForm tenantId="t-1" onSaved={vi.fn()} />);
    fireEvent.click(screen.getByTestId('brand-pack-persona-toggle'));
    type('anchorRole', 'Gründerin');
    fireEvent.click(screen.getByTestId('brand-pack-persona-toggle'));
    expect(screen.queryByTestId('brand-pack-anchorName')).toBeNull();
    submit();
    expect(api.patchTenantBrandPack).not.toHaveBeenCalled();
    expect(screen.getByTestId('brand-pack-error-anchorName')).toHaveTextContent(`${NS}.validation.anchorNameRequired`);
  });

  it('asks for an override reason only after the server says the tenant is not ready', async () => {
    api.patchTenantBrandPack.mockRejectedValueOnce(
      new api.TenantProvisioningError('TENANT_NOT_READY', 409),
    );
    const onSaved = vi.fn();
    render(<BrandPackForm tenantId="t-1" onSaved={onSaved} />);
    expect(screen.queryByTestId('brand-pack-overrideReason')).toBeNull();
    fireEvent.click(screen.getByTestId('brand-pack-openSignup'));
    submit();
    await screen.findByTestId('brand-pack-overrideReason');
    expect(screen.getByTestId('brand-pack-server-error')).toHaveTextContent(`${NS}.errors.TENANT_NOT_READY`);
    expect(toast.notifyError).toHaveBeenCalledWith(`${NS}.errors.TENANT_NOT_READY`);
    expect(api.patchTenantBrandPack).toHaveBeenNthCalledWith(1, 't-1', { open_signup: true });
    expect(onSaved).not.toHaveBeenCalled();

    // A reason is required now; too short is blocked.
    submit();
    expect(api.patchTenantBrandPack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('brand-pack-error-overrideReason')).toHaveTextContent(
      `${NS}.validation.overrideReasonLength`,
    );

    api.patchTenantBrandPack.mockResolvedValueOnce({});
    type('overrideReason', 'Launch event with the owner today');
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.patchTenantBrandPack).toHaveBeenNthCalledWith(2, 't-1', {
      open_signup: true,
      override_reason: 'Launch event with the owner today',
    });
  });

  it('shows the server error key for other failures without an override field', async () => {
    api.patchTenantBrandPack.mockRejectedValue(new api.TenantProvisioningError('FORBIDDEN', 403));
    render(<BrandPackForm tenantId="t-1" onSaved={vi.fn()} />);
    type('senderName', 'Longevity Club');
    submit();
    expect(await screen.findByTestId('brand-pack-server-error')).toHaveTextContent(`${NS}.errors.FORBIDDEN`);
    expect(screen.queryByTestId('brand-pack-overrideReason')).toBeNull();
  });
});
