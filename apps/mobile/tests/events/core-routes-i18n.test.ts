/**
 * VTID-05531 — the lane's wiring and its rules: the `@vitana/core` helper
 * entries and the port screens read them through, the native route files and
 * their NATIVE_ROUTES / resolver entries, the eventsNative shard in all 11
 * locales (German first, du-form), and the lane's source rules (no physical
 * left/right, no raw locale calls, every t() key present in the German shard).
 */
import './helpers';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { configure } from '@testing-library/react-native';
import { selectHotEvents } from '@vitana/core/events-hot';
import { isHttpUrl, toVirtualLink } from '@vitana/core/virtual-link';
import { resolveEventCover } from '@vitana/core/event-cover-image';
import { profilePath } from '@vitana/core/profile-path';
import * as port from '../../src/ports/events';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { LOCALES } from '../../src/i18n';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(30000);

const APP = join(__dirname, '../..');
const SRC = join(APP, 'src');
const EVENTS_SCREENS = join(SRC, 'screens/events');
const WEB_I18N = join(APP, '../../src/i18n');
const ROUTE_DIRS = [join(APP, 'app/(app)/comm/events-meetups'), join(APP, 'app/(app)/community'), join(APP, 'app/(app)/e'), join(APP, 'app/(app)/pub/events')];

/** Source files (not tests) under a directory. */
function sources(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

const laneSources = [...sources(EVENTS_SCREENS), ...ROUTE_DIRS.flatMap((d) => sources(d))];

describe('@vitana/core entries (pure event helpers)', () => {
  it('re-exports the helpers the events hub uses', () => {
    expect(typeof selectHotEvents).toBe('function');
    expect(toVirtualLink(true, 'https://meet.example.org/x')).toBe('https://meet.example.org/x');
    expect(isHttpUrl('ftp://x')).toBe(false);
    expect(typeof resolveEventCover).toBe('function');
    expect(typeof profilePath).toBe('function');
  });

  it('the screen-facing port exposes the same helpers', () => {
    expect(port.selectHotEvents).toBe(selectHotEvents);
    expect(port.toVirtualLink).toBe(toVirtualLink);
    expect(port.resolveEventCover).toBe(resolveEventCover);
  });
});

describe('route files and resolver', () => {
  it('lists the two static routes as native and keeps the dynamic ones out of the static list', () => {
    expect(NATIVE_ROUTES).toContain('/comm/events-meetups');
    expect(NATIVE_ROUTES).toContain('/community/event-game');
    expect(NATIVE_ROUTES.some((r) => r.startsWith('/e/') || r.startsWith('/pub/events'))).toBe(false);
  });

  it('resolves the hub tabs and the landing destinations', () => {
    expect(resolveWebPath('/comm/events-meetups?tab=today')).toMatchObject({ kind: 'native', href: '/comm/events-meetups?tab=today' });
    expect(resolveWebPath('/community/event-game').kind).toBe('native');
    expect(['native', 'unported']).toContain(resolveWebPath('/e/some-slug').kind);
    expect(['native', 'unported']).toContain(resolveWebPath('/pub/events/some-id').kind);
  });

  it('has a route file for every lane destination', () => {
    for (const f of [
      'app/(app)/comm/events-meetups/index.tsx',
      'app/(app)/community/event-game.tsx',
      'app/(app)/e/[slug].tsx',
      'app/(app)/e/game/[slug].tsx',
      'app/(app)/pub/events/[id].tsx',
    ]) {
      expect(existsSync(join(APP, f))).toBe(true);
    }
  });

  it('keeps tests and helpers out of app/ (every file there is a route)', () => {
    for (const dir of ROUTE_DIRS) {
      for (const f of sources(dir)) expect(relative(APP, f)).not.toMatch(/__tests__|\.test\./);
    }
  });
});

describe('eventsNative shard', () => {
  const de = JSON.parse(readFileSync(join(WEB_I18N, 'de/eventsNative.json'), 'utf8')) as Record<string, unknown>;
  const flat = (o: Record<string, unknown>, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));

  it('exists in all 11 locales with the same keys as German', () => {
    const keys = flat(de).sort();
    expect(keys.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const shard = JSON.parse(readFileSync(join(WEB_I18N, `${locale}/eventsNative.json`), 'utf8')) as Record<string, unknown>;
      expect(flat(shard).sort()).toEqual(keys);
    }
  });

  it('uses du-form in German (no Sie, Ihr or Ihnen)', () => {
    expect(JSON.stringify(de)).not.toMatch(/\b(Sie|Ihr|Ihnen)\b/);
  });
});

describe('lane source rules', () => {
  it('has no physical left/right layout keys', () => {
    for (const f of laneSources) {
      const hits = readFileSync(f, 'utf8').match(/\b(marginLeft|marginRight|paddingLeft|paddingRight|left:|right:|textAlign:\s*['"](left|right)['"])/g) ?? [];
      expect({ file: relative(APP, f), hits }).toEqual({ file: relative(APP, f), hits: [] });
    }
  });

  it('uses locale helpers, never raw toLocaleX or the date-fns format import', () => {
    for (const f of laneSources) {
      const hits = readFileSync(f, 'utf8').match(/\.toLocale(Date|Time)?String\(|from\s+['"]date-fns['"]/g) ?? [];
      expect({ file: relative(APP, f), hits }).toEqual({ file: relative(APP, f), hits: [] });
    }
  });

  it('every translation key the lane reads exists in the German catalogs', () => {
    const catalogs = readdirSync(join(WEB_I18N, 'de')).map((n) => JSON.parse(readFileSync(join(WEB_I18N, 'de', n), 'utf8')) as Record<string, unknown>);
    const has = (key: string) =>
      catalogs.some((c) => key.split('.').reduce<unknown>((v, p) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[p] : undefined), c) !== undefined);
    const missing: string[] = [];
    for (const f of laneSources) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\b(?:t|translate)\(\s*['"]([a-zA-Z][\w.]*)['"]/g)) {
        if (!has(m[1])) missing.push(`${relative(APP, f)}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the lane screens import no lane package directly', () => {
    for (const f of sources(EVENTS_SCREENS)) {
      const bad = readFileSync(f, 'utf8').match(/from\s+['"]@vitana\/[^'"]+['"]/g) ?? [];
      expect({ file: relative(APP, f), bad }).toEqual({ file: relative(APP, f), bad: [] });
    }
  });
});
