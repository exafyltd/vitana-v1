/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — `/ai/daily-summary`: the
 * daily learnings from the fake `GET /memory/daily-learning?limit=14`
 * (loaded / empty / error — the web shows the empty line when the read
 * fails), the built request (the community role header), and the Index
 * card with the latest score of the last 7 days ("–" without one).
 */
import '../helpers/no-network';
import './mocks';
import { screen, within } from '@testing-library/react-native';
import { createCoachGateway, createCoachSupabase, indexRows, renderCoach } from './helpers';
import { DailySummaryScreen } from '../../src/screens/ai-coach/DailySummaryScreen';

const learnings = [
  { id: 'l2', date: '2026-10-31', content: 'You slept longer after the evening walk.', created_at: '2026-10-31T21:00:00Z' },
  { id: 'l1', date: '2026-10-30', content: 'You drank more water than the day before.', created_at: '2026-10-30T21:00:00Z' },
];

describe('/ai/daily-summary', () => {
  it('renders the learnings newest first under their long dates (loaded)', async () => {
    const gateway = createCoachGateway({ 'GET /memory/daily-learning': { ok: true, learnings } });
    const supabase = createCoachSupabase({ tables: { vitana_index_scores: indexRows() } });
    renderCoach(<DailySummaryScreen />, { gateway, supabase, language: 'en-US' });
    const items = await screen.findAllByTestId('daily-learning');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Saturday, October 31')).toBeTruthy();
    expect(within(items[0]).getByText(learnings[0].content)).toBeTruthy();
    expect(within(items[1]).getByText('Friday, October 30')).toBeTruthy();
    const req = gateway.calls.find((c) => c.path.startsWith('/memory/daily-learning'));
    expect(req).toMatchObject({ method: 'GET', path: '/memory/daily-learning?limit=14', headers: { 'X-Vitana-Active-Role': 'community' } });
    expect(await screen.findByText('431')).toBeTruthy();
    expect(supabase.reads.find((r) => r.table === 'vitana_index_scores')?.filters[0]).toEqual(['gte', 'date', expect.any(String)]);
  });

  it('shows the loading line, then the empty line without learnings (empty)', async () => {
    const gateway = createCoachGateway({ 'GET /memory/daily-learning': { ok: true, learnings: [] } });
    renderCoach(<DailySummaryScreen />, { gateway, language: 'en-US' });
    expect(screen.getByTestId('daily-learnings-loading')).toHaveTextContent('Loading your days …');
    expect(await screen.findByTestId('daily-learnings-empty')).toHaveTextContent(/^No daily summary yet\./);
    expect(screen.getByTestId('coach-index-value')).toHaveTextContent('–');
  });

  it('a failed read shows the empty line, as on the web (error)', async () => {
    const gateway = createCoachGateway({ 'GET /memory/daily-learning': { __status: 500, __body: { ok: false, error: 'boom' } } });
    renderCoach(<DailySummaryScreen />, { gateway, language: 'de-DE' });
    expect(await screen.findByTestId('daily-learnings-empty')).toHaveTextContent(/^Noch keine/);
    expect(screen.queryAllByTestId('daily-learning')).toHaveLength(0);
  });

  it('{ ok: false } on a 200 is an error too (web json())', async () => {
    const gateway = createCoachGateway({ 'GET /memory/daily-learning': { ok: false, error: 'nope', learnings } });
    renderCoach(<DailySummaryScreen />, { gateway, language: 'en-US' });
    expect(await screen.findByTestId('daily-learnings-empty')).toBeTruthy();
  });
});
