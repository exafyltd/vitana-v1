/**
 * VTID-05136 — the manual registration flow on "Get ready to sell", end to end:
 * the hub shows what the server's checklist says, a supplier submits once
 * after confirming, and resubmits after Vitanaland asks for changes.
 * adminFetch is mocked; nothing is sent anywhere.
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

import { SetupHub } from './SetupHub';

const ORG = { id: 'org-1', org_key: 'demo', display_name: 'Demo Wellness', org_type: 'partner', status: 'active', role: 'org_admin' };

type Step = { key: string; required?: boolean; status: string; missing?: string[]; detail?: Record<string, unknown> };
const base: Step[] = [
  { key: 'account', status: 'done' },
  { key: 'company', status: 'done' },
  { key: 'verification', status: 'todo' },
  { key: 'catalogue', status: 'done' },
  { key: 'mapping', status: 'done' },
  { key: 'tracking_test', required: false, status: 'not_required' },
  { key: 'terms', status: 'done' },
  { key: 'billing_mandate', required: false, status: 'not_required' },
];
const steps = (patch: Record<string, Partial<Step>> = {}) =>
  base.map((s) => ({ required: true, missing: [], detail: {}, ...s, ...(patch[s.key] ?? {}) }));

/** What the gateway answers: GET /:orgId and POST /:orgId/submit share this shape. */
const orgBody = (lifecycle_state: string, stepList = steps(), extra: Record<string, unknown> = {}) => ({
  ok: true,
  organization: { id: 'org-1', country: 'DE', website: 'https://demo.example', lifecycle_state },
  checklist: { steps: stepList, submit_ready: true, submit_missing: [], complete: false },
  ...extra,
});
const CATALOGUE = { ok: true, merchant: { id: 'm-1' }, products: [{ id: 'p-1' }] };

let current: ReturnType<typeof orgBody>;
let submitAnswer: () => Promise<unknown>;

const posts = () => adminFetch.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

beforeEach(() => {
  adminFetch.mockReset();
  current = orgBody('draft');
  submitAnswer = async () => orgBody('needs_action', steps({ verification: { status: 'todo' } }), { transitions: [{}, {}, {}], open_steps: ['verification'] });
  adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST' && path === '/api/v1/partner-onboarding/org-1/submit') return submitAnswer();
    if (path === '/api/v1/partner-onboarding/org-1/catalogue') return CATALOGUE;
    if (path === '/api/v1/partner-onboarding/org-1') return current;
    throw new Error(`unexpected ${path}`);
  });
});

const hub = () => render(<SetupHub orgs={[ORG]} activeOrgId="org-1" onSelectOrg={() => {}} onAddProducts={() => {}} />);
const row = (id: string) => screen.getByTestId(`setup-step-${id}`);

describe('VTID-05136 manual flow on the setup hub', () => {
  it('draft → Submit → confirm → one POST → needs_action with what is still needed', async () => {
    hub();
    const submit = await screen.findByTestId('setup-submit');
    expect(submit.getAttribute('data-mode')).toBe('submit');
    expect(submit.textContent).toContain('Zur Verifizierung einreichen');
    // Opening the dialog sends nothing.
    fireEvent.click(submit);
    const confirm = await screen.findByTestId('setup-submit-confirm');
    expect(posts()).toHaveLength(0);

    let release: (v: unknown) => void = () => {};
    submitAnswer = () => new Promise((r) => (release = r));
    fireEvent.click(confirm);
    fireEvent.click(confirm); // a second click while pending does nothing
    await waitFor(() => expect((screen.getByTestId('setup-submit-confirm') as HTMLButtonElement).disabled).toBe(true));
    expect(posts()).toHaveLength(1);
    release(orgBody('needs_action', steps(), { transitions: [{}, {}, {}], open_steps: ['verification'] }));

    const result = await screen.findByTestId('setup-submit-result');
    expect(result.getAttribute('data-result')).toBe('needs_action');
    expect(posts()).toHaveLength(1);
    const needed = screen.getByTestId('setup-still-needed');
    expect([...needed.querySelectorAll('li')].map((li) => li.getAttribute('data-step'))).toEqual(['verification']);
    // Plain todo: not "needs your attention".
    expect(row('verification').getAttribute('data-state')).toBe('todo');
    // needs_action + ready → Resubmit is offered.
    expect(screen.getByTestId('setup-submit').getAttribute('data-mode')).toBe('resubmit');
  });

  it('request changes → the note shows as text → Resubmit → live → publish done', async () => {
    current = orgBody(
      'needs_action',
      steps({ verification: { status: 'todo', detail: { review_note: { reason: '<b>Bitte</b> USt-ID ergänzen.' } } } }),
    );
    submitAnswer = async () => orgBody('live', steps({ verification: { status: 'done' } }), { transitions: [{}, {}] });
    hub();
    const note = await screen.findByTestId('setup-review-note');
    expect(note.textContent).toContain('<b>Bitte</b> USt-ID ergänzen.');
    expect(note.querySelector('b')).toBeNull();
    expect(row('verification').getAttribute('data-state')).toBe('attention');

    fireEvent.click(screen.getByTestId('setup-submit'));
    fireEvent.click(await screen.findByTestId('setup-submit-confirm'));
    await waitFor(() => expect(screen.getByTestId('setup-submit-result').getAttribute('data-result')).toBe('live'));
    expect(row('publish').getAttribute('data-state')).toBe('done');
    expect(row('verification').getAttribute('data-state')).toBe('done');
    expect(screen.queryByTestId('setup-submit')).toBeNull();
    expect(screen.queryByTestId('setup-still-needed')).toBeNull();
    expect(screen.getByTestId('setup-hub-percent').textContent).toContain('100');
  });

  it('a refused submit says so and reloads; the fresh checklist explains what is open', async () => {
    submitAnswer = async () => {
      // The server's state changed meanwhile: the terms need accepting again.
      current = orgBody('draft', steps({ terms: { status: 'todo' } }));
      throw new Error('SUBMIT_PREREQUISITES_MISSING');
    };
    hub();
    fireEvent.click(await screen.findByTestId('setup-submit'));
    fireEvent.click(await screen.findByTestId('setup-submit-confirm'));
    await waitFor(() => expect(screen.getByTestId('setup-submit-result').getAttribute('data-result')).toBe('failed'));
    await waitFor(() =>
      expect(within(screen.getByTestId('setup-still-needed')).getAllByRole('listitem').map((li) => li.getAttribute('data-step'))).toEqual([
        'verification',
        'terms',
      ]),
    );
    expect(posts()).toHaveLength(1);
  });

  it('the admin-approved business waiting on other steps: verification done, the open step listed', async () => {
    current = orgBody('needs_action', steps({ verification: { status: 'done' }, mapping: { status: 'todo', missing: ['complete_offering'] } }));
    hub();
    await screen.findByTestId('setup-still-needed');
    expect(row('verification').getAttribute('data-state')).toBe('done');
    const items = within(screen.getByTestId('setup-still-needed')).getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('data-step'))).toEqual(['mapping']);
    expect(items[0].textContent).toContain('Ein vollständiges Angebot');
  });

  it('verification step in progress reads "Wird geprüft"', async () => {
    current = orgBody('needs_action', steps({ verification: { status: 'in_progress' } }));
    hub();
    await screen.findByTestId('setup-step-verification');
    expect(row('verification').getAttribute('data-state')).toBe('in_progress');
    expect(row('verification').textContent).toContain('Wird geprüft');
  });

  it.each(['submitted', 'verifying', 'live', 'rejected', 'exception'])('no submit button while %s', async (state) => {
    current = orgBody(state);
    hub();
    await screen.findByTestId('setup-step-verification');
    expect(screen.queryByTestId('setup-submit')).toBeNull();
  });

  it('not ready to submit → no button; the still-needed list explains why', async () => {
    current = { ...orgBody('draft', steps({ terms: { status: 'todo' } })), checklist: { steps: steps({ terms: { status: 'todo' } }), submit_ready: false, submit_missing: ['terms'], complete: false } };
    hub();
    await screen.findByTestId('setup-still-needed');
    expect(screen.queryByTestId('setup-submit')).toBeNull();
    expect(posts()).toHaveLength(0);
  });

  it('cancel closes the dialog without sending anything', async () => {
    hub();
    fireEvent.click(await screen.findByTestId('setup-submit'));
    fireEvent.click(await screen.findByTestId('setup-submit-cancel'));
    await waitFor(() => expect(screen.queryByTestId('setup-submit-confirm')).toBeNull());
    expect(posts()).toHaveLength(0);
  });
});
