/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — the community-gateway
 * contract (plan decision 2, sparring R1-F3: every diary / ticket call carries
 * the Bearer token and `X-Vitana-Active-Role: community`, like the web
 * `communityFetch`), the route file, and i18n + RTL (tasks.md diary task 4):
 * both modes render with no unresolved catalog key in all 11 locales, Arabic
 * renders, the lane's files use no physical left/right, and every diaryNative
 * key exists in all 11 shards with German's placeholders.
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
import { __clearToastsForTests } from '../../src/ports/ui';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { DailyDiaryScreen } from '../../src/screens/diary/DailyDiaryScreen';
import { SCREEN_OPTIONS } from '../../src/screens/diary/CaptureCard';
import { searchParams } from './mocks';
import { TOKEN, diaryWrapper, photoEntry, savedEntry, textEntry, ticket, voiceEntry } from './helpers';

afterEach(() => {
  searchParams.current = {};
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

const routes = {
  'POST /memory/diary/entries': savedEntry(null),
  'DELETE /memory/diary/entries/e-text': { ok: true },
  'GET /feedback/tickets/mine': { tickets: [ticket({ status: 'resolved' })] },
  'POST /feedback/tickets/t-1/reopen': { ok: true },
  'POST /feedback/tickets': { ok: true, ticket_number: 'FB-0009' },
};

describe('community gateway contract', () => {
  it('every diary and ticket call carries the Bearer token and X-Vitana-Active-Role: community', async () => {
    const { wrapper, requests } = diaryWrapper(routes, { entries: [textEntry] });
    const a = render(<DailyDiaryScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('diary-plus-text'));
    fireEvent.changeText(screen.getByTestId('diary-text-input'), 'water');
    fireEvent.press(screen.getByTestId('diary-text-save'));
    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true));
    await waitFor(() => expect(screen.getByTestId('diary-entry-delete')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-entry-delete'));
    await waitFor(() => expect(screen.getByTestId('diary-delete-confirm')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-delete-confirm'));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE')).toBe(true));
    a.unmount();

    searchParams.current = { tab: 'bugs' };
    render(<DailyDiaryScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('member-ticket-reopen')).toBeTruthy());
    fireEvent.press(screen.getByTestId('member-ticket-reopen'));
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await waitFor(() => expect(screen.getByTestId('capture-send')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('capture-send')));
    await waitFor(() => expect(screen.getByTestId('created-ticket-number')).toBeTruthy());

    const paths = new Set(requests.map((r) => `${r.method} ${r.path}`));
    for (const p of ['POST /memory/diary/entries', 'DELETE /memory/diary/entries/e-text', 'GET /feedback/tickets/mine', 'POST /feedback/tickets/t-1/reopen', 'POST /feedback/tickets']) {
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

describe('route file', () => {
  it('app/(app)/daily-diary/index.tsx renders DailyDiaryScreen', () => {
    const src = readFileSync(join(APP, 'app/(app)/daily-diary/index.tsx'), 'utf8');
    expect(src).toContain('src/screens/diary/DailyDiaryScreen');
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

const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
  Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
const shard = (l: string, ns: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, `${ns}.json`), 'utf8'));

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: both modes render no unresolved key', async (locale) => {
    const language = languageFromLocale(locale);
    const health = diaryWrapper(routes, { entries: [textEntry, photoEntry, voiceEntry] }, language);
    const a = render(<DailyDiaryScreen />, { wrapper: health.wrapper });
    await waitFor(() => expect(screen.getByTestId('diary-entries')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-plus-text'));
    const rawHealth = allStrings(a.root).filter((s) => RAW_KEY.test(s.trim()));
    expect({ locale, rawHealth }).toEqual({ locale, rawHealth: [] });
    a.unmount();

    searchParams.current = { tab: 'bugs' };
    const bugs = diaryWrapper(routes, {}, language);
    const b = render(<DailyDiaryScreen />, { wrapper: bugs.wrapper });
    await waitFor(() => expect(screen.getByTestId('member-ticket')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    const rawRecording = allStrings(b.root).filter((s) => RAW_KEY.test(s.trim()));
    await act(async () => fireEvent.press(screen.getByTestId('capture-mic')));
    await waitFor(() => expect(screen.getByTestId('capture-send')).toBeTruthy());
    const rawBugs = allStrings(b.root).filter((s) => RAW_KEY.test(s.trim()));
    expect({ locale, rawRecording, rawBugs }).toEqual({ locale, rawRecording: [], rawBugs: [] });
    b.unmount();
    searchParams.current = {};
  }, 30_000);

  it('Arabic (RTL) renders the diary with the Arabic catalog', async () => {
    const { wrapper } = diaryWrapper(routes, { entries: [textEntry] }, 'ar-XA');
    render(<DailyDiaryScreen />, { wrapper });
    const ar = shard('ar', 'diary').diary;
    expect(screen.getByText(ar.title)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('diary-entries')).toBeTruthy());
    expect(screen.getByText(shard('ar', 'screens').screens.diary.today)).toBeTruthy();
  });

  it('every diaryNative key exists in all 11 shards with the same placeholders as German', () => {
    const de = flat(shard('de', 'diaryNative'));
    expect(de.length).toBeGreaterThan(30);
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(flat(shard(l, 'diaryNative')));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) {
        expect({ l, k, empty: !(other.get(k) ?? '').trim() }).toEqual({ l, k, empty: false });
        expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
      }
    }
  });

  it('every affected-screen option has a catalog label', () => {
    const labels = shard('de', 'diaryNative').diaryNative.screenOption;
    expect(SCREEN_OPTIONS.map((o) => o.key).sort()).toEqual(Object.keys(labels).sort());
  });
});

describe('RTL-safe styles', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [...files(join(APP, 'src/screens/diary')), ...files(join(APP, 'app/(app)/daily-diary')), join(APP, 'src/ports/diary.tsx'), join(APP, 'src/ports/diary-capture.ts')];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(10);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});
