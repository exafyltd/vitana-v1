/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — i18n,
 * RTL, routes and parity: both screens (every biology tab, the Index page
 * with its dialogs open) render no unresolved catalog key in all 11 locales;
 * Arabic renders; the new healthNative keys are German-first du-form, exist
 * in all 11 shards with German's placeholders and keep the registers
 * (pt você, fr tu, ru ты); this lane's files use no physical left/right; the
 * two route files render their screens and the four URLs resolve native on a
 * cold start; the four ledger rows are native.
 */
import '../../helpers/no-network';
import { searchParams } from '../mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { LOCALES } from '../../../src/i18n';
import { languageFromLocale } from '../../../src/i18n/I18nProvider';
import { NATIVE_ROUTES, resolveWebPath } from '../../../src/navigation/resolve';
import { VitanaIndexDetailScreen } from '../../../src/screens/health/VitanaIndexDetailScreen';
import { MyBiologyScreen } from '../../../src/screens/health/MyBiologyScreen';
import { biologyWrapper } from './fixtures';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

const APP = join(__dirname, '../../..');
const REPO = join(APP, '../..');

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

function allStrings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    for (const k of ['accessibilityLabel', 'accessibilityHint', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}

const raw = (root: ReactTestInstance) => allStrings(root).filter((s) => RAW_KEY.test(s.trim()));

const settle = () =>
  act(async () => {
    await new Promise((res) => setTimeout(res, 0));
  });

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: /health/vitana-index + the log-data dialog render no unresolved key', async (locale) => {
    const { wrapper } = biologyWrapper({ language: languageFromLocale(locale) });
    const r = render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('mission-alignment-body')).toBeTruthy(), { timeout: 5000 });
    await waitFor(() => expect(screen.getByTestId('vitana-card-strip-vitana-index')).toBeTruthy(), { timeout: 5000 });
    fireEvent.press(screen.getByTestId('vitana-index-how-toggle'));
    expect({ locale, raw: raw(r.root) }).toEqual({ locale, raw: [] });
    fireEvent.press(screen.getByTestId('vitana-index-log'));
    await waitFor(() => expect(screen.getByTestId('vitana-log-data-dialog-content')).toBeTruthy());
    fireEvent.press(screen.getByTestId('log-data-metric'));
    await settle();
    expect({ locale, dialog: raw(r.root) }).toEqual({ locale, dialog: [] });
    r.unmount();
  }, 30_000);

  it.each(LOCALES.map((l) => [l]))('%s: /health/my-biology (three tabs, Biomarker Actions, the supplement dialog) render no unresolved key', async (locale) => {
    for (const tab of ['medical', 'omics', 'supplements']) {
      searchParams.current = { tab };
      const { wrapper } = biologyWrapper({ language: languageFromLocale(locale) });
      const r = render(<MyBiologyScreen />, { wrapper });
      await settle();
      if (tab === 'supplements') {
        await waitFor(() => expect(screen.getByTestId('biology-supplement-s1')).toBeTruthy(), { timeout: 5000 });
        fireEvent.press(screen.getByTestId('biology-supplements-add'));
        await waitFor(() => expect(screen.getByTestId('add-supplement-dialog-content')).toBeTruthy());
        fireEvent.press(screen.getByTestId('supplement-form-category'));
        await settle();
      } else {
        await waitFor(() => expect(screen.getByTestId(tab === 'medical' ? 'biology-report-r1' : 'biology-report-r2')).toBeTruthy(), { timeout: 5000 });
        fireEvent.press(screen.getByTestId('biology-add-data'));
        await waitFor(() => expect(screen.getByTestId('biomarker-actions-popup-content')).toBeTruthy());
      }
      expect({ locale, tab, raw: raw(r.root) }).toEqual({ locale, tab, raw: [] });
      r.unmount();
    }
    searchParams.current = {};
  }, 60_000);

  it('Arabic (RTL) renders both screens with the Arabic catalogs', async () => {
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/vitanaIndexPage.json'), 'utf8')).vitanaIndexPage;
    const one = biologyWrapper({ language: 'ar-XA' });
    const r = render(<VitanaIndexDetailScreen />, { wrapper: one.wrapper });
    expect(screen.getByText(ar.hero.title)).toBeTruthy();
    r.unmount();
    searchParams.current = { tab: 'supplements' };
    const two = biologyWrapper({ language: 'ar-XA', tables: { user_supplements: [] } });
    render(<MyBiologyScreen />, { wrapper: two.wrapper });
    const arNative = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/healthNative.json'), 'utf8')).healthNative;
    await waitFor(() => expect(screen.getByText(arNative.biology.noSupplementsYet)).toBeTruthy());
    searchParams.current = {};
  });

  const read = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'healthNative.json'), 'utf8')).healthNative;
  const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
  const laneKeys = (l: string) => flat({ indexDetail: read(l).indexDetail, biology: read(l).biology });

  it('the new keys (indexDetail.*, biology.*) are German du-form and exist in all 11 shards with German’s placeholders', () => {
    const de = laneKeys('de');
    expect(de.length).toBe(37);
    const deText = de.map(([, v]) => v).join(' ');
    expect(deText).toMatch(/\b(Tippe|Füge|Plane|Exportiere|Sieh|Aktualisiere)\b/);
    expect(deText).not.toMatch(/\b(Sie|Ihre?n?|Ihnen)\b/);
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(laneKeys(l));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
    }
  });

  it('registers: pt você (never teu/tua), fr tu (never vous), ru ты (never вы)', () => {
    const text = (l: string) => laneKeys(l).map(([, v]) => v).join(' ');
    expect(text('pt')).toMatch(/(^|\s)[Vv]ocê(\s|$)/);
    expect(text('pt')).not.toMatch(/\b(teu|tua|teus|tuas)\b/i);
    expect(text('fr')).toMatch(/\b(Touche|Ajoute|ta|ton|tes)\b/);
    expect(text('fr')).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(text('ru')).toMatch(/(Нажми|Добавь|твои)/);
    expect(text('ru')).not.toMatch(/(^|[^А-Яа-яЁё])(вы|вас|ваш[а-я]*)([^А-Яа-яЁё]|$)/i);
  });
});

describe('RTL-safe styles (this lane’s files)', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [
    join(APP, 'src/screens/health/VitanaIndexDetailScreen.tsx'),
    join(APP, 'src/screens/health/MyBiologyScreen.tsx'),
    ...files(join(APP, 'src/screens/health/index-biology')),
    join(APP, 'src/ports/health-biology.tsx'),
    join(APP, 'app/(app)/health/vitana-index.tsx'),
    join(APP, 'app/(app)/health/my-biology.tsx'),
  ];
  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});

describe('routes + parity', () => {
  it.each([
    ['app/(app)/health/vitana-index.tsx', 'src/screens/health/VitanaIndexDetailScreen'],
    ['app/(app)/health/my-biology.tsx', 'src/screens/health/MyBiologyScreen'],
  ])('%s renders %s', (file, screenPath) => {
    const src = readFileSync(join(APP, file), 'utf8');
    expect(src).toContain(screenPath);
    expect(src).toMatch(/export default function/);
  });

  it.each([
    ['/health/vitana-index', '/health/vitana-index'],
    ['/health/my-biology', '/health/my-biology'],
    ['/health/my-biology?tab=omics', '/health/my-biology'],
    ['/health/my-biology?tab=supplements', '/health/my-biology'],
  ])('%s resolves native (cold start)', (url, path) => {
    expect(NATIVE_ROUTES).toContain(path);
    expect(resolveWebPath(url)).toMatchObject({ kind: 'native', href: url, path });
  });

  it('the four vitana-index-biology ledger rows are native', () => {
    const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; status: string }> };
    const rows = ledger.rows.filter((r) => ['HEALTH.VITANA_INDEX', 'HEALTH.MY_BIOLOGY', 'HEALTH.BIOLOGY_OMICS', 'HEALTH.BIOLOGY_SUPPLEMENTS'].includes(r.key));
    expect(rows.map((r) => [r.key, r.status]).sort()).toEqual([
      ['HEALTH.BIOLOGY_OMICS', 'native'],
      ['HEALTH.BIOLOGY_SUPPLEMENTS', 'native'],
      ['HEALTH.MY_BIOLOGY', 'native'],
      ['HEALTH.VITANA_INDEX', 'native'],
    ]);
  });
});
