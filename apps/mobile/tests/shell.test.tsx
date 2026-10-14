/** VTID-05186 (N3, plan changes 17–18) — the shell: bars per mode, hide rules, drawer, top bar, mode pill. */
import './helpers/no-network';
import './helpers/mocks';
import './fixtures/native-keys';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { createSupabaseDouble, fakeSession } from './helpers/supabase-double';
import { makeWrapper } from './helpers/providers';
import { MobileAppShell, isEdgeSwipe } from '../src/shell/components/MobileAppShell';
import { MobileModePill } from '../src/shell/components/MobileModePill';
import { __setSupabaseForTests } from '../src/auth/client';
import { registerBadgeSource, __clearBadgeSourcesForTests } from '../src/ports/badges';
import { translate } from '../src/i18n';
import { I18nProvider } from '../src/i18n/I18nProvider';

let mockPath = '/home';
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn(), push: jest.fn() },
  usePathname: () => mockPath,
  useGlobalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  // The N2 kit reads insets from the context (src/ui/foundation/insets.ts); null = zero insets.
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  jest.clearAllMocks();
  __clearBadgeSourcesForTests();
  mockPath = '/home';
});

function setup(opts: { role?: string; tenant?: 'maxina' | 'alkalma'; orgs?: unknown[]; path?: string } = {}) {
  if (opts.path) mockPath = opts.path;
  const tenant = opts.tenant ?? 'maxina';
  const d = createSupabaseDouble({
    session: fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: `t-${tenant}` }, user_metadata: {} } }),
    tables: {
      tenants: [{ tenant_id: `t-${tenant}`, slug: tenant, name: tenant === 'maxina' ? 'Maxina' : 'AlKalma' }],
      profiles: [{ user_id: 'u-1', display_name: 'Ana B', avatar_url: null, handle: null }],
    },
    rpc: { get_role_preference: () => ({ data: [{ role: opts.role ?? 'community' }], error: null }), get_my_permitted_roles: () => ({ data: { ok: true, roles: ['community', 'patient'] }, error: null }) },
  });
  const wrapper = makeWrapper({ client: d.client, language: 'de-DE', gateway: { '/api/v1/partner-orgs/mine': { organizations: opts.orgs ?? [] } } });
  render(
    <MobileAppShell>
      <Text>page</Text>
    </MobileAppShell>,
    { wrapper },
  );
  return d;
}

const barIds = () =>
  within(screen.getByTestId('bottom-nav'))
    .getAllByTestId(/^(bottom-nav-[a-z-]+|orb-slot-placeholder)$/, { includeHiddenElements: true })
    .map((n) => n.props.testID as string)
    .filter((id) => !id.endsWith('-badge') && !id.endsWith('-active'));

describe('bottom bar', () => {
  it('community: four items with the ORB slot in the centre', async () => {
    setup();
    await waitFor(() => expect(screen.getByTestId('bottom-nav')).toBeTruthy());
    expect(barIds()).toEqual(['bottom-nav-news', 'bottom-nav-inbox', 'orb-slot-placeholder', 'bottom-nav-journey', 'bottom-nav-events']);
    expect(screen.getByTestId('bottom-nav-news-active')).toBeTruthy();
  });

  it('patient mode: the patient bar', async () => {
    setup({ role: 'patient', path: '/patient/dashboard' });
    await waitFor(() => expect(barIds()[0]).toBe('bottom-nav-patient-dashboard'));
    expect(barIds()).toEqual(['bottom-nav-patient-dashboard', 'bottom-nav-patient-results', 'orb-slot-placeholder', 'bottom-nav-patient-health', 'bottom-nav-patient-appointments']);
  });

  it('professional mode: the professional bar', async () => {
    setup({ role: 'professional', path: '/professional/dashboard' });
    await waitFor(() => expect(barIds()[0]).toBe('bottom-nav-professional-dashboard'));
    expect(barIds()[4]).toBe('bottom-nav-settings');
  });

  it.each([
    ['org_admin', ['bottom-nav-business-overview', 'bottom-nav-business-team', 'orb-slot-placeholder', 'bottom-nav-business-orders', 'bottom-nav-settings']],
    ['staff', ['bottom-nav-business-overview', 'bottom-nav-business-orders', 'orb-slot-placeholder', 'bottom-nav-business-inbox', 'bottom-nav-settings']],
    ['professional', ['bottom-nav-business-overview', 'bottom-nav-business-orders', 'orb-slot-placeholder', 'bottom-nav-inbox', 'bottom-nav-settings']],
  ])('business %s on a business route', async (role, want) => {
    setup({ path: '/commerce/health-orders', orgs: [{ id: 'org-1', display_name: 'Lab', role }] });
    await waitFor(() => expect(barIds()).toEqual(want));
  });

  it.each(['/maxina', '/comm/live-rooms/x', '/news/1', '/staff/queue'])('hidden on %s', async (path) => {
    setup({ path });
    await waitFor(() => expect(screen.getByTestId('top-app-bar')).toBeTruthy());
    expect(screen.queryByTestId('bottom-nav')).toBeNull();
  });

  it('a tap navigates; the inbox badge has an i18n label', async () => {
    registerBadgeSource('inboxUnread', () => 3);
    setup();
    fireEvent.press(await screen.findByTestId('bottom-nav-events'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events-meetups');
    expect(screen.getByTestId('bottom-nav-inbox-badge').props.accessibilityLabel).toBe(translate('de', 'native.a11y.unread', { count: 3 }));
  });
});

describe('top bar', () => {
  it.each([
    ['maxina', 'MAXINA'],
    ['alkalma', 'ALKALMA'],
  ] as const)('%s name uppercased', async (tenant, name) => {
    setup({ tenant });
    await waitFor(() => expect(screen.getByTestId('top-bar-tenant').props.children).toBe(name));
  });

  it('LIVE is hidden inside a live room and shown elsewhere', async () => {
    setup({ path: '/comm/live-rooms/abc' });
    await waitFor(() => expect(screen.getByTestId('top-app-bar')).toBeTruthy());
    expect(screen.queryByTestId('top-bar-live')).toBeNull();
  });

  it('mute toggles the label', async () => {
    setup();
    const mute = await screen.findByTestId('top-bar-mute');
    expect(mute.props.accessibilityLabel).toBe(translate('de', 'screens.audio.mute'));
    fireEvent.press(mute);
    expect(screen.getByTestId('top-bar-mute').props.accessibilityLabel).toBe(translate('de', 'screens.audio.unmute'));
  });
});

describe('drawer', () => {
  it('opens from the kebab; a row tap navigates', async () => {
    setup();
    fireEvent.press(await screen.findByTestId('top-bar-menu'));
    expect(screen.getByTestId('side-drawer')).toBeTruthy();
    fireEvent.press(screen.getByTestId('drawer-row-events'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events-meetups');
  });

  it('opens from an edge swipe (same thresholds as the web)', async () => {
    setup();
    await screen.findByTestId('shell-content');
    expect(isEdgeSwipe(10, 80, 5)).toBe(true);
    expect(isEdgeSwipe(40, 80, 5)).toBe(false);
    expect(isEdgeSwipe(10, 40, 5)).toBe(false);
    expect(isEdgeSwipe(10, 60, 70)).toBe(false);
    act(() => {
      fireGestureHandler(getByGestureTestId('shell-edge-swipe'), [
        { state: State.BEGAN, absoluteX: 10, absoluteY: 300 },
        { state: State.ACTIVE, absoluteX: 50, absoluteY: 302 },
        { state: State.END, absoluteX: 90, absoluteY: 305 },
      ]);
    });
    expect(screen.getByTestId('side-drawer')).toBeTruthy();
  });

  it('the role switcher hides the bottom bar and the ORB slot while open', async () => {
    setup();
    fireEvent.press(await screen.findByTestId('top-bar-menu'));
    fireEvent.press(await screen.findByTestId('drawer-mode-pill'));
    expect(screen.getByTestId('role-switcher')).toBeTruthy();
    expect(screen.queryByTestId('bottom-nav')).toBeNull();
    expect(screen.queryByTestId('orb-slot-placeholder', { includeHiddenElements: true })).toBeNull();
  });
});

it('mode pill selects a nested value; the active group starts expanded', () => {
  const onChange = jest.fn();
  render(
    <MobileModePill
      activeMode="services.events"
      onModeChange={onChange}
      modes={[
        { value: 'feed', label: 'Feed' },
        { value: 'services', label: 'Services', children: [{ value: 'services.events', label: 'Events' }, { value: 'services.classes', label: 'Classes' }] },
      ]}
    />,
    // The N2 sheet's close button reads its label from the catalog.
    { wrapper: ({ children }) => <I18nProvider initialLocale="de">{children}</I18nProvider> },
  );
  expect(screen.getByTestId('mode-pill').props.accessibilityLabel).toBe('Events');
  fireEvent.press(screen.getByTestId('mode-pill'));
  fireEvent.press(screen.getByTestId('mode-services.classes'));
  expect(onChange).toHaveBeenCalledWith('services.classes');
});
