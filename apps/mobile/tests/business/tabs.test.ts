/**
 * VTID-05645 — the Business Hub tab model: the path mapping, the valid-leaf set, the `?tab=` rule and
 * the mode-pill options (Sales only for resellers), the web `pathToMobileTab` / `resolveMobileTab`.
 */
import { buildBusinessModes, pathToMobileTab, resolveMobileTab, VALID_BUSINESS_TABS } from '../../src/screens/business/tabs';

const t = (key: string) => key;

describe('pathToMobileTab', () => {
  it.each([
    ['/business', 'snapshot'],
    ['/business/services', 'services.services'],
    ['/business/clients', 'insights.clients'],
    ['/business/sell-earn', 'sales.inventory'],
    ['/business/analytics', 'insights.performance'],
    ['/business/unknown', 'snapshot'],
  ])('%s → %s', (path, tab) => {
    expect(pathToMobileTab(path)).toBe(tab);
  });
});

describe('resolveMobileTab', () => {
  it('has the eleven pill leaves', () => {
    expect([...VALID_BUSINESS_TABS].sort()).toEqual(
      ['insights.clients', 'insights.earnings', 'insights.growth', 'insights.performance', 'sales.inventory', 'sales.promotions', 'sales.referrals', 'services.events', 'services.packages', 'services.services', 'snapshot'].sort(),
    );
  });

  it.each([...VALID_BUSINESS_TABS])('a valid ?tab=%s wins over the path', (leaf) => {
    expect(resolveMobileTab('/business/clients', leaf)).toBe(leaf);
  });

  it('an invalid or missing ?tab= falls back to the path mapping', () => {
    expect(resolveMobileTab('/business/clients', 'nope')).toBe('insights.clients');
    expect(resolveMobileTab('/business/services', null)).toBe('services.services');
    expect(resolveMobileTab('/business', undefined)).toBe('snapshot');
  });
});

describe('buildBusinessModes', () => {
  const leaves = (modes: ReturnType<typeof buildBusinessModes>) => modes.flatMap((m) => (m.children ? m.children.map((c) => c.value) : [m.value]));

  it('offers the Sales group to resellers only', () => {
    expect(buildBusinessModes(t, false).map((m) => m.value)).toEqual(['snapshot', 'services', 'insights']);
    expect(buildBusinessModes(t, true).map((m) => m.value)).toEqual(['snapshot', 'services', 'sales', 'insights']);
  });

  it('every pill leaf is a valid tab and every valid tab is a pill leaf for a reseller', () => {
    expect(leaves(buildBusinessModes(t, true)).sort()).toEqual([...VALID_BUSINESS_TABS].sort());
  });
});
