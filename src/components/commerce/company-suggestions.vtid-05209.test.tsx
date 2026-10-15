/**
 * VTID-05209 — country and website prefilled from what Vitanaland already
 * knows (Commerce UX contract). adminFetch is mocked; nothing is sent anywhere.
 *
 * Pinned: a suggestion fills only empty fields and is never saved by itself;
 * a saved value always wins; with no reliable suggestion the screens behave
 * exactly as before (country list with the browser preselect).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const adminFetch = vi.fn();
vi.mock('@/lib/admin-api', () => ({ adminFetch: (...a: unknown[]) => adminFetch(...a) }));
vi.mock('@/lib/commerce-terms', async () => {
  const real = await vi.importActual<typeof import('@/lib/commerce-terms')>('@/lib/commerce-terms');
  return { ...real, fetchPartnerTerms: vi.fn(async () => ({ kind: 'not_published' })) };
});
vi.mock('@/lib/i18n-toast', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n-toast')>('@/lib/i18n-toast');
  return { ...real, notify: vi.fn(), notifyError: vi.fn() };
});

import { t } from '@/lib/i18n-toast';
import { fetchCompanySuggestions, suggestionSourceKey } from '@/lib/commerce-suggestions';
import { RegisterOrgDialog, REGISTER_DRAFT_KEY } from './RegisterOrgDialog';
import { SetupHub } from './SetupHub';

const SUGGEST = '/api/v1/partner-onboarding/company-suggestions';
const sugg = (country: [string, string] | null, website: [string, string] | null) => ({
  ok: true,
  country: country ? { value: country[0], source: country[1] } : null,
  website: website ? { value: website[0], source: website[1] } : null,
});

const writes = () => adminFetch.mock.calls.filter(([, init]) => {
  const m = (init as RequestInit | undefined)?.method;
  return m && m !== 'GET';
});

beforeEach(() => {
  adminFetch.mockReset();
  localStorage.clear();
});

describe('fetchCompanySuggestions', () => {
  it('asks the registration route, passing a typed website', async () => {
    adminFetch.mockResolvedValue(sugg(['DE', 'website_domain'], null));
    const s = await fetchCompanySuggestions(adminFetch, { website: ' shop.example.de ' });
    expect(adminFetch).toHaveBeenCalledWith(`${SUGGEST}?website=shop.example.de`);
    expect(s.country).toEqual({ value: 'DE', source: 'website_domain' });
  });
  it('asks the business route with an orgId', async () => {
    adminFetch.mockResolvedValue(sugg(null, null));
    await fetchCompanySuggestions(adminFetch, { orgId: 'org-1' });
    expect(adminFetch).toHaveBeenCalledWith('/api/v1/partner-onboarding/org-1/company-suggestions');
  });
  it('a failure or a malformed answer means no suggestion', async () => {
    adminFetch.mockRejectedValue(new Error('404'));
    expect(await fetchCompanySuggestions(adminFetch)).toEqual({ country: null, website: null });
    adminFetch.mockResolvedValue({ country: { value: 'germany', source: 'x' }, website: { value: 1 } });
    expect(await fetchCompanySuggestions(adminFetch)).toEqual({ country: null, website: null });
  });
  it('names each source in plain words', () => {
    expect(suggestionSourceKey('email_domain')).toBe('screens.commerceportal.orgOnboarding.fromEmail');
    expect(suggestionSourceKey('website_domain')).toBe('screens.commerceportal.orgOnboarding.fromWebsite');
    expect(suggestionSourceKey('vat_id')).toBe('screens.commerceportal.orgOnboarding.fromVatId');
    expect(suggestionSourceKey('stored')).toBeNull();
  });
});

describe('registration step 2', () => {
  const openStep2 = async () => {
    render(<RegisterOrgDialog open onOpenChange={() => {}} onCreated={() => {}} />);
    fireEvent.click(await screen.findByTestId('register-category-health_medical'));
    fireEvent.click(screen.getByText(t('screens.commerceportal.orgOnboarding.wizardNext')));
  };

  it('prefills the website from the email and shows the country as one confirm line', async () => {
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith(SUGGEST)) return sugg(['DE', 'email_domain'], ['https://kraeuterhaus.de', 'email_domain']);
      throw new Error(`unexpected ${path}`);
    });
    await openStep2();
    await waitFor(() => expect((screen.getByLabelText(/Website/) as HTMLInputElement).value).toBe('https://kraeuterhaus.de'));
    expect(screen.getByTestId('register-website-hint').textContent).toBe(t('screens.commerceportal.orgOnboarding.fromEmail'));
    const line = screen.getByTestId('register-country-confirm');
    expect(line.textContent).toContain(t('screens.commerceportal.orgOnboarding.fromEmail'));
    expect(screen.queryByTestId('register-country-select')).toBeNull();
    // Nothing is written by the suggestion.
    expect(writes()).toHaveLength(0);
  });

  it('Change reveals the list; a picked country is never replaced by a later suggestion', async () => {
    let answer = sugg(['DE', 'email_domain'], null);
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith(SUGGEST)) return answer;
      throw new Error(`unexpected ${path}`);
    });
    await openStep2();
    fireEvent.click(await screen.findByTestId('register-country-change'));
    const select = screen.getByTestId('register-country-select') as HTMLSelectElement;
    expect(select.value).toBe('DE');
    fireEvent.change(select, { target: { value: 'AT' } });
    // The supplier types a .ch website: the suggestion changes, their pick stays.
    answer = sugg(['CH', 'website_domain'], null);
    const site = screen.getByLabelText(/Website/) as HTMLInputElement;
    fireEvent.change(site, { target: { value: 'https://shop.example.ch' } });
    fireEvent.blur(site);
    await waitFor(() => expect(adminFetch).toHaveBeenCalledWith(`${SUGGEST}?website=https%3A%2F%2Fshop.example.ch`));
    expect((screen.getByTestId('register-country-select') as HTMLSelectElement).value).toBe('AT');
  });

  it('no reliable suggestion → the list, as before', async () => {
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith(SUGGEST)) return sugg(null, null);
      throw new Error(`unexpected ${path}`);
    });
    await openStep2();
    await waitFor(() => expect(adminFetch).toHaveBeenCalled());
    expect(screen.getByTestId('register-country-select')).toBeTruthy();
    expect(screen.queryByTestId('register-country-confirm')).toBeNull();
    expect((screen.getByLabelText(/Website/) as HTMLInputElement).value).toBe('');
  });

  it('the suggestion route failing → the list, as before', async () => {
    adminFetch.mockRejectedValue(new Error('404'));
    await openStep2();
    await waitFor(() => expect(adminFetch).toHaveBeenCalled());
    expect(screen.getByTestId('register-country-select')).toBeTruthy();
  });

  it('a resumed draft keeps its own website and country', async () => {
    localStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify({ step: 1, form: { category: 'health_medical', display_name: 'X', website: 'https://mine.at', country: 'AT' } }));
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith(SUGGEST)) return sugg(['DE', 'email_domain'], ['https://kraeuterhaus.de', 'email_domain']);
      throw new Error(`unexpected ${path}`);
    });
    render(<RegisterOrgDialog open onOpenChange={() => {}} onCreated={() => {}} />);
    await waitFor(() => expect(adminFetch).toHaveBeenCalled());
    await waitFor(() => expect((screen.getByLabelText(/Website/) as HTMLInputElement).value).toBe('https://mine.at'));
    expect((screen.getByTestId('register-country-select') as HTMLSelectElement).value).toBe('AT');
  });
});

describe('business profile sheet', () => {
  const ORG = { id: 'org-1', org_key: 'demo', display_name: 'Demo', org_type: 'partner', status: 'active', role: 'org_admin' };
  const status = (org: Record<string, unknown>) => ({
    ok: true,
    organization: { id: 'org-1', lifecycle_state: 'draft', country: null, website: null, ...org },
    checklist: { steps: [], submit_ready: false, submit_missing: [], complete: false },
  });

  function wire(org: Record<string, unknown>, suggestion: ReturnType<typeof sugg>) {
    adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') return { ok: true };
      if (path === '/api/v1/partner-onboarding/org-1/company-suggestions') return suggestion;
      if (path === '/api/v1/partner-onboarding/org-1/catalogue') return { ok: true, merchant: null, products: [] };
      if (path === '/api/v1/partner-onboarding/org-1') return status(org);
      throw new Error(`unexpected ${path}`);
    });
    render(<SetupHub orgs={[ORG]} activeOrgId="org-1" onSelectOrg={() => {}} onAddProducts={() => {}} />);
  }
  const openProfile = async () => {
    fireEvent.click(within(await screen.findByTestId('setup-step-profile')).getByRole('button'));
  };

  it('both suggested → a summary with one Save; Save sends exactly the shown values', async () => {
    wire({}, sugg(['DE', 'email_domain'], ['https://kraeuterhaus.de', 'email_domain']));
    await openProfile();
    const summary = await screen.findByTestId('profile-summary');
    expect(screen.getByTestId('profile-summary-website').textContent).toBe('https://kraeuterhaus.de');
    expect(summary.textContent).toContain(t('screens.commerceportal.orgOnboarding.fromEmail'));
    expect(writes()).toHaveLength(0);
    fireEvent.click(screen.getByTestId('profile-save'));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const [path, init] = writes()[0];
    expect(path).toBe('/api/v1/partner-onboarding/org-1/company');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ country: 'DE', website: 'https://kraeuterhaus.de' });
  });

  it('a saved website wins over the email suggestion', async () => {
    wire({ website: 'https://mine.at' }, sugg(['AT', 'website_domain'], ['https://mine.at', 'stored']));
    await openProfile();
    await screen.findByTestId('profile-summary');
    expect(screen.getByTestId('profile-summary-website').textContent).toBe('https://mine.at');
    expect(screen.queryByText(t('screens.commerceportal.orgOnboarding.fromEmail'))).toBeNull();
    fireEvent.click(screen.getByTestId('profile-change'));
    expect((screen.getByTestId('profile-website') as HTMLInputElement).value).toBe('https://mine.at');
    expect((screen.getByTestId('profile-country') as HTMLSelectElement).value).toBe('AT');
  });

  it('Change shows the inputs; a missing value shows the inputs straight away', async () => {
    wire({}, sugg(['DE', 'website_domain'], null));
    await openProfile();
    // No website known: inputs, with the country prefilled and its source named.
    const country = (await screen.findByTestId('profile-country')) as HTMLSelectElement;
    await waitFor(() => expect(country.value).toBe('DE'));
    expect(screen.queryByTestId('profile-summary')).toBeNull();
    expect(screen.getByText(t('screens.commerceportal.orgOnboarding.fromWebsite'))).toBeTruthy();
  });
});
