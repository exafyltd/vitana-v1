/** VTID-04793 — the "Get ready to sell" checklist only ever reports what the server says. */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { deriveSetupSteps, groupOpenSteps, openSteps, parseChecklist, readinessPercent, reviewNote, submitMode, submitResultFor } from './SetupHub';

const fresh = { country: 'DE', website: null, lifecycleState: 'draft', productCount: 0, hasMerchant: false };
const state = (f: Parameters<typeof deriveSetupSteps>[0]) => Object.fromEntries(deriveSetupSteps(f).map((s) => [s.id, s.state]));

describe('deriveSetupSteps', () => {
  it('a just-registered business: profile done, everything else still to do (20%)', () => {
    expect(state(fresh)).toEqual({ profile: 'done', products: 'todo', verification: 'todo', sales: 'todo', publish: 'todo' });
    expect(readinessPercent(deriveSetupSteps(fresh))).toBe(20);
  });

  it('a business without a country is not counted as having a profile', () => {
    expect(state({ ...fresh, country: null }).profile).toBe('todo');
  });

  it('products and the shop record count only when they exist', () => {
    expect(state({ ...fresh, productCount: 3, hasMerchant: true })).toMatchObject({ products: 'done', sales: 'done' });
  });

  it('verification follows the lifecycle — in review, needs attention, live', () => {
    expect(state({ ...fresh, lifecycleState: 'verifying' }).verification).toBe('in_progress');
    expect(state({ ...fresh, lifecycleState: 'submitted' }).verification).toBe('in_progress');
    expect(state({ ...fresh, lifecycleState: 'needs_action' }).verification).toBe('attention');
    expect(state({ ...fresh, lifecycleState: 'live' })).toMatchObject({ verification: 'done', publish: 'done' });
  });

  it('100% only when the business is live with products, a profile and a shop record', () => {
    expect(readinessPercent(deriveSetupSteps({ country: 'DE', website: null, lifecycleState: 'live', productCount: 1, hasMerchant: true }))).toBe(100);
  });
});

// VTID-05136: the server's checklist, as GET /partner-onboarding/:orgId returns it.
type Raw = { key: string; required?: boolean; status: string; missing?: string[]; detail?: Record<string, unknown> };
const checklist = (steps: Raw[], submit_ready = true) =>
  parseChecklist({ steps: steps.map((s) => ({ required: true, missing: [], detail: {}, ...s })), submit_ready });
const SERVICE_PROVIDER: Raw[] = [
  { key: 'account', status: 'done' },
  { key: 'company', status: 'done' },
  { key: 'verification', status: 'todo' },
  { key: 'catalogue', status: 'done' },
  { key: 'mapping', status: 'done' },
  { key: 'tracking_test', required: false, status: 'not_required' },
  { key: 'terms', status: 'done' },
  { key: 'billing_mandate', required: false, status: 'not_required' },
];
const withStep = (key: string, patch: Partial<Raw>) => SERVICE_PROVIDER.map((s) => (s.key === key ? { ...s, ...patch } : s));

describe('VTID-05136 verification row follows the checklist', () => {
  it('admin-approved, other steps still open → verification done (the EXAFY case)', () => {
    const c = checklist(withStep('verification', { status: 'done' }).map((s) => (s.key === 'mapping' ? { ...s, status: 'todo', missing: ['complete_offering'] } : s)));
    expect(state({ ...fresh, lifecycleState: 'needs_action', checklist: c }).verification).toBe('done');
  });
  it('failed → attention; a reviewer note on a todo step → attention', () => {
    expect(state({ ...fresh, lifecycleState: 'needs_action', checklist: checklist(withStep('verification', { status: 'failed' })) }).verification).toBe('attention');
    const noted = checklist(withStep('verification', { status: 'todo', detail: { review_note: { reason: 'Please add your VAT ID.' } } }));
    expect(state({ ...fresh, lifecycleState: 'needs_action', checklist: noted }).verification).toBe('attention');
    expect(reviewNote(noted)).toBe('Please add your VAT ID.');
  });
  it('in review while the step or the lifecycle says so', () => {
    expect(state({ ...fresh, lifecycleState: 'needs_action', checklist: checklist(withStep('verification', { status: 'in_progress' })) }).verification).toBe('in_progress');
    expect(state({ ...fresh, lifecycleState: 'verifying', checklist: checklist(SERVICE_PROVIDER) }).verification).toBe('in_progress');
    expect(state({ ...fresh, lifecycleState: 'submitted', checklist: checklist(SERVICE_PROVIDER) }).verification).toBe('in_progress');
  });
  it('rejected → attention; a plain todo stays todo even in needs_action', () => {
    expect(state({ ...fresh, lifecycleState: 'rejected', checklist: checklist(SERVICE_PROVIDER) }).verification).toBe('attention');
    expect(state({ ...fresh, lifecycleState: 'needs_action', checklist: checklist(SERVICE_PROVIDER) }).verification).toBe('todo');
  });
  it('live → every row done', () => {
    const c = checklist(withStep('verification', { status: 'done' }));
    expect(readinessPercent(deriveSetupSteps({ ...fresh, lifecycleState: 'live', productCount: 1, hasMerchant: true, checklist: c }))).toBe(100);
  });
  it('no checklist → the old lifecycle mapping', () => {
    expect(state({ ...fresh, lifecycleState: 'needs_action', checklist: null }).verification).toBe('attention');
    expect(state({ ...fresh, lifecycleState: 'exception' }).verification).toBe('attention');
    expect(parseChecklist(undefined)).toBeNull();
    expect(parseChecklist({ steps: 'nope' })).toBeNull();
  });
});

describe('VTID-05136 still needed', () => {
  it('lists required todo/failed steps only — never done or not_required, and no in_progress step the server gave no owner (VTID-05237)', () => {
    const c = checklist([
      ...withStep('verification', { status: 'in_progress' }).map((s) => (s.key === 'terms' ? { ...s, status: 'failed' } : s)),
      { key: 'dpa', status: 'todo' },
    ]);
    expect(openSteps(c).map((o) => o.key)).toEqual(['terms', 'dpa']);
  });
  it('a missing complete offering gets its own plain-words label', () => {
    const c = checklist(withStep('mapping', { status: 'todo', missing: ['complete_offering'] }));
    expect(openSteps(c).find((o) => o.key === 'mapping')?.label).toBe('screens.commerceportal.setupHub.openCompleteOffering');
    expect(openSteps(checklist(withStep('mapping', { status: 'todo' })))[1].label).toBe('screens.commerceportal.setupHub.openShopLink');
  });
  it('an unknown step key still shows, with a generic label', () => {
    expect(openSteps(checklist([{ key: 'something_new', status: 'todo' }]))[0].label).toBe('screens.commerceportal.setupHub.openOther');
  });
});

describe('VTID-05136 submit / resubmit', () => {
  it('shown only for draft or needs_action when the server says submit_ready', () => {
    expect(submitMode({ ...fresh, lifecycleState: 'draft', checklist: checklist(SERVICE_PROVIDER) })).toBe('submit');
    expect(submitMode({ ...fresh, lifecycleState: 'needs_action', checklist: checklist(SERVICE_PROVIDER) })).toBe('resubmit');
    expect(submitMode({ ...fresh, lifecycleState: 'draft', checklist: checklist(SERVICE_PROVIDER, false) })).toBeNull();
    expect(submitMode({ ...fresh, lifecycleState: 'draft', checklist: null })).toBeNull();
    for (const s of ['submitted', 'verifying', 'live', 'rejected', 'exception']) {
      expect(submitMode({ ...fresh, lifecycleState: s, checklist: checklist(SERVICE_PROVIDER) })).toBeNull();
    }
  });
  it('the result is what the server returned; no transition means nothing changed', () => {
    expect(submitResultFor('live', [{}, {}])).toBe('live');
    expect(submitResultFor('needs_action', [{}, {}])).toBe('needs_action');
    expect(submitResultFor('verifying', [{}])).toBe('in_review');
    expect(submitResultFor('draft', [])).toBe('unchanged');
    expect(submitResultFor(null, undefined)).toBe('unchanged');
  });
});

describe('SetupHub reads, never invents', () => {
  const src = readFileSync(resolve(__dirname, './SetupHub.tsx'), 'utf8');
  it('loads the business and its catalogue from the existing onboarding endpoints', () => {
    expect(src).toContain('adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}`)');
    expect(src).toContain('adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}/catalogue`)');
  });
  it('VTID-05136: submits only through the existing endpoint, and shows the reviewer note as text', () => {
    expect(src).toContain("adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}/submit`, { method: 'POST' })");
    expect(src).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

describe('Commerce portal: first-time suppliers start registering right away', () => {
  const portal = readFileSync(resolve(__dirname, '../../pages/CommercePortal.tsx'), 'utf8');
  it('opens registration from the server list of businesses, once per visit', () => {
    // VTID-04839 / VTID-04848: it also waits for the AI-setup and MCP status,
    // then opens the AI-agent panel, AI setup or registration, in that order.
    expect(portal).toContain('if (!user || myOrgs === null || myOrgsFailed || myOrgs.length > 0 || aiReady === null || mcpReady === null) return;');
    expect(portal).toContain('if (mcpReady) setMcpOpen(true);\n    else if (aiReady) setAiSetupOpen(true);');
    // A failed list load is not "no business": it never opens registration.
    expect(portal).toContain('setMyOrgsFailed(true);');
    expect(portal).toContain('sessionStorage.setItem(AUTO_REGISTER_KEY');
    expect(portal).toContain('setRegisterOrgOpen(true);');
  });
  it('shows the setup hub to a business admin', () => {
    expect(portal).toContain('{user && hubOrg && (');
    expect(portal).toContain('<SetupHub');
  });
});

// VTID-05237: who can finish each open step. The gateway decides (`owner` on the step); the screen only groups.
describe('VTID-05237 who finishes each open step', () => {
  const owned = (key: string, owner: unknown, patch: Partial<Raw> = {}): Raw & { owner?: unknown } => ({ key, status: 'todo', owner, ...patch });

  it('parseChecklist keeps the gateway owner; an owner it does not know counts as the supplier; none stays none', () => {
    const c = parseChecklist({
      steps: [
        { key: 'company', required: true, status: 'todo', owner: 'assistant' },
        { key: 'terms', required: true, status: 'todo', owner: 'supplier' },
        { key: 'verification', required: true, status: 'in_progress', owner: 'vitanaland' },
        { key: 'catalogue', required: true, status: 'todo', owner: 'robot' },
        { key: 'mapping', required: true, status: 'todo', owner: 42 },
        { key: 'team', required: true, status: 'todo' },
      ],
      submit_ready: true,
    });
    expect(c?.steps.map((s) => s.owner)).toEqual(['assistant', 'supplier', 'vitanaland', 'supplier', 'supplier', undefined]);
  });

  it('openSteps carries the owner of every item', () => {
    const c = checklist([owned('company', 'assistant'), owned('terms', 'supplier')] as Raw[]);
    expect(openSteps(c).map((o) => [o.key, o.owner])).toEqual([['company', 'assistant'], ['terms', 'supplier']]);
  });

  it('an in_progress step is listed when the gateway names its owner', () => {
    const c = checklist([owned('verification', 'vitanaland', { status: 'in_progress' })] as Raw[]);
    expect(openSteps(c).map((o) => [o.key, o.owner])).toEqual([['verification', 'vitanaland']]);
  });

  it('an in_progress step without an owner stays out of the list (an older gateway: today\'s list)', () => {
    const c = checklist([{ key: 'verification', status: 'in_progress' }, { key: 'terms', status: 'todo' }]);
    expect(openSteps(c).map((o) => o.key)).toEqual(['terms']);
  });

  it('done, not_required and not-required steps are never listed, whatever their owner', () => {
    const c = checklist([
      owned('company', 'assistant', { status: 'done' }),
      owned('dpa', 'supplier', { status: 'not_required' }),
      owned('terms', 'supplier', { required: false }),
    ] as Raw[]);
    expect(openSteps(c)).toEqual([]);
  });

  const items = openSteps(
    checklist([
      owned('company', 'assistant'),
      owned('verification', 'vitanaland', { status: 'in_progress' }),
      owned('catalogue', 'assistant'),
      owned('terms', 'supplier'),
    ] as Raw[]),
  );

  it('groupOpenSteps: supplier first, then assistant, then Vitanaland; checklist order inside a group', () => {
    const g = groupOpenSteps(items, true);
    expect(g.map((x) => x.owner)).toEqual(['supplier', 'assistant', 'vitanaland']);
    expect(g.map((x) => x.items.map((i) => i.key))).toEqual([['terms'], ['company', 'catalogue'], ['verification']]);
  });

  it('groupOpenSteps: a group with no items is left out', () => {
    expect(groupOpenSteps(items.filter((i) => i.owner === 'assistant'), true).map((x) => x.owner)).toEqual(['assistant']);
    expect(groupOpenSteps([], true)).toEqual([]);
  });

  it('groupOpenSteps: while the assistant cannot be reached its items join the supplier group, in checklist order', () => {
    const g = groupOpenSteps(items, false);
    expect(g.map((x) => x.owner)).toEqual(['supplier', 'vitanaland']);
    expect(g[0].items.map((i) => i.key)).toEqual(['company', 'catalogue', 'terms']);
  });

  it('groupOpenSteps: a checklist with no owners is one supplier group (today\'s single list), reachable or not', () => {
    const legacy = openSteps(checklist([{ key: 'verification', status: 'todo' }, { key: 'terms', status: 'todo' }]));
    for (const reachable of [true, false]) {
      const g = groupOpenSteps(legacy, reachable);
      expect(g.map((x) => x.owner)).toEqual(['supplier']);
      expect(g[0].items.map((i) => i.key)).toEqual(['verification', 'terms']);
    }
  });
});
