/**
 * VTID-05166 (Health Hub Phase 1 / C3) — the Health Sync consents in
 * Settings › Privacy › "Manage connected sources", against a mocked gateway
 * (routes/health-consent.ts, VTID-05092 + VTID-05164). Nothing here talks to a
 * real gateway or database.
 *
 *   - dark until the gateway's catalogue carries the keys (C1 not live → no rows);
 *   - with the keys: one row per `sync_*` category × phone store and one
 *     `self_logged_health` row, labelled from the catalogue copy, all off;
 *   - the draft wording is never grantable (draft gate, VTID-05093);
 *   - a consent granted in the native app is always withdrawable here, with the
 *     exact revoke body (resource_id for `sync_*`, none for `self_logged_health`);
 *   - RTL: no physical left/right classes in the sources dialog.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

import { HealthConsentSourcesDialog } from './HealthConsentSourcesDialog';
import { setI18nLocale, t } from '@/lib/i18n-toast';
import { HEALTH_CONSENT_CATEGORIES, HEALTH_SYNC_CONSENT_KEYS, PHONE_HEALTH_STORES } from '@/lib/health-consent-wording';

const API = '/api/v1/health/consents';
const UI = 'screens.settings.healthConsentUi';
const D10_WP1_KEYS = ['wearables', 'partner_results', 'ai_health_analysis', 'health_data_analytics', 'community_insights'];

const catalogue = (keys: readonly string[]) =>
  keys.map((key, i) => ({
    key,
    resource_type: 'x',
    scope: 'x',
    per_resource: key === 'wearables' || key === 'partner_results' || key.startsWith('sync_'),
    current_text_version: 'v1',
    processing_active: key.startsWith('sync_') || key === 'self_logged_health',
    sort: i,
  }));

function state(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    store_pending: false,
    categories: catalogue(HEALTH_CONSENT_CATEGORIES),
    consents: [],
    partners: [{ partner_key: 'labnord', display_name: 'Labor Nord', status: 'active' }],
    connectors: [{ id: 'fitbit', display_name: 'Fitbit' }],
    ...over,
  };
}

const activeRow = (category: string, resource_id: string) => ({
  category,
  resource_id,
  active: true,
  granted_at: '2026-10-13T10:00:00.000Z',
  revoked_at: null,
  granted_via: 'native_health_sync',
  text_version: 'v1',
  shown_locale: 'de',
});

function route(handlers: Record<string, (body?: unknown) => unknown>) {
  adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${path}`;
    const h = handlers[key];
    if (!h) throw new Error(`unexpected ${key}`);
    return h(init?.body ? JSON.parse(String(init.body)) : undefined);
  });
}

function renderSources() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <HealthConsentSourcesDialog open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

const labels = (section: HTMLElement) =>
  within(section)
    .getAllByTestId('health-consent-source')
    .map((li) => li.querySelector('p')?.textContent);

beforeEach(() => {
  adminFetch.mockReset();
  notify.mockReset();
  notifyError.mockReset();
  setI18nLocale('de-DE');
  // The shipped state: every version is a draft until counsel's wording is released.
  lockState.texts = Object.fromEntries(HEALTH_CONSENT_CATEGORIES.map((c) => [c, { v1: { status: 'draft' } }]));
});

describe('Manage connected sources — Health Sync consents (VTID-05166)', () => {
  it('stays dark while the gateway catalogue has no Health Sync keys (VTID-05164 not live)', async () => {
    route({ [`GET ${API}`]: () => state({ categories: catalogue(D10_WP1_KEYS) }) });
    renderSources();
    const dialog = await screen.findByTestId('health-consent-sources-dialog');
    await within(dialog).findByTestId('health-consent-sources-wearables');
    expect(within(dialog).queryByTestId('health-consent-sources-health_sync')).toBeNull();
    expect(within(dialog).queryByTestId('health-consent-sources-self_logged_health')).toBeNull();
  });

  it('lists every sync category per phone store and the self-logged consent, all off and not grantable while the wording is a draft', async () => {
    route({ [`GET ${API}`]: () => state() });
    renderSources();
    const dialog = await screen.findByTestId('health-consent-sources-dialog');

    const sync = await within(dialog).findByTestId('health-consent-sources-health_sync');
    expect(within(sync).getByText(t(`${UI}.healthSyncHeading`))).toBeInTheDocument();
    const expected = HEALTH_SYNC_CONSENT_KEYS.flatMap((key) =>
      PHONE_HEALTH_STORES.map((store) => t(`${UI}.categories.${key}`, { name: t(`${UI}.phoneStores.${store}`) })),
    );
    expect(labels(sync)).toEqual(expected);
    expect(labels(sync)).toContain('Schlafdaten aus Apple Health');
    expect(labels(sync)).toContain('Körperdaten aus Health Connect');

    const self = within(dialog).getByTestId('health-consent-sources-self_logged_health');
    expect(within(self).getByText(t(`${UI}.selfLoggedHeading`))).toBeInTheDocument();
    expect(labels(self)).toEqual([t(`${UI}.categories.self_logged_health`)]);

    for (const li of [...within(sync).getAllByTestId('health-consent-source'), ...within(self).getAllByTestId('health-consent-source')]) {
      expect(within(li).getByText(t(`${UI}.statusNotGranted`))).toBeInTheDocument();
      expect(within(li).getByRole('button', { name: t(`${UI}.allow`) })).toBeDisabled();
    }
    expect(within(dialog).getByTestId('health-consent-sources-note')).toHaveTextContent(t(`${UI}.draftPending`));
    // Read-only: only the GET.
    expect(adminFetch.mock.calls.every(([, init]) => !init || !init.method || init.method === 'GET')).toBe(true);
  });

  it('a sync consent granted in the app is withdrawable on the web, with its resource_id', async () => {
    const revoke = vi.fn(() => ({ ok: true, changed: true, consent: { active: false } }));
    route({ [`GET ${API}`]: () => state({ consents: [activeRow('sync_sleep', 'apple_health')] }), [`POST ${API}/revoke`]: revoke });
    renderSources();
    const sync = await screen.findByTestId('health-consent-sources-health_sync');
    const sleep = within(sync)
      .getAllByTestId('health-consent-source')
      .find((li) => li.textContent?.includes('Schlafdaten aus Apple Health'))!;
    expect(within(sleep).getByText(t(`${UI}.statusActive`))).toBeInTheDocument();
    fireEvent.click(within(sleep).getByRole('button', { name: t(`${UI}.revoke`) }));
    expect(await screen.findByText(t(`${UI}.revokeConfirmBody`))).toBeInTheDocument();
    expect(revoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t(`${UI}.revokeConfirmAction`) }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith({ category: 'sync_sleep', resource_id: 'apple_health', locale: 'de' }));
  });

  it('an active consent stays listed and withdrawable even without the catalogue (store pending, aggregator source)', async () => {
    const revoke = vi.fn(() => ({ ok: true, changed: true, consent: { active: false } }));
    route({
      [`GET ${API}`]: () =>
        state({
          store_pending: true,
          categories: [],
          consents: [activeRow('sync_heart', 'terra'), activeRow('self_logged_health', 'self_logged_health')],
        }),
      [`POST ${API}/revoke`]: revoke,
    });
    renderSources();
    const sync = await screen.findByTestId('health-consent-sources-health_sync');
    expect(labels(sync)).toEqual([t(`${UI}.categories.sync_heart`, { name: 'terra' })]);
    const self = screen.getByTestId('health-consent-sources-self_logged_health');
    fireEvent.click(within(self).getByRole('button', { name: t(`${UI}.revoke`) }));
    fireEvent.click(await screen.findByRole('button', { name: t(`${UI}.revokeConfirmAction`) }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith({ category: 'self_logged_health', locale: 'de' }));
  });

  it('RTL: the sources dialog uses logical alignment and spacing only', () => {
    const src = readFileSync(resolve(__dirname, 'HealthConsentSourcesDialog.tsx'), 'utf8');
    expect(src).not.toMatch(/\b(?:text-left|text-right|ml-\d|mr-\d|pl-\d|pr-\d|left-\d|right-\d)\b/);
  });
});
