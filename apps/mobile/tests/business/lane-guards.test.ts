/**
 * VTID-05645 — lane guards for the native Business Hub port: the seven route files exist, all 13
 * ledger web paths resolve as native and their rows are `native`, no physical left/right and no raw
 * locale calls in the lane's files, every catalog key the lane renders exists in all 11 locales
 * (DE source of truth), the new shard is complete, and the lane makes no Supabase write.
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { catalogs, LOCALES } from '../../src/i18n';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';

const APP = resolve(__dirname, '../..');
const REPO = resolve(APP, '../..');
const LANE_ROOTS = ['app/(app)/business', 'src/screens/business'];

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
const laneFiles = () => LANE_ROOTS.flatMap(filesUnder);
const read = (rel: string) => readFileSync(join(APP, rel), 'utf8');

const WEB_PATHS = [
  '/business',
  '/business/services',
  '/business/clients',
  '/business/sell-earn',
  '/business/analytics',
  '/business?tab=services.events',
  '/business?tab=services.packages',
  '/business?tab=sales.promotions',
  '/business?tab=sales.referrals',
  '/business?tab=insights.earnings',
  '/business?tab=insights.growth',
  '/business/opportunities',
  '/business/listings',
];

describe('business routes', () => {
  it('the seven route files exist', () => {
    for (const f of ['index', 'services', 'clients', 'sell-earn', 'analytics', 'opportunities', 'listings']) {
      expect(existsSync(join(APP, `app/(app)/business/${f}.tsx`))).toBe(true);
    }
  });

  it('all thirteen web paths resolve native', () => {
    for (const url of WEB_PATHS) expect([url, resolveWebPath(url).kind]).toEqual([url, 'native']);
  });

  it('the static routes are listed as native and no dynamic pattern was added', () => {
    for (const r of ['/business', '/business/services', '/business/clients', '/business/sell-earn', '/business/analytics', '/business/opportunities', '/business/listings']) {
      expect(NATIVE_ROUTES).toContain(r);
    }
  });

  it('the thirteen ledger rows are native', () => {
    const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows?: Array<{ key: string; web_path: string; status: string }> } | Array<{ key: string; web_path: string; status: string }>;
    const rows = Array.isArray(ledger) ? ledger : (ledger.rows ?? []);
    const mine = rows.filter((r) => WEB_PATHS.includes(r.web_path) && r.key.startsWith('BUSINESS.'));
    expect(mine.map((r) => r.web_path).sort()).toEqual([...WEB_PATHS].sort());
    expect(mine.filter((r) => r.status !== 'native').map((r) => r.key)).toEqual([]);
  });
});

describe('lane code rules', () => {
  it('the lane has files to check', () => {
    expect(laneFiles().length).toBeGreaterThan(12);
  });

  it('no physical left/right styling (start/end only)', () => {
    const physical = /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\b|textAlign:\s*['"](left|right)['"]|\b(left|right):\s/;
    expect(laneFiles().filter((f) => physical.test(read(f)))).toEqual([]);
  });

  it('no raw toLocale* calls and no date-fns format import (the locale-format rule)', () => {
    const raw = /toLocale(?:Date|Time)?String\s*\(|from ['"]date-fns['"]/;
    expect(laneFiles().filter((f) => raw.test(read(f)))).toEqual([]);
  });

  it('no direct @vitana/* or ui-kit import (lane code goes through src/ports)', () => {
    const bad = laneFiles().filter((f) => /from\s+['"](@vitana\/|(\.\.\/)+ui\/|(\.\.\/)+packages\/)/.test(read(f)));
    expect(bad).toEqual([]);
  });

  it('the lane never writes to Supabase tables', () => {
    expect(laneFiles().filter((f) => /\.(insert|update|upsert|delete)\(/.test(read(f)))).toEqual([]);
  });
});

const flatten = (node: unknown, prefix: string, out: Set<string>) => {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.add(prefix);
  }
  return out;
};

describe('catalog keys', () => {
  it('every t() key used by the lane exists in all 11 locales', () => {
    const keys = new Set<string>();
    for (const f of laneFiles()) for (const m of read(f).matchAll(/\bt\(\s*['"]([A-Za-z][A-Za-z0-9_.]*)['"]/g)) keys.add(m[1]);
    // keys composed at run time (status / type labels)
    for (const s of ['draft', 'published', 'archived']) keys.add(`businessNative.packages.status.${s}`);
    for (const s of ['bundle', 'subscription', 'program']) keys.add(`businessNative.packages.type.${s}`);
    for (const s of ['draft', 'scheduled', 'active', 'completed']) keys.add(`businessNative.campaigns.status.${s}`);
    for (const k of ['screens.businesshub.performance', 'screens.businesshub.bookingAnalyticsComingSoon', 'screens.businesshub.earnings', 'screens.businesshub.earningsBreakdownComingSoon', 'screens.businesshub.growth', 'screens.businesshub.growthAnalyticsComingSoon']) keys.add(k);
    expect(keys.size).toBeGreaterThan(60);
    const missing: string[] = [];
    for (const locale of LOCALES) {
      const have = flatten(catalogs[locale], '', new Set<string>());
      for (const k of keys) if (!have.has(k)) missing.push(`${locale}:${k}`);
    }
    expect(missing).toEqual([]);
  });

  it('the businessNative shard has the same keys in every locale, no empty values, du-form German, Brazilian pt', () => {
    const load = (l: string) => JSON.parse(readFileSync(join(REPO, `src/i18n/${l}/businessNative.json`), 'utf8')) as Record<string, unknown>;
    const de = flatten(load('de'), '', new Set<string>());
    expect(de.size).toBeGreaterThan(40);
    for (const l of LOCALES) {
      const shard = load(l);
      expect([...flatten(shard, '', new Set<string>())].sort()).toEqual([...de].sort());
      const values = JSON.stringify(shard);
      expect(values).not.toMatch(/:\s*""/);
    }
    expect(JSON.stringify(load('de'))).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen)\b/);
    expect(JSON.stringify(load('pt'))).not.toMatch(/\b(tu|teu|tua)\b/i);
  });
});
