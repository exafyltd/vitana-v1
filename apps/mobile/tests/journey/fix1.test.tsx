/**
 * VTID-05461 fix round 1 (review journey-7c8eacd.md) — the mobile-web surfaces
 * the first head did not draw, each asserted against the built requests:
 *  - utility bar: UniversalCalendarButton, Life Compass, gift voucher (+ the
 *    voucher checkout), VitanaIndexChip, in the web rail order;
 *  - the card strip's static feature cards F1/F2/F3/F9 (local 7-day hide,
 *    server cards first, at most 3);
 *  - EventsPreview's demo fallback (titles from the catalog);
 *  - the daily-goal milestone modal + confetti, the "+N VTNA" toast, the
 *    media-caption copy, the popup error line through i18n;
 *  - the Guided view's AudiobookReminderControl mount slot;
 *  - ring / glow motion (reduced motion respected).
 * Fake gateway + Supabase double, no network.
 */
import '../helpers/no-network';
import type { ReactElement } from 'react';
import { orb, router } from './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, Clipboard, Platform, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests, UIProvider } from '../../src/ports/ui';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { translate } from '../../src/i18n';
import { JourneyScreen } from '../../src/screens/journey/JourneyScreen';
import { JourneyOrbBridgeContext, JourneySlotsContext, type JourneyOrbBridge } from '../../src/screens/journey/seams';
import { __resetGuidedProgressStorageForTests } from '../../src/screens/journey/hooks/useGuidedJourneyProgress';
import { __resetCelebrateForTests } from '../../src/screens/journey/celebrate';
import { __resetFeatureCardDismissMemory } from '../../src/screens/journey/EnrichmentStrip';
import { buildJourneyRing } from '../../src/ports/journey';
import { autopilotRecs, FAIL, flush, fullRoutes, fullRpc, fullTables, guidedState, journeyFull, journeyWrapper, onboarding } from './helpers';

jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({ __esModule: true, default: { setString: jest.fn(), getString: jest.fn(async () => '') } }));

// tests/helpers/mocks.ts stubs expo-web-browser with openAuthSessionAsync only; the voucher checkout uses openBrowserAsync.
(WebBrowser as unknown as { openBrowserAsync: jest.Mock }).openBrowserAsync = jest.fn(async () => ({ type: 'opened' }));

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
const dayKey = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const calendarRows = [
  { id: 'c1', user_id: 'u-1', title: 'Physio', start_time: inDays(1), status: 'confirmed' },
  { id: 'c2', user_id: 'u-1', title: 'Dentist', start_time: inDays(2), status: 'conflict' },
  { id: 'c3', user_id: 'u-1', title: 'Old', start_time: inDays(-2), status: 'confirmed' },
];
const tables = { ...fullTables, calendar_events: calendarRows };

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(async () => {
  router.navigate.mockClear();
  orb.open.mockClear();
  (WebBrowser.openBrowserAsync as jest.Mock).mockClear();
  (Clipboard.setString as jest.Mock).mockClear();
  __clearToastsForTests();
  __resetGuidedProgressStorageForTests();
  __resetCelebrateForTests();
  __resetFeatureCardDismissMemory();
  overlayBus.clear();
  await AsyncStorage.clear();
});

const settle = async () => {
  await act(async () => {
    await flush();
  });
};

function withPlatform(os: 'ios' | 'android') {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  return () => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
}

describe('utility bar (AutopilotDashboard.tsx:452-475)', () => {
  it('rail order: search, calendar, Life Compass, gift voucher, Vitana Index, Autopilot (Android)', async () => {
    const restore = withPlatform('android');
    try {
      const { wrapper } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
      render(<JourneyScreen />, { wrapper });
      await settle();
      const rail = screen.getByTestId('journey-utility-rail');
      const ids = within(rail)
        .getAllByRole('button')
        .map((b) => b.props.testID)
        .filter(Boolean);
      expect(ids).toEqual(['journey-search-open', 'journey-calendar-button', 'journey-life-compass-button', 'journey-gift-voucher-button', 'journey-vitana-index-chip', 'journey-autopilot-chip']);
    } finally {
      restore();
    }
  });

  it('the gift voucher is hidden on iOS (IAP gate, utility-action-button.tsx:43)', async () => {
    const { wrapper } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await settle();
    expect(Platform.OS).toBe('ios');
    expect(screen.queryByTestId('journey-gift-voucher-button')).toBeNull();
    expect(screen.getByTestId('journey-calendar-button')).toBeTruthy();
  });

  it('calendar: reads calendar_events for the member, badges upcoming events and the conflict dot, opens /calendar', async () => {
    const { wrapper, db } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-calendar-count').props.children).toBe('2'));
    expect(screen.getByTestId('journey-calendar-conflict')).toBeTruthy();
    const call = db.calls.find((c) => c.table === 'calendar_events');
    expect(call?.op).toBe('select');
    expect(call?.filters).toEqual([
      ['eq', 'user_id', 'u-1'],
      ['order', 'start_time', { ascending: true }],
    ]);
    expect(within(screen.getByTestId('journey-calendar-button')).getByText(en('actionBar.calendar'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('journey-calendar-button'));
    expect(router.navigate).toHaveBeenCalledWith('/calendar');
  });

  it('Life Compass opens the compass on the overlay bus', async () => {
    const seen: string[] = [];
    overlayBus.on('vitana:open-life-compass', () => seen.push('lc'));
    const { wrapper } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await settle();
    expect(within(screen.getByTestId('journey-life-compass-button')).getByText(en('lifeCompass.title'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('journey-life-compass-button'));
    expect(seen).toEqual(['lc']);
  });

  it('Vitana Index chip: 🧬 + the Index total, streak badge from the device streak store at 3+ days, opens the Index sheet', async () => {
    await AsyncStorage.setItem('vitana:streak:active-days', JSON.stringify({ days: [dayKey(-2), dayKey(-1), dayKey(0)], longest: 3 }));
    const opened: string[] = [];
    overlayBus.on('vitana:open-index', () => opened.push('index'));
    const { wrapper } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('journey-vitana-index-chip')).getByText('322')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('journey-vitana-index-streak', { includeHiddenElements: true }).props.children).toBe('🔥3'));
    expect(screen.getByTestId('journey-vitana-index-chip').props.accessibilityLabel).toBe(en('journeyAutopilotNative.indexChip.openWithStreak', { days: 3 }));
    fireEvent.press(screen.getByTestId('journey-vitana-index-chip'));
    expect(opened).toEqual(['index']);
  });

  it('Vitana Index chip: no streak badge under 3 days', async () => {
    await AsyncStorage.setItem('vitana:streak:active-days', JSON.stringify({ days: [dayKey(-1), dayKey(0)], longest: 2 }));
    const { wrapper } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('journey-vitana-index-chip')).getByText('322')).toBeTruthy());
    expect(screen.queryByTestId('journey-vitana-index-streak', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('journey-vitana-index-chip').props.accessibilityLabel).toBe(en('journeyAutopilotNative.indexChip.open'));
  });
});

describe('gift voucher checkout (MaxinaVoucherModal.tsx, Android)', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = withPlatform('android');
  });
  afterEach(() => restore());

  it('tier selection → stripe-create-voucher-checkout {tier, returnTo: /autopilot} → the checkout opens in the browser', async () => {
    const { wrapper, db } = journeyWrapper(fullRoutes(), {
      tables,
      rpc: fullRpc,
      functions: { 'stripe-create-voucher-checkout': () => ({ data: { url: 'https://checkout.stripe.test/s/1' } }) },
    });
    render(<JourneyScreen />, { wrapper });
    await settle();
    fireEvent.press(screen.getByTestId('journey-gift-voucher-button'));
    await waitFor(() => expect(screen.getByTestId('voucher-modal-content')).toBeTruthy());
    expect(screen.getByText(en('voucher.modal.title'))).toBeTruthy();
    expect(screen.getByText(en('voucher.tiers.experience.name'))).toBeTruthy();
    expect(screen.getByText('1 premium community event access')).toBeTruthy();
    expect(screen.getByTestId('voucher-buy').props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('voucher-tier-experience'));
    expect(within(screen.getByTestId('voucher-buy')).getByText(`${en('voucher.modal.buyVoucher')} · €99`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('voucher-buy'));
    await waitFor(() => expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://checkout.stripe.test/s/1'));
    expect(db.functionCalls).toEqual([{ name: 'stripe-create-voucher-checkout', body: { tier: 'experience', returnTo: '/autopilot' } }]);
  });

  it('a failed checkout toasts and returns to the selection', async () => {
    const { wrapper } = journeyWrapper(fullRoutes(), {
      tables,
      rpc: fullRpc,
      functions: { 'stripe-create-voucher-checkout': () => ({ error: { message: 'boom' } }) },
    });
    render(<JourneyScreen />, { wrapper });
    await settle();
    fireEvent.press(screen.getByTestId('journey-gift-voucher-button'));
    fireEvent.press(screen.getByTestId('voucher-tier-test'));
    fireEvent.press(screen.getByTestId('voucher-buy'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('voucher.toast.checkoutFailed'));
    expect(screen.getByTestId('voucher-tier-test')).toBeTruthy();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });
});

describe('card strip static feature cards (EnrichmentCardStrip.tsx:70-100, screen=autopilot)', () => {
  it('no server cards: F1, F2, F3 (maxCards 3); F9 waits; hiding F3 stores the device-local time and brings F9', async () => {
    const { wrapper } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    const strip = await waitFor(() => screen.getByTestId('vitana-card-strip-autopilot'));
    await waitFor(() => expect(within(strip).getByTestId('journey-feature-card-F1')).toBeTruthy());
    expect(within(strip).getByTestId('journey-feature-card-F2')).toBeTruthy();
    expect(within(strip).getByTestId('journey-feature-card-F3')).toBeTruthy();
    expect(within(strip).queryByTestId('journey-feature-card-F9')).toBeNull();
    expect(within(strip).getByText(en('screens.vitanaCards.F3.title'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('journey-feature-card-F3-dismiss'));
    await waitFor(async () => expect(Number(await AsyncStorage.getItem('vitana.card.F3.dismissed_at'))).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByTestId('journey-feature-card-F9')).toBeTruthy());
    expect(screen.queryByTestId('journey-feature-card-F3')).toBeNull();
    fireEvent.press(screen.getByTestId('journey-feature-card-F9-action'));
    expect(router.navigate).toHaveBeenCalledWith('/calendar');
  });

  it('a hide older than 7 days is ignored; F2 opens the Index sheet; F1 opens My Journey', async () => {
    await AsyncStorage.setItem('vitana.card.F1.dismissed_at', String(Date.now() - 8 * 86_400_000));
    const opened: string[] = [];
    overlayBus.on('vitana:open-index', () => opened.push('index'));
    const { wrapper } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-feature-card-F1')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('journey-feature-card-F2-action')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-feature-card-F2-action'));
    expect(opened).toEqual(['index']);
    fireEvent.press(screen.getByTestId('journey-feature-card-F1-action'));
    expect(router.navigate).toHaveBeenCalledWith('/autopilot');
  });

  it('server cards come first, then the feature cards, capped at 3', async () => {
    const { wrapper, requests } = journeyWrapper(
      fullRoutes({ 'GET /enrichment-cards': { ok: true, cards: [{ card_type: 'E1', title: 'Add a photo', description: 'Faces build trust' }] } }),
      { tables, rpc: fullRpc },
    );
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('feed-card-E1')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('journey-feature-card-F2')).toBeTruthy());
    expect(screen.getByTestId('journey-feature-card-F1')).toBeTruthy();
    expect(screen.queryByTestId('journey-feature-card-F3')).toBeNull();
    expect(requests.find((r) => r.path === '/enrichment-cards')?.query.get('screen')).toBe('autopilot');
  });
});

describe('EventsPreview demo fallback (EventsPreview.tsx:44-52)', () => {
  it('no community events: the two demo events, titles from the catalog', async () => {
    const { wrapper } = journeyWrapper(fullRoutes(), { tables: { ...tables, global_community_events: [] }, rpc: fullRpc, language: 'de-DE' });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-event-demo-group-1')).toBeTruthy());
    expect(screen.getByTestId('journey-event-demo-group-2')).toBeTruthy();
    expect(screen.queryByTestId('journey-events-empty')).toBeNull();
    expect(screen.getByText(translate('de', 'journeyAutopilotNative.demoEvents.sunriseYoga'))).toBeTruthy();
    expect(screen.getByText(translate('de', 'journeyAutopilotNative.demoEvents.mindfulWalk'))).toBeTruthy();
    // demo-group-1 (Wellness) shows attendees; demo-group-2 (Community) is online.
    expect(within(screen.getByTestId('journey-event-demo-group-1')).getByText(new RegExp(translate('de', 'screens.autopilotdashboard.eventsAttending', { count: 128 })))).toBeTruthy();
    expect(within(screen.getByTestId('journey-event-demo-group-2')).getByText(new RegExp(translate('de', 'screens.autopilotdashboard.eventsOnline')))).toBeTruthy();
    fireEvent.press(screen.getByTestId('journey-event-demo-group-1'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events-meetups?tab=hot&event=demo-group-1');
  });
});

describe('daily-goal celebration (TodaysGoalCard.tsx:34-36, celebrate.ts:408-432)', () => {
  const allDone = { recommendations: onboarding.recommendations.map((r) => ({ ...r, status: 'completed' })) };
  const routes = () =>
    fullRoutes({
      'GET /autopilot/recommendations': (r: { query: URLSearchParams }) => (r.query.get('status') === 'new,activated,completed' ? allDone : { ok: true, recommendations: autopilotRecs }),
      'POST /analytics/celebrate': { ok: true },
    });

  it('all of today done: milestone modal (🎉, title, body, Continue) + confetti, once per local day, analytics posted', async () => {
    const { wrapper, requests } = journeyWrapper(routes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-milestone-content')).toBeTruthy());
    expect(screen.getByText(en('toasts.dailyGoal.title'))).toBeTruthy();
    expect(screen.getByText(en('toasts.dailyGoal.body'))).toBeTruthy();
    expect(screen.getByText('🎉', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('journey-confetti', { includeHiddenElements: true })).toBeTruthy();
    expect(await AsyncStorage.getItem('vitana:celebrate:daily_goal:day')).toBe(dayKey(0));
    await waitFor(() => expect(requests.find((r) => r.method === 'POST' && r.path === '/analytics/celebrate')?.body).toEqual({ kind: 'daily-goal', source: 'my-journey', throttled: false }));
    expect(requests.find((r) => r.path === '/analytics/celebrate')?.headers['x-vitana-active-role']).toBe('community');
    fireEvent.press(screen.getByTestId('journey-milestone-continue'));
    await waitFor(() => expect(screen.queryByTestId('journey-milestone-content')).toBeNull());
  });

  it('already celebrated today: no modal, the throttled fire is still reported', async () => {
    await AsyncStorage.setItem('vitana:celebrate:daily_goal:day', dayKey(0));
    const { wrapper, requests } = journeyWrapper(routes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-today-all-done')).toBeTruthy());
    await waitFor(() => expect(requests.find((r) => r.path === '/analytics/celebrate')?.body).toEqual({ kind: 'daily-goal', source: 'my-journey', throttled: true }));
    expect(screen.queryByTestId('journey-milestone-content')).toBeNull();
  });

  it('reduced motion: the modal shows without confetti', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    try {
      const { wrapper } = journeyWrapper(routes(), { tables, rpc: fullRpc });
      render(<JourneyScreen />, { wrapper });
      await waitFor(() => expect(screen.getByTestId('journey-milestone-content')).toBeTruthy());
      expect(screen.queryByTestId('journey-confetti', { includeHiddenElements: true })).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Autopilot popup — toast, caption copy, error line', () => {
  it('Complete with a reward toasts "+N VTNA earned!" from the catalog (AutopilotPopup.tsx:342)', async () => {
    const { wrapper } = journeyWrapper(fullRoutes({ 'POST /autopilot/recommendations/a2/complete': { ok: true, reward: 5 } }), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('autopilot-complete-a2')).toBeTruthy());
    fireEvent.press(screen.getByTestId('autopilot-complete-a2'));
    await waitFor(() => expect(__toastsForTests().find((t) => t.titleKey === 'journeyAutopilotNative.autopilot.vtnaEarned')?.params).toEqual({ reward: 5 }));
  });

  it('a reviewed media caption is copied to the clipboard (AutopilotPopup.tsx:263-265)', async () => {
    const media = [{ ...autopilotRecs[0], action: { kind: 'media_upload' } }];
    const { wrapper, requests } = journeyWrapper(
      fullRoutes({
        'GET /autopilot/recommendations': (r: { query: URLSearchParams }) => (r.query.get('limit') === '100' ? { recommendations: [] } : { ok: true, recommendations: media }),
        'POST /autopilot/recommendations/a1/draft': { ok: true, kind: 'media_upload', draft: 'Sunrise stretch' },
        'POST /autopilot/recommendations/a1/activate': { ok: true, action_type: 'navigate', target: '/media-hub' },
      }),
      { tables, rpc: fullRpc },
    );
    render(<JourneyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('autopilot-action-a1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('autopilot-go'));
    await waitFor(() => expect(screen.getByTestId('autopilot-draft-text').props.value).toBe('Sunrise stretch'));
    fireEvent.press(screen.getByTestId('autopilot-draft-confirm'));
    expect(Clipboard.setString).toHaveBeenCalledWith('Sunrise stretch');
    await waitFor(() => expect(requests.find((r) => r.path === '/autopilot/recommendations/a1/activate')?.body).toEqual({ draft_text: 'Sunrise stretch' }));
  });

  it('the error state names the failure through the catalog (AutopilotPopup.tsx:520), never the raw message', async () => {
    const { wrapper } = journeyWrapper(
      fullRoutes({ 'GET /autopilot/recommendations': (r: { query: URLSearchParams }) => (r.query.get('limit') === '100' ? { recommendations: [] } : FAIL) }),
      { tables, rpc: fullRpc },
    );
    render(<JourneyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('autopilot-error-detail')).toBeTruthy());
    expect(screen.getByTestId('autopilot-error-detail').props.children).toBe(en('journeyAutopilotNative.autopilot.errorStatus', { status: 500 }));
    expect(screen.queryByText(/Fetch failed/)).toBeNull();
  });
});

describe('Guided view — AudiobookReminderControl mount slot (AutopilotDashboard.tsx:435; tasks.md:86 → autopilot-audiobook lane)', () => {
  const guidedRoutes = () => fullRoutes({ 'GET /journey/state': guidedState });

  it('renders the provided control between how-it-works and the catalog', async () => {
    const { wrapper } = journeyWrapper(guidedRoutes(), { tables, rpc: fullRpc });
    const Reminder = () => <Text testID="fake-reminder-control">reminder</Text>;
    render(
      <JourneySlotsContext.Provider value={{ AudiobookReminderControl: Reminder }}>
        <JourneyScreen />
      </JourneySlotsContext.Provider>,
      { wrapper },
    );
    await waitFor(() => expect(screen.getByTestId('fake-reminder-control')).toBeTruthy());
    const guided = screen.getByTestId('journey-guided-view');
    const order = (guided.props.children as Array<{ props?: { testID?: string } } | null>).map((c) => c?.props?.testID ?? null);
    expect(order).toEqual(['journey-how-it-works-slot', 'journey-slot-audiobook-reminder', 'guided-session-list']);
  });

  it('no control provided: the slot renders nothing', async () => {
    const { wrapper } = journeyWrapper(guidedRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('guided-catalog')).toBeTruthy());
    expect(screen.queryByTestId('journey-slot-audiobook-reminder')).toBeNull();
  });
});

describe('motion (DreamNorthStar.tsx:516-527, :592-603; GoalProgressRing.tsx:140-151)', () => {
  const guidedRoutes = () => fullRoutes({ 'GET /journey/state': guidedState });

  it('the guided start button pulses its glow (motion allowed)', async () => {
    const { wrapper } = journeyWrapper(guidedRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-start')).toBeTruthy());
    expect(screen.getByTestId('journey-hero-start-glow')).toBeTruthy();
    expect(screen.getByTestId('journey-ring-progress')).toBeTruthy();
  });

  // The shell root's kit provider (ShellRoot.tsx:25) carries the OS reduced-motion setting.
  const inShell = (node: ReactElement) => (
    <UIProvider colorScheme="light" direction="ltr">
      {node}
    </UIProvider>
  );

  it('reduced motion: no glow pulse, a steady halo instead', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    try {
      const { wrapper } = journeyWrapper(guidedRoutes(), { tables, rpc: fullRpc });
      render(inShell(<JourneyScreen />), { wrapper });
      await waitFor(() => expect(screen.getByTestId('journey-hero-start')).toBeTruthy());
      await settle();
      await waitFor(() => expect(screen.queryByTestId('journey-hero-start-glow')).toBeNull());
      expect(screen.getByTestId('journey-hero-start-halo')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it('reduced motion, Full App: the countdown ring sits at the journey ring percentage', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    try {
      const { wrapper } = journeyWrapper(fullRoutes(), { tables, rpc: fullRpc });
      render(inShell(<JourneyScreen />), { wrapper });
      await waitFor(() => expect(screen.getByTestId('journey-ring-progress')).toBeTruthy());
      await settle();
      const ring = screen.getByTestId('journey-ring-progress');
      const circumference = Number([].concat(ring.props.strokeDasharray)[0]);
      const pct = buildJourneyRing(journeyFull.life_compass as never, journeyFull.journey as never).pct;
      await waitFor(() => expect(Number(screen.getByTestId('journey-ring-progress').props.strokeDashoffset)).toBeCloseTo(circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference, 3));
    } finally {
      spy.mockRestore();
    }
  });
});

describe('ORB hook point (GuidedJourneyCatalog.tsx:200-237, orbActivate.ts:79-93) — wired later by the ORB lane', () => {
  const guidedRoutes = () => fullRoutes({ 'GET /journey/state': guidedState, 'POST /journey/session-listened': { ok: true }, 'POST /journey/practice-complete': { ok: true } });

  it('default bridge: a topic tap opens Vitana generically', async () => {
    const { wrapper } = journeyWrapper(guidedRoutes(), { tables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('guided-topic-T002')).toBeTruthy());
    fireEvent.press(screen.getByTestId('guided-topic-T002'));
    expect(orb.open).toHaveBeenCalledTimes(1);
  });

  it('a wired bridge: the tap focuses the topic; a teaching-end signal marks it done, toasts and opens the congratulation view', async () => {
    const focus = jest.fn();
    let emit: ((d: { topicId: string | null; reason: string | null }) => void) | null = null;
    const unsubscribe = jest.fn();
    const bridge: JourneyOrbBridge = {
      focusGuidedTopic: focus,
      onGuidedTopicTeachingComplete: (cb) => {
        emit = cb;
        return unsubscribe;
      },
    };
    const { wrapper, requests } = journeyWrapper(guidedRoutes(), { tables, rpc: fullRpc });
    const view = render(
      <JourneyOrbBridgeContext.Provider value={bridge}>
        <JourneyScreen />
      </JourneyOrbBridgeContext.Provider>,
      { wrapper },
    );
    await waitFor(() => expect(screen.getByTestId('guided-topic-T002')).toBeTruthy());
    fireEvent.press(screen.getByTestId('guided-topic-T002'));
    expect(focus).toHaveBeenCalledWith('T002');
    expect(orb.open).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('guided-back'));
    expect(emit).not.toBeNull();
    await act(async () => {
      emit?.({ topicId: 'T003', reason: 'model' });
      await flush();
    });
    await waitFor(() => expect(requests.find((r) => r.path === '/journey/practice-complete')?.body).toEqual({ topicId: 'T003' }));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toContain('screens.guidedCatalog.doneToast'));
    await waitFor(() => expect(screen.getByTestId('guided-reward')).toBeTruthy());
    view.unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
