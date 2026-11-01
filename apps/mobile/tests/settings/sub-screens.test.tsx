/**
 * VTID-05431 (Native Wave 2, settings lane) — the standalone settings
 * sub-screens: `/settings/preferences?section=` (the redirect + the hub
 * fallback, requirements R1.5), `/settings/limitations` and
 * `/settings/tenant-role` (loaded / empty / error, each write asserted as the
 * built request against the mocked gateway / Supabase double).
 */
import '../helpers/no-network';
import { mockParams, mockRedirects } from './mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createGateway, createSettingsSupabase, renderSettings } from './helpers';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { LimitationsScreen } from '../../src/screens/settings/LimitationsScreen';
import { TenantRoleScreen, hasRolePermission } from '../../src/screens/settings/TenantRoleScreen';
import { PreferencesRedirect } from '../../src/screens/settings/PreferencesRedirect';
import { initialSection, preferencesRedirectHref } from '../../src/screens/settings/sections';
import PreferencesRoute from '../../app/(app)/settings/preferences';
import LimitationsRoute from '../../app/(app)/settings/limitations';
import TenantRoleRoute from '../../app/(app)/settings/tenant-role';

afterEach(() => {
  mockParams.current = {};
  mockRedirects.length = 0;
  jest.clearAllMocks();
  __clearToastsForTests();
});

describe('/settings/preferences?section=', () => {
  it('SETTINGS.PREFERENCES_ACCESSIBILITY redirects to the hub, which falls back to notifications (web behaviour, R1.5)', () => {
    mockParams.current = { section: 'accessibility' };
    renderSettings(<PreferencesRoute />, { supabase: createSettingsSupabase() });
    expect(mockRedirects).toEqual(['/settings?mode=preferences.accessibility']);
    expect(initialSection('preferences.accessibility')).toBe('notifications');
  });

  it('a known section lands on that child; no section on the preferences parent', () => {
    mockParams.current = { section: 'language' };
    renderSettings(<PreferencesRedirect />, { supabase: createSettingsSupabase() });
    expect(mockRedirects).toEqual(['/settings?mode=preferences.language']);
    expect(preferencesRedirectHref(undefined)).toBe('/settings?mode=preferences');
    expect(initialSection('preferences.language')).toBe('preferences.language');
  });
});

const LIMITS = {
  limitations: {
    allergies: ['peanuts'],
    dietary_restrictions: ['vegan'],
    current_medications: [],
    pregnancy_status: null,
    physical_accessibility_needs: [],
    budget_max_per_product_cents: 4000,
    budget_monthly_cap_cents: null,
    budget_preferred_band: 'mid',
    field_last_verified: { allergies: '2026-10-01T00:00:00Z' },
  },
};

describe('/settings/limitations', () => {
  it('loaded: the live counter, the saved tags and the budget', async () => {
    renderSettings(<LimitationsRoute />, {
      supabase: createSettingsSupabase(),
      gateway: createGateway({ 'GET /user/limitations': LIMITS, 'GET /user/limitations/impact': { ok: true, total_active_products: 1200, hidden_total_approx: 37 } }),
    });
    expect(await screen.findByTestId('limitations-form')).toBeTruthy();
    expect(screen.getByTestId('allergies-tag-peanuts')).toBeTruthy();
    expect(screen.getByTestId('dietary-vegan').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('budget-max').props.value).toBe('40');
    expect(screen.getByTestId('limitations-hidden-total')).toBeTruthy();
    expect(screen.getByText(/37/)).toBeTruthy();
  });

  it('empty: no saved limitations shows the empty form ("none added yet")', async () => {
    renderSettings(<LimitationsScreen />, { supabase: createSettingsSupabase(), gateway: createGateway({ 'GET /user/limitations': { limitations: null } }) });
    expect(await screen.findByTestId('limitations-form')).toBeTruthy();
    expect(screen.getAllByText('Noch keine hinzugefügt').length).toBeGreaterThan(0);
  });

  it('error: a failed load toasts and leaves the empty form, as the web does', async () => {
    renderSettings(<LimitationsScreen />, { supabase: createSettingsSupabase(), gateway: createGateway({ 'GET /user/limitations': { __status: 500, __body: { error: 'x' } } }) });
    expect(await screen.findByTestId('limitations-form')).toBeTruthy();
    expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.settings.couldNotLoadLimitations');
  });

  it('adding an allergen and saving PATCHes /user/limitations with that section only', async () => {
    const gateway = createGateway({ 'GET /user/limitations': LIMITS, 'PATCH /user/limitations': { ok: true }, 'GET /user/limitations/impact': { ok: true, total_active_products: 1, hidden_total_approx: 0 } });
    renderSettings(<LimitationsScreen />, { supabase: createSettingsSupabase(), gateway });
    fireEvent.changeText(await screen.findByTestId('allergies-input'), ' Shellfish ');
    fireEvent.press(screen.getByTestId('allergies-add'));
    fireEvent.press(screen.getByTestId('save-allergies'));
    await waitFor(() => expect(gateway.writes()).toEqual([{ method: 'PATCH', path: '/user/limitations', body: { allergies: ['peanuts', 'shellfish'] } }]));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.settings.saved'));
  });

  it('the budget saves cents', async () => {
    const gateway = createGateway({ 'GET /user/limitations': LIMITS, 'PATCH /user/limitations': { ok: true } });
    renderSettings(<LimitationsScreen />, { supabase: createSettingsSupabase(), gateway });
    fireEvent.changeText(await screen.findByTestId('budget-cap'), '150');
    fireEvent.press(screen.getByTestId('save-budget'));
    await waitFor(() =>
      expect(gateway.writes()).toEqual([{ method: 'PATCH', path: '/user/limitations', body: { budget_max_per_product_cents: 4000, budget_monthly_cap_cents: 15000, budget_preferred_band: 'mid' } }]),
    );
  });
});

const MEMBERSHIPS = {
  memberships: [
    { id: 'm1', role: 'admin', status: 'active', tenant_id: 't-maxina', tenants: { id: 't-maxina', name: 'Maxina', slug: 'maxina' } },
    { id: 'm2', role: 'community', status: 'active', tenant_id: 't-alkalma', tenants: { id: 't-alkalma', name: 'Alkalma', slug: 'alkalma' } },
  ],
};

describe('/settings/tenant-role', () => {
  it('loaded (member): current context, the no-roles notice the web shows, permissions from dbRole', async () => {
    const sb = createSettingsSupabase({ rpc: { get_role_preference: () => ({ data: [{ role: 'patient' }], error: null }) }, functions: { list_my_memberships: () => ({ data: MEMBERSHIPS, error: null }) } });
    renderSettings(<TenantRoleRoute />, { supabase: sb });
    expect(await screen.findByTestId('tenant-role-context')).toBeTruthy();
    expect(screen.getByTestId('tenant-role-current-role')).toHaveTextContent(/Community-Mitglied/);
    await waitFor(() => expect(screen.getByTestId('tenant-role-current-tenant')).toHaveTextContent(/Maxina/));
    expect(screen.getByTestId('tenant-role-no-roles')).toBeTruthy();
    expect(screen.queryByTestId('tenant-role-switch-org')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('tenant-role-permission-patient')).toHaveTextContent(/Gewährt/));
    expect(screen.getByTestId('tenant-role-permission-professional')).toHaveTextContent(/Nicht verfügbar/);
  });

  it('empty (Exafy admin, no memberships): the no-organisations notice', async () => {
    const sb = createSettingsSupabase({ exafyAdmin: true, functions: { list_my_memberships: () => ({ data: { memberships: [] }, error: null }) } });
    renderSettings(<TenantRoleScreen />, { supabase: sb });
    expect(await screen.findByTestId('tenant-role-admin-notice')).toBeTruthy();
    expect(screen.getByTestId('tenant-role-no-orgs')).toBeTruthy();
  });

  it('error: a failed memberships call shows the no-roles notice, never a crash', async () => {
    const sb = createSettingsSupabase({ functions: { list_my_memberships: () => ({ data: null, error: { message: 'boom' } }) } });
    renderSettings(<TenantRoleScreen />, { supabase: sb });
    expect(await screen.findByTestId('tenant-role-no-roles')).toBeTruthy();
  });

  it('loading shows the skeleton', () => {
    const sb = createSettingsSupabase({ functions: { list_my_memberships: () => new Promise(() => undefined) as never } });
    renderSettings(<TenantRoleScreen />, { supabase: sb });
    expect(screen.getByTestId('tenant-role-loading')).toBeTruthy();
  });

  it('Exafy admin: switching organisation calls the shell tenant switch (switch_to_tenant_by_slug)', async () => {
    const sb = createSettingsSupabase({
      exafyAdmin: true,
      tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }, { tenant_id: 't-alkalma', slug: 'alkalma', name: 'Alkalma' }] },
      functions: { list_my_memberships: () => ({ data: MEMBERSHIPS, error: null }) },
    });
    renderSettings(<TenantRoleScreen />, { supabase: sb });
    // Wait until the tenant and the role preference have both settled (the screen shows its skeleton while either loads).
    await waitFor(() => expect(screen.getByTestId('tenant-role-current-tenant')).toHaveTextContent(/Maxina/), { timeout: 5000 });
    await waitFor(() => expect(sb.calls.some((c) => c.fn === 'rpc.get_role_preference')).toBe(true));
    fireEvent.press(await screen.findByTestId('tenant-role-org-trigger'));
    fireEvent.press(screen.getByTestId('tenant-role-org-t-alkalma'));
    fireEvent.press(screen.getByTestId('tenant-role-switch-org-button'));
    await waitFor(() => expect(sb.calls.filter((c) => c.fn === 'rpc.switch_to_tenant_by_slug')).toEqual([{ fn: 'rpc.switch_to_tenant_by_slug', args: [{ p_tenant_slug: 'alkalma' }] }]), { timeout: 5000 });
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.settings.organizationSwitched'), { timeout: 5000 });
  });

  it('hasRolePermission follows the role ladder; Exafy admins have every permission', () => {
    expect(hasRolePermission('community', 'patient', false)).toBe(false);
    expect(hasRolePermission('staff', 'professional', false)).toBe(true);
    expect(hasRolePermission('community', 'admin', true)).toBe(true);
  });
});
