/**
 * VTID-03833 — BACKOFFICE_SECTIONS is the single source of truth for the
 * BackOffice sidebar and tabs. These tests pin the shape the plan (B4) fixed
 * and guard the three things that drift silently: i18n keys, screen IDs and
 * the /admin ↔ /backoffice handshake.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BACKOFFICE_SECTIONS,
  BACKOFFICE_HOME,
  getBackOfficeContentSections,
  getBackOfficeSectionByPath,
  getBackOfficeTabByPath,
  getBackOfficeTabWave,
  canUseBackOfficeSection,
} from './backoffice-navigation';
import { ADMIN_SECTIONS } from './admin-navigation';
import { backOfficeNavigation, getRoleNavigation, getVisibleBackOfficeNavigation } from './role-navigation';
import { SCREEN_MAPPINGS } from '@/lib/screen-id';
import de from '@/i18n/de/backoffice.json';
import deSidebar from '@/i18n/de/sidebar.json';
import deScreens from '@/i18n/de/screens.json';

const content = getBackOfficeContentSections();

/**
 * The real content keys of an i18n node, excluding metadata.
 *
 * `_pending_review` is a sibling of the string leaves it flags — that is the
 * shape `translate-keys.mjs --init` writes and `collectPending()` reads, and
 * it is how the translate workflow knows which keys still need a translator.
 * Every script that walks these catalogs skips `_`-prefixed keys for exactly
 * this reason (i18n-audit.mjs, translate-keys.mjs); this test did not, so a
 * correctly-flagged untranslated key read as an extra TAB and the suite went
 * red on the propagation bot doing its job.
 *
 * Stripping the markers to make this pass is the wrong repair and was tried:
 * it hides genuinely untranslated keys from the pipeline for good. 56 of 64
 * French backoffice labels are still identical to English — the flags are
 * telling the truth.
 */
function contentKeys(tabs: Record<string, unknown>): string[] {
  return Object.keys(tabs).filter((k) => !k.startsWith('_')).sort();
}

describe('BACKOFFICE_SECTIONS (VTID-03833)', () => {
  it('has 13 sidebar items: "← Admin" first (adminOnly) + the 12 department sections in plan order', () => {
    expect(BACKOFFICE_SECTIONS).toHaveLength(13);
    expect(BACKOFFICE_SECTIONS[0].key).toBe('back');
    expect(BACKOFFICE_SECTIONS[0].adminOnly).toBe(true);
    expect(BACKOFFICE_SECTIONS[0].basePath).toBe('/admin/dashboard');
    expect(content.map((s) => s.key)).toEqual([
      'overview', 'sales', 'marketing', 'accounting', 'finance', 'hr',
      'operations', 'legal', 'reports', 'approvals', 'audit', 'settings',
    ]);
  });

  it('wave-1 scope is exactly decision 5 (cockpit + order-to-cash)', () => {
    const wave1 = content.filter((s) => s.wave === 1).map((s) => s.key);
    expect(wave1).toEqual(['overview', 'sales', 'accounting', 'finance', 'reports', 'approvals', 'audit', 'settings']);
    expect(content.filter((s) => s.wave === 2).map((s) => s.key)).toEqual(['marketing', 'hr', 'operations', 'legal']);
  });

  it('every tab path lives under its section basePath, keys are unique, defaultTab exists', () => {
    const allPaths = new Set<string>();
    for (const s of content) {
      expect(s.basePath.startsWith('/backoffice')).toBe(true);
      expect(s.tabs.some((t) => t.key === s.defaultTab)).toBe(true);
      const keys = new Set(s.tabs.map((t) => t.key));
      expect(keys.size).toBe(s.tabs.length);
      for (const t of s.tabs) {
        expect(t.path.startsWith(s.basePath === '/backoffice' ? '/backoffice/' : s.basePath + '/')).toBe(true);
        expect(allPaths.has(t.path)).toBe(false);
        allPaths.add(t.path);
        expect([1, 2, 3]).toContain(getBackOfficeTabWave(s, t));
      }
    }
    expect(new Set(content.map((s) => s.key)).size).toBe(content.length);
  });

  it('path helpers resolve longest basePath first and never resolve the "← Admin" link', () => {
    expect(getBackOfficeSectionByPath('/backoffice/sales/leads')?.key).toBe('sales');
    expect(getBackOfficeTabByPath('/backoffice/sales/leads')?.key).toBe('leads');
    expect(getBackOfficeSectionByPath('/backoffice/dashboard')?.key).toBe('overview');
    expect(getBackOfficeSectionByPath('/backoffice')?.key).toBe('overview');
    expect(getBackOfficeSectionByPath('/admin/dashboard')).toBeUndefined();
    expect(getBackOfficeSectionByPath('/backoffice/nope')?.key).toBe('overview'); // falls to the /backoffice base
    expect(getBackOfficeTabByPath('/backoffice/nope')).toBeUndefined();
    expect(BACKOFFICE_HOME).toBe('/backoffice/dashboard');
  });

  it('per-tab waves: the plan\'s wave-2 tabs inside wave-1 sections are marked', () => {
    const acct = content.find((s) => s.key === 'accounting')!;
    expect(getBackOfficeTabWave(acct, acct.tabs.find((t) => t.key === 'journals'))).toBe(1);
    expect(getBackOfficeTabWave(acct, acct.tabs.find((t) => t.key === 'tax'))).toBe(2);
    const hr = content.find((s) => s.key === 'hr')!;
    expect(getBackOfficeTabWave(hr, hr.tabs.find((t) => t.key === 'payroll'))).toBe(3);
  });

  it('DE i18n (source of truth) carries every sidebar label, every tab label and the placeholder strings', () => {
    const sidebar = (deSidebar as { sidebar: Record<string, unknown> }).sidebar.backoffice as Record<string, string>;
    const tabs = (de as { backoffice: Record<string, { tabs: Record<string, string> }> }).backoffice;
    for (const s of BACKOFFICE_SECTIONS) {
      expect(sidebar[s.key], `sidebar.backoffice.${s.key}`).toBeTruthy();
      for (const t of s.tabs) expect(tabs[s.key]?.tabs[t.key], `backoffice.${s.key}.tabs.${t.key}`).toBeTruthy();
    }
    const screens = (deScreens as { screens: Record<string, Record<string, string>> }).screens.backoffice;
    for (const k of ['comingWave1', 'comingWave2', 'comingWave3', 'placeholderBody', 'noSectionMatches', 'sidebarIsCanonical']) {
      expect(screens[k], `screens.backoffice.${k}`).toBeTruthy();
    }
  });

  it('every other locale mirrors the DE key set (no mid-UI fallback)', () => {
    const deTabs = (de as { backoffice: Record<string, { tabs: Record<string, string> }> }).backoffice;
    for (const loc of ['en', 'es', 'sr', 'ar', 'fr', 'pl', 'pt', 'ru', 'tr', 'zh']) {
      const other = JSON.parse(readFileSync(`src/i18n/${loc}/backoffice.json`, 'utf8')).backoffice;
      const sb = JSON.parse(readFileSync(`src/i18n/${loc}/sidebar.json`, 'utf8')).sidebar.backoffice;
      for (const s of Object.keys(deTabs)) {
        expect(contentKeys(other[s].tabs), `${loc}:${s}`).toEqual(contentKeys(deTabs[s].tabs));
      }
      expect(contentKeys(sb), `${loc}:sidebar`).toEqual(BACKOFFICE_SECTIONS.map((s) => s.key).sort());
    }
  });

  it('every content tab has a BO-### screen ID mapping and vice versa', () => {
    const bo = SCREEN_MAPPINGS.filter((m) => m.category === 'backoffice');
    const tabPaths = content.flatMap((s) => s.tabs.map((t) => t.path)).sort();
    expect(bo.map((m) => m.route).sort()).toEqual(tabPaths);
    expect(new Set(bo.map((m) => m.screenId)).size).toBe(bo.length);
    for (const m of bo) expect(String(m.screenId)).toMatch(/^BO-\d{3}$/);
  });

  it('"← Admin" is visible only to users who can enter /admin', () => {
    expect(getVisibleBackOfficeNavigation(true)).toHaveLength(13);
    expect(getVisibleBackOfficeNavigation(true)[0].path).toBe('/admin/dashboard');
    const noAdmin = getVisibleBackOfficeNavigation(false);
    expect(noAdmin).toHaveLength(12);
    expect(noAdmin.some((i) => i.path.startsWith('/admin'))).toBe(false);
    expect(noAdmin[0].path).toBe('/backoffice/dashboard');
  });

  it('VTID-03834: sections are gated by ERP capabilities (any-of); Overview/Approvals never; unknown = show all', () => {
    const sales = content.find((s) => s.key === 'sales')!;
    const overview = content.find((s) => s.key === 'overview')!;
    const approvals = content.find((s) => s.key === 'approvals')!;
    const hr = content.find((s) => s.key === 'hr')!;
    expect(canUseBackOfficeSection(sales, ['crm.view'])).toBe(true);
    expect(canUseBackOfficeSection(sales, ['sales.view'])).toBe(true);
    expect(canUseBackOfficeSection(sales, ['reports.view'])).toBe(false);
    expect(canUseBackOfficeSection(sales, [])).toBe(false);
    expect(canUseBackOfficeSection(sales, null)).toBe(true);
    expect(canUseBackOfficeSection(overview, [])).toBe(true);
    expect(canUseBackOfficeSection(approvals, [])).toBe(true);
    expect(canUseBackOfficeSection(hr, ['finance.view'])).toBe(false);
    expect(canUseBackOfficeSection(hr, ['hr.view'])).toBe(true);
    // a pure backoffice grant with nothing else sees only Overview + Approvals
    const bare = getVisibleBackOfficeNavigation(false, []);
    expect(bare.map((i) => i.path)).toEqual(['/backoffice/dashboard', '/backoffice/approvals/queue']);
    // a bookkeeper: finance + accounting + reports + overview + approvals
    const bookkeeper = getVisibleBackOfficeNavigation(false, ['finance.view', 'accounting.view', 'reports.view']);
    expect(bookkeeper.map((i) => i.path)).toEqual([
      '/backoffice/dashboard', '/backoffice/accounting/journals', '/backoffice/finance/payments', '/backoffice/reports/pnl', '/backoffice/approvals/queue',
    ]);
    // every gated section names only catalog-shaped capabilities
    for (const s of content) for (const c of s.capabilities ?? []) expect(c).toMatch(/^[a-z]+\.[a-z_]+$/);
  });

  it('sidebar derivation and the /admin handshake', () => {
    expect(getRoleNavigation('backoffice')).toBe(backOfficeNavigation);
    expect(backOfficeNavigation).toHaveLength(13);
    expect(backOfficeNavigation[0]).toMatchObject({ path: '/admin/dashboard', adminOnly: true, i18nKey: 'sidebar.backoffice.back' });
    expect(backOfficeNavigation[1]).toMatchObject({ path: '/backoffice/dashboard', i18nKey: 'sidebar.backoffice.overview' });
    // 14th admin item jumps into BackOffice
    expect(ADMIN_SECTIONS).toHaveLength(14);
    expect(ADMIN_SECTIONS[13]).toMatchObject({ key: 'backoffice', basePath: '/backoffice', defaultTab: 'dashboard', wave: 1 });
    expect(ADMIN_SECTIONS[13].tabs[0].path).toBe('/backoffice/dashboard');
  });
});
