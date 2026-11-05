/**
 * VTID-05237 — "Still needed" says who can finish each open step. The gateway sends `owner` on every open step
 * (VTID-05238); the screen groups by it and never works it out itself. adminFetch and fetchMcpReady are mocked:
 * nothing is sent anywhere.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

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
const fetchMcpReady = vi.fn();
vi.mock('@/lib/commerce-mcp', async () => {
  const real = await vi.importActual<typeof import('@/lib/commerce-mcp')>('@/lib/commerce-mcp');
  return { ...real, fetchMcpReady: (...a: unknown[]) => fetchMcpReady(...a) };
});

import { SetupHub } from './SetupHub';

const ORG = { id: 'org-1', org_key: 'demo', display_name: 'Demo Wellness', org_type: 'partner', status: 'active', role: 'org_admin' };

type Step = { key: string; required?: boolean; status: string; owner?: unknown; missing?: string[]; detail?: Record<string, unknown> };
const body = (stepList: Step[], lifecycle = 'needs_action') => ({
  ok: true,
  organization: { id: 'org-1', country: 'DE', website: 'https://demo.example', lifecycle_state: lifecycle },
  checklist: { steps: stepList.map((s) => ({ required: true, missing: [], detail: {}, ...s })), submit_ready: false, submit_missing: [], complete: false },
});
const CATALOGUE = { ok: true, merchant: { id: 'm-1' }, products: [{ id: 'p-1' }] };

const MIXED: Step[] = [
  { key: 'account', status: 'done' },
  { key: 'company', status: 'todo', owner: 'assistant', missing: ['website'] },
  { key: 'verification', status: 'in_progress', owner: 'vitanaland' },
  { key: 'catalogue', status: 'todo', owner: 'assistant' },
  { key: 'terms', status: 'todo', owner: 'supplier' },
];

let current: ReturnType<typeof body>;
beforeEach(() => {
  adminFetch.mockReset();
  fetchMcpReady.mockReset();
  fetchMcpReady.mockResolvedValue(true);
  current = body(MIXED);
  adminFetch.mockImplementation(async (path: string) => {
    if (path === '/api/v1/partner-onboarding/org-1/catalogue') return CATALOGUE;
    if (path === '/api/v1/partner-onboarding/org-1') return current;
    throw new Error(`unexpected ${path}`);
  });
});

const hub = () => render(<SetupHub orgs={[ORG]} activeOrgId="org-1" onSelectOrg={() => {}} onAddProducts={() => {}} />);
const groups = () => [...screen.getByTestId('setup-still-needed').querySelectorAll('[data-owner]')].map((g) => g.getAttribute('data-owner'));
const stepsIn = (owner: string) =>
  [...screen.getByTestId('setup-still-needed').querySelectorAll(`[data-owner="${owner}"] li`)].map((li) => li.getAttribute('data-step'));

describe('VTID-05237 grouped "Still needed"', () => {
  it('three groups in order: only you, your assistant, Vitanaland — each with the right steps', async () => {
    hub();
    await waitFor(() => expect(groups()).toEqual(['supplier', 'assistant', 'vitanaland']));
    expect(stepsIn('supplier')).toEqual(['terms']);
    expect(stepsIn('assistant')).toEqual(['company', 'catalogue']);
    expect(stepsIn('vitanaland')).toEqual(['verification']);
    const box = screen.getByTestId('setup-still-needed');
    expect(box.textContent).toContain('Nur du kannst das erledigen');
    expect(box.textContent).toContain('Dein KI-Assistent kann das übernehmen');
    expect(box.textContent).toContain('Vitanaland prüft gerade');
  });

  it('the assistant group says what to ask, in plain words', async () => {
    hub();
    await waitFor(() => expect(groups()).toContain('assistant'));
    const assistant = screen.getByTestId('setup-still-needed').querySelector('[data-owner="assistant"]') as HTMLElement;
    expect(assistant.textContent).toContain('Mach mein Business auf Vitanaland fertig');
  });

  it('keeps the existing step wording under each group', async () => {
    hub();
    await waitFor(() => expect(groups()).toHaveLength(3));
    expect(within(screen.getByTestId('setup-still-needed')).getByText('Die Partnerbedingungen akzeptieren')).toBeTruthy();
    expect(within(screen.getByTestId('setup-still-needed')).getByText('Firmenangaben (Firmenname und Land)')).toBeTruthy();
  });

  it('the assistant group appears only while the Commerce MCP is reachable — otherwise its steps join "Only you"', async () => {
    fetchMcpReady.mockResolvedValue(false);
    hub();
    await waitFor(() => expect(groups()).toEqual(['supplier', 'vitanaland']));
    expect(stepsIn('supplier')).toEqual(['company', 'catalogue', 'terms']);
    expect(screen.getByTestId('setup-still-needed').textContent).not.toContain('KI-Assistent');
  });

  it('before the reachability answer arrives it promises no assistant', async () => {
    fetchMcpReady.mockReturnValue(new Promise(() => {}));
    hub();
    await waitFor(() => expect(groups()).toEqual(['supplier', 'vitanaland']));
    expect(stepsIn('supplier')).toEqual(['company', 'catalogue', 'terms']);
  });

  it('a failing reachability check is the same as "not reachable"', async () => {
    fetchMcpReady.mockRejectedValue(new Error('network'));
    hub();
    await waitFor(() => expect(groups()).toEqual(['supplier', 'vitanaland']));
  });

  it('an older gateway (no owner on any step): one list, as today, and no reachability request', async () => {
    current = body([
      { key: 'account', status: 'done' },
      { key: 'verification', status: 'todo' },
      { key: 'terms', status: 'todo' },
    ]);
    hub();
    await waitFor(() => expect(groups()).toEqual(['supplier']));
    expect(stepsIn('supplier')).toEqual(['verification', 'terms']);
    expect(fetchMcpReady).not.toHaveBeenCalled();
  });

  it('an owner the screen does not know counts as the supplier', async () => {
    current = body([{ key: 'account', status: 'done' }, { key: 'company', status: 'todo', owner: 'robot' }]);
    hub();
    await waitFor(() => expect(groups()).toEqual(['supplier']));
    expect(stepsIn('supplier')).toEqual(['company']);
  });

  it('an in_progress step the gateway gave no owner is not listed (nothing new to tell the supplier)', async () => {
    current = body([{ key: 'account', status: 'done' }, { key: 'verification', status: 'in_progress' }, { key: 'terms', status: 'todo', owner: 'supplier' }]);
    hub();
    await waitFor(() => expect(groups()).toEqual(['supplier']));
    expect(stepsIn('supplier')).toEqual(['terms']);
  });

  it('no open step → no box', async () => {
    current = body([{ key: 'account', status: 'done' }, { key: 'company', status: 'done' }]);
    hub();
    await screen.findByTestId('setup-step-verification');
    expect(screen.queryByTestId('setup-still-needed')).toBeNull();
  });

  it('a live business shows no box even if the gateway still lists an owned step', async () => {
    current = body([{ key: 'account', status: 'done' }, { key: 'terms', status: 'todo', owner: 'supplier' }], 'live');
    hub();
    await screen.findByTestId('setup-step-verification');
    expect(screen.queryByTestId('setup-still-needed')).toBeNull();
  });

  it('the reachability request is made once per visit, only when an assistant step exists', async () => {
    hub();
    await waitFor(() => expect(groups()).toHaveLength(3));
    expect(fetchMcpReady).toHaveBeenCalledTimes(1);
  });

  it('shows nothing the screen worked out: the same step lands wherever the gateway says', async () => {
    current = body([{ key: 'account', status: 'done' }, { key: 'terms', status: 'todo', owner: 'assistant' }]);
    hub();
    await waitFor(() => expect(groups()).toEqual(['assistant']));
    expect(stepsIn('assistant')).toEqual(['terms']);
  });
});

describe('VTID-05237 strings exist in all 11 locales', () => {
  const LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'];
  const KEYS = ['ownerSupplier', 'ownerAssistant', 'ownerVitanaland', 'ownerAssistantHint'];
  const modules = import.meta.glob('../../i18n/*/screens.json', { eager: true, import: 'default' }) as Record<string, { screens?: { commerceportal?: { setupHub?: Record<string, string> } } }>;
  const hubOf = (l: string) => modules[`../../i18n/${l}/screens.json`]?.screens?.commerceportal?.setupHub ?? {};

  it.each(LOCALES)('%s has all four keys, filled in', (l) => {
    for (const k of KEYS) {
      expect(typeof hubOf(l)[k], `${l}.${k}`).toBe('string');
      expect(hubOf(l)[k].trim().length, `${l}.${k}`).toBeGreaterThan(0);
    }
  });

  it('every non-English locale is translated (not the English text)', () => {
    for (const l of LOCALES.filter((x) => x !== 'en')) {
      for (const k of KEYS) expect(hubOf(l)[k], `${l}.${k}`).not.toBe(hubOf('en')[k]);
    }
  });
});
