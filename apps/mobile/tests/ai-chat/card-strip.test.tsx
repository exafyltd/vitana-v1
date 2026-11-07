/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — the Talk-to-Vitana card
 * strip (web `EnrichmentCardStrip screen="talk-to-vitana"`): server cards
 * first (`GET /enrichment-cards?screen=talk-to-vitana`), then F1 / F2 / F3,
 * capped at 3; a feature card's X hides it on this device for 7 days
 * (AsyncStorage, web key); a failed server request keeps the feature cards;
 * F1 / F2 / F3 content and actions from fake gateway / Supabase data. No network.
 */
import '../helpers/no-network';
import { router } from './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { VitanaCardStrip } from '../../src/screens/ai-chat/VitanaCardStrip';
import { __resetFeatureCardDismissMemory } from '../../src/screens/ai-chat/data/feature-dismiss';
import { deriveTrend, weeklyChangePct } from '../../src/screens/ai-chat/data/vitana-index';
import { summarizeJourney } from '../../src/screens/ai-chat/data/journey';
import { daysAgo, indexSupabase, makeWrapper } from './helpers';

afterAll(() => __setSupabaseForTests(null));
beforeEach(async () => {
  jest.clearAllMocks();
  overlayBus.clear();
  __resetFeatureCardDismissMemory();
  await AsyncStorage.clear();
});

const CARDS = 'GET /enrichment-cards?screen=talk-to-vitana';
const CHECKLIST = 'GET /journey-checklist?locale=en';
const STATE = 'GET /journey/state';
const topics = [
  { topicId: 'a', session: 1, position: 1 },
  { topicId: 'b', session: 2, position: 1 },
  { topicId: 'c', session: 3, position: 1 },
];
const JOURNEY = { [CHECKLIST]: { ok: true, topics }, [STATE]: { ok: true, state: { currentSession: 2 } } };
const enrichment = (types: string[]) => ({
  ok: true,
  cards: types.map((card_type, i) => ({ card_type, category: 'enrichment', priority: 10 - i, title: `Server ${card_type}`, description: `Why ${card_type}` })),
});
const indexRows = () => indexSupabase([
  { user_id: 'u-self', date: daysAgo(5), score_total: 400 },
  { user_id: 'u-self', date: daysAgo(0), score_total: 450 },
]);

describe('strip composition', () => {
  it('asks for the talk-to-vitana screen and shows server cards first, capped at 3', async () => {
    const { wrapper, gateway } = makeWrapper({ [CARDS]: enrichment(['E1', 'E2']), ...JOURNEY }, { supabase: indexRows() });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    expect(await screen.findByTestId('feed-card-E1')).toBeTruthy();
    expect(screen.getByTestId('feed-card-E2')).toBeTruthy();
    expect(screen.getByText('Server E1')).toBeTruthy();
    expect(await screen.findByTestId('vitana-card-F1')).toBeTruthy();
    expect(screen.queryByTestId('vitana-card-F2')).toBeNull();
    expect(screen.queryByTestId('vitana-card-F3')).toBeNull();
    expect(gateway.calls.some((c) => c.path === '/enrichment-cards?screen=talk-to-vitana')).toBe(true);
  });

  it('without server cards it shows F1, F2 and F3', async () => {
    const { wrapper } = makeWrapper({ [CARDS]: enrichment([]), ...JOURNEY }, { supabase: indexRows() });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    expect(await screen.findByTestId('vitana-card-F1')).toBeTruthy();
    expect(await screen.findByTestId('vitana-card-F2')).toBeTruthy();
    expect(screen.getByTestId('vitana-card-F3')).toBeTruthy();
  });

  it('a failed server request drops only the server cards', async () => {
    const { wrapper } = makeWrapper({ ...JOURNEY }, { supabase: indexRows() });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    expect(await screen.findByTestId('vitana-card-F3')).toBeTruthy();
    expect(screen.queryByTestId('feed-card-E1')).toBeNull();
  });

  it('renders nothing when there is nothing to show', async () => {
    await AsyncStorage.setItem('vitana.card.F3.dismissed_at', String(Date.now()));
    const { wrapper, gateway } = makeWrapper({ [CARDS]: enrichment([]) });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    await waitFor(() => expect(gateway.calls.length).toBeGreaterThanOrEqual(3));
    await waitFor(() => expect(screen.queryByTestId('vitana-card-strip-talk-to-vitana')).toBeTruthy());
    expect(screen.queryByTestId('vitana-card-F1')).toBeNull();
    expect(screen.queryByTestId('vitana-card-F2')).toBeNull();
    expect(screen.queryByTestId('vitana-card-F3')).toBeNull();
  });
});

describe('feature card hide (7 days, this device)', () => {
  it('the X hides F3 and stores the web key', async () => {
    const { wrapper } = makeWrapper({ [CARDS]: enrichment([]) });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    fireEvent.press(await screen.findByTestId('vitana-card-F3-dismiss'));
    await waitFor(() => expect(screen.queryByTestId('vitana-card-F3')).toBeNull());
    const stored = Number(await AsyncStorage.getItem('vitana.card.F3.dismissed_at'));
    expect(Date.now() - stored).toBeLessThan(5000);
  });

  it('a hide older than 7 days no longer applies', async () => {
    await AsyncStorage.setItem('vitana.card.F3.dismissed_at', String(Date.now() - 8 * 24 * 3600 * 1000));
    const { wrapper } = makeWrapper({ [CARDS]: enrichment([]) });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    expect(await screen.findByTestId('vitana-card-F3')).toBeTruthy();
  });

  it('a server card X posts the server dismiss', async () => {
    const { wrapper, gateway } = makeWrapper({ [CARDS]: enrichment(['E2']), 'POST /enrichment-cards/dismiss': { ok: true, dismissed_until: null } });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    fireEvent.press(await screen.findByTestId('feed-card-E2-dismiss'));
    await waitFor(() => expect(gateway.writes().map((c) => [c.path, c.body])).toEqual([['/enrichment-cards/dismiss', { card_type: 'E2' }]]));
  });
});

describe('feature card content and actions', () => {
  it('F1: next episode + progress; the action opens My Journey', async () => {
    const { wrapper } = makeWrapper({ [CARDS]: enrichment([]), ...JOURNEY });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    expect(await screen.findByText('Your next step:')).toBeTruthy();
    expect(screen.getByText('Episode 2 is waiting · 1 done · today 0/1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-card-action-F1'));
    expect(router.navigate).toHaveBeenCalledWith('/autopilot');
  });

  it('F2: trend headline and score; opens the Index overlay when registered, else /health/vitana-index', async () => {
    const { wrapper } = makeWrapper({ [CARDS]: enrichment([]) }, { supabase: indexRows() });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    expect(await screen.findByTestId('vitana-card-F2')).toBeTruthy();
    expect(screen.getByText(/You're up 5%! Keep it up!/)).toBeTruthy();
    expect(screen.getByText('Index 450 · Great work!')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-card-action-F2'));
    expect(router.navigate).toHaveBeenCalledWith('/health/vitana-index');
    const opened = jest.fn();
    overlayBus.on('vitana:open-index', opened);
    fireEvent.press(screen.getByTestId('vitana-card-action-F2'));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('F2: no score in the last week → the compute RPC, then the latest-ever row', async () => {
    const supabase = indexSupabase([{ user_id: 'u-self', date: daysAgo(30), score_total: 321 }]);
    const { wrapper } = makeWrapper({ [CARDS]: enrichment([]) }, { supabase });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    expect(await screen.findByText('Index 321 · Stay consistent.')).toBeTruthy();
    expect(supabase.rpcCalls.filter((c) => c.name.startsWith('health_'))).toEqual([{ name: 'health_compute_vitana_index', args: { p_date: daysAgo(0), p_model_version: 'v3-5pillar' } }]);
  });

  it('F3: catalog copy; Record opens the diary', async () => {
    const { wrapper } = makeWrapper({ [CARDS]: enrichment([]) });
    render(<VitanaCardStrip screen="talk-to-vitana" />, { wrapper });
    expect(await screen.findByText('How are you today?')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-card-action-F3'));
    expect(router.navigate).toHaveBeenCalledWith('/daily-diary');
  });
});

describe('pure helpers (web math)', () => {
  it('trend and weekly change', () => {
    expect(deriveTrend([{ score: 400 }, { score: 406 }])).toBe('up');
    expect(deriveTrend([{ score: 400 }, { score: 394 }])).toBe('down');
    expect(deriveTrend([{ score: 400 }, { score: 404 }])).toBe('stable');
    expect(weeklyChangePct([{ score: 400 }, { score: 450 }])).toBe(5);
  });

  it('journey: in-order count stops at the first gap; today counts only today', () => {
    const s = summarizeJourney(topics, { completedTopicIds: [], completedListenedTopicIds: ['c'], completedSessionNumbers: [1], dailyListen: { date: '2026-11-03', sessions: [1, 1] } }, '2026-11-03');
    expect(s).toEqual({ totalSessions: 3, completedInOrder: 1, nextSession: { session: 2 }, completedToday: 1, dailyGoal: 1 });
    expect(summarizeJourney(topics, { completedTopicIds: ['a', 'b', 'c'], completedListenedTopicIds: [], completedSessionNumbers: [], dailyListen: null }).nextSession).toBeNull();
  });
});
