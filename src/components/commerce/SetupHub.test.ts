/** VTID-04793 — the "Get ready to sell" checklist only ever reports what the server says. */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { deriveSetupSteps, readinessPercent } from './SetupHub';

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

describe('SetupHub reads, never invents', () => {
  const src = readFileSync(resolve(__dirname, './SetupHub.tsx'), 'utf8');
  it('loads the business and its catalogue from the existing onboarding endpoints', () => {
    expect(src).toContain('adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}`)');
    expect(src).toContain('adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}/catalogue`)');
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
