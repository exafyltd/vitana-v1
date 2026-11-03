/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — the eight `/staff/*`
 * screens: loaded (the mobile-web bodies of src/pages/staff/Dashboard.tsx and
 * src/pages/staff/Queue.tsx), empty (the `ComingSoonPlaceholder` state the web
 * mounts for the six routes with no data source, src/App.tsx:1769-1810) and
 * error / access states of the web's `<ProtectedRoute requiredRole="staff">`
 * (loader while the role resolves, `NotAuthorized` when the role RPC fails or
 * the member's mode is below staff).
 */
import '../helpers/no-network';
import { router } from './mocks';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { createStaffSupabase, renderStaff } from './helpers';
import { translate } from '../../src/i18n';
import { useUITheme } from '../../src/ports/ui';
import { StaffDashboardScreen } from '../../src/screens/staff/DashboardScreen';
import { StaffQueueScreen } from '../../src/screens/staff/QueueScreen';
import { StaffComingSoonScreen, STAFF_COMING_SOON, type StaffComingSoonRoute } from '../../src/screens/staff/ComingSoonScreen';
import { hasStaffPermission } from '../../src/screens/staff/StaffGate';
import { formatCount, formatHours } from '../../src/screens/staff/format';

const de = (key: string) => translate('de', key);

beforeEach(() => jest.clearAllMocks());

describe('/staff/dashboard — loaded', () => {
  it('renders the header, the four stat cards, pending tasks and the quick actions', async () => {
    renderStaff(<StaffDashboardScreen />);
    const page = await screen.findByTestId('screen-staff-dashboard');
    expect(within(page).getAllByRole('header')[0]).toHaveTextContent(de('screens.staff.staffDashboard'));
    expect(within(page).getByText(de('screens.staff.yourDailyWorkflowTaskManagementCenter'))).toBeTruthy();

    const stats = screen.getByTestId('staff-dashboard-stats');
    expect(within(stats).getAllByTestId(/^staff-stat-/).map((n) => n.props.testID)).toEqual(['staff-stat-queue', 'staff-stat-hours', 'staff-stat-tasks', 'staff-stat-coverage']);
    const stat = (id: string) => within(screen.getByTestId(`staff-stat-${id}`));
    expect(stat('queue').getByText(de('screens.staff.patientQueue'))).toBeTruthy();
    expect(stat('queue').getByText('8')).toBeTruthy();
    expect(stat('queue').getByText(de('screens.staff.patientsWaiting'))).toBeTruthy();
    expect(stat('hours').getByText(de('screens.staff.hoursToday'))).toBeTruthy();
    expect(stat('hours').getByText(formatHours(6.5, 'de'))).toBeTruthy();
    expect(stat('hours').getByText(de('screens.staff.text15hRemaining'))).toBeTruthy();
    expect(stat('tasks').getByText(de('screens.staff.tasksCompleted'))).toBeTruthy();
    expect(stat('tasks').getByText('12/18')).toBeTruthy();
    expect(stat('tasks').getByText(de('screens.staff.text6TasksRemaining'))).toBeTruthy();
    expect(stat('coverage').getByText(de('screens.staff.teamCoverage'))).toBeTruthy();
    expect(stat('coverage').getByText('4/5')).toBeTruthy();
    expect(stat('coverage').getByText(de('screens.staff.staffDuty'))).toBeTruthy();
    expect(stat('queue').getByTestId('staff-icon-ClipboardList', { includeHiddenElements: true })).toBeTruthy();
    expect(stat('hours').getByTestId('staff-icon-Clock', { includeHiddenElements: true })).toBeTruthy();
    expect(stat('tasks').getByTestId('staff-icon-Activity', { includeHiddenElements: true })).toBeTruthy();
    expect(stat('coverage').getByTestId('staff-icon-Users', { includeHiddenElements: true })).toBeTruthy();

    const tasks = screen.getByTestId('staff-dashboard-pending-tasks');
    expect(within(tasks).getByText(de('screens.staff.pendingTasks'))).toBeTruthy();
    expect(within(tasks).getByText(de('screens.staff.yourAssignedTasksForToday'))).toBeTruthy();
    const rows = within(tasks).getAllByTestId(/^staff-task-\d$/);
    expect(rows).toHaveLength(3);
    const expected = [
      ['screens.staff.patientCheckinAssistance', 'screens.staff.room3MrJohnson', 'screens.staff.urgent', 'destructive'],
      ['screens.staff.equipmentSanitization', 'screens.staff.examRooms14', 'screens.staff.normal', 'outline'],
      ['screens.staff.insuranceVerification', 'screens.staff.text3PendingCases', 'screens.staff.normal', 'outline'],
    ];
    expected.forEach(([title, detail, badge, variant], i) => {
      expect(within(rows[i]).getByText(de(title))).toBeTruthy();
      expect(within(rows[i]).getByText(de(detail))).toBeTruthy();
      expect(within(rows[i]).getByTestId(`staff-badge-${variant}`)).toHaveTextContent(de(badge));
    });

    const actions = screen.getByTestId('staff-dashboard-quick-actions');
    expect(within(actions).getByText(de('screens.staff.quickActions'))).toBeTruthy();
    expect(within(actions).getByText(de('screens.staff.commonStaffFunctions'))).toBeTruthy();
    const buttons = within(actions).getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(within(buttons[0]).getByText(de('screens.staff.viewPatientQueue'))).toBeTruthy();
    expect(within(buttons[1]).getByText(de('screens.staff.clockInout'))).toBeTruthy();
    expect(within(buttons[2]).getByText(de('screens.staff.dailyTasks'))).toBeTruthy();
    expect(within(buttons[0]).getByTestId('staff-icon-ClipboardList', { includeHiddenElements: true })).toBeTruthy();
    expect(within(buttons[1]).getByTestId('staff-icon-Clock', { includeHiddenElements: true })).toBeTruthy();
    expect(within(buttons[2]).getByTestId('staff-icon-Activity', { includeHiddenElements: true })).toBeTruthy();
  });

  it('quick actions have no destination on the web (Dashboard.tsx:112-123, no onClick): a tap navigates nowhere', async () => {
    renderStaff(<StaffDashboardScreen />);
    const actions = await screen.findByTestId('staff-dashboard-quick-actions');
    for (const b of within(actions).getAllByRole('button')) fireEvent.press(b);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('asks for the role exactly as the web ProtectedRoute does, and writes nothing', async () => {
    const supabase = createStaffSupabase();
    renderStaff(<StaffDashboardScreen />, { supabase });
    await screen.findByTestId('screen-staff-dashboard');
    const rpcs = supabase.calls.filter((c) => c.fn.startsWith('rpc.') && c.fn !== 'rpc.list_public_tenants');
    expect(rpcs).toEqual([{ fn: 'rpc.get_role_preference', args: [{ p_tenant_id: 't-maxina' }] }]);
    expect(supabase.writes).toEqual([]);
  });

  it('formats the figures in the member’s locale (the web’s 6.5h in English)', () => {
    expect(formatHours(6.5, 'en')).toBe('6.5h');
    expect(formatCount(24, 'de')).toBe('24');
  });
});

describe('/staff/queue — loaded', () => {
  let colors: ReturnType<typeof useUITheme>['colors'] | null = null;
  function Probe(): ReactElement {
    colors = useUITheme().colors;
    return <StaffQueueScreen />;
  }

  it('renders the header, the four counters and the three queue cards in the web’s order', async () => {
    renderStaff(<Probe />);
    const page = await screen.findByTestId('screen-staff-queue');
    expect(within(page).getAllByRole('header')[0]).toHaveTextContent(de('screens.staff.patientQueue'));
    expect(within(page).getByText(de('screens.staff.managePatientCheckinsWaitingList'))).toBeTruthy();

    const stats = screen.getByTestId('staff-queue-stats');
    expect(within(stats).getAllByTestId(/^staff-stat-/).map((n) => n.props.testID)).toEqual(['staff-stat-waiting', 'staff-stat-progress', 'staff-stat-urgent', 'staff-stat-completed']);
    const c = colors!;
    const counters: Array<[string, string, string, string, string, string]> = [
      ['waiting', 'screens.staff.waiting', '8', 'screens.staff.patientsQueue', 'Clock', c.statusWarning],
      ['progress', 'screens.staff.progress', '5', 'screens.staff.seen', 'User', c.statusInfo],
      ['urgent', 'screens.staff.urgent', '2', 'screens.staff.priorityCases', 'AlertCircle', c.statusError],
      ['completed', 'screens.staff.completed', '24', 'screens.staff.todaySTotal', 'CheckCircle', c.statusSuccess],
    ];
    for (const [id, title, value, caption, icon, tint] of counters) {
      const card = within(screen.getByTestId(`staff-stat-${id}`));
      expect(card.getByText(de(title))).toBeTruthy();
      expect(card.getByText(value)).toBeTruthy();
      expect(card.getByText(de(caption))).toBeTruthy();
      expect(card.getByTestId(`staff-icon-${icon}-glyph`, { includeHiddenElements: true }).props.stroke).toBe(tint);
    }

    const queue = screen.getByTestId('staff-current-queue');
    expect(within(queue).getAllByRole('header')[0]).toHaveTextContent(de('screens.staff.currentQueue'));
    const cards = within(queue).getAllByTestId(/^staff-queue-card-\d$/);
    expect(cards).toHaveLength(3);
    const rows: Array<{ initials: string; name: string; reason: string; badge: string; variant: string; meta: string[]; buttons: string[]; tone: string; subtle: string }> = [
      {
        initials: 'screens.staff.jd', name: 'screens.staff.johnDoe', reason: 'screens.staff.walkinChestPain', badge: 'screens.staff.urgent2', variant: 'destructive',
        meta: ['screens.staff.arrived1015Am', 'screens.staff.waitTime45Min', 'screens.staff.roomTriage'], buttons: ['screens.staff.callPatient', 'screens.staff.assignRoom'],
        tone: c.statusError, subtle: c.statusErrorSubtle,
      },
      {
        initials: 'screens.staff.sj', name: 'screens.staff.sarahJohnson', reason: 'screens.staff.appointmentFollowup', badge: 'screens.staff.waiting2', variant: 'outline',
        meta: ['screens.staff.arrived1030Am', 'screens.staff.waitTime30Min', 'screens.staff.roomWaitingArea'], buttons: ['screens.staff.callPatient', 'screens.staff.assignRoom'],
        tone: c.statusWarning, subtle: c.statusWarningSubtle,
      },
      {
        initials: 'screens.staff.mw', name: 'screens.staff.mikeWilson', reason: 'screens.staff.appointmentLabResults', badge: 'screens.staff.progress2', variant: 'secondary',
        meta: ['screens.staff.started1045Am', 'screens.staff.duration15Min', 'screens.staff.room205DrMiller'], buttons: ['screens.staff.viewProgress'],
        tone: c.statusInfo, subtle: c.statusInfoSubtle,
      },
    ];
    rows.forEach((r, i) => {
      const card = within(cards[i]);
      const style = StyleSheet.flatten(cards[i].props.style);
      expect(style.borderStartWidth).toBe(4);
      expect(style.borderStartColor).toBe(r.tone);
      const avatar = card.getByTestId('staff-avatar-fallback');
      expect(avatar).toHaveTextContent(de(r.initials));
      expect(StyleSheet.flatten(avatar.props.style).backgroundColor).toBe(r.subtle);
      expect(card.getByText(de(r.name))).toBeTruthy();
      expect(card.getByText(de(r.reason))).toBeTruthy();
      expect(card.getByTestId(`staff-badge-${r.variant}`)).toHaveTextContent(de(r.badge));
      const meta = card.getByTestId('staff-queue-meta');
      expect(StyleSheet.flatten(meta.props.style).flexWrap).toBe('wrap');
      r.meta.forEach((k) => expect(within(meta).getByText(de(k))).toBeTruthy());
      const buttons = within(card.getByTestId('staff-queue-actions')).getAllByRole('button');
      expect(buttons).toHaveLength(r.buttons.length);
      r.buttons.forEach((k, j) => expect(within(buttons[j]).getByText(de(k))).toBeTruthy());
    });
  });

  it('queue buttons have no handler on the web (Queue.tsx:108-109, 138-139, 168): a tap navigates nowhere', async () => {
    renderStaff(<StaffQueueScreen />);
    const queue = await screen.findByTestId('staff-current-queue');
    const buttons = within(queue).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    for (const b of buttons) fireEvent.press(b);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});

const ROUTES = Object.keys(STAFF_COMING_SOON) as StaffComingSoonRoute[];

describe('the six routes with no data source — empty (“coming soon”) state', () => {
  it('covers exactly the web’s six placeholder routes with their icon and title (src/App.tsx:1769-1810)', () => {
    expect(STAFF_COMING_SOON).toEqual({
      tasks: { icon: 'Activity', titleKey: 'screens.common.dailyTasks' },
      schedule: { icon: 'Calendar', titleKey: 'screens.common.schedule' },
      reports: { icon: 'BarChart3', titleKey: 'screens.common.reports' },
      communications: { icon: 'MessageSquare', titleKey: 'screens.common.communications' },
      tools: { icon: 'Zap', titleKey: 'screens.common.staffTools' },
      time: { icon: 'Clock', titleKey: 'screens.common.timeTracking' },
    });
  });

  it.each(ROUTES)('/staff/%s renders its title and the coming-soon box', async (route) => {
    renderStaff(<StaffComingSoonScreen route={route} />);
    const page = await screen.findByTestId(`screen-staff-${route}`);
    expect(within(page).getByRole('header')).toHaveTextContent(de(STAFF_COMING_SOON[route].titleKey));
    const box = within(page).getByTestId('staff-coming-soon');
    expect(within(box).getByTestId(`staff-icon-${STAFF_COMING_SOON[route].icon}`, { includeHiddenElements: true })).toBeTruthy();
    expect(within(box).getByText(de('staffNative.comingSoon.title'))).toBeTruthy();
    expect(within(box).getByText(de('staffNative.comingSoon.body'))).toBeTruthy();
  });
});

describe('ProtectedRoute requiredRole="staff" — loading / error / access', () => {
  it('shows the delayed loader while the role preference resolves the first time', async () => {
    renderStaff(<StaffDashboardScreen />, { supabase: createStaffSupabase({ role: 'pending' }) });
    expect(await screen.findByTestId('staff-gate-loading')).toBeTruthy();
    expect(screen.queryByTestId('screen-staff-dashboard')).toBeNull();
  });

  it('error: the role RPC fails → Access Denied (the web falls back to community, below staff)', async () => {
    renderStaff(<StaffQueueScreen />, { supabase: createStaffSupabase({ role: { error: 'boom' } }) });
    const denied = await screen.findByTestId('staff-not-authorized');
    expect(within(denied).getByText(de('screens.notauthorized.accessDenied'))).toBeTruthy();
    expect(within(denied).getByText(de('screens.notauthorized.youDonTHavePermissionAccess'))).toBeTruthy();
    expect(within(denied).getByText(de('screens.notauthorized.error403Forbidden'))).toBeTruthy();
    expect(screen.queryByTestId('screen-staff-queue')).toBeNull();
  });

  it.each(['community', 'patient', 'professional'])('%s mode is below staff → Access Denied; its two buttons go to / and /settings', async (role) => {
    renderStaff(<StaffDashboardScreen />, { supabase: createStaffSupabase({ role: { role } }) });
    await screen.findByTestId('staff-not-authorized');
    expect(screen.queryByTestId('screen-staff-dashboard')).toBeNull();
    fireEvent.press(screen.getByTestId('staff-not-authorized-home'));
    expect(router.navigate).toHaveBeenLastCalledWith('/');
    fireEvent.press(screen.getByTestId('staff-not-authorized-support'));
    expect(router.navigate).toHaveBeenLastCalledWith('/settings');
    expect(screen.getByText(de('screens.notauthorized.returnDashboard'))).toBeTruthy();
    expect(screen.getByText(de('screens.notauthorized.contactSupport'))).toBeTruthy();
  });

  it.each(['backoffice', 'admin'])('%s outranks staff → the screen renders', async (role) => {
    renderStaff(<StaffQueueScreen />, { supabase: createStaffSupabase({ role: { role } }) });
    expect(await screen.findByTestId('screen-staff-queue')).toBeTruthy();
  });

  it('an Exafy admin passes on every role', async () => {
    renderStaff(<StaffComingSoonScreen route="time" />, { supabase: createStaffSupabase({ role: { role: 'community' }, exafyAdmin: true }) });
    expect(await screen.findByTestId('screen-staff-time')).toBeTruthy();
  });

  it('hasPermission follows ROLE_HIERARCHY (web useRole.tsx:14-23, 109-115)', () => {
    expect(['community', 'patient', 'professional'].map((r) => hasStaffPermission(r as never, false))).toEqual([false, false, false]);
    expect(['staff', 'backoffice', 'admin', 'developer', 'infra'].every((r) => hasStaffPermission(r as never, false))).toBe(true);
    expect(hasStaffPermission('community', true)).toBe(true);
  });

  it('once settled for the member, a later pending role query does not bring the loader back (ProtectedRoute settledFor)', async () => {
    renderStaff(<StaffDashboardScreen />);
    await screen.findByTestId('screen-staff-dashboard');
    screen.unmount();
    renderStaff(<StaffComingSoonScreen route="tools" />, { supabase: createStaffSupabase({ role: 'pending' }) });
    await waitFor(() => expect(screen.getByTestId('staff-not-authorized')).toBeTruthy());
    expect(screen.queryByTestId('staff-gate-loading')).toBeNull();
  });
});
