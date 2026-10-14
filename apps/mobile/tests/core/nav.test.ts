/** VTID-05183 — extracted nav data: icon names in the generated union, every i18n key in the de + en catalogs. */
import {
  communityBottomNav,
  ROLE_NAV_ITEMS,
  resolveRoleBottomNav,
  hideNavRoutes,
  roleSectionRoutes,
  drawerNavItems,
  drawerNavIconTones,
  CROSS_MODE_IDS,
  BUSINESS_DRAWER_KEYS,
  ICON_NAMES,
} from '@vitana/core/nav';
import { resolveBusinessBottomNav, businessDrawerItems } from '@vitana/core/business-mode';
import { patientNavigation, professionalNavigation, staffNavigation } from '@vitana/core/roles';
import { catalogs } from '../../src/i18n';

function lookup(catalog: Record<string, unknown>, key: string): unknown {
  let v: unknown = catalog;
  for (const part of key.split('.')) v = v && typeof v === 'object' ? (v as Record<string, unknown>)[part] : undefined;
  return v;
}

const bottomItems = [
  ...communityBottomNav,
  ...Object.values(ROLE_NAV_ITEMS).flat(),
  ...['org_admin', 'staff', 'professional'].flatMap((r) => [...resolveBusinessBottomNav(r), ...businessDrawerItems(r)]),
];

describe('nav icons', () => {
  it('every icon used is in the generated IconName union', () => {
    const used = [
      ...bottomItems.map((i) => i.icon),
      ...drawerNavItems.map((i) => i.icon),
      ...[...patientNavigation, ...professionalNavigation, ...staffNavigation].map((i) => i.icon),
    ];
    const known = new Set<string>(ICON_NAMES);
    for (const icon of used) expect(known.has(icon)).toBe(true);
    expect(used.every((i) => typeof i === 'string')).toBe(true);
  });
});

describe('nav i18n keys', () => {
  const keys = [
    ...bottomItems.map((i) => i.i18nKey),
    ...drawerNavItems.map((i) => i.translationKey),
    ...Object.values(BUSINESS_DRAWER_KEYS),
  ];
  it.each([...new Set(keys)])('%s exists in de and en', (key) => {
    expect(typeof lookup(catalogs.de, key)).toBe('string');
    expect(typeof lookup(catalogs.en, key)).toBe('string');
  });
});

describe('nav data', () => {
  it('route lists and role bars', () => {
    expect(hideNavRoutes).toContain('/maxina');
    expect(roleSectionRoutes).toHaveLength(5);
    expect(resolveRoleBottomNav('patient')?.map((i) => i.path)[0]).toBe('/patient/dashboard');
    expect(resolveRoleBottomNav('community')).toBeNull();
    expect(resolveRoleBottomNav(null)).toBeNull();
    expect(CROSS_MODE_IDS).toContain('logout');
    for (const id of CROSS_MODE_IDS) expect(drawerNavItems.some((i) => i.id === id)).toBe(true);
    expect(drawerNavIconTones.journey.base).toMatch(/^hsl\(/);
  });
});
