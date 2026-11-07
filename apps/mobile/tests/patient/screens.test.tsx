/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — each patient screen
 * loaded / empty / error from fixtures, the Results detail dialog, the
 * partner link-request decisions as built requests, and the four
 * coming-soon screens. Fake gateway only; no network.
 */
import '../helpers/no-network';
import { router } from './mocks';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { LINK_REQUESTS, RESULTS, createGateway, renderPatient, settled } from './helpers';
import { translate } from '../../src/i18n';
import { __toastsForTests } from '../../src/ports/ui';
import { DashboardScreen } from '../../src/screens/patient/DashboardScreen';
import { HealthScreen } from '../../src/screens/patient/HealthScreen';
import { AppointmentsScreen } from '../../src/screens/patient/AppointmentsScreen';
import { ResultsScreen } from '../../src/screens/patient/ResultsScreen';
import { ComingSoonScreen, type ComingSoonRoute } from '../../src/screens/patient/ComingSoonScreen';

const de = (key: string, params?: Record<string, string | number>) => translate('de', key, params);

beforeEach(() => jest.clearAllMocks());

describe('/patient/dashboard', () => {
  it('loaded: the three newest results, the KPIs, activity and quick actions in the web order', async () => {
    const { gateway } = renderPatient(<DashboardScreen />, { gateway: createGateway({ 'GET /patient/health-results': { results: RESULTS } }) });
    expect(await screen.findByTestId('patient-recent-result-r-1')).toBeTruthy();
    expect(screen.getByTestId('patient-recent-result-r-2')).toBeTruthy();
    expect(screen.getByTestId('patient-recent-result-r-3')).toBeTruthy();
    expect(screen.queryByTestId('patient-recent-result-r-4')).toBeNull();
    expect(within(screen.getByTestId('patient-recent-result-r-1')).getByText(de('screens.patient.results.markerCount', { count: 3 }))).toBeTruthy();
    expect(screen.getByText(de('screens.patient.patientDashboard'))).toBeTruthy();
    expect(screen.getByText(de('screens.patient.nextAppointment'))).toBeTruthy();
    expect(screen.getByText('85/100')).toBeTruthy();
    expect(screen.getByText('7/10')).toBeTruthy();
    expect(screen.getByText(de('screens.patient.completedDailyWalk'))).toBeTruthy();
    expect(screen.getByText(de('screens.patient.logHealthData'))).toBeTruthy();
    expect(gateway.calls[0]).toMatchObject({ method: 'GET', path: '/patient/health-results', headers: { authorization: 'Bearer token-u-1', 'content-type': 'application/json', 'x-vitana-tenant': 't-maxina' } });
    fireEvent.press(screen.getByTestId('patient-recent-results-view-all'));
    expect(router.navigate).toHaveBeenCalledWith('/patient/results');
  });

  it('loading: row skeletons in the recent results card', async () => {
    renderPatient(<DashboardScreen />, { gateway: createGateway({ 'GET /patient/health-results': () => new Promise(() => undefined) as never }) });
    expect(await screen.findByTestId('patient-recent-results-loading')).toBeTruthy();
  });

  it('empty: the empty line', async () => {
    renderPatient(<DashboardScreen />, { gateway: createGateway({ 'GET /patient/health-results': { results: [] } }) });
    expect(await screen.findByTestId('patient-recent-results-empty')).toHaveTextContent(de('screens.patient.results.empty'));
  });

  it('error: the card falls back to the empty line (web RecentResultsCard), the rest still renders', async () => {
    renderPatient(<DashboardScreen />, { gateway: createGateway({ 'GET /patient/health-results': { __status: 500 } }) });
    expect(await screen.findByTestId('patient-recent-results-empty')).toBeTruthy();
    expect(screen.getByTestId('patient-dashboard-kpis')).toBeTruthy();
  });
});

describe('/patient/health', () => {
  it('the three cards and the timeline, no fetch', async () => {
    const { gateway } = renderPatient(<HealthScreen />);
    await settled();
    for (const id of ['patient-health-vitals', 'patient-health-activity', 'patient-health-progress', 'patient-health-timeline']) expect(screen.getByTestId(id)).toBeTruthy();
    expect(screen.getByText('120/80')).toBeTruthy();
    expect(screen.getByText('8.247')).toBeTruthy();
    expect(screen.getByText(de('screens.patient.improving'))).toBeTruthy();
    expect(screen.getByText(de('screens.patient.medicationTaken'))).toBeTruthy();
    expect(gateway.calls).toEqual([]);
  });

  it('formats the figures in the member locale (en)', async () => {
    renderPatient(<HealthScreen />, { language: 'en-US' });
    await settled();
    expect(screen.getByText('8,247')).toBeTruthy();
  });
});

describe('/patient/appointments', () => {
  it('the header action and the three appointments with their badges and actions', async () => {
    renderPatient(<AppointmentsScreen />);
    await settled();
    expect(screen.getByTestId('patient-appointments-schedule-new')).toHaveTextContent(de('screens.patient.scheduleNew'));
    const chen = within(screen.getByTestId('patient-appointment-chen'));
    expect(chen.getByText(de('screens.patient.completed'))).toBeTruthy();
    expect(chen.getByText(de('screens.patient.viewNotes'))).toBeTruthy();
    const miller = within(screen.getByTestId('patient-appointment-miller'));
    expect(miller.getByText(de('screens.patient.upcoming'))).toBeTruthy();
    expect(miller.getByText(de('screens.patient.reschedule'))).toBeTruthy();
    expect(screen.getByTestId('patient-appointment-davis')).toBeTruthy();
  });
});

describe('/patient/results', () => {
  it('loaded: one card per result with partner, badge and date; a card opens the biomarker table', async () => {
    renderPatient(<ResultsScreen />, { gateway: createGateway({ 'GET /patient/health-results': { results: RESULTS }, 'GET /partner-health/member/link-requests': { ok: true, requests: [] } }) });
    const first = within(await screen.findByTestId('patient-result-r-1'));
    expect(first.getByText(de('screens.patient.results.needsAttention', { count: 1 }))).toBeTruthy();
    expect(first.getByText('Labor Nord')).toBeTruthy();
    expect(within(screen.getByTestId('patient-result-r-2')).getByText(de('screens.patient.results.selfReported'))).toBeTruthy();
    expect(within(screen.getByTestId('patient-result-r-2')).getByText(de('screens.patient.results.allNormal'))).toBeTruthy();
    expect(within(screen.getByTestId('patient-result-r-3')).getByText('Dr. Weber')).toBeTruthy();
    expect(screen.queryByTestId('partner-link-requests')).toBeNull();

    fireEvent.press(screen.getByTestId('patient-result-r-1'));
    const table = within(await screen.findByTestId('patient-result-table'));
    expect(table.getByText('HbA1c')).toBeTruthy();
    expect(table.getByText('6,1 %')).toBeTruthy();
    expect(table.getByText('4–5,6')).toBeTruthy();
    expect(table.getByText(de('screens.patient.results.statusHigh'))).toBeTruthy();
    expect(within(screen.getByTestId('patient-biomarker-b-2')).getByText('LDL')).toBeTruthy();
    expect(within(screen.getByTestId('patient-biomarker-b-2')).getByText('—')).toBeTruthy();
    expect(within(screen.getByTestId('patient-biomarker-b-3')).getByText(de('screens.patient.results.statusUnknown'))).toBeTruthy();
  });

  it('a result without biomarkers says so in the dialog', async () => {
    renderPatient(<ResultsScreen />, { gateway: createGateway({ 'GET /patient/health-results': { results: RESULTS } }) });
    fireEvent.press(await screen.findByTestId('patient-result-r-4'));
    expect(await screen.findByText(de('screens.patient.results.noBiomarkers'))).toBeTruthy();
  });

  it('loading: row skeletons', async () => {
    renderPatient(<ResultsScreen />, { gateway: createGateway({ 'GET /patient/health-results': () => new Promise(() => undefined) as never }) });
    expect(await screen.findByTestId('patient-results-loading')).toBeTruthy();
  });

  it('empty: the empty state', async () => {
    renderPatient(<ResultsScreen />, { gateway: createGateway({ 'GET /patient/health-results': { results: [] } }) });
    expect(await screen.findByTestId('patient-results-empty')).toHaveTextContent(de('screens.patient.results.empty'));
  });

  it('error: the load-failed state; Retry refetches and shows the results', async () => {
    let fail = true;
    const gateway = createGateway({ 'GET /patient/health-results': () => (fail ? { __status: 500 } : { results: RESULTS }) });
    renderPatient(<ResultsScreen />, { gateway });
    expect(await screen.findByTestId('patient-results-error')).toHaveTextContent(new RegExp(de('screens.patient.results.loadFailed')));
    fail = false;
    fireEvent.press(screen.getByTestId('patient-results-retry'));
    expect(await screen.findByTestId('patient-result-r-1')).toBeTruthy();
    expect(gateway.calls.filter((c) => c.path === '/patient/health-results')).toHaveLength(2);
  });
});

describe('/patient/results — "Is this your test?"', () => {
  const routes = (extra: Record<string, unknown> = {}) => ({
    'GET /patient/health-results': { results: RESULTS },
    'GET /partner-health/member/link-requests': { ok: true, requests: LINK_REQUESTS },
    ...extra,
  });

  it('lists each pending request with partner (or the fallback) and the proposed date', async () => {
    renderPatient(<ResultsScreen />, { gateway: createGateway(routes()) });
    const first = within(await screen.findByTestId('partner-link-request-lr-1'));
    expect(first.getByText('Großes Blutbild')).toBeTruthy();
    expect(first.getByText('Labor Nord')).toBeTruthy();
    expect(first.getByText(/^Angefragt am 20\. Okt\. 2026$/)).toBeTruthy();
    expect(within(screen.getByTestId('partner-link-request-lr-2')).getByText(de('screens.patient.results.linkRequests.unknownPartner'))).toBeTruthy();
  });

  it('Confirm asks first, then POSTs …/confirm, toasts and refetches requests and results', async () => {
    const gateway = createGateway(routes({ 'POST /partner-health/member/link-requests/lr-1/confirm': { ok: true, status: 'confirmed', order_id: 'o-1' } }));
    renderPatient(<ResultsScreen />, { gateway });
    fireEvent.press(await screen.findByTestId('partner-link-confirm-lr-1'));
    const dialog = within(await screen.findByTestId('partner-link-confirm-dialog-content'));
    expect(dialog.getByText(de('screens.patient.results.linkRequests.confirmDialogBody', { partner: 'Labor Nord', test: 'Großes Blutbild' }))).toBeTruthy();
    expect(gateway.writes()).toEqual([]);
    fireEvent.press(dialog.getByTestId('partner-link-confirm-action'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toEqual(['screens.patient.results.linkRequests.confirmed']));
    expect(gateway.writes()).toEqual([
      { method: 'POST', path: '/partner-health/member/link-requests/lr-1/confirm', headers: { authorization: 'Bearer token-u-1', 'content-type': 'application/json', 'x-vitana-tenant': 't-maxina' } },
    ]);
    await waitFor(() => expect(gateway.calls.filter((c) => c.path === '/patient/health-results')).toHaveLength(2));
    expect(gateway.calls.filter((c) => c.path === '/partner-health/member/link-requests')).toHaveLength(2);
  });

  it('Cancel in the dialog sends nothing', async () => {
    const gateway = createGateway(routes());
    renderPatient(<ResultsScreen />, { gateway });
    fireEvent.press(await screen.findByTestId('partner-link-confirm-lr-1'));
    fireEvent.press(await screen.findByTestId('partner-link-confirm-cancel'));
    await waitFor(() => expect(screen.queryByTestId('partner-link-confirm-dialog-content')).toBeNull());
    expect(gateway.writes()).toEqual([]);
  });

  it('Not me POSTs …/decline straight away and toasts', async () => {
    const gateway = createGateway(routes({ 'POST /partner-health/member/link-requests/lr-2/decline': { ok: true, status: 'declined' } }));
    renderPatient(<ResultsScreen />, { gateway });
    fireEvent.press(await screen.findByTestId('partner-link-decline-lr-2'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toEqual(['screens.patient.results.linkRequests.declined']));
    expect(gateway.writes().map((w) => `${w.method} ${w.path}`)).toEqual(['POST /partner-health/member/link-requests/lr-2/decline']);
  });

  it('a failed decision shows the error toast', async () => {
    const gateway = createGateway(routes({ 'POST /partner-health/member/link-requests/lr-2/decline': { __status: 500 } }));
    renderPatient(<ResultsScreen />, { gateway });
    fireEvent.press(await screen.findByTestId('partner-link-decline-lr-2'));
    await waitFor(() => expect(__toastsForTests().map((t) => [t.kind, t.titleKey])).toEqual([['error', 'screens.patient.results.linkRequests.failed']]));
  });

  it('a failing requests endpoint hides the card and never blocks Results', async () => {
    renderPatient(<ResultsScreen />, { gateway: createGateway({ 'GET /patient/health-results': { results: RESULTS }, 'GET /partner-health/member/link-requests': { __status: 404 } }) });
    expect(await screen.findByTestId('patient-result-r-1')).toBeTruthy();
    expect(screen.queryByTestId('partner-link-requests')).toBeNull();
  });
});

describe.each<[ComingSoonRoute, string]>([
  ['care-team', 'screens.common.careTeam'],
  ['goals', 'screens.common.healthGoals'],
  ['insurance', 'screens.common.insurance'],
  ['notifications', 'screens.common.notifications'],
])('/patient/%s', (route, titleKey) => {
  it('the title and the honest "coming soon" state, no fetch', async () => {
    const { gateway } = renderPatient(<ComingSoonScreen route={route} />);
    await settled();
    expect(screen.getByTestId(`screen-patient-${route}`)).toHaveTextContent(new RegExp(de(titleKey)));
    expect(screen.getByTestId('patient-coming-soon')).toHaveTextContent(new RegExp(de('screens.patient.comingSoon.title')));
    expect(gateway.calls).toEqual([]);
  });
});
