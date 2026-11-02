/**
 * VTID-05432 — `/connectors` (ConnectorsScreen) and `/settings/connected-apps`:
 * each category `?tab=` renders its sections; live state from the gateway
 * (wearables, AI providers, social connections); every connect / disconnect /
 * sync / channel write builds the right request against a MOCKED gateway, and a
 * provider consent URL goes to the (mocked) opener — no URL is opened, nothing
 * is written anywhere.
 */
import '../helpers/no-network';
import { mockParams, mockRedirects, router } from './mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { __setConsentOpenerForTests } from '../../src/ports/support';
import { CONNECTOR_TABS, ConnectorsScreen, connectorTab } from '../../src/screens/support/ConnectorsScreen';
import ConnectorsRoute from '../../app/(app)/connectors';
import ConnectedAppsRoute from '../../app/(app)/settings/connected-apps';
import { makeWrapper, status } from './helpers';

const opener = jest.fn(async (_url: string) => undefined);

afterAll(() => {
  __setSupabaseForTests(null);
  __setConsentOpenerForTests(null);
});
beforeEach(() => {
  mockParams.current = {};
  mockRedirects.length = 0;
  jest.clearAllMocks();
  __clearToastsForTests();
  __setConsentOpenerForTests(opener);
});

const hubApp = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  provider: id.startsWith('apple') || id === 'iphone-contacts' ? 'apple' : id.startsWith('outlook') ? 'microsoft' : id === 'android-contacts' ? 'device' : 'google',
  kind: id.includes('mail') || id === 'gmail' ? 'mail' : id.includes('calendar') ? 'calendar' : 'contacts',
  method: id.startsWith('apple') || id === 'iphone-contacts' ? 'app_password' : id === 'android-contacts' ? 'device' : 'oauth',
  availability: 'ready',
  status: 'off',
  account: null,
  syncs: true,
  last_sync_at: null,
  last_result: null,
  last_error: null,
  ...over,
});

const HUB = [
  hubApp('gmail'),
  hubApp('outlook-mail'),
  hubApp('apple-mail'),
  hubApp('google-calendar'),
  hubApp('outlook-calendar'),
  hubApp('apple-calendar'),
  hubApp('google-contacts', { status: 'on', account: 'ana@example.com' }),
  hubApp('outlook-contacts'),
  hubApp('iphone-contacts'),
  hubApp('android-contacts'),
];

const BASE = {
  'GET /wearables/providers': { ok: true, providers: [{ id: 'garmin', display_name: 'Garmin', category: 'fitness', status: 'connected', last_sync_at: '2026-10-30T08:00:00Z' }] },
  'GET /integrations/ai-assistants/providers': { ok: true, providers: [{ provider: 'chatgpt', status: 'connected', last_verified_at: '2026-10-29T08:00:00Z' }] },
  'GET /social-accounts/connections': { connections: [] },
  'GET /connected-apps': { ok: true, apps: HUB },
  'GET /vaea/channels': { ok: true, channels: [{ id: 'c-1', platform: 'slack', channel_key: 'C123', display_name: 'Team', active: true, dry_run: true, last_error: null }] },
};

/** What each pill shows (web MobileConnectedAppsView). */
const EXPECTED: Record<string, string[]> = {
  shopping: ['section-shopping'],
  ai: ['section-ai'],
  productivity: ['mailhub-section'],
  media: ['section-media'],
  social: ['section-social'],
  fitness: ['section-fitness'],
  health: ['section-health'],
  other: ['section-other'],
  agent: ['agent-channels'],
};
const ALL_SECTIONS = Object.values(EXPECTED).flat();

/** The hub rows are switchable once GET /connected-apps answered (google-contacts shows its account). */
const hubReady = () => screen.findByText('ana@example.com');

describe('connectorTab (web CONNECTOR_TABS)', () => {
  it('accepts only the ten pills', () => {
    expect([...CONNECTOR_TABS]).toEqual(['all', 'shopping', 'ai', 'productivity', 'media', 'social', 'fitness', 'health', 'other', 'agent']);
    expect(connectorTab('fitness')).toBe('fitness');
    expect(connectorTab('connected')).toBeNull();
    expect(connectorTab(undefined)).toBeNull();
  });
});

describe('ConnectorsScreen categories', () => {
  it.each(Object.entries(EXPECTED))('?tab=%s renders only its section', async (tab, sections) => {
    mockParams.current = { tab };
    const { wrapper } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    for (const id of sections) expect(await screen.findByTestId(id)).toBeTruthy();
    for (const id of ALL_SECTIONS.filter((s) => !sections.includes(s))) expect(screen.queryByTestId(id)).toBeNull();
  });

  it('no tab (SETTINGS.SOCIAL) shows every section; the route file renders the screen', async () => {
    const { wrapper } = makeWrapper(BASE);
    render(<ConnectorsRoute />, { wrapper });
    for (const id of ALL_SECTIONS) expect(await screen.findByTestId(id)).toBeTruthy();
    expect(screen.getByTestId('connection-summary')).toBeTruthy();
  });

  it('an unknown tab keeps "all"', async () => {
    mockParams.current = { tab: 'connected' };
    const { wrapper } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    expect(await screen.findByTestId('agent-channels')).toBeTruthy();
    expect(screen.getByTestId('section-shopping')).toBeTruthy();
  });

  it('the pill writes ?tab= back', () => {
    const { wrapper } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-health'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'health' });
    expect(screen.queryByTestId('section-fitness')).toBeNull();
  });

  it('search filters the rows by name', async () => {
    const { wrapper } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.changeText(screen.getByTestId('connectors-search'), 'strava');
    expect(await screen.findByTestId('section-fitness')).toBeTruthy();
    expect(screen.queryByTestId('section-social')).toBeNull();
  });
});

describe('live state', () => {
  it('fitness is connected only when the gateway says so; AI from the providers', async () => {
    mockParams.current = { tab: 'fitness' };
    const { wrapper } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('section-fitness-trigger'));
    await waitFor(() => expect(within(screen.getByTestId('integration-garmin')).getByText('Connected')).toBeTruthy());
    expect(within(screen.getByTestId('integration-fitbit')).queryByText('Connected')).toBeNull();
  });

  it('a failed wearables read connects nothing', async () => {
    mockParams.current = { tab: 'fitness' };
    const { wrapper } = makeWrapper({ ...BASE, 'GET /wearables/providers': status(500) });
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('section-fitness-trigger'));
    expect(within(screen.getByTestId('integration-garmin')).queryByText('Connected')).toBeNull();
  });

  it('an expired session shows the banner', async () => {
    const { wrapper } = makeWrapper({ ...BASE, 'GET /social-accounts/connections': status(401) });
    render(<ConnectorsScreen />, { wrapper });
    expect(await screen.findByTestId('session-expired')).toBeTruthy();
  });
});

describe('detail sheet connect / disconnect', () => {
  it('YouTube Music connect GETs the gateway OAuth start and hands the URL to the opener', async () => {
    mockParams.current = { tab: 'media' };
    const { wrapper, gateway } = makeWrapper({ ...BASE, 'GET /social-accounts/connect/youtube?return=mobile': { auth_url: 'https://accounts.example/consent' } });
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('section-media-trigger'));
    fireEvent.press(screen.getByTestId('integration-youtube-music'));
    fireEvent.press(screen.getByTestId('integration-connect'));
    await waitFor(() => expect(opener).toHaveBeenCalledWith('https://accounts.example/consent'));
    expect(gateway.calls.some((c) => c.method === 'GET' && c.path === '/social-accounts/connect/youtube?return=mobile')).toBe(true);
    expect(gateway.writes()).toHaveLength(0);
  });

  it('a failed OAuth start shows the error and opens nothing', async () => {
    mockParams.current = { tab: 'media' };
    const { wrapper } = makeWrapper({ ...BASE, 'GET /social-accounts/connect/youtube?return=mobile': status(500) });
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('section-media-trigger'));
    fireEvent.press(screen.getByTestId('integration-youtube-playback'));
    fireEvent.press(screen.getByTestId('integration-connect'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.settings.couldnTStartYoutubeSignin'));
    expect(opener).not.toHaveBeenCalled();
  });

  it('a connected demo row disconnects with the web placeholder (no request)', async () => {
    mockParams.current = { tab: 'social' };
    const { wrapper, gateway } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('section-social-trigger'));
    fireEvent.press(screen.getByTestId('integration-linkedin'));
    fireEvent.press(screen.getByTestId('integration-disconnect'));
    expect(__toastsForTests().map((t) => t.titleKey)).toContain('connectedApps.actions.disconnect');
    expect(gateway.writes()).toHaveLength(0);
  });

  it('a coming-soon app explains instead of connecting', async () => {
    mockParams.current = { tab: 'other' };
    const { wrapper } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('section-other-trigger'));
    fireEvent.press(screen.getByTestId('integration-whatsapp'));
    expect(screen.getByTestId('integration-coming-soon')).toBeTruthy();
    expect(screen.queryByTestId('integration-connect')).toBeNull();
  });

  it('a shopping row opens Discover', async () => {
    mockParams.current = { tab: 'shopping' };
    const { wrapper } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('section-shopping-trigger'));
    fireEvent.press(screen.getByTestId('integration-aliexpress'));
    expect(router.navigate).toHaveBeenCalledWith('/discover');
  });
});

describe('Mail, Calendar & Contacts hub (writes — mocked)', () => {
  it('switching Gmail on POSTs connect (return: mobile) and hands the consent URL to the opener', async () => {
    mockParams.current = { tab: 'productivity' };
    const { wrapper, gateway } = makeWrapper({ ...BASE, 'POST /connected-apps/gmail/connect': { ok: true, status: 'consent_required', auth_url: 'https://google.example/consent' } });
    render(<ConnectorsScreen />, { wrapper });
    await hubReady();
    fireEvent.press(screen.getByTestId('mailhub-toggle-gmail'));
    await waitFor(() => expect(opener).toHaveBeenCalledWith('https://google.example/consent'));
    const w = gateway.writes();
    expect(w.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /connected-apps/gmail/connect']);
    expect(w[0].body).toEqual({ return: 'mobile' });
    expect(await screen.findByText('Finish signing in in your browser, then come back')).toBeTruthy();
  });

  it('a direct "on" reply toasts and refreshes', async () => {
    mockParams.current = { tab: 'productivity' };
    const { wrapper } = makeWrapper({ ...BASE, 'POST /connected-apps/outlook-calendar/connect': { ok: true, status: 'on', sync: { ok: true } } });
    render(<ConnectorsScreen />, { wrapper });
    await hubReady();
    fireEvent.press(screen.getByTestId('mailhub-toggle-outlook-calendar'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('mailhub.toasts.turnedOn'));
    expect(opener).not.toHaveBeenCalled();
  });

  it('switching off asks first, then POSTs disconnect with remove_data', async () => {
    mockParams.current = { tab: 'productivity' };
    const { wrapper, gateway } = makeWrapper({ ...BASE, 'POST /connected-apps/google-contacts/disconnect': { ok: true } });
    render(<ConnectorsScreen />, { wrapper });
    await hubReady();
    fireEvent.press(screen.getByTestId('mailhub-toggle-google-contacts'));
    expect(gateway.writes()).toHaveLength(0);
    fireEvent.press(screen.getByTestId('mailhub-off-remove'));
    fireEvent.press(screen.getByTestId('mailhub-off-confirm'));
    await waitFor(() => expect(gateway.writes().map((c) => `${c.method} ${c.path}`)).toEqual(['POST /connected-apps/google-contacts/disconnect']));
    expect(gateway.writes()[0].body).toEqual({ remove_data: true });
  });

  it('sync now POSTs sync', async () => {
    mockParams.current = { tab: 'productivity' };
    const { wrapper, gateway } = makeWrapper({ ...BASE, 'POST /connected-apps/google-contacts/sync': { ok: true } });
    render(<ConnectorsScreen />, { wrapper });
    await hubReady();
    fireEvent.press(screen.getByTestId('mailhub-sync-google-contacts'));
    await waitFor(() => expect(gateway.writes().map((c) => `${c.method} ${c.path}`)).toEqual(['POST /connected-apps/google-contacts/sync']));
  });

  it('Apple asks for the Apple ID + app password, then POSTs them', async () => {
    mockParams.current = { tab: 'productivity' };
    const { wrapper, gateway } = makeWrapper({ ...BASE, 'POST /connected-apps/apple-mail/connect': { ok: true, status: 'on' } });
    render(<ConnectorsScreen />, { wrapper });
    await hubReady();
    fireEvent.press(screen.getByTestId('mailhub-toggle-apple-mail'));
    expect(gateway.writes()).toHaveLength(0);
    fireEvent.changeText(screen.getByTestId('mailhub-apple-id'), 'ana@icloud.com');
    fireEvent.changeText(screen.getByTestId('mailhub-apple-password'), 'abcd-efgh-ijkl-mnop');
    fireEvent.press(screen.getByTestId('mailhub-apple-submit'));
    await waitFor(() => expect(gateway.writes()).toHaveLength(1));
    expect(gateway.writes()[0].body).toEqual({ return: 'mobile', apple_id: 'ana@icloud.com', app_password: 'abcd-efgh-ijkl-mnop' });
  });

  it('Android contacts shows the help sheet and sends nothing', async () => {
    mockParams.current = { tab: 'productivity' };
    const { wrapper, gateway } = makeWrapper(BASE);
    render(<ConnectorsScreen />, { wrapper });
    await hubReady();
    fireEvent.press(screen.getByTestId('mailhub-toggle-android-contacts'));
    expect(screen.getByTestId('mailhub-android-help')).toBeTruthy();
    expect(gateway.writes()).toHaveLength(0);
  });

  it('an expired session on the hub read shows the session error (no retry on 401)', async () => {
    mockParams.current = { tab: 'productivity' };
    const { wrapper } = makeWrapper({ ...BASE, 'GET /connected-apps': status(401, { ok: false, error: 'unauthorized' }) });
    render(<ConnectorsScreen />, { wrapper });
    expect(await screen.findByTestId('mailhub-error')).toBeTruthy();
    expect(screen.getByText('Your session has expired. Sign in again to manage your apps.')).toBeTruthy();
  });
});

describe('Autopilot channels (writes — mocked)', () => {
  it('pause PATCHes, remove DELETEs, add POSTs', async () => {
    mockParams.current = { tab: 'agent' };
    const { wrapper, gateway } = makeWrapper({
      ...BASE,
      'PATCH /vaea/channels/c-1': { ok: true },
      'DELETE /vaea/channels/c-1': { ok: true },
      'POST /vaea/channels': { ok: true, channel: { id: 'c-2' } },
    });
    render(<ConnectorsScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('agent-active-c-1'));
    await waitFor(() => expect(gateway.writes()).toHaveLength(1));
    expect(gateway.writes()[0]).toMatchObject({ method: 'PATCH', path: '/vaea/channels/c-1', body: { active: false } });

    fireEvent.press(screen.getByTestId('agent-remove-c-1'));
    await waitFor(() => expect(gateway.writes()).toHaveLength(2));
    expect(gateway.writes()[1]).toMatchObject({ method: 'DELETE', path: '/vaea/channels/c-1' });

    fireEvent.press(screen.getByTestId('agent-toggle-form'));
    fireEvent.press(screen.getByTestId('agent-platform-discord'));
    fireEvent.changeText(screen.getByTestId('agent-channel-key'), ' 987 ');
    fireEvent.press(screen.getByTestId('agent-add'));
    await waitFor(() => expect(gateway.writes()).toHaveLength(3));
    expect(gateway.writes()[2]).toMatchObject({ method: 'POST', path: '/vaea/channels', body: { platform: 'discord', channel_key: '987', display_name: null, dry_run: true } });
  });

  it('shows the empty state', async () => {
    mockParams.current = { tab: 'agent' };
    const { wrapper } = makeWrapper({ ...BASE, 'GET /vaea/channels': { ok: true, channels: [] } });
    render(<ConnectorsScreen />, { wrapper });
    expect(await screen.findByTestId('agent-empty')).toBeTruthy();
  });
});

describe('/settings/connected-apps (SETTINGS.CONNECTED_APPS)', () => {
  it('redirects to /connectors keeping the query (web RedirectPreservingSearch)', () => {
    mockParams.current = { connected: 'google', username: 'ana' };
    render(<ConnectedAppsRoute />);
    expect(mockRedirects).toEqual([{ pathname: '/connectors', params: { connected: 'google', username: 'ana' } }]);
  });
});
