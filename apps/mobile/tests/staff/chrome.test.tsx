/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — staff mode has NO
 * bottom tabs (design §2a). The web proof: `ROLE_NAV_ITEMS` has no `staff`
 * entry (src/components/mobile/MobileBottomNav.tsx:45-58), so
 * `resolveRoleBottomNav('staff')` is null and the VTID-03968 hide for
 * `roleSectionRoutes` (`/staff`, :112-121) returns null for the whole bar.
 * On every one of the eight `/staff/*` routes the native shell renders the
 * top app bar (menu, tenant) and no bottom bar; the drawer lists the eight
 * staff rows (`staffNavigation`) and a tap lands on the native route.
 */
import '../helpers/no-network';
import { mockPath, router } from './mocks';
import { Text } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createStaffSupabase, renderStaff } from './helpers';
import { MobileAppShell } from '../../src/shell/components/MobileAppShell';
import { StaffDashboardScreen } from '../../src/screens/staff/DashboardScreen';

const ROUTES = ['communications', 'dashboard', 'queue', 'reports', 'schedule', 'tasks', 'time', 'tools'];
const PATHS = ROUTES.map((p) => `/staff/${p}`);

function renderShell(path: string, role = 'staff', page = <Text testID="page">page</Text>) {
  mockPath.current = path;
  return renderStaff(<MobileAppShell>{page}</MobileAppShell>, {
    supabase: createStaffSupabase({ role: { role } }),
    gateway: { '/api/v1/partner-orgs/mine': { organizations: [] } },
  });
}

beforeEach(() => jest.clearAllMocks());

describe('staff mode chrome', () => {
  it.each(PATHS)('%s: the top app bar renders, no bottom tab bar', async (path) => {
    renderShell(path);
    await waitFor(() => expect(screen.getByTestId('top-bar-menu')).toBeTruthy());
    expect(screen.getByTestId('top-bar-tenant')).toBeTruthy();
    expect(screen.getByTestId('page')).toBeTruthy();
    expect(screen.queryByTestId('bottom-nav')).toBeNull();
    expect(screen.queryByTestId('orb-slot-placeholder')).toBeNull();
  });

  it('the rendered staff dashboard inside the shell has no tab bar either', async () => {
    renderShell('/staff/dashboard', 'staff', <StaffDashboardScreen />);
    expect(await screen.findByTestId('screen-staff-dashboard')).toBeTruthy();
    expect(screen.queryByTestId('bottom-nav')).toBeNull();
  });

  it('the drawer lists the eight staff rows and a tap opens the native staff route', async () => {
    renderShell('/staff/dashboard');
    fireEvent.press(await screen.findByTestId('top-bar-menu'));
    await waitFor(() => expect(screen.getByTestId('drawer-row-role:/staff/queue')).toBeTruthy());
    for (const p of ['/staff/dashboard', '/staff/queue', '/staff/tasks', '/staff/schedule', '/staff/reports', '/staff/communications', '/staff/tools', '/staff/time']) {
      expect(screen.getByTestId(`drawer-row-role:${p}`)).toBeTruthy();
    }
    fireEvent.press(screen.getByTestId('drawer-row-role:/staff/queue'));
    expect(router.navigate).toHaveBeenLastCalledWith('/staff/queue');
  });
});
