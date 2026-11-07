/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — `/ai`, `/ai/insights` and
 * `/ai/recommendations`: each card stack renders in the web order with the
 * web data (`@vitana/core/ai-mocks`), the calendar card reads the member's
 * upcoming `calendar_events` (loaded / empty), the header Index card shows
 * the mock 72 (insights) or the live Index (recommendations, "…" without
 * one), and the sub-navigation and card buttons go where the web goes.
 */
import '../helpers/no-network';
import { router } from './mocks';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { createCoachSupabase, futureEvent, indexRows, renderCoach } from './helpers';
import { AIOverviewScreen } from '../../src/screens/ai-coach/AIOverviewScreen';
import { InsightsScreen } from '../../src/screens/ai-coach/InsightsScreen';
import { RecommendationsScreen } from '../../src/screens/ai-coach/RecommendationsScreen';
import { correlations, memoryHighlights, recommendations, todayActions } from '../../src/ports/ai-coach';

const order = (root: string, ids: string[]) => {
  const all = screen.getByTestId(root);
  const seen: string[] = [];
  const walk = (n: { props?: { testID?: string }; children: unknown[] }) => {
    const id = n.props?.testID;
    if (id && ids.includes(id) && !seen.includes(id)) seen.push(id);
    for (const c of n.children) if (typeof c === 'object' && c) walk(c as never);
  };
  walk(all as never);
  return seen;
};

beforeEach(() => jest.clearAllMocks());

describe('/ai overview', () => {
  it('renders the seven web cards in order with the mock data (loaded)', async () => {
    const supabase = createCoachSupabase({ tables: { calendar_events: [futureEvent('Yoga', 30), futureEvent('Run', 5), futureEvent('Past', -5)] } });
    renderCoach(<AIOverviewScreen />, { supabase, language: 'en-US' });
    expect(screen.getByText('AI Intelligence Overview')).toBeTruthy();
    const ids = ['card-priority-actions', 'card-autopilot-status', 'card-memory-highlights', 'card-smart-calendar', 'card-progress-streaks', 'card-lifestyle-mental', 'card-motivation'];
    expect(order('ai-overview-cards', ids)).toEqual(ids);
    const priority = within(screen.getByTestId('card-priority-actions'));
    for (const a of todayActions.slice(0, 3)) expect(priority.getByText(a.label)).toBeTruthy();
    expect(priority.queryByText(todayActions[3].label)).toBeNull();
    expect(priority.getByText('15m')).toBeTruthy();
    const memory = within(screen.getByTestId('card-memory-highlights'));
    for (const h of memoryHighlights) expect(memory.getByText(h.title)).toBeTruthy();
    expect(memory.getAllByText('Medium')).toHaveLength(3);
    // The calendar shows the next upcoming events first, never past ones.
    const events = await screen.findAllByTestId('card-smart-calendar-event');
    expect(events).toHaveLength(2);
    expect(within(events[0]).getByText('Run')).toBeTruthy();
    expect(screen.queryByText('Past')).toBeNull();
    expect(supabase.reads.find((r) => r.table === 'calendar_events')).toMatchObject({ filters: [['eq', 'user_id', 'u-1']], order: ['start_time', true] });
    // Motivation shows the inspiration record with the video hint.
    expect(within(screen.getByTestId('card-motivation')).getByText('Video available')).toBeTruthy();
  });

  it('shows the calendar empty state without upcoming events', async () => {
    renderCoach(<AIOverviewScreen />, { language: 'en-US' });
    expect(await screen.findByTestId('card-smart-calendar-empty')).toHaveTextContent('No upcoming events');
  });

  it('navigates with the sub-navigation and the card buttons', () => {
    renderCoach(<AIOverviewScreen />, { language: 'en-US' });
    fireEvent.press(screen.getByTestId('coach-subnav-insights'));
    expect(router.navigate).toHaveBeenLastCalledWith('/ai/insights');
    fireEvent.press(screen.getByTestId('coach-subnav-overview'));
    expect(router.navigate).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('card-smart-calendar-cta'));
    expect(router.navigate).toHaveBeenLastCalledWith('/calendar');
    fireEvent.press(screen.getByTestId('card-progress-streaks-cta'));
    expect(router.navigate).toHaveBeenLastCalledWith('/health/my-health-tracker');
    fireEvent.press(screen.getByTestId('card-motivation-secondary'));
    expect(router.navigate).toHaveBeenLastCalledWith('/community/media-hub');
    fireEvent.press(screen.getByTestId('card-lifestyle-mental-secondary'));
    expect(router.navigate).toHaveBeenLastCalledWith('/health/my-health-tracker');
  });

  it('the mental plan shows 2/3 moments under 75 % in the warning tone', () => {
    renderCoach(<AIOverviewScreen />, { language: 'en-US' });
    expect(screen.getByTestId('card-lifestyle-mental-progress')).toHaveTextContent(/^2\/3 /);
    expect(screen.getByTestId('card-lifestyle-mental-bar')).toHaveStyle({ width: '67%' });
  });
});

describe('/ai/insights', () => {
  it('renders the header, the mock Index 72 and the twelve cards in order (loaded)', () => {
    renderCoach(<InsightsScreen />, { language: 'en-US' });
    expect(screen.getByText('AI Insights & Patterns ✨')).toBeTruthy();
    expect(screen.getByTestId('coach-index-value')).toHaveTextContent('72');
    const ids = [
      'card-progress-streaks',
      'card-insight-C-006',
      'card-insight-C-007',
      'card-insight-C-008',
      'card-insight-C-009',
      'card-smart-calendar',
      'card-lifestyle-patterns',
      'card-index-movement',
      'card-social-engagement',
      'card-smart-correlations',
    ];
    expect(order('ai-insights-cards', ids)).toEqual(ids);
    // The page's streaks: hydration 15 is the top streak.
    expect(screen.getByTestId('card-progress-streaks-top-count')).toHaveTextContent('15');
    expect(within(screen.getByTestId('card-index-movement')).getByText('Vitana Index: 72 (+3)')).toBeTruthy();
    const corr = within(screen.getByTestId('card-smart-correlations'));
    expect(corr.getAllByTestId('card-smart-correlations-item')).toHaveLength(3);
    expect(corr.getByText(correlations[0])).toBeTruthy();
    expect(corr.queryByText(correlations[3])).toBeNull();
  });

  it('opens the Vitana Index from the header card', () => {
    renderCoach(<InsightsScreen />, { language: 'en-US' });
    fireEvent.press(screen.getByTestId('coach-index-card'));
    expect(router.navigate).toHaveBeenLastCalledWith('/health-tracker/vitana-index');
  });
});

describe('/ai/recommendations', () => {
  it('renders the cards in order with the live Index (loaded)', async () => {
    const supabase = createCoachSupabase({ tables: { vitana_index_scores: indexRows() } });
    renderCoach(<RecommendationsScreen />, { supabase, language: 'en-US' });
    const ids = ['card-progress-streaks', 'card-health-recommendations', 'card-lifestyle-suggestions', 'card-smart-calendar', 'card-wellness-services', 'card-lab-test', 'card-personalization-insights'];
    expect(order('ai-recommendations-cards', ids)).toEqual(ids);
    expect(await screen.findByText('431')).toBeTruthy();
    const health = within(screen.getByTestId('card-health-recommendations'));
    expect(health.getAllByTestId('card-health-recommendations-item')).toHaveLength(recommendations.healthTodos.length);
    expect(health.getByText('High')).toBeTruthy();
    expect(health.getByText('Low')).toBeTruthy();
    const lifestyle = within(screen.getByTestId('card-lifestyle-suggestions'));
    expect(lifestyle.getByText(recommendations.content[0].title)).toBeTruthy();
    expect(within(screen.getByTestId('card-wellness-services')).getAllByTestId('card-wellness-services-offer')).toHaveLength(1);
    expect(screen.getByTestId('card-lab-test-price')).toHaveTextContent('$89');
    expect(within(screen.getByTestId('card-lab-test')).getByText('Biomarkers (3):')).toBeTruthy();
  });

  it('shows "…" in the Index card when the member has no Index (empty)', async () => {
    const supabase = createCoachSupabase();
    renderCoach(<RecommendationsScreen />, { supabase, language: 'en-US' });
    // Empty trailing window → the compute RPC, then the latest-ever fallback (web self-heal).
    await screen.findByTestId('card-smart-calendar-empty');
    expect(supabase.rpcs.map((r) => r.name)).toContain('health_compute_vitana_index');
    expect(screen.getByTestId('coach-index-value')).toHaveTextContent('…');
  });
});
