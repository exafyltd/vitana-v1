/**
 * VTID-05091 — the setup hub's data processing agreement row, driven by the
 * onboarding checklist's `dpa` step: absent when not required, "being
 * prepared" (no button) while no version is published, read-and-sign, re-sign,
 * and signed with version and date. The gateway is mocked; nothing is sent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const adminFetch = vi.fn();
vi.mock('@/lib/admin-api', () => ({ adminFetch: (...a: unknown[]) => adminFetch(...a) }));
vi.mock('@/lib/i18n-toast', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n-toast')>('@/lib/i18n-toast');
  return { ...real, getI18nLocale: () => 'de-DE', notify: vi.fn(), notifyError: vi.fn() };
});

import { SetupHub } from './SetupHub';
import { t } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';

const ORG = { id: 'org-1', org_key: 'labor', display_name: 'Labor Muster', org_type: 'lab', status: 'active', role: 'org_admin', lifecycle_state: 'draft' };

type Step = { key: string; required: boolean; status: string; missing?: string[]; detail?: Record<string, unknown> };
let dpaStep: Step | null;
let dpaAnswer: unknown;

const DPA = {
  id: 'dv-1',
  version: '2026-11',
  published_at: '2026-11-01T00:00:00Z',
  content_sha256: 'h',
  binding_locale: 'de',
  binding: { title: 'AVV', body_md: 'Text', signing_declaration: null },
  locale: 'de',
  fallback: false,
  direction: 'ltr',
  text: { title: 'AVV', body_md: 'Text', signing_declaration: null },
  signing_declaration: null,
  available_locales: ['de'],
  shown_locale: 'de',
};

beforeEach(() => {
  adminFetch.mockReset();
  dpaStep = null;
  dpaAnswer = { ok: true, required: true, published: false, dpa: null, signed: false, signed_at: null, signed_version: null, resign_required: false };
  adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method && init.method !== 'GET') throw new Error('no writes in this test');
    if (path === '/api/v1/partner-onboarding/org-1') {
      return {
        ok: true,
        organization: { country: 'DE', website: null, legal_name: 'Labor Muster GmbH', lifecycle_state: 'draft' },
        checklist: { steps: [{ key: 'terms', required: true, status: 'todo' }, ...(dpaStep ? [dpaStep] : [])] },
      };
    }
    if (path.endsWith('/catalogue')) return { ok: true, products: [], merchant: null };
    if (path.includes('/terms')) return { ok: true, published: false, terms: null };
    if (path.includes('/dpa')) return dpaAnswer;
    throw new Error(`unexpected ${path}`);
  });
});

const hub = () => render(<SetupHub orgs={[ORG]} activeOrgId="org-1" onSelectOrg={() => {}} onAddProducts={() => {}} />);
const dpaGets = () => adminFetch.mock.calls.filter(([p]) => String(p).includes('/dpa')).length;

describe('VTID-05091 setup hub — DPA row', () => {
  it('not required for this business (no step, or step not required): no row and no DPA read', async () => {
    hub();
    await screen.findByTestId('setup-step-profile');
    expect(screen.queryByTestId('setup-dpa')).toBeNull();

    dpaStep = { key: 'dpa', required: false, status: 'not_required' };
    const second = render(<SetupHub orgs={[ORG]} activeOrgId="org-1" onSelectOrg={() => {}} onAddProducts={() => {}} refreshKey={1} />);
    await waitFor(() => expect(second.container.querySelector('[data-testid="setup-step-profile"]')).not.toBeNull());
    expect(second.container.querySelector('[data-testid="setup-dpa"]')).toBeNull();
    expect(dpaGets()).toBe(0);
  });

  it('pending legal text: "being prepared", state todo, nothing to click', async () => {
    dpaStep = { key: 'dpa', required: true, status: 'todo', missing: ['dpa_not_published'] };
    hub();
    const row = await screen.findByTestId('setup-dpa');
    expect(row.getAttribute('data-state')).toBe('todo');
    expect(row.getAttribute('data-dpa')).toBe('pending_legal');
    expect(row.textContent).toContain(t('screens.commerceportal.dpa.rowTitle'));
    expect(row.textContent).toContain(t('screens.commerceportal.dpa.rowPending'));
    expect(row.tagName).not.toBe('BUTTON');
    expect(row.querySelector('button')).toBeNull();
  });

  it('published, not signed: read and sign opens the sheet', async () => {
    dpaStep = { key: 'dpa', required: true, status: 'todo', detail: { current_version: '2026-11' } };
    dpaAnswer = { ok: true, required: true, published: true, dpa: DPA, signed: false, signed_at: null, signed_version: null, resign_required: false };
    hub();
    await waitFor(() => expect(screen.getByTestId('setup-dpa').getAttribute('data-state')).toBe('todo'));
    const row = screen.getByTestId('setup-dpa');
    await waitFor(() => expect(row.textContent).toContain(t('screens.commerceportal.dpa.rowBody', { version: '2026-11' })));
    fireEvent.click(row);
    await screen.findByTestId('partner-dpa-sheet');
    expect(await screen.findByTestId('partner-dpa-sign')).toBeTruthy();
  });

  it('re-sign required: reworded row', async () => {
    dpaStep = { key: 'dpa', required: true, status: 'todo', detail: { current_version: '2026-12' } };
    dpaAnswer = { ok: true, required: true, published: true, dpa: { ...DPA, version: '2026-12' }, signed: false, signed_at: null, signed_version: null, resign_required: true };
    hub();
    await waitFor(() => expect(screen.getByTestId('setup-dpa').getAttribute('data-state')).toBe('resign'));
    expect(screen.getByTestId('setup-dpa').textContent).toContain(t('screens.commerceportal.dpa.rowResignTitle'));
    expect(screen.getByTestId('setup-dpa').textContent).toContain(t('screens.commerceportal.dpa.rowResignBody', { version: '2026-12' }));
  });

  it('signed: version and date (fmtDate)', async () => {
    dpaStep = { key: 'dpa', required: true, status: 'done' };
    dpaAnswer = { ok: true, required: true, published: true, dpa: DPA, signed: true, signed_at: '2026-11-03T10:00:00Z', signed_version: '2026-11', resign_required: false };
    hub();
    await waitFor(() =>
      expect(screen.getByTestId('setup-dpa').textContent).toContain(
        t('screens.commerceportal.dpa.rowSigned', { version: '2026-11', date: fmtDate(new Date('2026-11-03T10:00:00Z')) }),
      ),
    );
    expect(screen.getByTestId('setup-dpa').getAttribute('data-state')).toBe('done');
  });

  it('the DPA read fails: the checklist step alone decides (done → signed)', async () => {
    dpaStep = { key: 'dpa', required: true, status: 'done' };
    dpaAnswer = Promise.reject(new Error('HTTP 500'));
    (dpaAnswer as Promise<unknown>).catch(() => {});
    hub();
    const row = await screen.findByTestId('setup-dpa');
    expect(row.getAttribute('data-state')).toBe('done');
    expect(row.textContent).toContain(t('screens.commerceportal.dpa.rowSignedPlain'));
  });
});
