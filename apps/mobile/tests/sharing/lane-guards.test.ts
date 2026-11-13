/**
 * VTID-05646 — lane guards for the native sharing port: the route files sit where the plan says
 * (`/pub/campaigns/:id` public, `/creator/onboarded` under the AuthGate), the concrete routes
 * resolve native, no physical left/right and no raw locale calls in the lane's files, no
 * `html2canvas`, every catalog key the lane renders exists in all 11 locales, and the 8 ledger rows
 * are native.
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { catalogs, LOCALES } from '../../src/i18n';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { GUEST_PATHS } from '../../src/navigation/guest-paths';
import { configure } from '@testing-library/react-native';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(30000);

const APP = resolve(__dirname, '../..');
const ROUTES = [
  'app/(app)/sharing',
  'app/(app)/invite.tsx',
  'app/(app)/creator',
  'app/(public)/pub',
];
const LANE_FILES_ROOTS = [...ROUTES, 'src/screens/sharing', 'src/ports/share-capture.ts'];

function filesUnder(rel: string): string[] {
  const full = join(APP, rel);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return [rel];
  const out: string[] = [];
  for (const name of readdirSync(full).sort()) {
    const child = join(rel, name);
    if (statSync(join(APP, child)).isDirectory()) out.push(...filesUnder(child));
    else if (/\.(ts|tsx)$/.test(name)) out.push(child);
  }
  return out;
}
const laneFiles = () => LANE_FILES_ROOTS.flatMap(filesUnder);
const read = (rel: string) => readFileSync(join(APP, rel), 'utf8');

describe('sharing routes', () => {
  it.each([
    'app/(app)/sharing/index.tsx',
    'app/(app)/sharing/campaigns/index.tsx',
    'app/(app)/sharing/campaigns/[id].tsx',
    'app/(app)/sharing/distribution.tsx',
    'app/(app)/sharing/data-consent.tsx',
    'app/(app)/invite.tsx',
    'app/(app)/creator/onboarded.tsx',
    'app/(public)/pub/campaigns/[id].tsx',
  ])('%s exists', (file) => {
    expect(existsSync(join(APP, file))).toBe(true);
  });

  it('/pub/campaigns/:id is public (outside (app)/) and /creator/onboarded stays under the AuthGate', () => {
    expect(existsSync(join(APP, 'app/(app)/pub'))).toBe(false);
    expect(existsSync(join(APP, 'app/(public)/creator'))).toBe(false);
    expect(GUEST_PATHS.some((p) => p.startsWith('/creator') || p.startsWith('/pub'))).toBe(false);
    const layout = read('app/(public)/_layout.tsx');
    expect(layout).not.toMatch(/AuthGate|MobileAppShell|useAuth/);
  });

  it('the concrete routes resolve native and the dynamic ones to their own href', () => {
    for (const p of ['/sharing', '/sharing/campaigns', '/sharing/distribution', '/sharing/data-consent', '/invite', '/creator/onboarded']) {
      expect(NATIVE_ROUTES).toContain(p);
      expect(resolveWebPath(p).kind).toBe('native');
    }
    expect(resolveWebPath('/sharing/campaigns/abc').href).toBe('/sharing/campaigns/abc');
    expect(resolveWebPath('/pub/campaigns/abc').href).toBe('/pub/campaigns/abc');
  });

  it('the 8 parity rows are native', () => {
    const ledger = JSON.parse(read('parity/ledger.json')) as { rows: Array<{ key: string; status: string; lane: string }> };
    const keys = ['SHARING.OVERVIEW', 'SHARING.CAMPAIGNS', 'SHARING.CAMPAIGN_DETAIL', 'SHARING.DISTRIBUTION', 'SHARING.DATA_CONSENT', 'COMM.INVITE', '/creator/onboarded', '/pub/campaigns/:id'];
    for (const key of keys) expect(ledger.rows.find((r) => r.key === key)).toMatchObject({ lane: 'sharing-business', status: 'native' });
  });
});

describe('lane code rules', () => {
  it('the lane has files to check', () => {
    expect(laneFiles().length).toBeGreaterThan(15);
  });

  it('no physical left/right styling (start/end only)', () => {
    const physical = /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\b|textAlign:\s*['"](left|right)['"]|\b(left|right):\s/;
    expect(laneFiles().filter((f) => physical.test(read(f)))).toEqual([]);
  });

  it('no raw toLocale* calls and no date-fns format import (the locale-format rule)', () => {
    const raw = /toLocale(?:Date|Time)?String\s*\(|from ['"]date-fns['"]/;
    expect(laneFiles().filter((f) => raw.test(read(f)))).toEqual([]);
  });

  it('html2canvas is not used: the share card is captured natively', () => {
    expect(laneFiles().filter((f) => /html2canvas/.test(read(f)))).toEqual([]);
  });

  it('screens use no lane package directly and no web-only module', () => {
    const bad = /from\s+['"](@vitana\/|react-dom|sonner|recharts|date-fns)/;
    expect(laneFiles().filter((f) => bad.test(read(f)))).toEqual([]);
  });
});

describe('catalog keys the lane renders', () => {
  it('every t() key used by the lane exists in all 11 locales', () => {
    const keys = new Set<string>();
    for (const f of laneFiles()) {
      for (const m of read(f).matchAll(/\bt\(\s*['"]([A-Za-z][A-Za-z0-9_.]*)['"]/g)) keys.add(m[1]);
      for (const m of read(f).matchAll(/['"]((?:screens|toasts|sharingNative|eventCta|mailhub|common|errors|liveRooms|proactive|spotlightMember)\.[A-Za-z0-9_.]+)['"]/g)) keys.add(m[1]);
    }
    expect(keys.size).toBeGreaterThan(60);
    const flatten = (node: unknown, prefix: string, out: Set<string>) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
      } else out.add(prefix);
      return out;
    };
    const missing: string[] = [];
    for (const locale of LOCALES) {
      const have = flatten(catalogs[locale], '', new Set<string>());
      for (const k of keys) if (!have.has(k)) missing.push(`${locale}:${k}`);
    }
    expect(missing).toEqual([]);
  });

  it('the new sharingNative shard has the same keys in every locale, de first', () => {
    const REPO = resolve(APP, '../..');
    const flat = (node: unknown, prefix = ''): string[] =>
      node && typeof node === 'object' ? Object.entries(node).flatMap(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k)) : [prefix];
    const de = flat(JSON.parse(readFileSync(join(REPO, 'src/i18n/de/sharingNative.json'), 'utf8'))).sort();
    expect(de.length).toBeGreaterThan(20);
    for (const locale of LOCALES) {
      const keys = flat(JSON.parse(readFileSync(join(REPO, `src/i18n/${locale}/sharingNative.json`), 'utf8'))).sort();
      expect({ locale, keys }).toEqual({ locale, keys: de });
    }
  });

  it('no du-form violation in the German shard (no Sie/Ihr/Ihnen)', () => {
    const REPO = resolve(APP, '../..');
    const text = readFileSync(join(REPO, 'src/i18n/de/sharingNative.json'), 'utf8');
    expect(/\b(Sie|Ihr|Ihre|Ihren|Ihnen)\b/.test(text)).toBe(false);
  });
});
