/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — i18n, RTL, route
 * and parity: the dashboard (three modes) and the Index overlay render no
 * unresolved catalog key in all 11 locales, Arabic renders, every
 * healthNative key exists in all 11 shards with German's placeholders, no
 * `screens.nativeHealthSync.osPermission.*` key is added (N5a's), the lane
 * files use no physical left/right, the route file renders HealthScreen and
 * is reachable on a cold start, and the four ledger rows are native.
 */
import '../helpers/no-network';
import { searchParams } from './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { HealthScreen } from '../../src/screens/health/HealthScreen';
import { healthWrapper } from './helpers';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

const APP = join(__dirname, '../..');
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

const settle = () =>
  act(async () => {
    await new Promise((res) => setTimeout(res, 0));
  });

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: the three modes and the Index overlay render no unresolved key', async (locale) => {
    for (const mode of ['overview', 'medical', 'supplements']) {
      searchParams.current = { mode };
      const { wrapper } = healthWrapper({ language: languageFromLocale(locale) });
      const r = render(<HealthScreen />, { wrapper });
      await settle();
      await waitFor(() => expect(screen.queryByTestId('health-medical-loading')).toBeNull(), { timeout: 5000 });
      await waitFor(() => expect(screen.queryByTestId('health-supplements-loading')).toBeNull(), { timeout: 5000 });
      if (mode === 'overview') {
        fireEvent.press(screen.getByTestId('health-snapshot'));
        await waitFor(() => expect(screen.getByTestId('vitana-index-sheet-content')).toBeTruthy());
        await settle();
      }
      if (mode === 'medical') {
        fireEvent.press(screen.getByTestId('health-upload-button'));
        await waitFor(() => expect(screen.getByTestId('health-upload-sheet-content')).toBeTruthy());
      }
      if (mode === 'supplements') {
        fireEvent.press(screen.getByTestId('health-upload-button'));
        await waitFor(() => expect(screen.getByTestId('health-upload-sheet-content')).toBeTruthy());
      }
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, mode, raw }).toEqual({ locale, mode, raw: [] });
      r.unmount();
    }
    searchParams.current = {};
    // Three screens + two overlays per locale: allow for a loaded CI worker.
  }, 60_000);

  it.each(LOCALES.map((l) => [l]))('%s: the Health Actions popup and the lab-order sheet resolve', async (locale) => {
    const { wrapper } = healthWrapper({ language: languageFromLocale(locale) });
    const r = render(<HealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-take-action'));
    await waitFor(() => expect(screen.getByTestId('health-actions-popup-content')).toBeTruthy());
    let raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
    expect({ locale, raw }).toEqual({ locale, raw: [] });
    fireEvent.press(screen.getByTestId('health-action-orderBloodTest'));
    await waitFor(() => expect(screen.getByTestId('health-lab-order-sheet-content')).toBeTruthy());
    raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
    expect({ locale, raw }).toEqual({ locale, raw: [] });
    r.unmount();
  }, 30_000);

  it('Arabic (RTL) renders the dashboard with the Arabic catalog', async () => {
    const { wrapper } = healthWrapper({ language: 'ar-XA' });
    render(<HealthScreen />, { wrapper });
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/healthNative.json'), 'utf8')).healthNative;
    expect(screen.getByText(ar.subtitle)).toBeTruthy();
    const arHealth = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/health.json'), 'utf8')).health;
    await waitFor(() => expect(screen.getByText(arHealth.healthSnapshot, { exact: false })).toBeTruthy());
  });

  it('German (du-form) is the source shard', () => {
    const de = JSON.parse(readFileSync(join(REPO, 'src/i18n/de/healthNative.json'), 'utf8')).healthNative;
    expect(de.subtitle).toMatch(/\bdeinen\b/);
    expect(JSON.stringify(de)).not.toMatch(/\b(Sie|Ihre?n?|Ihnen)\b/);
  });

  it('every healthNative key exists in all 11 shards with the same placeholders as German', () => {
    const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
      Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
    const read = (l: string) => flat(JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'healthNative.json'), 'utf8')));
    const de = read('de');
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(read(l));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
    }
  });

  it('adds no screens.nativeHealthSync.osPermission.* key (those are N5a’s)', () => {
    for (const l of LOCALES) expect(readFileSync(join(REPO, 'src/i18n', l, 'healthNative.json'), 'utf8')).not.toMatch(/nativeHealthSync|osPermission/);
  });
});

describe('RTL-safe styles', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [...files(join(APP, 'src/screens/health')), ...files(join(APP, 'app/(app)/health')), join(APP, 'src/ports/health.tsx'), join(APP, 'src/ports/health-sync.ts'), join(APP, 'src/ports/health-data.ts')];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(12);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});

describe('route + parity', () => {
  it('app/(app)/health/index.tsx renders HealthScreen and no other app/ file shadows /health', () => {
    const src = readFileSync(join(APP, 'app/(app)/health/index.tsx'), 'utf8');
    expect(src).toContain('src/screens/health/HealthScreen');
    expect(src).toMatch(/export default function/);
    expect(existsSync(join(APP, 'app/health.tsx'))).toBe(false);
    expect(existsSync(join(APP, 'app/(app)/health.tsx'))).toBe(false);
    expect(existsSync(join(APP, 'app/(public)/health.tsx'))).toBe(false);
  });

  it.each(['/health', '/health?mode=medical', '/health?mode=supplements'])('%s resolves native (cold start)', (url) => {
    expect(NATIVE_ROUTES).toContain('/health');
    expect(resolveWebPath(url)).toMatchObject({ kind: 'native', href: url });
  });

  it('the four health-hub ledger rows are native', () => {
    const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; status: string; lane: string }> };
    const rows = ledger.rows.filter((r) => ['HEALTH.OVERVIEW', 'HEALTH.MEDICAL', 'HEALTH.SUPPLEMENTS', 'OVERLAY.VITANA_INDEX'].includes(r.key));
    expect(rows.map((r) => [r.key, r.status]).sort()).toEqual([
      ['HEALTH.MEDICAL', 'native'],
      ['HEALTH.OVERVIEW', 'native'],
      ['HEALTH.SUPPLEMENTS', 'native'],
      ['OVERLAY.VITANA_INDEX', 'native'],
    ]);
  });
});
