/**
 * VTID-05530 — lane guards for the native calendar / reminders port: the four routes exist and
 * resolve as native, no physical left/right and no raw locale calls in the lane's files (dates and
 * times only through the locale-format twin), no class-B web module in core, and every catalog key
 * the lane renders exists in all 11 locales (the new calendarNative keys DE-first, du-form).
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { catalogs, LOCALES } from '../../src/i18n';
import { NATIVE_PATTERNS, NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';

jest.setTimeout(30000);

const APP = resolve(__dirname, '../..');
const ROOT = resolve(APP, '../..');
const LANE_FILES_ROOTS = ['app/(app)/calendar', 'app/(app)/reminders', 'src/screens/calendar'];

function filesUnder(rel: string): string[] {
  const full = join(APP, rel);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return [rel];
  const out: string[] = [];
  for (const name of readdirSync(full).sort()) {
    const child = join(rel, name);
    if (statSync(join(APP, child)).isDirectory()) {
      if (name === '__tests__') continue;
      out.push(...filesUnder(child));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(child);
    }
  }
  return out;
}

const laneFiles = () => LANE_FILES_ROOTS.flatMap(filesUnder);
const read = (rel: string) => readFileSync(join(APP, rel), 'utf8');

describe('routes', () => {
  it('the four route files exist', () => {
    for (const f of [
      'app/(app)/calendar/index.tsx',
      'app/(app)/calendar/entry/[entryId].tsx',
      'app/(app)/reminders/index.tsx',
      'app/(app)/reminders/fire/[fireId].tsx',
    ]) {
      expect(existsSync(join(APP, f))).toBe(true);
    }
  });

  it('/calendar and /reminders are native routes; the entry and fire links are native patterns', () => {
    expect(NATIVE_ROUTES).toContain('/calendar');
    expect(NATIVE_ROUTES).toContain('/reminders');
    expect(NATIVE_PATTERNS).toContain('/calendar/entry/:entryId');
    expect(NATIVE_PATTERNS).toContain('/reminders/fire/:fireId');
    for (const url of ['/calendar', '/reminders', '/reminders?filter=missed', '/calendar/entry/abc-123', '/reminders/fire/f-1']) {
      expect(resolveWebPath(url).kind).toBe('native');
    }
  });
});

describe('lane code rules', () => {
  it('the lane has files to check', () => {
    expect(laneFiles().length).toBeGreaterThan(10);
  });

  it('no physical left/right styling (start/end only)', () => {
    const physical = /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)\b|textAlign:\s*['"](left|right)['"]|\b(left|right):\s/;
    const offenders = laneFiles().filter((f) => physical.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('no raw toLocale* calls and no date-fns import (the locale-format rule)', () => {
    const raw = /toLocale(?:Date|Time)?String\s*\(|from ['"]date-fns/;
    const offenders = laneFiles().filter((f) => raw.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('Intl is only used in the locale-format twin (format.ts)', () => {
    const offenders = laneFiles().filter((f) => !f.endsWith('screens/calendar/format.ts') && /\bIntl\./.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('no class-B web module was moved into core for this lane', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'packages/core/manifest.json'), 'utf8')).reexports as Record<string, unknown>;
    expect(Object.keys(manifest).filter((k) => /calendar|reminders|Calendar\.tsx/.test(k))).toEqual([]);
  });

  it('no hard-coded user-visible text in JSX (everything goes through t())', () => {
    const jsxText = /<[A-Za-z][\w.]*(?:\s[^<>]*)?>\s*[A-Za-z][A-Za-z ,.!?'’-]{2,}\s*</;
    const offenders = laneFiles()
      .filter((f) => f.endsWith('.tsx'))
      .filter((f) => jsxText.test(read(f).replace(/\{[^{}]*\}/g, '{}')));
    expect(offenders).toEqual([]);
  });
});

describe('catalog keys the lane renders', () => {
  const flatten = (node: unknown, prefix: string, out: Set<string>) => {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    } else {
      out.add(prefix);
    }
    return out;
  };

  it('every t() / notify() key used by the lane exists in all 11 locales', () => {
    const keys = new Set<string>();
    for (const f of laneFiles()) {
      for (const m of read(f).matchAll(/\b(?:t|notify|notifyError)\(\s*['"`]([A-Za-z][A-Za-z0-9_.]*)['"`]/g)) keys.add(m[1]);
      // keys built from a prefix, e.g. t(`vcal.kinds.${kind}`), are listed in KEY_FAMILIES below
    }
    expect(keys.size).toBeGreaterThan(40);
    const missing: string[] = [];
    for (const locale of LOCALES) {
      const have = flatten(catalogs[locale], '', new Set<string>());
      for (const k of keys) if (!have.has(k)) missing.push(`${locale}:${k}`);
    }
    expect(missing).toEqual([]);
  });

  it('the key families built from a value exist in all 11 locales', () => {
    const families: Record<string, string[]> = {
      'vcal.kinds': ['nutrition', 'hydration', 'exercise', 'sleep', 'mental', 'community', 'lab', 'work', 'vitana', 'personal'],
      'vcal.views': ['day', 'week', 'month'],
      'vcal.form.types': ['personal', 'professional', 'health', 'workout', 'community', 'nutrition'],
      'vcal.move.blocked': ['cancelled', 'completed', 'recurring', 'owned_by_source'],
      'vcal.work': ['deploy_staging', 'deploy_prod', 'autopilot_review', 'ticket_due', 'erp_approval'],
    };
    const missing: string[] = [];
    for (const locale of LOCALES) {
      const have = flatten(catalogs[locale], '', new Set<string>());
      for (const [prefix, names] of Object.entries(families)) for (const n of names) if (!have.has(`${prefix}.${n}`)) missing.push(`${locale}:${prefix}.${n}`);
    }
    expect(missing).toEqual([]);
  });

  it('the calendarNative shard exists for all 11 locales with the same keys, du-form in German', () => {
    const shard = (l: string) => JSON.parse(readFileSync(join(ROOT, `src/i18n/${l}/calendarNative.json`), 'utf8')) as Record<string, unknown>;
    const de = flatten(shard('de'), '', new Set<string>());
    expect(de.size).toBeGreaterThanOrEqual(2);
    for (const l of LOCALES) expect([...flatten(shard(l), '', new Set<string>())].sort()).toEqual([...de].sort());
    expect(JSON.stringify(shard('de'))).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen)\b/);
  });
});
