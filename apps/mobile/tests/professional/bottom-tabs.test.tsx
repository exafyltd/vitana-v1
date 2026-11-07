/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — professional
 * mode carries its own bottom tabs (design §2a; web MobileBottomNav.tsx
 * ROLE_NAV_ITEMS.professional): Dashboard, Patients, ORB slot, Schedule,
 * Settings — on every one of the eight `/professional/*` screens, with the
 * active tab underlined, and a tap moves to the tab's web path. Staff's
 * VTID-03968 hide does not apply while a role bar is on offer.
 */
import '../helpers/no-network';
import { mockPath, router } from './mocks';
import { Text } from 'react-native';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { createProfessionalSupabase, renderProfessional } from './helpers';
import { translate } from '../../src/i18n';
import { MobileAppShell } from '../../src/shell/components/MobileAppShell';

const PATHS = ['billing', 'dashboard', 'education', 'patients', 'profile', 'referrals', 'schedule', 'tools'].map((p) => `/professional/${p}`);

const barIds = () =>
  within(screen.getByTestId('bottom-nav'))
    .getAllByTestId(/^(bottom-nav-[a-z-]+|orb-slot-placeholder)$/, { includeHiddenElements: true })
    .map((n) => n.props.testID as string)
    .filter((id) => !id.endsWith('-badge') && !id.endsWith('-active'));

function renderShell(path: string, role = 'professional') {
  mockPath.current = path;
  return renderProfessional(
    <MobileAppShell>
      <Text>page</Text>
    </MobileAppShell>,
    { supabase: createProfessionalSupabase({ role: { role } }), gateway: { '/api/v1/partner-orgs/mine': { organizations: [] } } },
  );
}

beforeEach(() => jest.clearAllMocks());

describe('professional bottom tabs', () => {
  it.each(PATHS)('%s shows the professional bar under the top app bar (menu, tenant)', async (path) => {
    renderShell(path);
    await waitFor(() => expect(barIds()).toEqual(['bottom-nav-professional-dashboard', 'bottom-nav-professional-patients', 'orb-slot-placeholder', 'bottom-nav-professional-schedule', 'bottom-nav-settings']));
    expect(screen.getByTestId('top-bar-menu')).toBeTruthy();
    expect(screen.getByTestId('top-bar-tenant')).toBeTruthy();
  });

  it('labels come from mobileNav.* and the active tab follows the route', async () => {
    renderShell('/professional/schedule');
    await waitFor(() => expect(screen.getByTestId('bottom-nav-professional-schedule-active')).toBeTruthy());
    expect(screen.queryByTestId('bottom-nav-professional-dashboard-active')).toBeNull();
    for (const [id, key] of [
      ['professional-dashboard', 'mobileNav.dashboard'],
      ['professional-patients', 'mobileNav.patients'],
      ['professional-schedule', 'mobileNav.schedule'],
      ['settings', 'mobileNav.settings'],
    ]) {
      expect(screen.getByTestId(`bottom-nav-${id}`).props.accessibilityLabel).toBe(translate('de', key));
    }
  });

  it('a tap moves to the tab’s web path (native routes)', async () => {
    renderShell('/professional/dashboard');
    fireEvent.press(await screen.findByTestId('bottom-nav-professional-patients'));
    expect(router.navigate).toHaveBeenLastCalledWith('/professional/patients');
    fireEvent.press(screen.getByTestId('bottom-nav-professional-schedule'));
    expect(router.navigate).toHaveBeenLastCalledWith('/professional/schedule');
    fireEvent.press(screen.getByTestId('bottom-nav-professional-dashboard'));
    expect(router.navigate).toHaveBeenLastCalledWith('/professional/dashboard');
  });
});
