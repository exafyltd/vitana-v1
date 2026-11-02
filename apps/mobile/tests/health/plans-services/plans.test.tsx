/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) —
 * /health/plans (HEALTH.PLANS + ?tab=nutrition / exercise / hydration / sleep /
 * mental): the built `user_health_plans` read, loading / sample / real-plan
 * cards, the reads-only guard (Generate New Plan + Generate Plan disabled, no
 * UPDATE / INSERT / edge function on render or interaction — plan decision
 * 3a), the tab switch and `?tab=` deep links, the five pillar panes with the
 * web sample plans and a member's own plan data, the Autopilot footer toasts.
 * Supabase double, no network.
 */
import '../../helpers/no-network';
import { router, searchParams } from './helpers';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { dismissToast, getToasts } from '../../../src/ui/toast/store';
import { PlansScreen } from '../../../src/screens/health/PlansScreen';
import { healthWrapper, planRow } from './helpers';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => {
  searchParams.current = {};
  router.navigate.mockClear();
  dismissToast();
});

const PILLARS = ['nutrition', 'exercise', 'hydration', 'sleep', 'mental'] as const;

describe('PlansScreen — all plans', () => {
  it('builds the active-plans read: user_health_plans select(*) active=true newest first', async () => {
    const { wrapper, queries } = healthWrapper({ user_health_plans: [] });
    render(<PlansScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-plans-all')).toBeTruthy());
    const reads = queries.filter((q) => q.table === 'user_health_plans');
    expect(reads.length).toBeGreaterThanOrEqual(1);
    for (const r of reads) expect(r).toEqual({ table: 'user_health_plans', op: 'select', columns: '*', filters: [['eq', 'active', true]], order: [['created_at', false]] });
  });

  it('shows the loading line, then six sample cards with Generate Plan disabled when the member has no plans', async () => {
    const { wrapper } = healthWrapper({ user_health_plans: [] });
    render(<PlansScreen />, { wrapper });
    expect(screen.getByText('Loading plans...')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('health-plans-all')).toBeTruthy());
    for (const t of [...PILLARS, 'supplement']) {
      expect(screen.getByTestId(`health-plan-card-${t}`)).toBeTruthy();
      expect(screen.getByTestId(`health-plan-card-${t}-generate`).props.accessibilityState).toMatchObject({ disabled: true });
    }
    // getMockPlan adherence (src/lib/mockPlanData.ts)
    expect(screen.getByTestId('health-plan-card-sleep-adherence').props.children).toBe('86%');
    expect(screen.getByText('Nutrition Plan')).toBeTruthy();
    // No plans → no cross-plan relationships (CrossPlanRelationshipWidget returns null).
    expect(screen.queryByTestId('health-plans-relationships')).toBeNull();
    expect(screen.getByTestId('health-plans-autopilot')).toBeTruthy();
  });

  it('a member plan row shows its adherence, View Plan and Refresh, and the cross-plan relationships', async () => {
    const { wrapper, queries } = healthWrapper({
      user_health_plans: [planRow('hydration', { adherence_score: 81 }), planRow('sleep', { adherence_score: 90 }), planRow('mental', { adherence_score: 76 })],
    });
    render(<PlansScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-plan-card-hydration-adherence').props.children).toBe('81%'));
    expect(within(screen.getByTestId('health-plan-card-hydration')).getByText('AI Optimized • 3h ago')).toBeTruthy();
    expect(screen.queryByTestId('health-plan-card-hydration-generate')).toBeNull();
    fireEvent.press(screen.getByTestId('health-plan-card-hydration-view'));
    expect(router.navigate).toHaveBeenCalledWith('/health/plans/hydration');
    expect(screen.getByTestId('health-plans-relationships')).toBeTruthy();
    expect(screen.getByText('Hydration consistency boosted sleep recovery +4%')).toBeTruthy();
    expect(screen.getByText('Better sleep enhanced mental focus +8%')).toBeTruthy();

    const before = queries.filter((q) => q.table === 'user_health_plans').length;
    await act(async () => {
      fireEvent.press(screen.getByTestId('health-plan-card-hydration-refresh'));
    });
    await waitFor(() => expect(queries.filter((q) => q.table === 'user_health_plans').length).toBeGreaterThan(before));
    expect(getToasts().map((t) => t.title)).toContain('Hydration Plan refreshed! 🔄');
  });

  it('READS ONLY: Generate New Plan is disabled and no interaction writes or calls the generator', async () => {
    const { wrapper, nonReads, client } = healthWrapper({ user_health_plans: [planRow('nutrition', { adherence_score: 40 })] });
    render(<PlansScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-plans-all')).toBeTruthy());
    const generate = screen.getByTestId('health-plans-generate-new');
    expect(generate.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(generate);
    fireEvent.press(screen.getByTestId('health-plan-card-exercise-generate'));
    fireEvent.press(screen.getByTestId('health-plans-recalibrate-all'));
    fireEvent.press(screen.getByTestId('health-plans-view-report'));
    fireEvent.press(screen.getByTestId('health-plans-optimize'));
    for (const p of PILLARS) {
      fireEvent.press(screen.getByTestId(`health-plans-tab-${p}`));
      fireEvent.press(screen.getByTestId(`health-plans-${p}-overview-recalibrate`));
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(nonReads()).toEqual([]);
    expect(client.functions.invoke).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalledWith('health_compute_vitana_index', expect.anything());
  });

  it('the Autopilot footer raises the web toasts', async () => {
    const { wrapper } = healthWrapper({ user_health_plans: [planRow('sleep', { adherence_score: 30 }), planRow('nutrition', { adherence_score: 70 })] });
    render(<PlansScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-plans-all')).toBeTruthy());
    fireEvent.press(screen.getByTestId('health-plans-recalibrate-all'));
    fireEvent.press(screen.getByTestId('health-plans-optimize'));
    const toasts = getToasts();
    expect(toasts.map((t) => t.title)).toEqual(expect.arrayContaining(['🔄 Recalibration Started', '✨ Optimizing Sleep']));
    const optimize = toasts.find((t) => t.title === '✨ Optimizing Sleep');
    (optimize?.action as { onClick: () => void }).onClick();
    expect(router.navigate).toHaveBeenCalledWith('/health/plans/sleep');
  });
});

describe('PlansScreen — pillar tabs', () => {
  it('switches through the five pillar panes (web sample plans)', async () => {
    const { wrapper } = healthWrapper({ user_health_plans: [] });
    render(<PlansScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-plans-all')).toBeTruthy());
    for (const p of PILLARS) {
      fireEvent.press(screen.getByTestId(`health-plans-tab-${p}`));
      expect(screen.getByTestId(`health-plans-${p}`)).toBeTruthy();
      expect(screen.getByTestId(`health-plans-${p}-overview`)).toBeTruthy();
      expect(screen.getByTestId(`health-plans-tab-${p}`).props.accessibilityState).toEqual({ selected: true });
    }
    expect(screen.queryByTestId('health-plans-all')).toBeNull();
  });

  it.each(PILLARS.map((p) => [p]))('?tab=%s deep-links to its pane', (p) => {
    searchParams.current = { tab: p };
    const { wrapper } = healthWrapper({ user_health_plans: [] });
    render(<PlansScreen />, { wrapper });
    expect(screen.getByTestId(`health-plans-${p}`)).toBeTruthy();
  });

  it('exercise pane: weekly workouts and the progress dashboard', () => {
    searchParams.current = { tab: 'exercise' };
    const { wrapper } = healthWrapper({ user_health_plans: [] });
    render(<PlansScreen />, { wrapper });
    expect(screen.getByText('Your Exercise Plan, Powered by Autopilot')).toBeTruthy();
    expect(screen.getByText('Your Weekly Workouts')).toBeTruthy();
    expect(screen.getAllByTestId(/^health-workout-/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('health-plans-exercise-dashboard')).toBeTruthy();
    expect(screen.getByText('"Consistency is excellent! Hydration and sleep scores are enhancing your recovery."')).toBeTruthy();
  });

  it('nutrition pane: meal filter tabs group the recipes by day', () => {
    searchParams.current = { tab: 'nutrition' };
    const { wrapper } = healthWrapper({ user_health_plans: [] });
    render(<PlansScreen />, { wrapper });
    const all = screen.getAllByTestId(/^health-recipe-/).length;
    expect(all).toBeGreaterThan(0);
    expect(screen.getByTestId('health-plans-nutrition-day-1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('health-plans-meal-tab-breakfast'));
    const breakfast = screen.getAllByTestId(/^health-recipe-/).length;
    expect(breakfast).toBeGreaterThan(0);
    expect(breakfast).toBeLessThan(all);
  });

  it('a member plan row replaces the sample, and isGenerated:false shows the empty state with Generate disabled', async () => {
    searchParams.current = { tab: 'mental' };
    const { wrapper } = healthWrapper({
      user_health_plans: [planRow('mental', { plan_data: { isGenerated: false } }), planRow('sleep', { plan_data: { isGenerated: false } })],
    });
    render(<PlansScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-plans-mental-empty')).toBeTruthy());
    expect(screen.getByText('No Mental Plan Yet')).toBeTruthy();
    expect(screen.getByTestId('health-plans-mental-empty-generate').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('health-plans-tab-sleep'));
    expect(screen.getByTestId('health-plans-sleep-empty')).toBeTruthy();
    fireEvent.press(screen.getByTestId('health-plans-tab-hydration'));
    expect(screen.getByTestId('health-plans-hydration')).toBeTruthy();
  });
});
