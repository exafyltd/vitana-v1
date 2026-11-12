/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — the pure helpers
 * through their `@vitana/core` entries (horizon buckets, Index projection and
 * tiers, goal phases, the journey ring + goal trend, the Audiobook season
 * order), the `/autopilot` route file and its cold-start resolution, and
 * i18n: the dashboard (Full App and Guided) renders no unresolved catalog key
 * in all 11 locales, Arabic renders, the lane's files use no physical
 * left/right, and every journeyAutopilotNative key exists in all 11 shards.
 */
import '../helpers/no-network';
import './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, configure, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { LOCALES, translate } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { resolveWebPath, NATIVE_ROUTES } from '../../src/navigation/resolve';
import { bucketActions, bucketFromWaveId } from '@vitana/core/horizon-buckets';
import { projectDay90, trend7d } from '@vitana/core/vitana-projection';
import { buildPhases } from '@vitana/core/goal-phases';
import { getVitanaIndexTier } from '@vitana/core/vitana-index-tiers';
import { AUDIOBOOK_SEASONS, seasonNumber } from '@vitana/core/audiobook-queue';
import { buildJourneyRing, computeGoalTrend } from '@vitana/core/journey';
import { JourneyScreen } from '../../src/screens/journey/JourneyScreen';
import { bucketFromRec } from '../../src/screens/journey/JourneyScreen';
import { __resetGuidedProgressStorageForTests } from '../../src/screens/journey/hooks/useGuidedJourneyProgress';
import { fullRoutes, fullRpc, fullTables, goalPlan, guidedState, journeyFull, journeyWrapper } from './helpers';

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(60_000);

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(async () => {
  __resetGuidedProgressStorageForTests();
  await AsyncStorage.clear();
});

describe('pure helpers through @vitana/core', () => {
  it('horizon buckets: wave ids and explicit horizons (the dashboard "today" filter)', () => {
    expect(['wave-0', 1, '2', 3, 'wave-9', 'x'].map((w) => bucketFromWaveId(w as string | number))).toEqual(['today', 'next3', 'thisWeek', 'month', 'future', 'future']);
    const a = { id: 'a', title: '', reason: '', category: 'health', priority: 'low', icon: '', timestamp: new Date(), status: 'pending' } as const;
    const r = bucketActions([{ ...a, id: '1', horizon: 'month' } as never, { ...a, id: '2', wave_id: 0 } as never, { ...a, id: '3' }]);
    expect([r.month.map((x) => x.id), r.today.map((x) => x.id), r.future.map((x) => x.id)]).toEqual([['1'], ['2'], ['3']]);
    expect(bucketFromRec({ id: 'x', title: '', summary: '', status: 'new', source_ref: '', impact_score: 0, horizon: 'today', wave_id: 3 })).toBe('today');
    expect(bucketFromRec({ id: 'x', title: '', summary: '', status: 'new', source_ref: '', impact_score: 0 })).toBe('future');
  });

  it('Index projection and tiers', () => {
    expect(trend7d([{ date: 'a', score: 300 }])).toBeNull();
    expect(trend7d([{ date: 'a', score: 300 }, { date: 'b', score: 322 }])).toBe(22);
    expect(projectDay90(300, 7, 83)).toBe(307);
    expect(getVitanaIndexTier(322).labelKey).toBe('vitanaIndex.tiers.building');
  });

  it('goal phases, journey ring and goal trend', () => {
    expect(buildPhases([60, 100], 150).map((p) => [p.start, p.end])).toEqual([
      [0, 60],
      [60, 100],
      [100, 150],
    ]);
    expect(buildPhases([], 150)).toEqual([]);
    const ring = buildJourneyRing(journeyFull.life_compass as never, journeyFull.journey as never);
    expect(ring).toMatchObject({ day: 12, daysLeft: 120, total: 150, pct: 20, source: 'goal', hasCountdown: true });
    expect(buildJourneyRing(null, journeyFull.journey as never)).toMatchObject({ source: 'onboarding', daysLeft: 79, total: 90 });
    expect(buildJourneyRing(null, null)).toMatchObject({ hasCountdown: false, day: 1 });
    const today = new Date().toISOString().slice(0, 10);
    expect(computeGoalTrend(goalPlan.plan as never, today)).toBe('up');
    expect(computeGoalTrend(null, today)).toBeNull();
  });

  it('the Audiobook season order', () => {
    expect(AUDIOBOOK_SEASONS[0]).toBe('prolog');
    expect(seasonNumber('basics')).toBe(1);
    expect(seasonNumber('nope')).toBe(-1);
  });
});

describe('route', () => {
  it('app/(app)/autopilot/index.tsx renders JourneyScreen', () => {
    const src = readFileSync(join(APP, 'app/(app)/autopilot/index.tsx'), 'utf8');
    expect(src).toContain('src/screens/journey/JourneyScreen');
    expect(src).toMatch(/export default function/);
  });

  it('cold start: /autopilot resolves native (not the Unported resolver) and is a concrete route file', () => {
    expect(NATIVE_ROUTES).toContain('/autopilot');
    expect(resolveWebPath('/autopilot')).toMatchObject({ kind: 'native', href: '/autopilot' });
    expect(resolveWebPath('/autopilot?tab=x').kind).toBe('native');
    // The audiobook deep link is the sibling lane's own route file (VTID-05460), native too.
    expect(resolveWebPath('/autopilot/audiobook').kind).toBe('native');
    // No other app/ file claims /autopilot (index.tsx / the [...path] catch-all rank below a concrete file).
    expect(existsSync(join(APP, 'app/(app)/autopilot.tsx'))).toBe(false);
    expect(existsSync(join(APP, 'app/autopilot'))).toBe(false);
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
  it.each(LOCALES.map((l) => [l]))('%s: Full App and Guided render no unresolved key', async (locale) => {
    for (const routes of [fullRoutes(), fullRoutes({ 'GET /journey/state': guidedState })]) {
      __resetGuidedProgressStorageForTests();
      await AsyncStorage.clear();
      const { wrapper } = journeyWrapper(routes, { tables: fullTables, rpc: fullRpc, language: languageFromLocale(locale) });
      const r = render(<JourneyScreen />, { wrapper });
      await waitFor(() => expect(screen.queryByTestId('journey-hero-full') ?? screen.queryByTestId('journey-hero-guided')).toBeTruthy());
      await act(async () => {
        await new Promise((res) => setTimeout(res, 0));
      });
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, raw }).toEqual({ locale, raw: [] });
      r.unmount();
    }
  });

  it('Arabic (RTL) renders the dashboard with the Arabic catalog', async () => {
    const { wrapper } = journeyWrapper(fullRoutes(), { tables: fullTables, rpc: fullRpc, language: 'ar-XA' });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-full')).toBeTruthy());
    expect(screen.getAllByText(translate('ar', 'screens.autopilotdashboard.myJourney')).length).toBeGreaterThan(0);
    expect(screen.getByText(translate('ar', 'screens.autopilotdashboard.todaysGoal'))).toBeTruthy();
  });

  it('every journeyAutopilotNative key exists in all 11 shards with the same placeholders as German', () => {
    const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
      Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
    const read = (l: string) => flat(JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'journeyAutopilotNative.json'), 'utf8')));
    const de = read('de');
    expect(de.length).toBeGreaterThan(10);
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
  const laneFiles = [...files(join(APP, 'src/screens/journey')), ...files(join(APP, 'app/(app)/autopilot')), join(APP, 'src/ports/journey.tsx')];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(15);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});
