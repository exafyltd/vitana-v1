/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) fix 1 — the /health
 * utility bar and the baseline survey, 1:1 with the mobile web:
 *
 *  - the bar (Health.tsx:303-333, utility-action-button.tsx:99-125): Search,
 *    the mode pill, Calendar, Upload, Life Compass, Gift Voucher, then the
 *    Vitana Index and Autopilot chips, in that order;
 *  - ExpandableSearchButton (Health.tsx:316): expands to an input, collapses
 *    on ✕, and is inert (nothing on the page reads the query);
 *  - UniversalCalendarButton (Health.tsx:322): opens /calendar, shows the
 *    upcoming-events badge (getUpcomingEvents(10)) and the conflict dot;
 *  - Life Compass (utility-action-button.tsx:108-118) emits
 *    `vitana:open-life-compass`; Gift Voucher (:121-123) is hidden when the
 *    IAP-restricted check (iOS) is true;
 *  - VitanaBaselineSurveyModal (Health.tsx:288): auto-opens when the status
 *    GET says the survey is not completed; five steps; submit disabled
 *    (reads only, plan.md:110).
 * Fake gateway + recording Supabase, no network.
 */
import '../helpers/no-network';
import { router } from './mocks';
import { Platform } from 'react-native';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { HealthScreen } from '../../src/screens/health/HealthScreen';
import { fullTables, gatewayRoutes, healthWrapper, FAIL, USER_ID } from './helpers';

const realOS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

beforeEach(() => {
  jest.clearAllMocks();
  overlayBus.clear();
  setOS('android');
});
afterEach(() => setOS(realOS));
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const BAR_ITEMS = /^(health-search-button|mode-pill|health-calendar-button|health-upload-button|health-life-compass-button|health-gift-voucher-button|vitana-index-chip|autopilot-chip)$/;

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

function calendarRows() {
  return [
    { id: 'e0', user_id: USER_ID, start_time: hoursFromNow(-5), status: 'confirmed' },
    { id: 'e1', user_id: USER_ID, start_time: hoursFromNow(2), status: 'confirmed' },
    { id: 'e2', user_id: USER_ID, start_time: hoursFromNow(30), status: 'confirmed' },
    { id: 'x', user_id: 'someone-else', start_time: hoursFromNow(3), status: 'confirmed' },
  ];
}

describe('utility bar (Health.tsx:303-333, utility-action-button.tsx:99-125)', () => {
  it('renders Search, mode pill, Calendar, Upload, Life Compass, Gift Voucher, Index chip, Autopilot chip in the web order', () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    const bar = screen.getByTestId('health-utility-bar');
    expect(within(bar).getAllByTestId(BAR_ITEMS).map((n) => n.props.testID)).toEqual([
      'health-search-button',
      'mode-pill',
      'health-calendar-button',
      'health-upload-button',
      'health-life-compass-button',
      'health-gift-voucher-button',
      'vitana-index-chip',
      'autopilot-chip',
    ]);
    expect(within(bar).getByText('Search')).toBeTruthy();
    expect(within(bar).getByText('Calendar')).toBeTruthy();
    expect(within(bar).getByText('Life Compass')).toBeTruthy();
    expect(within(bar).getByText('Gift Voucher')).toBeTruthy();
  });

  it('Search expands to the input with the health placeholder, stays inert, and ✕ collapses it', () => {
    const { wrapper, sb, gw } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('health-search-button'));
    const input = screen.getByTestId('health-search-input');
    expect(input.props.placeholder).toBe('Search reports, supplements...');
    const before = { sb: sb.requests.length, gw: gw.requests.length };
    fireEvent.changeText(input, 'vitamin');
    fireEvent(input, 'submitEditing');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(sb.requests.length).toBe(before.sb);
    expect(gw.requests.length).toBe(before.gw);
    fireEvent.press(screen.getByTestId('health-search-close'));
    expect(screen.queryByTestId('health-search-input')).toBeNull();
    expect(screen.getByTestId('health-search-button')).toBeTruthy();
    fireEvent.press(screen.getByTestId('health-search-button'));
    expect(screen.getByTestId('health-search-input').props.value).toBe('');
  });

  it('Calendar opens /calendar (the resolver route) and shows the upcoming-events badge from the member’s own events', async () => {
    const { wrapper, sb } = healthWrapper({ tables: { ...fullTables(), calendar_events: calendarRows() } });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('health-calendar-badge')).getByText('2')).toBeTruthy());
    expect(screen.getByTestId('health-calendar-badge').props.accessibilityLabel).toBe('2 upcoming events');
    expect(screen.queryByTestId('health-calendar-conflict')).toBeNull();
    const reads = sb.requests.filter((r) => r.table === 'calendar_events');
    expect(reads).toHaveLength(1);
    expect(reads[0]).toMatchObject({ method: 'select', filters: [['eq', 'user_id', USER_ID]], order: [['start_time', { ascending: true }]] });
    fireEvent.press(screen.getByTestId('health-calendar-button'));
    expect(router.navigate).toHaveBeenCalledWith('/calendar');
  });

  it('Calendar: no upcoming events → no badge; a conflict → the conflict dot', async () => {
    const rows = [{ id: 'c', user_id: USER_ID, start_time: hoursFromNow(-2), status: 'conflict' }];
    const { wrapper, sb } = healthWrapper({ tables: { ...fullTables(), calendar_events: rows } });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('health-calendar-conflict')).toBeTruthy());
    expect(screen.queryByTestId('health-calendar-badge')).toBeNull();
    expect(sb.requests.some((r) => r.table === 'calendar_events')).toBe(true);
  });

  it('Life Compass emits vitana:open-life-compass on the overlay bus', () => {
    const { wrapper } = healthWrapper();
    render(<HealthScreen />, { wrapper });
    const opened = jest.fn();
    overlayBus.on('vitana:open-life-compass', opened);
    fireEvent.press(screen.getByTestId('health-life-compass-button'));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('Gift Voucher emits gift-voucher:open; it is hidden when IAP-restricted (iOS), like isIAPRestricted()', () => {
    const { wrapper } = healthWrapper();
    const { unmount } = render(<HealthScreen />, { wrapper });
    const opened = jest.fn();
    overlayBus.on('gift-voucher:open', opened);
    fireEvent.press(screen.getByTestId('health-gift-voucher-button'));
    expect(opened).toHaveBeenCalledTimes(1);
    unmount();

    setOS('ios');
    const again = healthWrapper();
    render(<HealthScreen />, { wrapper: again.wrapper });
    expect(screen.queryByTestId('health-gift-voucher-button')).toBeNull();
    expect(screen.queryByText('Gift Voucher')).toBeNull();
    expect(screen.getByTestId('health-life-compass-button')).toBeTruthy();
  });
});

describe('VitanaBaselineSurveyModal (Health.tsx:288)', () => {
  const routes = (status: unknown) => ({ ...gatewayRoutes, 'GET /health/baseline-survey/status': status });

  it('auto-opens when the status says the survey is not completed; five steps with Back / Next; Finish stays disabled (reads only)', async () => {
    const { wrapper, gw } = healthWrapper({ routes: routes({ ok: true, completed: false }) });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('baseline-survey-content')).toBeTruthy());
    const status = gw.requests.filter((r) => r.path === '/health/baseline-survey/status');
    expect(status).toHaveLength(1);
    expect(status[0].method).toBe('GET');

    const dialog = () => screen.getByTestId('baseline-survey-content');
    expect(within(dialog()).getByText("How you're eating")).toBeTruthy();
    expect(within(dialog()).getByText(/Step 1\s*of 5/)).toBeTruthy();
    expect(screen.getByTestId('baseline-survey-back').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId('baseline-survey-next').props.accessibilityState).toMatchObject({ disabled: true });
    expect(within(screen.getByTestId('baseline-survey-next')).getByText('Next')).toBeTruthy();

    fireEvent.press(screen.getByTestId('baseline-survey-rating-4'));
    expect(screen.getByTestId('baseline-survey-rating-4').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('baseline-survey-rating-4').props.accessibilityLabel).toBe('Rating 4');
    expect(screen.getByTestId('baseline-survey-next').props.accessibilityState).toMatchObject({ disabled: false });
    fireEvent.press(screen.getByTestId('baseline-survey-next'));
    expect(within(dialog()).getByText('Your hydration')).toBeTruthy();
    expect(within(dialog()).getByText(/Step 2\s*of 5/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('baseline-survey-back'));
    expect(within(dialog()).getByText("How you're eating")).toBeTruthy();
    expect(screen.getByTestId('baseline-survey-rating-4').props.accessibilityState).toMatchObject({ selected: true });

    for (const title of ['Your hydration', 'Your movement', 'Your sleep', 'Your mind right now']) {
      fireEvent.press(screen.getByTestId('baseline-survey-rating-3'));
      fireEvent.press(screen.getByTestId('baseline-survey-next'));
      expect(within(dialog()).getByText(title)).toBeTruthy();
    }
    fireEvent.press(screen.getByTestId('baseline-survey-rating-5'));
    const finish = screen.getByTestId('baseline-survey-next');
    expect(within(finish).getByText('Finish')).toBeTruthy();
    expect(finish.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(finish);
    expect(screen.getByTestId('baseline-survey-content')).toBeTruthy();
    expect(gw.requests.filter((r) => r.method !== 'GET')).toEqual([]);
    expect(gw.requests.some((r) => r.path === '/health/baseline-survey')).toBe(false);
  });

  it.each([
    ['completed', { ok: true, completed: true }],
    ['ok: false', { ok: false, completed: false }],
    ['a failed status call', FAIL],
    ['no status route', undefined],
  ])('does not open on %s', async (_label, status) => {
    const { wrapper, gw } = healthWrapper({ routes: routes(status) });
    render(<HealthScreen />, { wrapper });
    await waitFor(() => expect(gw.requests.some((r) => r.path === '/health/baseline-survey/status')).toBe(true));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId('baseline-survey-content')).toBeNull();
  });
});
