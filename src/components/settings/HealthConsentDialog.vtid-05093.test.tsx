/**
 * VTID-05093 (Health Hub D10, WP2) — HealthConsentDialog against a mocked
 * gateway (routes/health-consent.ts, VTID-05092). Nothing here talks to a
 * real gateway or database.
 *
 *   - grant: versioned wording, explicit UNticked checkbox, Grant disabled
 *     until ticked, exact request body (text_version + displayed locale);
 *   - draft gate: unreleased wording is never shown and cannot be granted;
 *   - store_pending / load failure: nothing can be granted;
 *   - revoke: always offered for an active consent (also a legacy row while
 *     the store is pending), only after a confirmation;
 *   - every gateway error code → its own i18n toast;
 *   - RTL: no physical left/right classes in the new consent UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { adminFetch, notify, notifyError, lockState } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  notify: vi.fn(),
  notifyError: vi.fn(),
  lockState: { texts: {} as Record<string, unknown> },
}));

vi.mock('@/lib/admin-api', () => ({ adminFetch }));
vi.mock('@/i18n/health-consent-texts.lock.json', () => ({ default: lockState }));
vi.mock('@/lib/i18n-toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n-toast')>();
  return { ...actual, notify, notifyError };
});

import { HealthConsentDialog } from './HealthConsentDialog';
import { PartnerLabsConsentDialog } from './PartnerLabsConsentDialog';
import { ensureCatalog } from '@/i18n';
import { setI18nLocale, t } from '@/lib/i18n-toast';
import { HEALTH_CONSENT_CATEGORIES } from '@/lib/health-consent-wording';

const API = '/api/v1/health/consents';
const UI = 'screens.settings.healthConsentUi';

const CATEGORIES = HEALTH_CONSENT_CATEGORIES.map((key, i) => ({
  key,
  resource_type: 'x',
  scope: 'x',
  per_resource: key === 'wearables' || key === 'partner_results',
  current_text_version: 'v1',
  processing_active: false,
  sort: i,
}));

function state(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    store_pending: false,
    categories: CATEGORIES,
    consents: [],
    partners: [{ partner_key: 'labnord', display_name: 'Labor Nord', status: 'active' }],
    connectors: [{ id: 'fitbit', display_name: 'Fitbit' }],
    ...over,
  };
}

/** Release v1 of every category for the given locales (hash values are not checked at runtime). */
function release(locales: string[]) {
  lockState.texts = Object.fromEntries(
    HEALTH_CONSENT_CATEGORIES.map((c) => [c, { v1: { status: 'released', locales: Object.fromEntries(locales.map((l) => [l, 'sha'])) } }]),
  );
}
function draft() {
  lockState.texts = Object.fromEntries(HEALTH_CONSENT_CATEGORIES.map((c) => [c, { v1: { status: 'draft' } }]));
}

/**
 * The shipped v1 wording carries the [DRAFT] marker, which the resolver never
 * displays. For "released" scenarios the tests swap in neutral test wording in
 * the de/en catalogues (module state is per test file in Vitest, so it never
 * leaks into another file).
 */
async function withTestWording() {
  await ensureCatalog('en-US');
  const { catalogs } = await import('@/i18n');
  for (const tag of ['de-DE', 'en-US']) {
    const settings = ((catalogs[tag].screens as Record<string, unknown>).settings ?? {}) as Record<string, unknown>;
    const tree = settings.healthConsent as Record<string, Record<string, Record<string, string>>>;
    for (const c of HEALTH_CONSENT_CATEGORIES) {
      tree[c].v1 = { title: `Title ${c} ${tag} {name}`, body: `Body ${c} ${tag} {name}`, checkbox: `Checkbox ${c} ${tag}` };
    }
  }
}

function route(handlers: Record<string, (body?: unknown) => unknown>) {
  adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${path}`;
    const h = handlers[key];
    if (!h) throw new Error(`unexpected ${key}`);
    return h(init?.body ? JSON.parse(String(init.body)) : undefined);
  });
}

function renderDialog(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  return { qc, invalidate };
}

const grantButton = () => screen.getByRole('button', { name: t(`${UI}.grant`) });

beforeEach(async () => {
  adminFetch.mockReset();
  notify.mockReset();
  notifyError.mockReset();
  setI18nLocale('de-DE');
  draft();
  await withTestWording();
});

describe('HealthConsentDialog — grant (VTID-05093)', () => {
  it('shows the versioned wording with an unticked checkbox; Grant stays disabled until ticked', async () => {
    release(['de', 'en']);
    route({ [`GET ${API}`]: () => state() });
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="health_data_analytics" />);

    expect(await screen.findByText(/^Body health_data_analytics de-DE/)).toBeInTheDocument();
    expect(screen.getByText(/Title health_data_analytics de-DE/)).toBeInTheDocument();
    const box = screen.getByTestId('health-consent-checkbox');
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(grantButton()).toBeDisabled();
    expect(screen.getByText(t(`${UI}.versionLabel`, { version: 'v1' }))).toBeInTheDocument();

    fireEvent.click(box);
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(grantButton()).toBeEnabled();
    fireEvent.click(box);
    expect(grantButton()).toBeDisabled();
  });

  it('sends exactly { category, text_version, locale, granted_via } for a whole-category consent', async () => {
    release(['de', 'en']);
    const onChanged = vi.fn();
    const onOpenChange = vi.fn();
    const grant = vi.fn(() => ({ ok: true, changed: true, consent: { active: true } }));
    route({ [`GET ${API}`]: () => state(), [`POST ${API}/grant`]: grant });
    const { invalidate } = renderDialog(
      <HealthConsentDialog open onOpenChange={onOpenChange} category="health_data_analytics" onChanged={onChanged} />,
    );

    fireEvent.click(await screen.findByTestId('health-consent-checkbox'));
    fireEvent.click(grantButton());

    await waitFor(() => expect(notify).toHaveBeenCalledWith(`${UI}.grantedToast`));
    expect(grant).toHaveBeenCalledWith({
      category: 'health_data_analytics',
      text_version: 'v1',
      locale: 'de',
      granted_via: 'settings_privacy',
    });
    expect(adminFetch).toHaveBeenCalledWith(`${API}/grant`, expect.objectContaining({ method: 'POST' }));
    expect(onChanged).toHaveBeenCalledWith(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['health-consents'] });
  });

  it('a per-partner consent sends resource_id and the caller’s granted_via (PartnerLabsConsentDialog wrapper)', async () => {
    release(['de', 'en']);
    const grant = vi.fn(() => ({ ok: true, changed: true, consent: { active: true } }));
    route({ [`GET ${API}`]: () => state(), [`POST ${API}/grant`]: grant });
    renderDialog(<PartnerLabsConsentDialog open onOpenChange={vi.fn()} partnerKey="labnord" partnerName="Labor Nord" />);

    expect(await screen.findByText('Title partner_results de-DE Labor Nord')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('health-consent-checkbox'));
    fireEvent.click(grantButton());
    await waitFor(() => expect(grant).toHaveBeenCalled());
    expect(grant).toHaveBeenCalledWith({
      category: 'partner_results',
      resource_id: 'labnord',
      text_version: 'v1',
      locale: 'de',
      granted_via: 'settings_connected_apps',
    });
  });

  it('a locale without released wording shows the released EN text and sends locale "en"', async () => {
    release(['de', 'en']);
    setI18nLocale('fr-FR');
    const grant = vi.fn(() => ({ ok: true, changed: true, consent: { active: true } }));
    route({ [`GET ${API}`]: () => state(), [`POST ${API}/grant`]: grant });
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="community_insights" />);

    expect(await screen.findByText(/Body community_insights en-US/)).toBeInTheDocument();
    expect(screen.getByText(t(`${UI}.displayedInFallback`))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('health-consent-checkbox'));
    fireEvent.click(grantButton());
    await waitFor(() => expect(grant).toHaveBeenCalled());
    expect(grant).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en', text_version: 'v1' }));
  });

  it('sends the catalogue’s current_text_version, not a hard-coded one', async () => {
    release(['de', 'en']);
    lockState.texts.ai_health_analysis = { v2: { status: 'released', locales: { de: 'sha', en: 'sha' } } };
    const { catalogs } = await import('@/i18n');
    const tree = ((catalogs['de-DE'].screens as Record<string, unknown>).settings as Record<string, unknown>).healthConsent as Record<
      string,
      Record<string, unknown>
    >;
    tree.ai_health_analysis.v2 = { title: 'V2 title', body: 'V2 body', checkbox: 'V2 box' };
    const grant = vi.fn(() => ({ ok: true, changed: true, consent: { active: true } }));
    route({
      [`GET ${API}`]: () =>
        state({ categories: CATEGORIES.map((c) => (c.key === 'ai_health_analysis' ? { ...c, current_text_version: 'v2' } : c)) }),
      [`POST ${API}/grant`]: grant,
    });
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="ai_health_analysis" />);
    expect(await screen.findByText('V2 body')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('health-consent-checkbox'));
    fireEvent.click(grantButton());
    await waitFor(() => expect(grant).toHaveBeenCalled());
    expect(grant).toHaveBeenCalledWith(expect.objectContaining({ text_version: 'v2' }));
    delete tree.ai_health_analysis.v2;
  });
});

describe('HealthConsentDialog — nothing can be granted (VTID-05093)', () => {
  it('draft wording: the text is not shown, no checkbox, Grant disabled, "coming soon" note', async () => {
    draft();
    route({ [`GET ${API}`]: () => state() });
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="health_data_analytics" />);

    expect(await screen.findByText(t(`${UI}.draftPending`))).toBeInTheDocument();
    expect(screen.queryByTestId('health-consent-checkbox')).toBeNull();
    expect(screen.queryByText(/Body health_data_analytics/)).toBeNull();
    expect(grantButton()).toBeDisabled();
  });

  it('store_pending: explains the store is being set up, Grant disabled', async () => {
    release(['de', 'en']);
    route({ [`GET ${API}`]: () => state({ store_pending: true, categories: [] }) });
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="community_insights" />);

    expect(await screen.findByText(t(`${UI}.storePending`))).toBeInTheDocument();
    expect(screen.queryByTestId('health-consent-checkbox')).toBeNull();
    expect(grantButton()).toBeDisabled();
  });

  it('a failed load (500 CONSENTS_UNAVAILABLE): unavailable note, Grant disabled', async () => {
    release(['de', 'en']);
    adminFetch.mockRejectedValue(new Error('CONSENTS_UNAVAILABLE'));
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="community_insights" />);

    expect(await screen.findByText(t(`${UI}.unavailable`))).toBeInTheDocument();
    expect(grantButton()).toBeDisabled();
  });
});

describe('HealthConsentDialog — revoke (VTID-05093)', () => {
  const activeRow = {
    category: 'health_data_analytics',
    resource_id: 'health_data_analytics',
    active: true,
    granted_at: '2026-10-01T10:00:00.000Z',
    revoked_at: null,
    granted_via: 'settings_privacy',
    text_version: 'v1',
    shown_locale: 'de',
  };

  it('asks for confirmation before sending { category, locale }', async () => {
    const revoke = vi.fn(() => ({ ok: true, changed: true, consent: { active: false } }));
    const onChanged = vi.fn();
    route({ [`GET ${API}`]: () => state({ consents: [activeRow] }), [`POST ${API}/revoke`]: revoke });
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="health_data_analytics" onChanged={onChanged} />);

    fireEvent.click(await screen.findByRole('button', { name: t(`${UI}.revoke`) }));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.getByText(t(`${UI}.revokeConfirmBody`))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t(`${UI}.revokeConfirmAction`) }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(`${UI}.revokedToast`));
    expect(revoke).toHaveBeenCalledWith({ category: 'health_data_analytics', locale: 'de' });
    expect(onChanged).toHaveBeenCalledWith(false);
  });

  it('Cancel on the confirmation sends nothing', async () => {
    route({ [`GET ${API}`]: () => state({ consents: [activeRow] }) });
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="health_data_analytics" startWithRevoke />);

    expect(await screen.findByText(t(`${UI}.revokeConfirmBody`))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t(`${UI}.cancel`) }));
    expect(screen.getByText(t(`${UI}.activeBody`))).toBeInTheDocument();
    expect(adminFetch).toHaveBeenCalledTimes(1);
  });

  it('a legacy DoctorBox-style row stays revocable while the store is pending and the wording is a draft', async () => {
    draft();
    const revoke = vi.fn(() => ({ ok: true, changed: true, consent: { active: false } }));
    route({
      [`GET ${API}`]: () =>
        state({
          store_pending: true,
          categories: [],
          consents: [{ ...activeRow, category: 'partner_results', resource_id: 'labnord', text_version: null, shown_locale: null }],
        }),
      [`POST ${API}/revoke`]: revoke,
    });
    renderDialog(<PartnerLabsConsentDialog open onOpenChange={vi.fn()} partnerKey="labnord" partnerName="Labor Nord" />);

    fireEvent.click(await screen.findByRole('button', { name: t(`${UI}.revoke`) }));
    fireEvent.click(screen.getByRole('button', { name: t(`${UI}.revokeConfirmAction`) }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith({ category: 'partner_results', resource_id: 'labnord', locale: 'de' }));
  });
});

describe('HealthConsentDialog — gateway errors → i18n toasts (VTID-05093)', () => {
  const CODES: Record<string, string> = {
    INVALID_REQUEST: 'invalidRequest',
    UNKNOWN_CATEGORY: 'unknownCategory',
    UNKNOWN_RESOURCE: 'unknownResource',
    STALE_TEXT_VERSION: 'staleText',
    CONSENT_STORE_PENDING: 'storePending',
    DB_UNAVAILABLE: 'unavailable',
    CONSENT_WRITE_FAILED: 'writeFailed',
    UNAUTHENTICATED: 'signIn',
    'HTTP 502': 'generic',
  };

  for (const [code, key] of Object.entries(CODES)) {
    it(`grant failing with ${code} toasts ${key} and stays open`, async () => {
      release(['de', 'en']);
      const onOpenChange = vi.fn();
      route({
        [`GET ${API}`]: () => state(),
        [`POST ${API}/grant`]: () => {
          throw new Error(code);
        },
      });
      renderDialog(<HealthConsentDialog open onOpenChange={onOpenChange} category="community_insights" />);
      fireEvent.click(await screen.findByTestId('health-consent-checkbox'));
      fireEvent.click(grantButton());
      await waitFor(() => expect(notifyError).toHaveBeenCalledWith(`${UI}.errors.${key}`));
      expect(notify).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(t(`${UI}.errors.${key}`)).not.toMatch(/missing/);
    });
  }

  it('revoke failing with DB_UNAVAILABLE toasts unavailable', async () => {
    route({
      [`GET ${API}`]: () =>
        state({
          consents: [
            { category: 'community_insights', resource_id: 'community_insights', active: true, granted_at: null, revoked_at: null, granted_via: null, text_version: 'v1', shown_locale: 'de' },
          ],
        }),
      [`POST ${API}/revoke`]: () => {
        throw new Error('DB_UNAVAILABLE');
      },
    });
    renderDialog(<HealthConsentDialog open onOpenChange={vi.fn()} category="community_insights" startWithRevoke />);
    fireEvent.click(await screen.findByRole('button', { name: t(`${UI}.revokeConfirmAction`) }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(`${UI}.errors.unavailable`));
  });
});

describe('consent UI is RTL-safe (VTID-05093)', () => {
  const FILES = [
    'src/components/settings/HealthConsentDialog.tsx',
    'src/components/settings/HealthConsentSwitch.tsx',
    'src/components/settings/HealthConsentSourcesDialog.tsx',
    'src/components/settings/PartnerLabsConsentDialog.tsx',
    'src/components/patient/PartnerLinkRequestsCard.tsx',
  ];
  it.each(FILES)('%s uses no physical left/right classes', (file) => {
    const src = readFileSync(resolve(__dirname, '../../..', file), 'utf8');
    expect(src).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(src).not.toMatch(/\btext-(left|right)\b/);
    expect(src).not.toMatch(/\b(rounded|border)-(l|r)\b/);
  });
});
