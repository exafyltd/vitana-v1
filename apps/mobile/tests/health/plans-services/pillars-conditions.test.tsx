/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) —
 * /health/pillars (HEALTH.PILLARS) and /health/conditions (HEALTH.CONDITIONS):
 * the cards, the health sub-navigation, the Vitana Index tile (the built
 * `vitana_index_scores` reads, the latest-ever fallback, "…" while loading,
 * no compute RPC) — Supabase double, no network.
 */
import '../../helpers/no-network';
import { router } from './helpers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { PillarsOfHealthScreen } from '../../../src/screens/health/PillarsOfHealthScreen';
import { ConditionsRisksScreen } from '../../../src/screens/health/ConditionsRisksScreen';
import { healthWrapper } from './helpers';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => router.navigate.mockClear());

describe('PillarsOfHealthScreen', () => {
  it('renders the header and the five pillar cards', async () => {
    const { wrapper } = healthWrapper({ vitana_index_scores: [{ date: '2026-11-01', score_total: 512 }] });
    render(<PillarsOfHealthScreen />, { wrapper });
    expect(screen.getByText(/^Build your foundation for wellness!/)).toBeTruthy();
    for (const p of ['hydration', 'nutrition', 'exercise', 'sleep', 'mental']) expect(screen.getByTestId(`health-pillar-${p}`)).toBeTruthy();
    expect(screen.getByText('Hydration')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('health-pillars-index-value').props.children).toBe('512'));
  });

  it('builds the RLS-scoped trailing-window read and shows the newest score', async () => {
    const { wrapper, queries, nonReads } = healthWrapper({
      vitana_index_scores: [
        { date: '2026-10-30', score_total: 480 },
        { date: '2026-11-01', score_total: 501 },
      ],
    });
    render(<PillarsOfHealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-pillars-index-value').props.children).toBe('501'));
    const reads = queries.filter((q) => q.table === 'vitana_index_scores');
    expect(reads).toHaveLength(1);
    expect(reads[0].columns).toBe('date, score_total');
    expect(reads[0].filters[0]).toEqual(['eq', 'user_id', 'u-1']);
    expect(reads[0].filters[1][0]).toBe('gte');
    expect(reads[0].filters[1][1]).toBe('date');
    expect(reads[0].order).toEqual([['date', true]]);
    expect(nonReads()).toEqual([]);
  });

  it('falls back to the latest-ever score without the compute RPC (no write)', async () => {
    const { wrapper, queries, nonReads } = healthWrapper({
      vitana_index_scores: (q) => (q.limit === 1 ? [{ date: '2026-09-01', score_total: 333 }] : []),
    });
    render(<PillarsOfHealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-pillars-index-value').props.children).toBe('333'));
    const reads = queries.filter((q) => q.table === 'vitana_index_scores');
    expect(reads).toHaveLength(2);
    expect(reads[1]).toMatchObject({ order: [['date', false]], limit: 1, filters: [['eq', 'user_id', 'u-1']] });
    expect(nonReads()).toEqual([]);
  });

  it('shows "…" when the member has no score', async () => {
    const { wrapper, queries } = healthWrapper({ vitana_index_scores: [] });
    render(<PillarsOfHealthScreen />, { wrapper });
    expect(screen.getByTestId('health-pillars-index-value').props.children).toBe('…');
    await waitFor(() => expect(queries.filter((q) => q.table === 'vitana_index_scores')).toHaveLength(2));
    expect(screen.getByTestId('health-pillars-index-value').props.children).toBe('…');
  });

  it('the index tile goes where the web tile ends up (/health-tracker/vitana-index → /health)', () => {
    const { wrapper } = healthWrapper();
    render(<PillarsOfHealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-pillars-index'));
    expect(router.navigate).toHaveBeenCalledWith('/health');
  });

  it('the health sub-navigation resolves to the right routes', () => {
    const { wrapper } = healthWrapper();
    render(<PillarsOfHealthScreen />, { wrapper });
    expect(screen.getByText('Services Hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('health-subnav-plans'));
    expect(router.navigate).toHaveBeenLastCalledWith('/health/plans');
    fireEvent.press(screen.getByTestId('health-subnav-education-science'));
    expect(router.navigate).toHaveBeenLastCalledWith('/health/education');
    fireEvent.press(screen.getByTestId('health-subnav-services-hub'));
    expect(router.navigate).toHaveBeenLastCalledWith('/health/services-hub');
  });
});

describe('ConditionsRisksScreen', () => {
  it('renders the header and the two condition cards, reads nothing', () => {
    const { wrapper, queries, nonReads } = healthWrapper();
    render(<ConditionsRisksScreen />, { wrapper });
    expect(screen.getByText('Take control of your health risks!')).toBeTruthy();
    expect(screen.getByText('Assess your health risks and create preventive action plans to maintain optimal wellness.')).toBeTruthy();
    expect(screen.getByTestId('health-condition-risk')).toBeTruthy();
    expect(screen.getByTestId('health-condition-preventive')).toBeTruthy();
    expect(screen.getByText('Risk Assessments')).toBeTruthy();
    expect(queries.filter((q) => q.table === 'vitana_index_scores' || q.table === 'user_health_plans')).toEqual([]);
    expect(nonReads()).toEqual([]);
  });
});
