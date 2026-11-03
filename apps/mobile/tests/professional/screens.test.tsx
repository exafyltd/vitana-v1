/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — the eight
 * `/professional/*` screens: loaded (the mobile-web body of
 * src/pages/professional/Dashboard.tsx), empty (the `ComingSoonPlaceholder`
 * state the web mounts for the seven routes with no data source,
 * src/App.tsx:1698-1752 + src/pages/professional/Patients.tsx) and error /
 * access states of the web's `<ProtectedRoute requiredRole="professional">`
 * (loader while the role resolves, `NotAuthorized` when the role RPC fails or
 * the member's mode is below professional).
 */
import '../helpers/no-network';
import { router } from './mocks';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { createProfessionalSupabase, renderProfessional } from './helpers';
import { translate } from '../../src/i18n';
import { ProfessionalDashboardScreen } from '../../src/screens/professional/DashboardScreen';
import { ProfessionalComingSoonScreen, PROFESSIONAL_COMING_SOON, type ProfessionalComingSoonRoute } from '../../src/screens/professional/ComingSoonScreen';
import { hasProfessionalPermission } from '../../src/screens/professional/ProfessionalGate';

const de = (key: string) => translate('de', key);

beforeEach(() => jest.clearAllMocks());

describe('/professional/dashboard — loaded', () => {
  it('renders the header, the four stat cards, today’s schedule and the quick actions', async () => {
    renderProfessional(<ProfessionalDashboardScreen />);
    const page = await screen.findByTestId('screen-professional-dashboard');
    expect(within(page).getByText(de('screens.professional.professionalDashboard'))).toBeTruthy();
    expect(within(page).getByText(de('screens.professional.yourHealthcarePracticeManagementCenter'))).toBeTruthy();

    const stats = screen.getByTestId('professional-dashboard-stats');
    const cards = within(stats).getAllByTestId(/^professional-stat-/).map((n) => n.props.testID);
    expect(cards).toEqual(['professional-stat-patients', 'professional-stat-next', 'professional-stat-reviews', 'professional-stat-revenue']);
    expect(within(screen.getByTestId('professional-stat-patients')).getByText('12')).toBeTruthy();
    expect(within(screen.getByTestId('professional-stat-patients')).getByText(de('screens.professional.text3PendingAppointments'))).toBeTruthy();
    expect(within(screen.getByTestId('professional-stat-next')).getByText(de('screens.professional.text230Pm'))).toBeTruthy();
    expect(within(screen.getByTestId('professional-stat-next')).getByText(de('screens.professional.sarahJohnsonFollowup'))).toBeTruthy();
    expect(within(screen.getByTestId('professional-stat-reviews')).getByText('5')).toBeTruthy();
    // $24,500 (web literal) through the locale number format: German grouping, USD.
    expect(within(screen.getByTestId('professional-stat-revenue')).getByText(new Intl.NumberFormat('de', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(24500))).toBeTruthy();
    expect(within(screen.getByTestId('professional-stat-revenue')).getByText(de('screens.professional.text12FromLastMonth'))).toBeTruthy();
    for (const id of ['patients', 'next', 'reviews', 'revenue']) expect(within(screen.getByTestId(`professional-stat-${id}`)).getAllByTestId(/^professional-icon-/, { includeHiddenElements: true }).length).toBe(1);

    const schedule = screen.getByTestId('professional-dashboard-schedule');
    expect(within(schedule).getByText(de('screens.professional.todaySSchedule'))).toBeTruthy();
    expect(within(schedule).getByText(de('screens.professional.yourAppointmentsForToday'))).toBeTruthy();
    const rows = within(schedule).getAllByTestId(/^professional-appointment-/);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText(de('screens.professional.johnDoe'))).toBeTruthy();
    expect(within(rows[0]).getByText(de('screens.professional.annualCheckup'))).toBeTruthy();
    expect(within(rows[0]).getByText(de('screens.professional.text900Am'))).toBeTruthy();
    expect(within(rows[1]).getByText(de('screens.professional.sarahJohnson'))).toBeTruthy();
    expect(within(rows[1]).getByText(de('screens.professional.followup'))).toBeTruthy();
    expect(within(rows[1]).getByText(de('screens.professional.text230Pm'))).toBeTruthy();
    expect(within(rows[2]).getByText(de('screens.professional.mikeWilson'))).toBeTruthy();
    expect(within(rows[2]).getByText(de('screens.professional.labResultsReview'))).toBeTruthy();
    expect(within(rows[2]).getByText(de('screens.professional.text400Pm'))).toBeTruthy();

    const actions = screen.getByTestId('professional-dashboard-quick-actions');
    expect(within(actions).getByText(de('screens.professional.quickActions'))).toBeTruthy();
    expect(within(actions).getByText(de('screens.professional.commonProfessionalTasks'))).toBeTruthy();
    const buttons = within(actions).getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(within(buttons[0]).getByText(de('screens.professional.viewPatientList'))).toBeTruthy();
    expect(within(buttons[1]).getByText(de('screens.professional.manageSchedule'))).toBeTruthy();
    expect(within(buttons[2]).getByText(de('screens.professional.clinicalTools'))).toBeTruthy();
  });

  it('quick actions have no destination on the web (Dashboard.tsx:111-122, no onClick): a tap navigates nowhere', async () => {
    renderProfessional(<ProfessionalDashboardScreen />);
    const actions = await screen.findByTestId('professional-dashboard-quick-actions');
    for (const b of within(actions).getAllByRole('button')) fireEvent.press(b);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('asks for the role exactly as the web ProtectedRoute does, and writes nothing', async () => {
    const supabase = createProfessionalSupabase();
    renderProfessional(<ProfessionalDashboardScreen />, { supabase });
    await screen.findByTestId('screen-professional-dashboard');
    const rpcs = supabase.calls.filter((c) => c.fn.startsWith('rpc.') && c.fn !== 'rpc.list_public_tenants');
    expect(rpcs).toEqual([{ fn: 'rpc.get_role_preference', args: [{ p_tenant_id: 't-maxina' }] }]);
    expect(supabase.writes).toEqual([]);
  });
});

const ROUTES = Object.keys(PROFESSIONAL_COMING_SOON) as ProfessionalComingSoonRoute[];

describe('the seven routes with no data source — empty (“coming soon”) state', () => {
  it('covers exactly the web’s seven placeholder routes with their icon and title', () => {
    expect(PROFESSIONAL_COMING_SOON).toEqual({
      patients: { icon: 'Users', titleKey: 'screens.professional.myPatients' },
      schedule: { icon: 'Calendar', titleKey: 'screens.common.schedule' },
      tools: { icon: 'Stethoscope', titleKey: 'screens.common.clinicalTools' },
      referrals: { icon: 'FileText', titleKey: 'screens.common.referrals' },
      billing: { icon: 'Wallet', titleKey: 'screens.common.billing' },
      profile: { icon: 'UserCheck', titleKey: 'screens.common.professionalProfile' },
      education: { icon: 'BookOpen', titleKey: 'screens.common.continuingEducation' },
    });
  });

  it.each(ROUTES)('/professional/%s renders its title and the coming-soon box', async (route) => {
    renderProfessional(<ProfessionalComingSoonScreen route={route} />);
    const page = await screen.findByTestId(`screen-professional-${route}`);
    expect(within(page).getByRole('header')).toHaveTextContent(de(PROFESSIONAL_COMING_SOON[route].titleKey));
    const box = within(page).getByTestId('professional-coming-soon');
    expect(within(box).getByTestId(`professional-icon-${PROFESSIONAL_COMING_SOON[route].icon}`, { includeHiddenElements: true })).toBeTruthy();
    expect(within(box).getByText(de('professionalNative.comingSoon.title'))).toBeTruthy();
    expect(within(box).getByText(de('professionalNative.comingSoon.body'))).toBeTruthy();
  });
});

describe('ProtectedRoute requiredRole="professional" — loading / error / access', () => {
  it('shows the delayed loader while the role preference resolves the first time', async () => {
    renderProfessional(<ProfessionalDashboardScreen />, { supabase: createProfessionalSupabase({ role: 'pending' }) });
    expect(await screen.findByTestId('professional-gate-loading')).toBeTruthy();
    expect(screen.queryByTestId('screen-professional-dashboard')).toBeNull();
  });

  it('error: the role RPC fails → Access Denied (the web falls back to community, below professional)', async () => {
    renderProfessional(<ProfessionalComingSoonScreen route="schedule" />, { supabase: createProfessionalSupabase({ role: { error: 'boom' } }) });
    const denied = await screen.findByTestId('professional-not-authorized');
    expect(within(denied).getByText(de('screens.notauthorized.accessDenied'))).toBeTruthy();
    expect(within(denied).getByText(de('screens.notauthorized.youDonTHavePermissionAccess'))).toBeTruthy();
    expect(within(denied).getByText(de('screens.notauthorized.error403Forbidden'))).toBeTruthy();
    expect(screen.queryByTestId('screen-professional-schedule')).toBeNull();
  });

  it('patient mode is below professional → Access Denied; its two buttons go to / and /settings', async () => {
    renderProfessional(<ProfessionalDashboardScreen />, { supabase: createProfessionalSupabase({ role: { role: 'patient' } }) });
    await screen.findByTestId('professional-not-authorized');
    expect(screen.queryByTestId('screen-professional-dashboard')).toBeNull();
    fireEvent.press(screen.getByTestId('professional-not-authorized-home'));
    expect(router.navigate).toHaveBeenLastCalledWith('/');
    fireEvent.press(screen.getByTestId('professional-not-authorized-support'));
    expect(router.navigate).toHaveBeenLastCalledWith('/settings');
    expect(screen.getByText(de('screens.notauthorized.returnDashboard'))).toBeTruthy();
    expect(screen.getByText(de('screens.notauthorized.contactSupport'))).toBeTruthy();
  });

  it.each(['staff', 'admin'])('%s outranks professional → the screen renders', async (role) => {
    renderProfessional(<ProfessionalDashboardScreen />, { supabase: createProfessionalSupabase({ role: { role } }) });
    expect(await screen.findByTestId('screen-professional-dashboard')).toBeTruthy();
  });

  it('an Exafy admin passes on every role', async () => {
    renderProfessional(<ProfessionalComingSoonScreen route="billing" />, { supabase: createProfessionalSupabase({ role: { role: 'community' }, exafyAdmin: true }) });
    expect(await screen.findByTestId('screen-professional-billing')).toBeTruthy();
  });

  it('hasPermission follows ROLE_HIERARCHY (web useRole.tsx:14-23, 109-115)', () => {
    expect(['community', 'patient'].map((r) => hasProfessionalPermission(r as never, false))).toEqual([false, false]);
    expect(['professional', 'staff', 'backoffice', 'admin', 'developer', 'infra'].every((r) => hasProfessionalPermission(r as never, false))).toBe(true);
    expect(hasProfessionalPermission('community', true)).toBe(true);
  });

  it('once settled for the member, a later pending role query does not bring the loader back (ProtectedRoute settledFor)', async () => {
    renderProfessional(<ProfessionalDashboardScreen />);
    await screen.findByTestId('screen-professional-dashboard');
    screen.unmount();
    renderProfessional(<ProfessionalComingSoonScreen route="tools" />, { supabase: createProfessionalSupabase({ role: 'pending' }) });
    await waitFor(() => expect(screen.getByTestId('professional-not-authorized')).toBeTruthy());
    expect(screen.queryByTestId('professional-gate-loading')).toBeNull();
  });
});
