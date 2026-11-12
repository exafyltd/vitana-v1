/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — role-gated access from
 * fixtures (web `ProtectedRoute requiredRole="patient"`; `/patient/results`
 * AuthGuard only), the patient bottom tabs on the patient screens (design
 * §2a: patient mode carries its own bar), and the eight route files: each
 * one exists, renders its screen and resolves as native (no shadowing
 * catch-all on a cold start).
 */
import '../helpers/no-network';
import { mockPathname, router } from './mocks';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ComponentType } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { createGateway, createPatientSupabase, renderPatient } from './helpers';
import { translate } from '../../src/i18n';
import { MobileAppShell } from '../../src/shell/components/MobileAppShell';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { routeGuard } from '../../src/shell/logic/route-guard';
import { FALLBACK_REGISTRY } from '../../src/ports/core';
import { hasRolePermission } from '../../src/screens/patient/PatientGate';
import DashboardRoute from '../../app/(app)/patient/dashboard';
import HealthRoute from '../../app/(app)/patient/health';
import AppointmentsRoute from '../../app/(app)/patient/appointments';
import ResultsRoute from '../../app/(app)/patient/results';
import CareTeamRoute from '../../app/(app)/patient/care-team';
import GoalsRoute from '../../app/(app)/patient/goals';
import InsuranceRoute from '../../app/(app)/patient/insurance';
import NotificationsRoute from '../../app/(app)/patient/notifications';

const PATIENT_ROUTES = ['/patient/appointments', '/patient/care-team', '/patient/dashboard', '/patient/goals', '/patient/health', '/patient/insurance', '/patient/notifications', '/patient/results'];

const GATED: Array<[string, ComponentType, string]> = [
  ['dashboard', DashboardRoute, 'screen-patient-dashboard'],
  ['health', HealthRoute, 'screen-patient-health'],
  ['appointments', AppointmentsRoute, 'screen-patient-appointments'],
  ['care-team', CareTeamRoute, 'screen-patient-care-team'],
  ['goals', GoalsRoute, 'screen-patient-goals'],
  ['insurance', InsuranceRoute, 'screen-patient-insurance'],
  ['notifications', NotificationsRoute, 'screen-patient-notifications'],
];

const gw = () => createGateway({ 'GET /patient/health-results': { results: [] }, 'GET /partner-health/member/link-requests': { requests: [] } });

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.current = '/patient/dashboard';
});

describe('role gate (ProtectedRoute requiredRole="patient")', () => {
  it.each(GATED)('/patient/%s renders for a member in patient mode', async (_route, Route, testID) => {
    renderPatient(<Route />, { supabase: createPatientSupabase({ role: 'patient' }), gateway: gw() });
    expect(await screen.findByTestId(testID)).toBeTruthy();
    expect(screen.queryByTestId('patient-not-authorized')).toBeNull();
  });

  it.each(GATED)('/patient/%s shows Access denied to a community member', async (_route, Route, testID) => {
    renderPatient(<Route />, { supabase: createPatientSupabase({ role: 'community' }), gateway: gw() });
    expect(await screen.findByTestId('patient-not-authorized')).toHaveTextContent(new RegExp(translate('de', 'screens.notauthorized.accessDenied')));
    expect(screen.queryByTestId(testID)).toBeNull();
  });

  it('higher roles pass (professional), and an Exafy admin passes in community mode', async () => {
    renderPatient(<DashboardRoute />, { supabase: createPatientSupabase({ role: 'professional' }), gateway: gw() });
    expect(await screen.findByTestId('screen-patient-dashboard')).toBeTruthy();
    screen.unmount();
    renderPatient(<HealthRoute />, { supabase: createPatientSupabase({ role: 'community', exafyAdmin: true }), gateway: gw() });
    expect(await screen.findByTestId('screen-patient-health')).toBeTruthy();
  });

  it('the loader while the role preference resolves for the first time', async () => {
    renderPatient(<DashboardRoute />, { supabase: createPatientSupabase({ roleLoads: 'never' }), gateway: gw() });
    expect(await screen.findByTestId('patient-gate-loading')).toBeTruthy();
    expect(screen.queryByTestId('screen-patient-dashboard')).toBeNull();
  });

  it('Access denied: "Return to dashboard" opens / and "Contact support" opens /settings', async () => {
    renderPatient(<GoalsRoute />, { supabase: createPatientSupabase({ role: 'community' }), gateway: gw() });
    fireEvent.press(await screen.findByTestId('patient-not-authorized-home'));
    expect(router.navigate).toHaveBeenCalledWith('/');
    fireEvent.press(screen.getByTestId('patient-not-authorized-support'));
    expect(router.navigate).toHaveBeenCalledWith('/settings');
  });

  it('/patient/results is AuthGuard only: a community member sees their own results', async () => {
    renderPatient(<ResultsRoute />, { supabase: createPatientSupabase({ role: 'community' }), gateway: gw() });
    expect(await screen.findByTestId('patient-results-empty')).toBeTruthy();
    expect(screen.queryByTestId('patient-not-authorized')).toBeNull();
  });

  it('hasPermission: the role ladder, Exafy admins always', () => {
    expect(hasRolePermission('community', 'patient', false)).toBe(false);
    expect(hasRolePermission('patient', 'patient', false)).toBe(true);
    expect(hasRolePermission('staff', 'patient', false)).toBe(true);
    expect(hasRolePermission('community', 'patient', true)).toBe(true);
  });

  it('the shell route guard runs first, as the web useRoleRouteEnforcement: community bounced off gated routes, not off results', () => {
    const reg = FALLBACK_REGISTRY;
    expect(routeGuard('/patient/goals', 'community', reg)).toBe('/home');
    expect(routeGuard('/patient/results', 'community', reg)).toBeNull();
    expect(routeGuard('/patient/goals', 'patient', reg)).toBeNull();
  });
});

describe('patient bottom tabs (design §2a)', () => {
  const barIds = () =>
    within(screen.getByTestId('bottom-nav'))
      .getAllByTestId(/^bottom-nav-[a-z-]+$/, { includeHiddenElements: true })
      .map((n) => n.props.testID as string)
      .filter((id) => !id.endsWith('-badge') && !id.endsWith('-active'));

  it.each([
    ['/patient/dashboard', DashboardRoute, 'patient-dashboard'],
    ['/patient/health', HealthRoute, 'patient-health'],
    ['/patient/appointments', AppointmentsRoute, 'patient-appointments'],
    ['/patient/results', ResultsRoute, 'patient-results'],
  ] as const)('%s in patient mode: Dashboard, Results, Health, Appointments with the active tab', async (path, Route, active) => {
    mockPathname.current = path;
    renderPatient(
      <MobileAppShell>
        <Route />
      </MobileAppShell>,
      { supabase: createPatientSupabase({ role: 'patient' }), gateway: gw() },
    );
    await waitFor(() => expect(barIds()).toEqual(['bottom-nav-patient-dashboard', 'bottom-nav-patient-results', 'bottom-nav-patient-health', 'bottom-nav-patient-appointments']));
    expect(screen.getByTestId(`bottom-nav-${active}-active`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('bottom-nav-patient-results'));
    expect(router.navigate).toHaveBeenCalledWith('/patient/results');
  });

  it('labels come from the mobileNav catalog', async () => {
    mockPathname.current = '/patient/health';
    renderPatient(
      <MobileAppShell>
        <HealthRoute />
      </MobileAppShell>,
      { supabase: createPatientSupabase({ role: 'patient' }), gateway: gw() },
    );
    expect(await screen.findByTestId('bottom-nav-patient-appointments')).toHaveTextContent(translate('de', 'mobileNav.appointments'));
  });

  it('a community member on /patient/results gets no bar (role section, no mode bar — web VTID-03968)', async () => {
    mockPathname.current = '/patient/results';
    renderPatient(
      <MobileAppShell>
        <ResultsRoute />
      </MobileAppShell>,
      { supabase: createPatientSupabase({ role: 'community' }), gateway: gw() },
    );
    expect(await screen.findByTestId('screen-patient-results')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('top-app-bar')).toBeTruthy());
    expect(screen.queryByTestId('bottom-nav')).toBeNull();
  });
});

describe('route files', () => {
  it.each(PATIENT_ROUTES)('%s has its own route file and resolves native (cold start, no catch-all)', (path) => {
    expect(existsSync(join(__dirname, '../../app/(app)', `${path}.tsx`))).toBe(true);
    expect(NATIVE_ROUTES).toContain(path);
    expect(resolveWebPath(path)).toMatchObject({ kind: 'native', href: path });
  });
});
