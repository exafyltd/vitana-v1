/**
 * VTID-05532 — lane guards for the native live-rooms port: the two routes exist and resolve as native,
 * no physical left/right and no raw locale calls in the lane's files, every catalog key the lane renders
 * exists in all 11 locales, and the Daily.co SDK is not imported (its device join is G1-deferred).
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { catalogs, LOCALES } from '../../src/i18n';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { configure } from '@testing-library/react-native';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(30000);

const APP = resolve(__dirname, '../..');
const LANE_FILES_ROOTS = ['app/(app)/comm/live-rooms', 'src/screens/liverooms', 'src/ports/live-room-video.ts'];

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

describe('live-rooms routes', () => {
  it('the list and the viewer route files exist', () => {
    expect(existsSync(join(APP, 'app/(app)/comm/live-rooms/index.tsx'))).toBe(true);
    expect(existsSync(join(APP, 'app/(app)/comm/live-rooms/[roomId]/view.tsx'))).toBe(true);
  });

  it('the static list route is native and every tab variant resolves to it', () => {
    expect(NATIVE_ROUTES).toContain('/comm/live-rooms');
    for (const url of ['/comm/live-rooms', '/comm/live-rooms?tab=all', '/comm/live-rooms?tab=live', '/comm/live-rooms?tab=past', '/comm/live-rooms?tab=scheduled']) {
      expect(resolveWebPath(url).kind).toBe('native');
    }
  });
});

describe('lane code rules', () => {
  it('the lane has files to check', () => {
    expect(laneFiles().length).toBeGreaterThan(5);
  });

  it('no physical left/right styling (start/end only)', () => {
    const physical = /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\b|textAlign:\s*['"](left|right)['"]|\b(left|right):\s/;
    const offenders = laneFiles().filter((f) => physical.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('no raw toLocale* calls and no date-fns format import (the locale-format rule)', () => {
    const raw = /toLocale(?:Date|Time)?String\s*\(|from ['"]date-fns['"]/;
    const offenders = laneFiles().filter((f) => raw.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('the Daily.co SDK is not imported by the lane (the device join is G1-deferred)', () => {
    const offenders = laneFiles().filter((f) => /@daily-co\//.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

describe('catalog keys the lane renders', () => {
  it('every t() key used by the lane exists in all 11 locales', () => {
    const keys = new Set<string>();
    for (const f of laneFiles()) {
      for (const m of read(f).matchAll(/\bt\(\s*['"]([A-Za-z][A-Za-z0-9_.]*)['"]/g)) keys.add(m[1]);
    }
    expect(keys.size).toBeGreaterThan(20);
    const flatten = (node: unknown, prefix: string, out: Set<string>) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
      } else {
        out.add(prefix);
      }
      return out;
    };
    const missing: string[] = [];
    for (const locale of LOCALES) {
      const have = flatten(catalogs[locale], '', new Set<string>());
      for (const k of keys) if (!have.has(k)) missing.push(`${locale}:${k}`);
    }
    expect(missing).toEqual([]);
  });

});
