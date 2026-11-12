/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the community-gateway
 * contract (plan decision 2, sparring R1-F3: every memory call carries the
 * Bearer token and `X-Vitana-Active-Role: community`, like the web
 * `communityFetch`), the four route files, and i18n: the screens render with
 * no unresolved catalog key in all 11 locales, Arabic renders, the lane's
 * files use no physical left/right, and every memoryNative key exists in all
 * 11 shards (DE first).
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { MemoryOverview } from '../../src/screens/memory/MemoryOverview';
import { MemoryTimeline } from '../../src/screens/memory/MemoryTimeline';
import { MemoryRecall } from '../../src/screens/memory/MemoryRecall';
import { MemoryPermissions } from '../../src/screens/memory/MemoryPermissions';
import { TOKEN, memoryWrapper, moment, overviewRoutes, spotlight } from './helpers';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

const allRoutes = {
  ...overviewRoutes,
  'GET /timeline': { items: [moment], next_cursor: null },
  'GET /timeline/m-1': { item: moment, detail: { index_before: { hydration: 66 }, index_after: { hydration: 70 }, used_by_vitana: true, why_kept_key: 'x' } },
  'GET /timeline/learning-prefs': { available: true, prefs: [] },
  'PUT /timeline/learning-prefs': { routines_deleted: 0 },
  'GET /timeline/usage-data': { available: true, count: 3 },
  'POST /timeline/m-1/hide-from-ai': { ok: true },
  'DELETE /timeline/routines/r1': { ok: true },
};

describe('community gateway contract', () => {
  it('every memory read and write carries the Bearer token and X-Vitana-Active-Role: community', async () => {
    const { wrapper, requests } = memoryWrapper(allRoutes);
    const a = render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-routine-forget-r1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('memory-routine-forget-r1'));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE')).toBe(true));
    a.unmount();
    const b = render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-moment')).toBeTruthy());
    fireEvent.press(screen.getByTestId('timeline-moment'));
    await waitFor(() => expect(screen.getByTestId('timeline-learn-switch')).toBeTruthy());
    fireEvent.press(screen.getByTestId('timeline-learn-switch'));
    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
    b.unmount();
    render(<MemoryPermissions />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('learn-switch-sleep')).toBeTruthy());
    fireEvent.press(screen.getByTestId('learn-switch-sleep'));
    await waitFor(() => expect(requests.some((r) => r.method === 'PUT')).toBe(true));

    const paths = new Set(requests.map((r) => `${r.method} ${r.path}`));
    for (const p of [
      'GET /memory/garden/categories',
      'GET /memory/garden/entries',
      'GET /presence/self-awareness-summary',
      'GET /timeline/spotlight',
      'GET /timeline/routines',
      'DELETE /timeline/routines/r1',
      'GET /timeline',
      'GET /timeline/m-1',
      'POST /timeline/m-1/hide-from-ai',
      'GET /timeline/learning-prefs',
      'PUT /timeline/learning-prefs',
      'GET /timeline/usage-data',
    ]) {
      expect(paths).toContain(p);
    }
    for (const r of requests) {
      expect({ call: `${r.method} ${r.path}`, auth: r.headers.authorization, role: r.headers['x-vitana-active-role'] }).toEqual({
        call: `${r.method} ${r.path}`,
        auth: `Bearer ${TOKEN}`,
        role: 'community',
      });
      if (r.body !== undefined) expect(r.headers['content-type']).toBe('application/json');
    }
  }, 30_000);
});

describe('route files', () => {
  it.each([
    ['index', 'MemoryOverview'],
    ['timeline', 'MemoryTimeline'],
    ['recall', 'MemoryRecall'],
    ['permissions', 'MemoryPermissions'],
  ])('app/(app)/memory/%s.tsx renders %s', (file, screenName) => {
    const src = readFileSync(join(APP, 'app/(app)/memory', `${file}.tsx`), 'utf8');
    expect(src).toContain(`src/screens/memory/${screenName}`);
    expect(src).toMatch(/export default function/);
  });
});

/** A dotted catalog key that t() returned unresolved. */
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

function allStrings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    for (const k of ['accessibilityLabel', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: the four screens render no unresolved key', async (locale) => {
    const { wrapper } = memoryWrapper(allRoutes, languageFromLocale(locale));
    const screensToRender = [<MemoryOverview key="o" />, <MemoryTimeline key="t" />, <MemoryRecall key="r" />, <MemoryPermissions key="p" />];
    for (const el of screensToRender) {
      const r = render(el, { wrapper });
      await act(async () => {
        await new Promise((res) => setTimeout(res, 0));
      });
      await waitFor(() => expect(screen.queryAllByTestId('memory-card-skeleton')).toHaveLength(0));
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, raw }).toEqual({ locale, raw: [] });
      r.unmount();
    }
    // Four full screens per locale: allow for a loaded CI worker (jest's 5 s default flaked once in the full run).
  }, 30_000);

  it('the education pane resolves in every locale (memoryNative keys)', async () => {
    for (const locale of LOCALES) {
      const { wrapper } = memoryWrapper(allRoutes, languageFromLocale(locale));
      const r = render(<MemoryOverview />, { wrapper });
      fireEvent.press(screen.getByTestId('memory-tab-education'));
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, raw }).toEqual({ locale, raw: [] });
      r.unmount();
    }
  }, 30_000);

  it('Arabic (RTL) renders the timeline with the Arabic catalog', async () => {
    const { wrapper } = memoryWrapper({ 'GET /timeline/spotlight': { spotlight }, 'GET /timeline': { items: [moment], next_cursor: null } }, 'ar-XA');
    render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-moment')).toBeTruthy());
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/timeline.json'), 'utf8')).timeline;
    expect(screen.getByText(ar.header.title)).toBeTruthy();
  });

  it('every memoryNative key exists in all 11 shards with the same placeholders as German', () => {
    const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
      Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
    const read = (l: string) => flat(JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'memoryNative.json'), 'utf8')));
    const de = read('de');
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(read(l));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
    }
  });
});

describe('RTL-safe styles', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [...files(join(APP, 'src/screens/memory')), ...files(join(APP, 'app/(app)/memory')), join(APP, 'src/ports/memory.tsx')];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(10);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});
