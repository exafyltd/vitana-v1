/**
 * VTID-05677 — lane guards for the native Media Hub port: the two routes exist and
 * resolve as native, the `/community/media-hub` redirect keeps the query, the four
 * `media` parity rows are native, no physical left/right and no raw locale calls in
 * the lane's files, no raw user-visible text, every catalog key the lane renders
 * exists in all 11 locales, the `mediaHubNative` shards carry the same keys and
 * placeholders as German, and the core re-export is by name.
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { render } from '@testing-library/react-native';
import { catalogs, LOCALES } from '../../src/i18n';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import CommunityRedirect from '../../app/(app)/community/media-hub';
import { redirects, searchParams } from './mocks';

const APP = resolve(__dirname, '../..');
const REPO = resolve(APP, '../..');
const ROOTS = ['app/(app)/comm/media-hub.tsx', 'app/(app)/community/media-hub.tsx', 'src/screens/media', 'src/ports/media.ts', 'src/ports/media-ui.tsx'];

function filesUnder(rel: string): string[] {
  const full = join(APP, rel);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return /\.(ts|tsx)$/.test(rel) ? [rel] : [];
  return readdirSync(full)
    .sort()
    .flatMap((name) => filesUnder(join(rel, name)));
}
const laneFiles = () => ROOTS.flatMap(filesUnder);
const read = (rel: string) => readFileSync(join(APP, rel), 'utf8');
const flatten = (node: unknown, prefix: string, out = new Map<string, string>()) => {
  if (node && typeof node === 'object' && !Array.isArray(node)) for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out.set(prefix, String(node));
  return out;
};

describe('routes', () => {
  it('both route files exist and are native routes', () => {
    expect(existsSync(join(APP, 'app/(app)/comm/media-hub.tsx'))).toBe(true);
    expect(existsSync(join(APP, 'app/(app)/community/media-hub.tsx'))).toBe(true);
    expect(NATIVE_ROUTES).toContain('/comm/media-hub');
    expect(NATIVE_ROUTES).toContain('/community/media-hub');
  });

  it.each(['/comm/media-hub', '/comm/media-hub?tab=music', '/comm/media-hub?tab=podcasts', '/comm/media-hub?tab=shorts', '/comm/media-hub?short=abc', '/community/media-hub'])('%s resolves native', (url) => {
    expect(resolveWebPath(url).kind).toBe('native');
  });

  it('the legacy path redirects to /comm/media-hub with the query kept', () => {
    searchParams.current = { tab: 'music', short: 'abc' };
    redirects.length = 0;
    render(<CommunityRedirect />);
    expect(redirects).toEqual(['/comm/media-hub?tab=music&short=abc']);
    searchParams.current = {};
    render(<CommunityRedirect />);
    expect(redirects[1]).toBe('/comm/media-hub');
  });
});

describe('parity ledger', () => {
  const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { native_only: Array<{ path: string; reason: string }>; rows: Array<{ key: string; lane: string; status: string; web_path: string }> };
  it('the four media rows are native', () => {
    const rows = ledger.rows.filter((r) => r.lane === 'media');
    expect(rows.map((r) => r.key).sort()).toEqual(['COMM.MEDIA_HUB', 'COMM.MEDIA_MUSIC', 'COMM.MEDIA_PODCASTS', 'COMM.MEDIA_SHORTS']);
    expect(rows.map((r) => r.status)).toEqual(['native', 'native', 'native', 'native']);
  });
  it('the legacy redirect is a native_only entry with its reason', () => {
    const e = ledger.native_only.find((n) => n.path === '/community/media-hub');
    expect(e?.reason).toMatch(/App\.tsx:1321/);
  });
});

describe('lane code rules', () => {
  it('has files to check', () => {
    expect(laneFiles().length).toBeGreaterThan(20);
  });

  it('no physical left/right styling (start/end only)', () => {
    const physical = /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor|borderTopLeftRadius|borderTopRightRadius)\b|textAlign:\s*['"](left|right)['"]|\b(left|right):\s/;
    expect(laneFiles().filter((f) => physical.test(read(f)))).toEqual([]);
  });

  it('no raw toLocale* calls and no date-fns import', () => {
    expect(laneFiles().filter((f) => /toLocale(?:Date|Time)?String\s*\(|from ['"]date-fns['"]/.test(read(f)))).toEqual([]);
  });

  it('no raw user-visible text in JSX and no production host literal', () => {
    const jsxText = />\s*[A-Za-z][A-Za-z ,.!?'-]{2,}\s*<\/(Text|Button)>/;
    expect(laneFiles().filter((f) => jsxText.test(read(f)))).toEqual([]);
    expect(laneFiles().filter((f) => /vitanaland\.com|vitana\.dev/.test(read(f)))).toEqual([]);
  });

  it('the core re-export is by name (no export * from a web file) and the screens import @vitana only through ports', () => {
    expect(read('../../packages/core/src/media.ts')).not.toMatch(/export \*/);
    expect(laneFiles().filter((f) => f.startsWith('src/screens') && /from ['"]@vitana\//.test(read(f)))).toEqual([]);
  });

  it('every control has an accessible name (pressables carry accessibilityLabel)', () => {
    const offenders: string[] = [];
    for (const f of laneFiles().filter((x) => x.endsWith('.tsx') && x.includes('screens/media'))) {
      for (const m of read(f).matchAll(/<(Pressable|PressableRow|ScrimButton|IconButton)\b((?:=>|[^>])*?)(\/?)>/gs)) {
        const attrs = m[2];
        if (!/accessibilityLabel|label=/.test(attrs)) offenders.push(`${f}: <${m[1]}>`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('catalog keys', () => {
  it('every key the lane renders exists in all 11 locales', () => {
    const keys = new Set<string>();
    for (const f of laneFiles()) {
      for (const m of read(f).matchAll(/\b(?:t|notify|notifyError)\(\s*['"]([A-Za-z][A-Za-z0-9_.]*)['"]/g)) keys.add(m[1]);
    }
    for (const type of ['music', 'podcast', 'video']) {
      keys.add(`mediaHub.menu.${type}`);
      keys.add(`mediaHubNative.upload.hint.${type}`);
    }
    for (const v of ['public', 'private']) keys.add(`mediaHub.upload.${v}`);
    for (const r of ['type', 'size', 'duration']) keys.add(`mediaHubNative.upload.invalid.${r}`);
    for (const id of JSON.parse(JSON.stringify(['nutrition', 'sleep', 'longevity', 'motivation', 'mindfulness', 'fitness', 'mentalHealth', 'wellness', 'education', 'lifestyle']))) keys.add(`mediaHub.upload.predefinedTags.${id}`);
    for (const k of ['permissionDeniedDesc', 'saveFailed']) keys.add(`mediaHubNative.toast.${k}`);
    expect(keys.size).toBeGreaterThan(80);
    const missing: string[] = [];
    for (const locale of LOCALES) {
      const have = flatten(catalogs[locale], '');
      for (const k of keys) if (!have.has(k)) missing.push(`${locale}:${k}`);
    }
    expect(missing).toEqual([]);
  });

  it('the mediaHubNative shards have the same keys and placeholders as German', () => {
    const shard = (locale: string) => flatten(JSON.parse(readFileSync(join(REPO, 'src/i18n', locale, 'mediaHubNative.json'), 'utf8')), '');
    const de = shard('de');
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const locale of LOCALES) {
      const other = shard(locale);
      expect([...other.keys()].sort()).toEqual([...de.keys()].sort());
      for (const [k, v] of de) expect({ locale, k, p: placeholders(other.get(k) as string) }).toEqual({ locale, k, p: placeholders(v) });
    }
  });

  it('German uses du-form (no Sie / Ihr)', () => {
    const text = [...flatten(JSON.parse(readFileSync(join(REPO, 'src/i18n/de/mediaHubNative.json'), 'utf8')), '').values()].join(' ');
    expect(text).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen)\b/);
  });
});
