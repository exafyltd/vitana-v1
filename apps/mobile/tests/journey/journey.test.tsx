/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — /autopilot
 * (AUTOPILOT.MY_JOURNEY): the native My Journey dashboard in its loaded /
 * empty / error states, the Full-App tiles, Guided Mode (switch, hero,
 * catalog, topic drawer), the Autopilot popup (consent, selection, snooze,
 * complete, the client-dismissed set in the key-value store), the goal sheets
 * (goal-plan generation carries the member's language) — fake gateway and
 * Supabase double, every built request asserted, no network.
 */
import '../helpers/no-network';
import { orb, router } from './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { translate } from '../../src/i18n';
import { JourneyScreen } from '../../src/screens/journey/JourneyScreen';
import { __resetGuidedProgressStorageForTests } from '../../src/screens/journey/hooks/useGuidedJourneyProgress';
import { dismissedKey } from '../../src/screens/journey/hooks/useAutopilot';
import { FAIL, TOKEN, autopilotRecs, flush, fullRoutes, fullRpc, fullState, fullTables, goalPlan, guidedState, journeyNoGoal, journeyWrapper, topics } from './helpers';

// The dashboard mounts a dozen queries and two SVG charts; give the async helpers room on a loaded worker.
configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const en = (key: string) => translate('en', key);

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(async () => {
  router.navigate.mockClear();
  orb.open.mockClear();
  __clearToastsForTests();
  __resetGuidedProgressStorageForTests();
  overlayBus.clear();
  await AsyncStorage.clear();
});

const settle = async () => {
  await act(async () => {
    await flush();
  });
};

describe('My Journey — Full App, loaded', () => {
  it('renders the header, utility bar, hero and every Full-App tile from fixtures', async () => {
    const { wrapper, requests } = journeyWrapper(fullRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    expect(screen.getByText(en('screens.autopilotdashboard.myJourney'))).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('journey-hero-full')).toBeTruthy());
    // Ring: day_in_journey + 1, goal deadline countdown, adjust-goal pill with the localized seeded goal.
    expect(screen.getByTestId('journey-hero-day-number').props.children).toBe('12');
    expect(screen.getByTestId('journey-hero-plane')).toBeTruthy();
    expect(within(screen.getByTestId('journey-hero-goal')).getByText('Transform Health')).toBeTruthy();
    expect(screen.getByTestId('journey-future-self')).toBeTruthy();
    expect(screen.getByTestId('journey-future-anchor').props.children).toMatch(/4/);
    // Today's goal: the two "today" recommendations (wave-0 + horizon today), one done.
    await waitFor(() => expect(screen.getByTestId('journey-today-o1')).toBeTruthy());
    expect(screen.getByTestId('journey-today-o2')).toBeTruthy();
    expect(screen.queryByTestId('journey-today-o3')).toBeNull();
    // Matches: resolved profile, localized structured reason, score.
    await waitFor(() => expect(screen.getByTestId('journey-match-u-9')).toBeTruthy());
    expect(screen.getByText('Mila Novak')).toBeTruthy();
    expect(screen.getByText('87%')).toBeTruthy();
    // Events: nearest event with the attendee count.
    await waitFor(() => expect(screen.getByTestId('journey-event-ev1')).toBeTruthy());
    expect(screen.getByText('Sunrise yoga')).toBeTruthy();
    // Autopilot preview + chip count (consent given → list fetched).
    await waitFor(() => expect(screen.getByTestId('journey-autopilot-a1')).toBeTruthy());
    expect(screen.getByTestId('journey-autopilot-count')).toBeTruthy();
    expect(screen.getByTestId('journey-autopilot-chip-count')).toBeTruthy();
    // How you're doing: Index total, tier and 7-day trend via core trend7d; trajectory stats.
    await waitFor(() => expect(screen.getByTestId('journey-index-total').props.children).toBe('322'));
    expect(screen.getByTestId('journey-index-trend')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('journey-trajectory')).toBeTruthy());
    expect(screen.getByTestId('journey-keep-checking-in')).toBeTruthy();

    const calls = requests.map((r) => `${r.method} ${r.path}?${r.query.toString()}`);
    expect(calls).toContain('GET /my-journey?');
    expect(calls).toContain('GET /autopilot/recommendations?status=new%2Cactivated%2Ccompleted&limit=100');
    expect(calls).toContain('GET /autopilot/recommendations?status=new%2Cactivated&limit=20&role=community');
    expect(calls).toContain('GET /autopilot/recommendations/count?role=community');
    expect(calls).toContain('GET /journey/state?');
    for (const r of requests) expect(r.headers.authorization).toBe(`Bearer ${TOKEN}`);
    const list = requests.find((r) => r.query.get('limit') === '20');
    expect(list?.headers['x-user-id']).toBe('u-1');
    expect(list?.headers['x-vitana-active-role']).toBe('community');
    expect(requests.find((r) => r.path === '/my-journey')?.headers['x-vitana-active-role']).toBe('community');
  });

  it('matches and events read the right tables; a shown match is stamped viewed once', async () => {
    const { wrapper, db } = journeyWrapper(fullRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-match-u-9')).toBeTruthy());
    const matches = db.calls.find((c) => c.table === 'daily_matches' && c.op === 'select');
    expect(matches?.filters).toEqual(expect.arrayContaining([['eq', 'user_id', 'u-1'], ['is', 'action', null], ['limit', 3, undefined]]));
    await waitFor(() => expect(db.calls.some((c) => c.table === 'daily_matches' && c.op === 'update')).toBe(true));
    const viewed = db.calls.filter((c) => c.table === 'daily_matches' && c.op === 'update');
    expect(viewed).toHaveLength(1);
    expect(viewed[0].filters).toEqual(expect.arrayContaining([['in', 'matched_user_id', ['u-9']], ['is', 'viewed_at', null]]));
    expect(db.rpcCalls).toContainEqual({ name: 'get_user_profile_by_identifier', args: { identifier: 'u-9' } });
    await waitFor(() => expect(db.calls.some((c) => c.table === 'global_event_participants')).toBe(true));
    expect(db.calls.filter((c) => c.table === 'global_community_events')).toHaveLength(2);
  });

  it('tiles deep-link by path: matches, a match, events, an event', async () => {
    const { wrapper } = journeyWrapper(fullRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-match-u-9')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-matches-all'));
    fireEvent.press(screen.getByTestId('journey-match-u-9'));
    await waitFor(() => expect(screen.getByTestId('journey-event-ev1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-events-all'));
    fireEvent.press(screen.getByTestId('journey-event-ev1'));
    const targets = router.navigate.mock.calls.map((c) => c[0]);
    expect(targets).toEqual(['/me/matches', '/u/u-9', '/comm/events-meetups?tab=hot', '/comm/events-meetups?tab=hot&event=ev1']);
  });

  it('search filters the recommendations and a result opens the Autopilot popup', async () => {
    const { wrapper } = journeyWrapper(fullRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-today-o2')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-search-open'));
    fireEvent.changeText(screen.getByTestId('journey-search-input'), 'calendar');
    expect(screen.getByTestId('journey-search-result-o3')).toBeTruthy();
    expect(screen.queryByTestId('journey-search-result-o1')).toBeNull();
    fireEvent.press(screen.getByTestId('journey-search-result-o3'));
    await waitFor(() => expect(screen.getByTestId('autopilot-action-a1')).toBeTruthy());
  });
});

describe('My Journey — empty and error', () => {
  it('no goal: the Set-goal CTA opens the Life Compass (overlay bus); tiles show their empty lines; no match regenerates', async () => {
    const lifeCompass = jest.fn();
    overlayBus.on('vitana:open-life-compass', lifeCompass);
    const { wrapper, db } = journeyWrapper(
      fullRoutes({
        'GET /my-journey': journeyNoGoal,
        'GET /autopilot/recommendations': (r: { query: URLSearchParams }) => (r.query.get('limit') === '100' ? { recommendations: [] } : { ok: true, recommendations: [] }),
      }),
      { tables: { user_preferences: [{ user_id: 'u-1', ai_data_consent_given: true }] } },
    );
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-set-goal')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-hero-set-goal'));
    expect(lifeCompass).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('journey-today-empty')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('journey-matches-empty')).toBeTruthy());
    expect(db.functions).toContain('generate-daily-matches');
    // No community events: EventsPreview falls back to the demo events (EventsPreview.tsx:44-52; fix round 1), so its empty line never shows.
    await waitFor(() => expect(screen.getByTestId('journey-event-demo-group-1')).toBeTruthy());
    expect(screen.queryByTestId('journey-events-empty')).toBeNull();
    expect(screen.getByTestId('journey-autopilot-clear')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('journey-trajectory-empty')).toBeTruthy());
    // No Index rows: the self-heal compute RPC ran (web useVitanaIndex step 2).
    expect(db.rpcCalls.map((c) => c.name)).toContain('health_compute_vitana_index');
  });

  it('journey error: the hero shows the error card and Retry refetches /my-journey', async () => {
    const { wrapper, requests } = journeyWrapper(fullRoutes({ 'GET /my-journey': FAIL }), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-error')).toBeTruthy());
    const before = requests.filter((r) => r.path === '/my-journey').length;
    fireEvent.press(screen.getByTestId('journey-hero-retry'));
    await waitFor(() => expect(requests.filter((r) => r.path === '/my-journey').length).toBe(before + 1));
  });
});

describe('Guided Mode', () => {
  const guidedRoutes = () => fullRoutes({ 'GET /journey/state': guidedState, 'POST /journey/mode': { ok: true }, 'POST /journey/session-listened': { ok: true, awarded: true }, 'POST /journey/practice-complete': { ok: true } });

  it('resolves Guided from /journey/state: guided hero, how-it-works and the catalog replace the Full-App feed', async () => {
    const { wrapper, requests } = journeyWrapper(guidedRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-guided')).toBeTruthy());
    // Next session: session 1 (not listened); its first incomplete topic (T002) titles the card.
    expect(screen.getByTestId('journey-hero-next-title').props.children).toBe('Your journey');
    expect(screen.getByTestId('journey-hero-stepper')).toBeTruthy();
    expect(screen.getByTestId('journey-how-it-works')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('guided-catalog')).toBeTruthy());
    expect(screen.getByTestId('guided-topic-T001')).toBeTruthy();
    expect(screen.getByTestId('guided-session-2')).toBeTruthy();
    expect(screen.queryByTestId('journey-future-self')).toBeNull();
    expect(screen.queryByTestId('journey-todays-goal')).toBeNull();
    expect(requests.find((r) => r.path === '/journey-checklist')?.query.get('locale')).toBe('en');
    expect(await AsyncStorage.getItem('vitana.journeyMode.u-1')).toBe('guided');
  });

  it('the switch flips the mode optimistically, persists it and POSTs /journey/mode', async () => {
    const { wrapper, requests } = journeyWrapper(guidedRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-guided')).toBeTruthy());
    fireEvent.press(screen.getByTestId('guided-mode-full'));
    await waitFor(() => expect(screen.getByTestId('journey-future-self')).toBeTruthy());
    expect(screen.queryByTestId('guided-catalog')).toBeNull();
    await waitFor(() => expect(requests.some((r) => r.method === 'POST' && r.path === '/journey/mode')).toBe(true));
    expect(requests.find((r) => r.method === 'POST' && r.path === '/journey/mode')?.body).toEqual({ mode: 'full' });
    expect(await AsyncStorage.getItem('vitana.journeyMode.u-1')).toBe('full');
    expect(await AsyncStorage.getItem('vitana.journeyMode.last')).toBe('full');
  });

  it('an established member who never interacted resolves Full and the default is persisted once', async () => {
    const { wrapper, requests } = journeyWrapper(
      fullRoutes({ 'GET /journey/state': { ok: true, state: { mode: 'guided', onboardingStatus: 'not_started', enteredFullModeAt: null, returnedToGuidedAt: null, qualifiedAt: null } }, 'POST /journey/mode': { ok: true } }),
      { tables: fullTables, rpc: fullRpc },
    );
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-full')).toBeTruthy());
    await waitFor(() => expect(requests.filter((r) => r.method === 'POST' && r.path === '/journey/mode')).toHaveLength(1));
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({ mode: 'full' });
  });

  it('the hero start credits the listen (optimistic + POST) and opens Vitana', async () => {
    const { wrapper, requests } = journeyWrapper(guidedRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-start')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-hero-start'));
    expect(orb.open).toHaveBeenCalled();
    await waitFor(() => expect(requests.some((r) => r.path === '/journey/session-listened')).toBe(true));
    const body = requests.find((r) => r.path === '/journey/session-listened')?.body;
    expect(body).toMatchObject({ session: 1, topicId: 'T002' });
    expect(body.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Session 1 listened → the next session is 2; the daily goal (1) is met.
    await waitFor(() => expect(screen.getByTestId('journey-hero-next-title').props.children).toBe('The Vitana Index'));
    expect(screen.getByTestId('journey-step-goal-met')).toBeTruthy();
    expect(await AsyncStorage.getItem('vitana.guidedJourney.listenedSessions.v1.u-1')).toBe('[1]');
  });

  it('catalog: chapter filter, topic drawer (reward, explanations), practice → mark done', async () => {
    const { wrapper, requests } = journeyWrapper(guidedRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('guided-catalog')).toBeTruthy());
    // T001 is completed: done chip; session 1 (one of two done) shows progress 1/2.
    expect(within(screen.getByTestId('guided-topic-T001')).getByText(en('screens.guidedCatalog.statusDone'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('guided-chapter-basics'));
    expect(screen.queryByTestId('guided-session-1')).toBeNull();
    expect(screen.getByTestId('guided-session-2')).toBeTruthy();
    fireEvent.press(screen.getByTestId('guided-chapter-all'));
    fireEvent.press(screen.getByTestId('guided-topic-T001'));
    expect(orb.open).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('guided-reward')).toBeTruthy());
    expect(screen.getByTestId('guided-explanation-what')).toBeTruthy();
    expect(screen.getByTestId('guided-explanation-try')).toBeTruthy();
    await waitFor(() => expect(requests.find((r) => r.path === '/journey/session-listened')?.body).toMatchObject({ session: 1, topicId: 'T001' }));
    fireEvent.press(screen.getByTestId('guided-start-practice'));
    fireEvent.press(screen.getByTestId('guided-mark-done'));
    await waitFor(() => expect(requests.find((r) => r.path === '/journey/practice-complete')?.body).toEqual({ topicId: 'T001' }));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('screens.guidedCatalog.doneToast'));
  });

  it('practice "open feature" goes to the target route (memory) and credits the practice', async () => {
    const { wrapper, requests } = journeyWrapper(guidedRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('guided-topic-T002')).toBeTruthy());
    fireEvent.press(screen.getByTestId('guided-topic-T002'));
    fireEvent.press(screen.getByTestId('guided-start-practice'));
    fireEvent.press(screen.getByTestId('guided-open-feature'));
    expect(router.navigate).toHaveBeenCalledWith('/memory');
    await waitFor(() => expect(requests.find((r) => r.path === '/journey/practice-complete')?.body).toEqual({ topicId: 'T002' }));
  });

  it('empty curriculum: the catalog shows its empty line', async () => {
    const { wrapper } = journeyWrapper(fullRoutes({ 'GET /journey/state': guidedState, 'GET /journey-checklist': { ok: true, topics: [] } }), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('guided-catalog-empty')).toBeTruthy());
    expect(topics.length).toBeGreaterThan(0);
  });
});

describe('Autopilot popup', () => {
  const popupRoutes = (extra = {}) =>
    fullRoutes({
      'POST /autopilot/recommendations/a1/snooze': { ok: true },
      'POST /autopilot/recommendations/a2/complete': { ok: true, reward: 5 },
      'POST /autopilot/recommendations/a1/activate': { ok: true, vtid: 'V1', action_type: 'notify', completion_message: 'Done and dusted' },
      'POST /autopilot/recommendations/a1/complete': { ok: true },
      ...extra,
    });

  it('opens from the chip: lift strip, grouped actions, selection count; snooze POSTs {hours: 24} and toasts', async () => {
    const { wrapper, requests } = journeyWrapper(popupRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-autopilot-a1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('autopilot-action-a1')).toBeTruthy());
    expect(screen.getByTestId('autopilot-lift')).toBeTruthy();
    // Two pillars (exercise, hydration) → group headers.
    expect(screen.getByTestId('autopilot-group-exercise')).toBeTruthy();
    expect(within(screen.getByTestId('autopilot-selection')).getByText('1 / 1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('autopilot-snooze-a1'));
    await waitFor(() => expect(requests.find((r) => r.path === '/autopilot/recommendations/a1/snooze')?.body).toEqual({ hours: 24 }));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('screens.autopilotpopup.snoozedUntilTomorrow'));
    await waitFor(() => expect(screen.queryByTestId('autopilot-action-a1')).toBeNull());
  });

  it('Complete on an executing row persists it to the client-dismissed set (native key-value store)', async () => {
    const { wrapper, requests } = journeyWrapper(popupRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('autopilot-complete-a2')).toBeTruthy());
    fireEvent.press(screen.getByTestId('autopilot-complete-a2'));
    await waitFor(() => expect(requests.some((r) => r.method === 'POST' && r.path === '/autopilot/recommendations/a2/complete' && r.query.get('role') === 'community')).toBe(true));
    await waitFor(async () => expect(await AsyncStorage.getItem(dismissedKey('u-1'))).toBe('["a2"]'));
    await waitFor(() => expect(screen.queryByTestId('autopilot-action-a2')).toBeNull());
  });

  it('Go runs the selection (activate → notify → complete) and shows the done banner with the server message', async () => {
    const { wrapper, requests } = journeyWrapper(popupRoutes(), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('autopilot-action-a1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('autopilot-go'));
    await waitFor(() => expect(screen.getByTestId('autopilot-banner')).toBeTruthy());
    expect(screen.getByText('Done and dusted')).toBeTruthy();
    expect(requests.find((r) => r.path === '/autopilot/recommendations/a1/activate')?.body).toEqual({});
    expect(requests.some((r) => r.path === '/autopilot/recommendations/a1/complete')).toBe(true);
  });

  it('a drafted suggestion is reviewed in the draft sheet before the run; the reviewed text is sent', async () => {
    const drafted = [{ ...autopilotRecs[0], action: { kind: 'post_to_feed' } }];
    const { wrapper, requests } = journeyWrapper(
      popupRoutes({
        'GET /autopilot/recommendations': (r: { query: URLSearchParams }) => (r.query.get('limit') === '100' ? { recommendations: [] } : { ok: true, recommendations: drafted }),
        'POST /autopilot/recommendations/a1/draft': { ok: true, kind: 'post_to_feed', draft: 'Morning walk, anyone?' },
        'POST /autopilot/recommendations/a1/activate': { ok: true, action_type: 'navigate', target: '/memory' },
      }),
      { tables: fullTables, rpc: fullRpc },
    );
    render(<JourneyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('autopilot-action-a1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('autopilot-go'));
    await waitFor(() => expect(screen.getByTestId('autopilot-draft-text').props.value).toBe('Morning walk, anyone?'));
    fireEvent.changeText(screen.getByTestId('autopilot-draft-text'), 'Walk at 8?');
    fireEvent.press(screen.getByTestId('autopilot-draft-confirm'));
    await waitFor(() => expect(requests.find((r) => r.path === '/autopilot/recommendations/a1/activate')?.body).toEqual({ draft_text: 'Walk at 8?' }));
    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith('/memory'));
  });

  it('without consent the consent dialog opens; I agree writes user_preferences and loads the list', async () => {
    const { wrapper, db } = journeyWrapper(popupRoutes(), { tables: { ...fullTables, user_preferences: [{ user_id: 'u-1', ai_data_consent_given: false }] }, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await settle();
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('ai-consent-agree')).toBeTruthy());
    fireEvent.press(screen.getByTestId('ai-consent-agree'));
    await waitFor(() => expect(db.calls.some((c) => c.table === 'user_preferences' && c.op === 'update')).toBe(true));
    expect(db.calls.find((c) => c.table === 'user_preferences' && c.op === 'update')?.values).toMatchObject({ ai_data_consent_given: true });
    expect(await AsyncStorage.getItem('vitana_ai_consent_given')).toBe('true');
    await waitFor(() => expect(screen.getByTestId('autopilot-action-a1')).toBeTruthy());
  });

  it('error state offers Try again; an empty queue regenerates once', async () => {
    let fail = true;
    const { wrapper, requests } = journeyWrapper(
      popupRoutes({
        'GET /autopilot/recommendations': (r: { query: URLSearchParams }) => (r.query.get('limit') === '100' ? { recommendations: [] } : fail ? FAIL : { ok: true, recommendations: [] }),
        'POST /autopilot/recommendations/generate': { ok: true, generated: 0, reason: 'no_signals' },
      }),
      { tables: fullTables, rpc: fullRpc },
    );
    render(<JourneyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('journey-autopilot-chip'));
    await waitFor(() => expect(screen.getByTestId('autopilot-error')).toBeTruthy());
    fail = false;
    fireEvent.press(screen.getByTestId('autopilot-retry'));
    await waitFor(() => expect(screen.getByTestId('autopilot-empty')).toBeTruthy());
    await waitFor(() => expect(requests.filter((r) => r.path === '/autopilot/recommendations/generate')).toHaveLength(1));
    expect(screen.getByText(en('screens.autopilotpopup.nothingNewRightNow'))).toBeTruthy();
  });
});

describe('goal sheets', () => {
  it('the goal pill opens the goal dialog prefilled; Save writes a new compass version, asks for the plan in the member language and opens the plan sheet', async () => {
    const { wrapper, requests, db } = journeyWrapper(
      fullRoutes({ 'POST /goal-plan/generate': { ok: true, plan: goalPlan.plan }, 'GET /goal-plan': { ok: true, plan: null } }),
      { tables: fullTables, rpc: fullRpc, language: 'de-DE' },
    );
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-goal')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-hero-goal'));
    await waitFor(() => expect(screen.getByTestId('goal-setup-text').props.value).toBe('Transform Health'));
    fireEvent.changeText(screen.getByTestId('goal-setup-date'), '2099-01-31');
    fireEvent.changeText(screen.getByTestId('goal-setup-value'), '5');
    fireEvent.changeText(screen.getByTestId('goal-setup-unit'), 'km');
    fireEvent.press(screen.getByTestId('goal-setup-save'));
    await waitFor(() => expect(db.calls.some((c) => c.table === 'life_compass' && c.op === 'insert')).toBe(true));
    expect(db.calls.find((c) => c.table === 'life_compass' && c.op === 'update')?.values).toEqual({ is_active: false });
    expect(db.calls.find((c) => c.table === 'life_compass' && c.op === 'insert')?.values).toEqual({
      user_id: 'u-1',
      primary_goal: 'Transform Health',
      category: 'health',
      is_active: true,
      version: 3,
      target_date: '2099-01-31',
      target_value: 5,
      target_unit: 'km',
    });
    await waitFor(() => expect(requests.some((r) => r.method === 'POST' && r.path === '/goal-plan/generate')).toBe(true));
    const gen = requests.find((r) => r.method === 'POST' && r.path === '/goal-plan/generate');
    // R2.5: the LLM plan request carries the member's language.
    expect(gen?.query.get('locale')).toBe('de-DE');
    expect(gen?.body).toEqual({ answers: [] });
    await waitFor(() => expect(screen.queryByTestId('goal-plan-empty') ?? screen.queryByTestId('goal-plan-loaded') ?? screen.queryByTestId('goal-plan-loading')).toBeTruthy());
  });

  it('the plan sheet (plane badge) renders the loaded plan; a habit toggles done', async () => {
    const { wrapper, requests } = journeyWrapper(fullRoutes({ 'GET /goal-plan': goalPlan, 'POST /goal-plan/steps/h1/complete': { ok: true } }), { tables: fullTables, rpc: fullRpc });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-plane')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-hero-plane'));
    await waitFor(() => expect(screen.getByTestId('goal-plan-loaded')).toBeTruthy());
    expect(screen.getByTestId('goal-plan-ring')).toBeTruthy();
    expect(screen.getByTestId('goal-plan-next')).toBeTruthy();
    expect(screen.getAllByText('First 5k').length).toBeGreaterThan(0);
    // The two "Weekly review" checkpoints collapse to one row.
    expect(screen.getAllByText('Weekly review')).toHaveLength(1);
    fireEvent.press(screen.getByTestId('goal-step-h1'));
    await waitFor(() => expect(requests.find((r) => r.path === '/goal-plan/steps/h1/complete')?.body).toEqual({ done: true }));
    expect(requests.find((r) => r.path === '/goal-plan')?.query.get('locale')).toBe('en-US');
  });

  it('an empty plan auto-generates once; clarifying questions are answered inline', async () => {
    const { wrapper, requests } = journeyWrapper(
      fullRoutes({ 'GET /goal-plan': { ok: true, plan: null }, 'POST /goal-plan/generate': (r: { body: { answers: unknown[] } }) => (r.body.answers.length ? { ok: true, plan: null } : { ok: true, plan: null, needs_clarification: true, questions: ['How far do you run today?'] }) }),
      { tables: fullTables, rpc: fullRpc },
    );
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-plane')).toBeTruthy());
    fireEvent.press(screen.getByTestId('journey-hero-plane'));
    await waitFor(() => expect(screen.getByTestId('goal-plan-clarify')).toBeTruthy());
    expect(requests.filter((r) => r.path === '/goal-plan/generate')).toHaveLength(1);
    fireEvent.changeText(screen.getByTestId('goal-plan-answer-0'), '3 km');
    fireEvent.press(screen.getByTestId('goal-plan-submit'));
    await waitFor(() => expect(requests.filter((r) => r.path === '/goal-plan/generate')).toHaveLength(2));
    expect(requests.filter((r) => r.path === '/goal-plan/generate')[1].body).toEqual({ answers: [{ question: 'How far do you run today?', answer: '3 km' }] });
    expect(fullState.ok).toBe(true);
  });
});
