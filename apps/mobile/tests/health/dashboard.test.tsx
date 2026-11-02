/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the native /health
 * dashboard (HEALTH.OVERVIEW / HEALTH.MEDICAL / HEALTH.SUPPLEMENTS): loaded /
 * empty / error, the `?mode=` tabs (normalizeHealthMode aliases, mode pill
 * writes the param back), the snapshot / priority / guidance / pillar-agent
 * widgets, the chips, the Health Actions popup and the two sheets, the
 * medical and supplements modes. Fake gateway + recording Supabase, no network.
 */
import '../helpers/no-network';
import { router, searchParams } from './mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { HealthScreen, normalizeHealthMode } from '../../src/screens/health/HealthScreen';
import { filterSupplements } from '../../src/screens/health/MobileHealthSupplementsTab';
import { healthWrapper, supplements, FAIL } from './helpers';

beforeEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
  overlayBus.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('normalizeHealthMode (Health.tsx:103-121)', () => {
  it.each([
    ['overview', 'overview'],
    ['health', 'overview'],
    ['medical', 'medical'],
    ['Labs', 'medical'],
    ['reports', 'medical'],
    ['supplements', 'supplements'],
    ['vitamins', 'supplements'],
    [' Stack ', 'supplements'],
    ['nope', null],
    [undefined, null],
  ])('%p → %p', (input, expected) => {
    expect(normalizeHealthMode(input)).toBe(expected);
  });
});

describe('overview (loaded)', () => {
  it('renders the header, the utility bar and the snapshot with the member’s Index, standing, trend, tier and pillars', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Track and manage your health journey')).toBeTruthy();
    expect(screen.getByTestId('mode-pill')).toBeTruthy();
    expect(within(screen.getByTestId('mode-pill')).getByText('Overview')).toBeTruthy();
    await waitFor(() => expect(within(screen.getByTestId('health-snapshot-index')).getByText('412')).toBeTruthy());
    expect(screen.getByTestId('health-snapshot-index').props.accessibilityLabel).toBe('Vitana Index 412 of 999');
    await waitFor(() => expect(screen.getByTestId('health-snapshot-percentile')).toBeTruthy());
    expect(screen.getByText('Top 18%')).toBeTruthy();
    expect(within(screen.getByTestId('health-snapshot-trend')).getByText('Improving')).toBeTruthy();
    expect(within(screen.getByTestId('health-snapshot-tier')).getByText(/./)).toBeTruthy();
    expect(within(screen.getByTestId('health-snapshot-pillars-sleep')).getByText('60')).toBeTruthy();
    expect(within(screen.getByTestId('health-snapshot-pillars-nutrition')).getByText('120')).toBeTruthy();
    expect(within(screen.getByTestId('vitana-index-chip')).getByText('412')).toBeTruthy();
  });

  it('priority focus names the weakest pillar with its 0–100 share; guidance shows the two suggestions', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('health-priority-focus')).getByText('30%')).toBeTruthy());
    expect(within(screen.getByTestId('health-priority-focus')).getByText('Sleep')).toBeTruthy();
    expect(within(screen.getByTestId('health-priority-focus')).getByText('😴')).toBeTruthy();
    const guidance = screen.getByTestId('health-autopilot-guidance');
    expect(within(guidance).getByText('Upload blood test results')).toBeTruthy();
    expect(within(guidance).getByText('Start 30-Day Fitness Challenge')).toBeTruthy();
  });

  it('the pillar agents panel lists today’s outputs (total / 200 · version) and "no output yet" for the rest', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('health-pillar-agent-nutrition')).getByText('120/200 · v1')).toBeTruthy());
    expect(within(screen.getByTestId('health-pillar-agent-sleep')).getByText('60/200 · v1')).toBeTruthy();
    expect(within(screen.getByTestId('health-pillar-agent-mental')).getByText('no output yet')).toBeTruthy();
    expect(screen.getByText('2/5 done today')).toBeTruthy();
  });

  it('the Autopilot chip shows the pending count (new suggestions, not activated ones)', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('autopilot-chip-badge')).getByText('2')).toBeTruthy());
  });

  it('the Autopilot chip opens the registered popup over the bus, else the /autopilot destination', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('autopilot-chip'));
    expect(router.navigate).toHaveBeenCalledWith('/autopilot');
    const opened = jest.fn();
    const off = overlayBus.on('autopilot:open', opened);
    router.navigate.mockClear();
    fireEvent.press(screen.getByTestId('autopilot-chip'));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
    off();
  });

  it('"View My Journey" goes to /autopilot', () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-view-journey'));
    expect(router.navigate).toHaveBeenCalledWith('/autopilot');
  });

  it('"Action" opens Health Actions; its items open the sheets or navigate', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-take-action'));
    await waitFor(() => expect(screen.getByTestId('health-actions-popup-content')).toBeTruthy());
    expect(screen.getByText('Health Actions')).toBeTruthy();
    for (const title of ['Upload Lab Results', 'Order Blood Test', 'Book Health Screening', 'Join Wellness Group', "Track Today's Health", 'Health Education']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    fireEvent.press(screen.getByTestId('health-action-orderBloodTest'));
    await waitFor(() => expect(screen.getByTestId('health-lab-order-sheet-content')).toBeTruthy());
    expect(screen.getByText('Order a Lab Test')).toBeTruthy();
    fireEvent.press(screen.getByTestId('health-lab-order-completeBloodPanel'));
    expect(router.navigate).toHaveBeenCalledWith('/health/services-hub');

    fireEvent.press(screen.getByTestId('health-take-action'));
    await waitFor(() => expect(screen.getByTestId('health-action-bookScreening')).toBeTruthy());
    fireEvent.press(screen.getByTestId('health-action-joinWellnessGroup'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/groups');

    fireEvent.press(screen.getByTestId('health-take-action'));
    await waitFor(() => expect(screen.getByTestId('health-action-uploadLabResults')).toBeTruthy());
    fireEvent.press(screen.getByTestId('health-action-uploadLabResults'));
    await waitFor(() => expect(screen.getByTestId('health-upload-sheet-content')).toBeTruthy());
  });

  it('the upload sheet is presented with its form, but the write path is not wired (submit stays disabled)', async () => {
    const { wrapper, sb } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-upload-button'));
    await waitFor(() => expect(screen.getByTestId('health-upload-sheet-content')).toBeTruthy());
    expect(screen.getByText('Upload Health Report')).toBeTruthy();
    expect(screen.getByText('Blood Panel')).toBeTruthy();
    fireEvent.press(screen.getByTestId('health-upload-category-genomics'));
    expect(screen.getByTestId('health-upload-category-genomics').props.accessibilityState).toEqual({ checked: true });
    fireEvent.changeText(screen.getByTestId('health-upload-provider'), 'Quest');
    expect(screen.getByTestId('health-upload-submit').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('health-upload-submit'));
    expect(sb.storageCalls).toEqual([]);
    expect(sb.requests.filter((r) => r.method !== 'select')).toEqual([]);
  });
});

describe('overview (empty / error)', () => {
  it('empty: no Index rows → 0, the Starting tier, "…" on the chip, sleep defaults to the first pillar', async () => {
    const { wrapper, sb } = healthWrapper({ tables: { vitana_index_scores: [] }, rpcs: { get_profile_health_summary: { standing: { available: false } } }, routes: {} });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(sb.requests.filter((r) => r.table === 'vitana_index_scores')).toHaveLength(2));
    await waitFor(() => expect(within(screen.getByTestId('vitana-index-chip')).getByText('…')).toBeTruthy());
    expect(within(screen.getByTestId('health-snapshot-index')).getByText('0')).toBeTruthy();
    expect(within(screen.getByTestId('health-snapshot-tier')).getByText('Beginner')).toBeTruthy();
    expect(screen.queryByTestId('health-snapshot-percentile')).toBeNull();
    expect(within(screen.getByTestId('health-snapshot-trend')).getByText('Stable')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('health-pillar-agents-empty')).toBeTruthy());
    expect(screen.queryByTestId('autopilot-chip-badge')).toBeNull();
  });

  it('error: a failed Index read still renders the dashboard at 0 (web: `liveVitanaIndex?.total ?? 0`)', async () => {
    const { wrapper } = healthWrapper({ tables: { vitana_index_scores: { error: 'boom' } }, routes: { 'GET /pillar-agents/outputs': FAIL, 'GET /autopilot/recommendations': FAIL } });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('vitana-index-chip')).getByText('…')).toBeTruthy());
    expect(within(screen.getByTestId('health-snapshot-index')).getByText('0')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('health-pillar-agents-empty')).toBeTruthy());
  });
});

describe('mode tabs (?mode=)', () => {
  it('?mode=medical opens Medical; ?mode=labs (alias) too', async () => {
    searchParams.current = { mode: 'medical' };
    const { wrapper } = healthWrapper();
    const a = render(<HealthScreen />, { wrapper });
    expect(screen.getByTestId('health-medical')).toBeTruthy();
    expect(screen.queryByTestId('health-overview')).toBeNull();
    a.unmount();
    searchParams.current = { mode: 'labs' };
    render(<HealthScreen />, { wrapper });
    expect(screen.getByTestId('health-medical')).toBeTruthy();
  });

  it('?mode=vitamins opens Supplements; an unknown mode keeps Overview', () => {
    searchParams.current = { mode: 'vitamins' };
    const { wrapper } = healthWrapper();
    const a = render(<HealthScreen />, { wrapper });
    expect(screen.getByTestId('health-supplements')).toBeTruthy();
    a.unmount();
    searchParams.current = { mode: 'whatever' };
    render(<HealthScreen />, { wrapper });
    expect(screen.getByTestId('health-overview')).toBeTruthy();
  });

  it('the mode pill switches overview → medical → supplements and writes ?mode= back', async () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-medical'));
    expect(screen.getByTestId('health-medical')).toBeTruthy();
    expect(router.setParams).toHaveBeenLastCalledWith({ mode: 'medical' });
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-supplements'));
    expect(screen.getByTestId('health-supplements')).toBeTruthy();
    expect(router.setParams).toHaveBeenLastCalledWith({ mode: 'supplements' });
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-overview'));
    expect(screen.getByTestId('health-overview')).toBeTruthy();
    expect(router.setParams).toHaveBeenLastCalledWith({ mode: 'overview' });
  });
});

describe('Medical mode', () => {
  it('lists the member’s own reports (type emoji, title, provider, date, status) with the upload CTA', async () => {
    searchParams.current = { mode: 'medical' };
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-report-r1')).toBeTruthy());
    const r1 = screen.getByTestId('health-report-r1');
    expect(within(r1).getByText('Annual bloods')).toBeTruthy();
    expect(within(r1).getByText('Quest')).toBeTruthy();
    expect(within(r1).getByText('🩸')).toBeTruthy();
    expect(within(r1).getByText('Sep 14, 2026')).toBeTruthy();
    expect(within(screen.getByTestId('health-report-status-r1')).getByText('Processed')).toBeTruthy();
    const r2 = screen.getByTestId('health-report-r2');
    expect(within(r2).getByText('Health Report')).toBeTruthy();
    expect(within(r2).getByText('Unknown provider')).toBeTruthy();
    expect(within(screen.getByTestId('health-report-status-r2')).getByText('Uploaded')).toBeTruthy();
    expect(screen.queryByTestId('health-report-other')).toBeNull();
    fireEvent.press(screen.getByTestId('health-medical-upload-cta'));
    await waitFor(() => expect(screen.getByTestId('health-upload-sheet-content')).toBeTruthy());
  });

  it('empty: the empty state and its own upload CTA (no dashed CTA)', async () => {
    searchParams.current = { mode: 'medical' };
    const { wrapper } = healthWrapper({ tables: { lab_reports: [] } });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-medical-empty')).toBeTruthy());
    expect(screen.getByText('No Health Reports Yet')).toBeTruthy();
    expect(screen.queryByTestId('health-medical-upload-cta')).toBeNull();
    fireEvent.press(screen.getByTestId('health-medical-upload-first'));
    await waitFor(() => expect(screen.getByTestId('health-upload-sheet-content')).toBeTruthy());
  });

  it('error: the error card with a retry that reads again', async () => {
    searchParams.current = { mode: 'medical' };
    const { wrapper, sb } = healthWrapper({ tables: { lab_reports: { error: 'boom' } } });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-medical-error')).toBeTruthy());
    expect(screen.getByText("Couldn't load your reports")).toBeTruthy();
    const before = sb.requests.filter((r) => r.table === 'lab_reports').length;
    fireEvent.press(screen.getByTestId('health-medical-retry'));
    await waitFor(() => expect(sb.requests.filter((r) => r.table === 'lab_reports').length).toBeGreaterThan(before));
  });
});

describe('Supplements mode', () => {
  it('lists the supplements with dosage / frequency / start date / notes and the inactive badge; filters by category', async () => {
    searchParams.current = { mode: 'supplements' };
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('supplement-s1')).toBeTruthy());
    const s1 = screen.getByTestId('supplement-s1');
    expect(within(s1).getByText('Vitamin D3')).toBeTruthy();
    expect(within(s1).getByText('2000 IU')).toBeTruthy();
    expect(within(s1).getByText('Daily')).toBeTruthy();
    expect(within(s1).getByText('With breakfast')).toBeTruthy();
    expect(within(s1).getByText('Jan 10, 2026')).toBeTruthy();
    expect(within(screen.getByTestId('supplement-s2')).getByText('Inactive')).toBeTruthy();
    fireEvent.press(screen.getByTestId('supplement-filter-minerals'));
    expect(screen.queryByTestId('supplement-s1')).toBeNull();
    expect(screen.getByTestId('supplement-s2')).toBeTruthy();
    fireEvent.press(screen.getByTestId('supplement-filter-probiotics'));
    expect(screen.getByTestId('health-supplements-empty')).toBeTruthy();
  });

  it('delete is not wired (disabled): no write reaches Supabase', async () => {
    searchParams.current = { mode: 'supplements' };
    const { wrapper, sb } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('supplement-delete-s1')).toBeTruthy());
    expect(screen.getByTestId('supplement-delete-s1').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('supplement-delete-s1'));
    fireEvent.press(screen.getByTestId('supplement-edit-s1'));
    expect(sb.requests.filter((r) => r.method !== 'select')).toEqual([]);
  });

  it('empty: the empty state', async () => {
    searchParams.current = { mode: 'supplements' };
    const { wrapper } = healthWrapper({ tables: { user_supplements: [] } });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-supplements-empty')).toBeTruthy());
    expect(screen.getByText('No supplements yet')).toBeTruthy();
  });

  it('filterSupplements matches the stored category like the web (case-insensitive substring)', () => {
    expect(filterSupplements(supplements as never, 'All')).toHaveLength(2);
    expect(filterSupplements(supplements as never, 'Vitamins').map((s) => s.id)).toEqual(['s1']);
  });
});
