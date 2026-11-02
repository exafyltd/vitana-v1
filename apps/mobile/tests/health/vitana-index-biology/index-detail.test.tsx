/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the
 * native Vitana Index detail page (HEALTH.VITANA_INDEX /health/vitana-index):
 * hero loaded / loading / error / no-Index, the next steps (order, "Next up",
 * done steps, CTAs), the 90-day goal, the pillar breakdown (bars, biggest
 * lever, strongest, balance), the log-data dialog (pillar switch, metric
 * picker, value, write-disabled submit), the card strip (server + feature
 * cards, G3 metric, dismiss), the pillar agents panel, Mission Alignment
 * (loaded / empty / error) and "How your Index grows". Recording Supabase +
 * fake gateway, no network.
 */
import '../../helpers/no-network';
import { router, searchParams } from '../mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { VitanaIndexDetailScreen } from '../../../src/screens/health/VitanaIndexDetailScreen';
import { buildNextSteps, goalProgress, balanceKey } from '../../../src/screens/health/index-biology/next-steps';
import { aggregate } from '../../../src/screens/health/index-biology/data';
import { toVitanaIndexState } from '../../../src/screens/health/data/vitana-index';
import { getVitanaIndexTier } from '../../../src/ports/health';
import { resolveWebPath } from '../../../src/navigation/resolve';
import { readFileSync } from 'fs';
import { join } from 'path';

const EN_INDEX = JSON.parse(readFileSync(join(__dirname, '../../../../../src/i18n/en/vitanaIndex.json'), 'utf8'));
const tierLabel = (score: number) => getVitanaIndexTier(score).labelKey.split('.').reduce((o: Record<string, unknown>, k) => o[k] as Record<string, unknown>, EN_INDEX) as unknown as string;
import { FAIL, fullTables, indexRows, USER_ID } from '../helpers';
import { biologyRoutes, biologyWrapper, missionRows, recommendationsRoute } from './fixtures';

beforeEach(async () => {
  searchParams.current = {};
  jest.clearAllMocks();
  await AsyncStorage.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

/** An overlay closes after its exit animation (motion.dialogMs / sheetMs): let it run inside act, then check it unmounted. */
async function gone(testID: string) {
  await act(async () => {
    await new Promise((res) => setTimeout(res, 450));
  });
  await waitFor(() => expect(screen.queryByTestId(testID)).toBeNull(), { timeout: 5000 });
}

const settle = () =>
  act(async () => {
    await new Promise((res) => setTimeout(res, 0));
  });

describe('pure rules (vitana-index-next-steps.ts, MissionAlignmentCard aggregate)', () => {
  const index = toVitanaIndexState(indexRows() as never)!;
  it('open steps first in order, finished ones last; focus = the weakest pillar', () => {
    expect(buildNextSteps(index, { hasBloodPanel: true }).map((s) => [s.id, s.done])).toEqual([
      ['focus', false],
      ['journey', false],
      ['blood', true],
      ['devices', true],
    ]);
    expect(buildNextSteps(index, { hasBloodPanel: false })[0]).toEqual({ id: 'blood', done: false });
    expect(buildNextSteps(index, { hasBloodPanel: true })[0]).toMatchObject({ pillar: 'sleep', even: false });
    expect(buildNextSteps(null, { hasBloodPanel: false }).map((s) => s.id)).toEqual(['blood', 'devices', 'journey']);
  });
  it('goal: 600 then 800; balance note thresholds', () => {
    expect(goalProgress(412)).toEqual({ target: 600, remaining: 188, ratio: 412 / 600 });
    expect(goalProgress(700)).toMatchObject({ target: 800, remaining: 100 });
    expect([balanceKey(null), balanceKey(1), balanceKey(0.9), balanceKey(0.85), balanceKey(0.5)]).toEqual([
      null,
      'vitanaIndexPage.balance.even',
      'vitanaIndexPage.balance.slight',
      'vitanaIndexPage.balance.uneven',
      'vitanaIndexPage.balance.veryUneven',
    ]);
  });
  it('aggregate counts pillars, economic axes and served rows', () => {
    const agg = aggregate(missionRows as never);
    expect(agg).toEqual({
      total: 4,
      served: 3,
      pillarCounts: { nutrition: 0, hydration: 0, exercise: 1, sleep: 1, mental: 0, none: 2 },
      economyCounts: { find_match: 1, marketplace: 1, income_generation: 0, business_formation: 0, none: 2 },
    });
  });
});

describe('hero', () => {
  it('loaded: score, of 999, tier, rising chip, hero line, sparkline, updated date', async () => {
    const { wrapper } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    expect(screen.getByText('Your Vitana Index')).toBeTruthy();
    expect(screen.getByText('Your health, in your hands')).toBeTruthy();
    await waitFor(() => expect(within(screen.getByTestId('vitana-index-score')).getByText('412')).toBeTruthy());
    expect(screen.getByText('of 999')).toBeTruthy();
    expect(within(screen.getByTestId('vitana-index-tier')).getByText(tierLabel(412))).toBeTruthy();
    expect(within(screen.getByTestId('vitana-index-trend-up')).getByText('Rising')).toBeTruthy();
    expect(screen.getByTestId('vitana-index-hero-line').props.children).toBe("You're moving up. What you've done these past days is working. Keep going!");
    expect(screen.getByTestId('vitana-index-sparkline', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('last 7 days')).toBeTruthy();
    expect(screen.getByTestId('vitana-index-updated').props.children).toMatch(/^Updated \d{1,2} [A-Z][a-z]+$|^Updated [A-Z][a-z]+ \d{1,2}$/);
  });

  it('loading shows the skeleton, not a score', async () => {
    const { wrapper, sb } = biologyWrapper();
    const from = sb.client.from;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((res) => (release = res));
    // The Index read waits on a gate: the hero shows the skeleton until it answers.
    sb.client.from = jest.fn((table: string) => {
      const b = from(table);
      if (table !== 'vitana_index_scores') return b;
      const then = b.then;
      b.then = (res: (r: unknown) => unknown, rej?: (e: unknown) => unknown) => gate.then(() => then(res, rej));
      return b;
    });
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-index-score-loading')).toBeTruthy());
    expect(screen.queryByTestId('vitana-index-score')).toBeNull();
    release();
    await waitFor(() => expect(within(screen.getByTestId('vitana-index-score')).getByText('412')).toBeTruthy());
  });

  it('a failed Index read shows the error banner; the refresh button re-reads', async () => {
    const { wrapper, sb } = biologyWrapper({ tables: { ...fullTables(), vitana_index_scores: { error: 'boom' } } });
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-index-error')).toBeTruthy());
    expect(screen.getByText('Could not load your Index. Try refresh.')).toBeTruthy();
    const before = sb.requests.filter((r) => r.table === 'vitana_index_scores').length;
    fireEvent.press(screen.getByTestId('vitana-index-refresh'));
    expect(screen.getByTestId('vitana-index-refresh').props.accessibilityLabel).toBe('Refresh index');
    await waitFor(() => expect(sb.requests.filter((r) => r.table === 'vitana_index_scores').length).toBeGreaterThan(before));
  });

  it('no Index yet: em dash, the "no index" line and goal copy, no tier, no focus step', async () => {
    const { wrapper } = biologyWrapper({ tables: { ...fullTables(), vitana_index_scores: [], lab_reports: [] } });
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('vitana-index-score')).getByText('—')).toBeTruthy());
    expect(screen.getByText("Your Index starts with your first step. Let's set your baseline together.")).toBeTruthy();
    expect(screen.getByText("As soon as your baseline is set, we'll show you here how far your goal is.")).toBeTruthy();
    expect(screen.queryByTestId('vitana-index-tier')).toBeNull();
    expect(screen.queryByTestId('vitana-index-goal-bar')).toBeNull();
    expect(screen.queryByTestId('vitana-index-step-focus')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('vitana-index-step-blood-cta')).toBeTruthy());
  });
});

describe('next steps', () => {
  it('focus is "Next up" (sleep), journey next, blood + devices done and struck through', async () => {
    const { wrapper } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByText('Lift your Sleep pillar')).toBeTruthy());
    const steps = screen.getByTestId('vitana-index-next-steps');
    expect(within(steps).getByText('Next up')).toBeTruthy();
    expect(within(screen.getByTestId('vitana-index-step-focus')).getByText('Lift your Sleep pillar')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('vitana-index-step-blood').props.accessibilityState).toEqual({ checked: true }));
    expect(screen.getByTestId('vitana-index-step-devices').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByTestId('vitana-index-step-journey').props.accessibilityState).toEqual({ checked: false });
    expect(within(screen.getByTestId('vitana-index-step-blood')).getByText('Do your blood test')).toBeTruthy();
    expect(within(screen.getByTestId('vitana-index-step-blood')).getByText('Done')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-index-step-journey-cta'));
    expect(router.navigate).toHaveBeenCalledWith('/autopilot');
  });

  it('without a blood panel or tracker data: blood is next up (CTA opens the blood-panel upload sheet), devices lists the trackers', async () => {
    const rows = indexRows().map((r) => ({ ...r, feature_inputs: null }));
    const { wrapper } = biologyWrapper({ tables: { ...fullTables(), vitana_index_scores: rows, lab_reports: [] } });
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-index-step-blood-cta')).toBeTruthy());
    expect(within(screen.getByTestId('vitana-index-trackers')).getByText('Health Connect')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-index-step-blood-cta'));
    await waitFor(() => expect(screen.getByTestId('health-upload-sheet-content')).toBeTruthy());
    expect(screen.getByTestId('health-upload-category-blood_panel').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByTestId('health-upload-submit').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('vitana-index-blood-no-test'));
    expect(router.navigate).toHaveBeenCalledWith('/health/my-biology');
    fireEvent.press(screen.getByTestId('vitana-index-step-devices-cta'));
    expect(router.navigate).toHaveBeenCalledWith(resolveWebPath('/connectors?tab=fitness').href);
  });
});

describe('goal + pillars', () => {
  it('goal: 188 points to the thriving zone, bar 412/600', async () => {
    const { wrapper } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByText("You're 188 points away from the thriving zone. You can do this — one step at a time.")).toBeTruthy());
    expect(screen.getByTestId('vitana-index-goal-bar').props.accessibilityValue).toEqual({ min: 0, max: 600, now: 412 });
    expect(screen.getByText('600+')).toBeTruthy();
    expect(screen.getByText('800+')).toBeTruthy();
  });

  it('pillar breakdown: five rows with value/200, sleep is the biggest lever, nutrition the strength, the balance note', async () => {
    const { wrapper } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-index-pillar-sleep-lever')).toBeTruthy());
    expect(screen.getByTestId('vitana-index-pillar-sleep-value').props.children).toBe('60/200');
    expect(screen.getByTestId('vitana-index-pillar-nutrition-value').props.children).toBe('120/200');
    expect(screen.getByTestId('vitana-index-pillar-nutrition-strongest')).toBeTruthy();
    expect(screen.queryByTestId('vitana-index-pillar-mental-lever')).toBeNull();
    expect(within(screen.getByTestId('vitana-index-balance')).getByText('One pillar is lagging a little. Lift it so your Index counts in full.')).toBeTruthy();
  });
});

describe('log-data dialog (write-disabled)', () => {
  it('opens from "Log today", switches pillar → metric list, takes a value, submit stays disabled, nothing is posted', async () => {
    const { wrapper, sb, gw } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('vitana-index-log'));
    await waitFor(() => expect(screen.getByTestId('vitana-log-data-dialog-content')).toBeTruthy());
    expect(screen.getByText('Log a data point')).toBeTruthy();
    expect(screen.getByTestId('log-data-pillar-hydration').props.accessibilityState).toEqual({ checked: true });
    expect(within(screen.getByTestId('log-data-metric')).getByText('Water intake (ml)')).toBeTruthy();
    fireEvent.press(screen.getByTestId('log-data-pillar-sleep'));
    expect(within(screen.getByTestId('log-data-metric')).getByText('Sleep duration (hours)')).toBeTruthy();
    expect(screen.getByText('Value (hours)')).toBeTruthy();
    expect(screen.getByTestId('log-data-value').props.placeholder).toBe('e.g. 7.5');
    fireEvent.press(screen.getByTestId('log-data-metric'));
    await waitFor(() => expect(screen.getByTestId('log-data-metric-wearable_hrv')).toBeTruthy());
    fireEvent.press(screen.getByTestId('log-data-metric-wearable_hrv'));
    await waitFor(() => expect(screen.getByText('Value (ms)')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('log-data-value'), '45');
    expect(screen.getByTestId('log-data-value').props.value).toBe('45');
    expect(screen.getByTestId('log-data-submit').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('log-data-submit'));
    await settle();
    expect(gw.requests.filter((r) => r.method !== 'GET')).toEqual([]);
    expect(gw.requests.map((r) => r.path)).not.toContain('/integrations/manual/log');
    expect(sb.requests.filter((r) => r.method !== 'select')).toEqual([]);
    fireEvent.press(screen.getByTestId('log-data-cancel'));
    await gone('vitana-log-data-dialog-content');
  }, 30_000);

  it('the focus step and the pillars card open it too', async () => {
    const { wrapper } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-index-step-focus-cta')).toBeTruthy());
    fireEvent.press(screen.getByTestId('vitana-index-step-focus-cta'));
    await waitFor(() => expect(screen.getByTestId('vitana-log-data-dialog-content')).toBeTruthy());
    fireEvent.press(screen.getByTestId('log-data-cancel'));
    await gone('vitana-log-data-dialog-content');
    fireEvent.press(screen.getByTestId('vitana-index-pillars-log'));
    await waitFor(() => expect(screen.getByTestId('vitana-log-data-dialog-content')).toBeTruthy());
  }, 30_000);
});

describe('card strip (screen="vitana-index", max 3)', () => {
  it('server cards first (E1, G3 with its streak metric; G1 is not placed here), then F3; the server X is disabled', async () => {
    const { wrapper, gw } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-card-strip-vitana-index')).toBeTruthy());
    const strip = screen.getByTestId('vitana-card-strip-vitana-index');
    expect(strip.props.accessibilityLabel).toBe('Suggestions from Vitana');
    expect(within(strip).getByTestId('vitana-card-E1')).toBeTruthy();
    expect(within(strip).getByTestId('vitana-card-G3')).toBeTruthy();
    expect(within(strip).getByTestId('vitana-card-F3')).toBeTruthy();
    expect(within(strip).queryByTestId('vitana-card-G1')).toBeNull();
    expect(within(strip).queryByTestId('vitana-card-F4')).toBeNull();
    expect(within(screen.getByTestId('vitana-card-G3')).getByText(/^Streak: 12 days · /)).toBeTruthy();
    expect(screen.getByTestId('vitana-card-E1-dismiss').props.accessibilityState).toMatchObject({ disabled: true });
    expect(gw.requests.find((r) => r.path === '/enrichment-cards')?.query.get('screen')).toBe('vitana-index');
    fireEvent.press(screen.getByTestId('vitana-card-action-F3'));
    expect(router.navigate).toHaveBeenCalledWith('/daily-diary');
    fireEvent.press(screen.getByTestId('vitana-card-E1-dismiss'));
    await settle();
    expect(gw.requests.filter((r) => r.method !== 'GET')).toEqual([]);
  });

  it('feature cards only: F3, F4, F6; the X hides one for 7 days on this device; F4 opens Talk to Vitana', async () => {
    const { wrapper } = biologyWrapper({ routes: biologyRoutes({ 'GET /enrichment-cards': { ok: true, cards: [] } }) });
    const r = render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-card-F6')).toBeTruthy());
    expect(screen.getByText('Got a question?')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-card-action-F4'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/talk-to-vitana');
    fireEvent.press(screen.getByTestId('vitana-card-F3-dismiss'));
    await gone('vitana-card-F3');
    await waitFor(async () => expect(Number(await AsyncStorage.getItem('vitana.card.F3.dismissed_at'))).toBeGreaterThan(0));
    r.unmount();
    const again = biologyWrapper({ routes: biologyRoutes({ 'GET /enrichment-cards': { ok: true, cards: [] } }) });
    render(<VitanaIndexDetailScreen />, { wrapper: again.wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-card-F6')).toBeTruthy());
    expect(screen.queryByTestId('vitana-card-F3')).toBeNull();
  });

  it('an expired dismissal (older than 7 days) shows the card again', async () => {
    await AsyncStorage.setItem('vitana.card.F3.dismissed_at', String(Date.now() - 8 * 24 * 60 * 60 * 1000));
    const { wrapper } = biologyWrapper({ routes: biologyRoutes({ 'GET /enrichment-cards': { ok: true, cards: [] } }) });
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('vitana-card-F3')).toBeTruthy());
  });
});

describe('pillar agents, mission alignment, how it works', () => {
  it('mounts the pillar agents panel and the mission card: summary + bars', async () => {
    const { wrapper, gw } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('mission-alignment-body')).toBeTruthy());
    expect(screen.getByText('75% of your recommendations advance the mission')).toBeTruthy();
    expect(screen.getByText('3 of 4 recommendations aligned')).toBeTruthy();
    expect(within(screen.getByTestId('mission-pillar-exercise')).getByText('1 (25%)')).toBeTruthy();
    expect(within(screen.getByTestId('mission-pillar-none')).getByText('2 (50%)')).toBeTruthy();
    expect(within(screen.getByTestId('mission-economy-marketplace')).getByText('1 (25%)')).toBeTruthy();
    const req = gw.requests.find((r) => r.path === '/autopilot/recommendations' && r.query.get('limit') === '200');
    expect(req?.query.get('status')).toBe('new');
    expect(req?.headers['x-vitana-active-role']).toBe('community');
    expect(req?.headers.authorization).toMatch(/^Bearer /);
    expect(gw.requests.some((r) => r.path === '/pillar-agents/outputs')).toBe(true);
  });

  it('mission card: empty queue and gateway error', async () => {
    const empty = biologyWrapper({ routes: biologyRoutes({ 'GET /autopilot/recommendations': recommendationsRoute({ ok: true, recommendations: [] }) }) });
    const r = render(<VitanaIndexDetailScreen />, { wrapper: empty.wrapper });
    await waitFor(() => expect(screen.getByTestId('mission-alignment-empty')).toBeTruthy());
    expect(screen.getByText('No recommendations in your queue yet.')).toBeTruthy();
    r.unmount();
    const failed = biologyWrapper({ routes: biologyRoutes({ 'GET /autopilot/recommendations': recommendationsRoute(FAIL) }) });
    render(<VitanaIndexDetailScreen />, { wrapper: failed.wrapper });
    await waitFor(() => expect(screen.getByTestId('mission-alignment-error')).toBeTruthy());
    expect(screen.getByText('Could not load mission data')).toBeTruthy();
  });

  it('"How your Index grows" expands to the five ingredients and links to the journey', async () => {
    const { wrapper } = biologyWrapper();
    render(<VitanaIndexDetailScreen />, { wrapper });
    expect(screen.queryByTestId('vitana-index-how-body')).toBeNull();
    fireEvent.press(screen.getByTestId('vitana-index-how-toggle'));
    expect(screen.getByTestId('vitana-index-how-toggle').props.accessibilityState).toEqual({ expanded: true });
    expect(screen.getByText('Streak bonus')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-index-how-journey'));
    expect(router.navigate).toHaveBeenCalledWith('/autopilot');
    fireEvent.press(screen.getByTestId('vitana-index-how-toggle'));
    expect(screen.queryByTestId('vitana-index-how-body')).toBeNull();
  });
});

it('reads the Index once for the member (shared react-query subscription)', async () => {
  const { wrapper, sb } = biologyWrapper();
  render(<VitanaIndexDetailScreen />, { wrapper });
  await waitFor(() => expect(screen.getByTestId('vitana-index-score')).toBeTruthy());
  await settle();
  const reads = sb.requests.filter((r) => r.table === 'vitana_index_scores');
  expect(reads.length).toBe(1);
  expect(reads[0].filters).toContainEqual(['eq', 'user_id', USER_ID]);
});
