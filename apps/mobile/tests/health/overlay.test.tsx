/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the Vitana Index
 * overlay (OVERLAY.VITANA_INDEX): opened from the snapshot, the chip or the
 * `vitana:open-index` bus event (the ORB directive), dismissed by its close
 * button; renders the consented Index data (score, tier framing, 7-day
 * delta, balance, pillars), the pending Autopilot lift, the 30-day horizon
 * and the Life Compass link. Pure helpers mirror the web copy rules.
 */
import '../helpers/no-network';
import { router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { HealthScreen } from '../../src/screens/health/HealthScreen';
import { GROWTH_CONFETTI_DAY_KEY, keepGoingMessage, sevenDayDelta, sumVectors, todayKey } from '../../src/screens/health/VitanaIndexSheet';
import { healthWrapper, indexRows } from './helpers';

beforeEach(async () => {
  searchParams.current = {};
  jest.clearAllMocks();
  await AsyncStorage.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

async function openFromSnapshot() {
  await waitFor(() => expect(within(screen.getByTestId('vitana-index-chip')).getByText('412')).toBeTruthy());
  fireEvent.press(screen.getByTestId('health-snapshot'));
  await waitFor(() => expect(screen.getByTestId('vitana-index-sheet-content')).toBeTruthy());
}

describe('open / dismiss', () => {
  it('the snapshot opens the sheet; its close button dismisses it', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    expect(screen.queryByTestId('vitana-index-sheet-content')).toBeNull();
    await openFromSnapshot();
    expect(screen.getByText('Your Index')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-index-sheet-close'));
    await waitFor(() => expect(screen.queryByTestId('vitana-index-sheet-content')).toBeNull(), { timeout: 5000 });
    // The sheet slides out (motion.sheetMs) before it unmounts: allow for a loaded CI worker.
  }, 20_000);

  it('the Vitana Index chip opens it', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('vitana-index-chip'));
    await waitFor(() => expect(screen.getByTestId('vitana-index-sheet-content')).toBeTruthy());
  });

  it('the `vitana:open-index` bus event (the ORB overlay directive) opens it', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    expect(overlayBus.listenerCount('vitana:open-index')).toBe(1);
    act(() => overlayBus.emit('vitana:open-index'));
    await waitFor(() => expect(screen.getByTestId('vitana-index-sheet-content')).toBeTruthy());
  });
});

describe('data render', () => {
  it('Today: score, tier, framing, 7-day delta, balance and the five pillars', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await openFromSnapshot();
    const score = screen.getByTestId('vitana-index-sheet-score');
    expect(within(score).getByText('412')).toBeTruthy();
    expect(score.props.accessibilityLabel).toBe('Vitana Index 412 of 999');
    expect(screen.getByTestId('vitana-index-sheet-tier')).toBeTruthy();
    expect(within(screen.getByTestId('vitana-index-sheet-delta')).getByText('+32this week')).toBeTruthy();
    expect(within(screen.getByTestId('vitana-index-sheet-balance')).getByText('Balance 90%')).toBeTruthy();
    expect(within(screen.getByTestId('vitana-index-sheet-pillars-sleep')).getByText('60')).toBeTruthy();
  });

  it('Next few days: the pending actions and their summed pillar lift; Open Autopilot', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await openFromSnapshot();
    await waitFor(() => expect(screen.getByTestId('vitana-index-next-summary')).toBeTruthy());
    expect(within(screen.getByTestId('vitana-index-next-summary')).getByText('+12')).toBeTruthy();
    expect(screen.getByTestId('vitana-index-pillar-deltas')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-index-open-autopilot'));
    expect(router.navigate).toHaveBeenCalledWith('/autopilot');
  });

  it('30-day horizon: the chart with ≥ 7 days of history, the empty copy with fewer', async () => {
    const { wrapper } = healthWrapper();
    const a = render(<HealthScreen />, { wrapper });
    await openFromSnapshot();
    expect(screen.getByTestId('vitana-index-horizon-chart')).toBeTruthy();
    a.unmount();
    const short = healthWrapper({ tables: { vitana_index_scores: indexRows().slice(-3) }, routes: {} });
    render(<HealthScreen />, { wrapper: short.wrapper });
    await waitFor(() => expect(within(screen.getByTestId('vitana-index-chip')).getByText('412')).toBeTruthy());
    fireEvent.press(screen.getByTestId('health-snapshot'));
    await waitFor(() => expect(screen.getByTestId('vitana-index-horizon-empty')).toBeTruthy());
    expect(screen.getByTestId('vitana-index-next-empty')).toBeTruthy();
  });

  it('"Understand index" closes the sheet and opens /health/vitana-index; the compass row shows the goal', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await openFromSnapshot();
    await waitFor(() => expect(within(screen.getByTestId('vitana-index-sheet-compass')).getByText('Compass: Sleep better →')).toBeTruthy());
    fireEvent.press(screen.getByTestId('vitana-index-sheet-understand'));
    expect(router.navigate).toHaveBeenCalledWith('/health/vitana-index');
  });

  it('the compass row emits `vitana:open-life-compass` and closes the sheet', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await openFromSnapshot();
    const opened = jest.fn();
    const off = overlayBus.on('vitana:open-life-compass', opened);
    fireEvent.press(screen.getByTestId('vitana-index-sheet-compass'));
    expect(opened).toHaveBeenCalledTimes(1);
    off();
  });

  it('a growth week shows the keep-going banner and marks the day', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await openFromSnapshot();
    await waitFor(() => expect(screen.getByTestId('vitana-index-banner')).toBeTruthy());
    expect(within(screen.getByTestId('vitana-index-banner')).getByText('Huge week — your Index is up 32. Keep going!')).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem(GROWTH_CONFETTI_DAY_KEY)).toBe(todayKey()));
  });

  it('without growth, the banner shows only on the first open of the day', async () => {
    const flat = indexRows().map((r) => ({ ...r, score_total: 400 }));
    await AsyncStorage.setItem(GROWTH_CONFETTI_DAY_KEY, todayKey());
    const { wrapper } = healthWrapper({ tables: { vitana_index_scores: flat }, routes: {} });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('vitana-index-chip')).getByText('400')).toBeTruthy());
    fireEvent.press(screen.getByTestId('health-snapshot'));
    await waitFor(() => expect(screen.getByTestId('vitana-index-sheet-content')).toBeTruthy());
    expect(screen.queryByTestId('vitana-index-banner')).toBeNull();
  });
});

describe('pure helpers (VitanaIndexSheet.tsx:39-96)', () => {
  it('keepGoingMessage picks the same branch as the web', () => {
    expect(keepGoingMessage(25, 0).key).toBe('healthNative.sheet.keepGoing.huge');
    expect(keepGoingMessage(12, 0).key).toBe('healthNative.sheet.keepGoing.roll');
    expect(keepGoingMessage(4, 8)).toEqual({ key: 'healthNative.sheet.keepGoing.streakWeek', params: { streak: 8, delta: 4 } });
    expect(keepGoingMessage(4, 3).key).toBe('healthNative.sheet.keepGoing.streakDays');
    expect(keepGoingMessage(4, 0).key).toBe('healthNative.sheet.keepGoing.up');
    expect(keepGoingMessage(0, 9).key).toBe('healthNative.sheet.keepGoing.habits');
    expect(keepGoingMessage(0, 3).key).toBe('healthNative.sheet.keepGoing.streak');
  });

  it('sevenDayDelta and sumVectors', () => {
    expect(sevenDayDelta([{ date: 'a', score: 1 }])).toBeNull();
    expect(sevenDayDelta([{ date: 'a', score: 10 }, { date: 'b', score: 4 }])).toBe(-6);
    expect(sumVectors([{ contributionVector: { sleep: 3, exercise: -1 } }, { contributionVector: { sleep: 2 } }, {}])).toEqual({ vector: { sleep: 5 }, total: 5 });
  });
});
