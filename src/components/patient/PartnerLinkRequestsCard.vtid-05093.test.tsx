/**
 * VTID-05093 (Health Hub D10, WP2): after a member confirms "this is my test"
 * (D8, VTID-05056), a SEPARATE, optional step may offer that partner's
 * `partner_results` consent. It is never bundled into the confirmation, never
 * pre-ticked, records granted_via 'partner_link_confirm', and is offered only
 * when it can be granted (partner identified unambiguously, no active
 * consent, store migrated, wording released). The gateway is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

import { PartnerLinkRequestsCard } from './PartnerLinkRequestsCard';
import { partnerConsentOffer } from '@/hooks/useHealthConsents';
import { catalogs } from '@/i18n';
import { setI18nLocale, t } from '@/lib/i18n-toast';
import { HEALTH_CONSENT_CATEGORIES } from '@/lib/health-consent-wording';

const LIST = '/api/v1/partner-health/member/link-requests';
const API = '/api/v1/health/consents';
const UI = 'screens.settings.healthConsentUi';
const REQUEST = { id: '11111111-1111-1111-1111-111111111111', partner_display_name: 'Labor Nord', test_name: 'Lipid panel', proposed_at: null };

const CATEGORIES = HEALTH_CONSENT_CATEGORIES.map((key, i) => ({
  key, resource_type: 'x', scope: 'x', per_resource: key === 'wearables' || key === 'partner_results', current_text_version: 'v1', processing_active: false, sort: i,
}));
function consents(over: Record<string, unknown> = {}) {
  return {
    ok: true, store_pending: false, categories: CATEGORIES, consents: [],
    partners: [{ partner_key: 'labnord', display_name: 'Labor Nord', status: 'active' }], connectors: [], ...over,
  };
}

function release() {
  lockState.texts = Object.fromEntries(HEALTH_CONSENT_CATEGORIES.map((c) => [c, { v1: { status: 'released', locales: { de: 'sha', en: 'sha' } } }]));
  const tree = ((catalogs['de-DE'].screens as Record<string, unknown>).settings as Record<string, unknown>).healthConsent as Record<string, Record<string, unknown>>;
  tree.partner_results.v1 = { title: 'Partner title {name}', body: 'Partner body {name}', checkbox: 'Partner box {name}' };
}

function setup(consentAnswer: unknown, extra: Record<string, (b?: unknown) => unknown> = {}) {
  const handlers: Record<string, (b?: unknown) => unknown> = {
    [`GET ${LIST}`]: () => ({ ok: true, requests: [REQUEST] }),
    [`POST ${LIST}/${REQUEST.id}/confirm`]: () => ({ ok: true, status: 'confirmed', order_id: 'o1' }),
    [`GET ${API}`]: () => {
      if (consentAnswer instanceof Error) throw consentAnswer;
      return consentAnswer;
    },
    ...extra,
  };
  adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${path}`;
    if (!handlers[key]) throw new Error(`unexpected ${key}`);
    return handlers[key](init?.body ? JSON.parse(String(init.body)) : undefined);
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={qc}><PartnerLinkRequestsCard /></QueryClientProvider>);
}

async function confirmTheLink() {
  fireEvent.click(await screen.findByRole('button', { name: t('screens.patient.results.linkRequests.confirm') }));
  fireEvent.click(await screen.findByRole('button', { name: t('screens.patient.results.linkRequests.confirmDialogAction') }));
  await waitFor(() => expect(notify).toHaveBeenCalledWith('screens.patient.results.linkRequests.confirmed'));
}

beforeEach(() => {
  adminFetch.mockReset();
  notify.mockReset();
  notifyError.mockReset();
  setI18nLocale('de-DE');
  lockState.texts = Object.fromEntries(HEALTH_CONSENT_CATEGORIES.map((c) => [c, { v1: { status: 'draft' } }]));
});

describe('D8 confirm → optional partner consent step (VTID-05093)', () => {
  it('the confirmation itself sends only /confirm — no consent is bundled into it', async () => {
    release();
    setup(consents());
    await confirmTheLink();
    const posts = adminFetch.mock.calls.filter(([, init]) => init?.method === 'POST').map(([p]) => p);
    expect(posts).toEqual([`${LIST}/${REQUEST.id}/confirm`]);
  });

  it('offers the consent as a separate step; "Not now" sends nothing', async () => {
    release();
    setup(consents());
    await confirmTheLink();
    expect(await screen.findByText(t(`${UI}.linkConsentTitle`, { partner: 'Labor Nord' }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t(`${UI}.linkConsentSkip`) }));
    await waitFor(() => expect(screen.queryByTestId('partner-link-consent-offer')).toBeNull());
    expect(adminFetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('"View consent" opens the dialog unticked; granting sends granted_via partner_link_confirm for that partner', async () => {
    release();
    const grant = vi.fn(() => ({ ok: true, changed: true, consent: { active: true } }));
    setup(consents(), { [`POST ${API}/grant`]: grant });
    await confirmTheLink();
    fireEvent.click(await screen.findByRole('button', { name: t(`${UI}.linkConsentAction`) }));

    expect(await screen.findByText('Partner body Labor Nord')).toBeInTheDocument();
    const box = screen.getByTestId('health-consent-checkbox');
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: t(`${UI}.grant`) })).toBeDisabled();
    fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: t(`${UI}.grant`) }));
    await waitFor(() => expect(grant).toHaveBeenCalled());
    expect(grant).toHaveBeenCalledWith({
      category: 'partner_results',
      resource_id: 'labnord',
      text_version: 'v1',
      locale: 'de',
      granted_via: 'partner_link_confirm',
    });
  });

  it('no offer while the wording is a draft', async () => {
    setup(consents());
    await confirmTheLink();
    await waitFor(() => expect(adminFetch).toHaveBeenCalledWith(API));
    expect(screen.queryByTestId('partner-link-consent-offer')).toBeNull();
  });

  it('no offer when the consents cannot be loaded', async () => {
    release();
    setup(new Error('CONSENTS_UNAVAILABLE'));
    await confirmTheLink();
    await waitFor(() => expect(adminFetch).toHaveBeenCalledWith(API));
    expect(screen.queryByTestId('partner-link-consent-offer')).toBeNull();
  });
});

describe('partnerConsentOffer (VTID-05093)', () => {
  beforeEach(() => release());
  const data = (over: Record<string, unknown> = {}) => consents(over) as never;

  it('offers the uniquely named, grantable partner', () => {
    expect(partnerConsentOffer(data(), 'Labor Nord', 'de-DE')).toMatchObject({ partner_key: 'labnord' });
  });
  it('never guesses between two partners with the same name', () => {
    const partners = [
      { partner_key: 'a', display_name: 'Labor Nord', status: 'active' },
      { partner_key: 'b', display_name: 'Labor Nord', status: 'active' },
    ];
    expect(partnerConsentOffer(data({ partners }), 'Labor Nord', 'de-DE')).toBeNull();
  });
  it('no offer for an unknown partner, an already active consent, or a pending store', () => {
    expect(partnerConsentOffer(data(), 'Somebody else', 'de-DE')).toBeNull();
    expect(partnerConsentOffer(data(), '', 'de-DE')).toBeNull();
    const active = [{ category: 'partner_results', resource_id: 'labnord', active: true, granted_at: null, revoked_at: null, granted_via: null, text_version: 'v1', shown_locale: 'de' }];
    expect(partnerConsentOffer(data({ consents: active }), 'Labor Nord', 'de-DE')).toBeNull();
    expect(partnerConsentOffer(data({ store_pending: true }), 'Labor Nord', 'de-DE')).toBeNull();
  });
});
