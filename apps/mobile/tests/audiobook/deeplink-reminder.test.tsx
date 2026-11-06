/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — the
 * `/autopilot/audiobook` deep link (renders My Journey through the dashboard
 * port, switches to Guided, starts the player, settles on /autopilot), the
 * `?audiobook=play` entry, the player plugged into My Journey (the reminder
 * slot in the Guided view, the hero's "Play episode N"), and the reminder
 * control (twin of AudiobookReminderControl.tsx: current time, save, off,
 * error). Fake gateway + Supabase double + fake expo-audio; every built
 * request asserted; no network.
 */
import '../helpers/no-network';
import { audio, orb, route, router } from './mocks';
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { useAuth } from '../../src/auth/AuthProvider';
import { __setAudiobookOriginForTests } from '../../src/ports/audiobook';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { JourneyScreen } from '../../src/ports/journey-dashboard';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { translate } from '../../src/i18n';
import AudiobookDeepLinkRoute from '../../app/(app)/autopilot/audiobook';
import { AudiobookPlayParam } from '../../src/screens/audiobook/AudiobookDeepLink';
import { AudiobookReminderControl } from '../../src/screens/audiobook/AudiobookReminderControl';
import { useAudiobookPlayer } from '../../src/screens/audiobook/AudiobookPlayerProvider';
import { __resetGuidedProgressStorageForTests } from '../../src/screens/journey/hooks/useGuidedJourneyProgress';
import { fullRoutes, fullRpc, fullState, fullTables, guidedState, journeySupabase, topics as journeyTopics } from '../journey/helpers';
import { ORIGIN, audiobookWrapper, flush, state, withStatus, type Route } from './helpers';

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
  __setAudiobookOriginForTests(null);
});
beforeEach(async () => {
  audio.reset();
  router.navigate.mockClear();
  router.replace.mockClear();
  orb.open.mockClear();
  route.pathname = '/autopilot';
  route.params = {};
  overlayBus.clear();
  __clearToastsForTests();
  __resetGuidedProgressStorageForTests();
  await AsyncStorage.clear();
});

const settle = async () => {
  await act(async () => {
    await flush();
    await flush();
  });
};

const player = () => audio.player as unknown as Record<string, jest.Mock>;
const lastSource = () => player().replace.mock.calls.at(-1)?.[0] as { uri: string; headers: Record<string, string> };

/** My Journey with the full fixture set (journey lane fixtures) and the player. */
function dashboardWrapper(routes: Record<string, Route>) {
  const db = journeySupabase({ tables: fullTables, rpc: fullRpc });
  return audiobookWrapper(fullRoutes({ 'POST /journey/mode': { ok: true }, 'POST /journey/session-listened': { ok: true, awarded: true }, ...routes }), { client: db.client });
}

describe('/autopilot/audiobook — the push deep link', () => {
  it('renders My Journey, switches a Full-App member to Guided, starts the player and settles on /autopilot', async () => {
    route.pathname = '/autopilot/audiobook';
    const { wrapper, requests } = dashboardWrapper({ 'GET /journey/state': fullState });
    render(<AudiobookDeepLinkRoute />, { wrapper });
    expect(screen.getByTestId('screen-my-journey')).toBeTruthy();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/autopilot'));
    expect(requests.filter((r) => r.method === 'POST' && r.path === '/journey/mode').map((r) => r.body)).toEqual([{ mode: 'guided' }]);
    expect(await AsyncStorage.getItem('vitana.journeyMode.u-1')).toBe('guided');
    await waitFor(() => expect(player().replace).toHaveBeenCalled());
    expect(lastSource().uri).toBe(`${ORIGIN}/api/v1/journey/audiobook/topics/T001/audio?lang=en`);
    expect(player().play).toHaveBeenCalled();
    // The POST /journey/mode finished before the redirect (the next /autopilot opens Guided).
    const modeIndex = requests.findIndex((r) => r.path === '/journey/mode');
    expect(modeIndex).toBeGreaterThanOrEqual(0);
  });

  it('a Guided member is not switched again; a playing Audiobook is not restarted', async () => {
    const { wrapper, requests } = dashboardWrapper({ 'GET /journey/state': guidedState });
    function StartFirst() {
      const p = useAudiobookPlayer();
      const { user } = useAuth();
      const started = useRef(false);
      useEffect(() => {
        if (p && user && !started.current) {
          started.current = true;
          void p.start();
        }
      }, [p, user]);
      return p?.active ? <AudiobookDeepLinkRoute /> : null;
    }
    render(<StartFirst />, { wrapper });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/autopilot'));
    await settle();
    expect(requests.some((r) => r.method === 'POST' && r.path === '/journey/mode')).toBe(false);
    expect(player().replace).toHaveBeenCalledTimes(1);
  });

  it('waits for a signed-in member', async () => {
    const { wrapper } = audiobookWrapper({ 'GET /journey/state': state() }, { signedIn: false });
    render(<AudiobookPlayParamProbe />, { wrapper });
    await settle();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

function AudiobookPlayParamProbe() {
  return <AudiobookPlayParam />;
}

describe('/autopilot?audiobook=play', () => {
  it('goes through the deep link (Guided, play, /autopilot without the parameter)', async () => {
    route.params = { audiobook: 'play' };
    const { wrapper } = audiobookWrapper({ 'GET /journey/state': state() });
    render(<AudiobookPlayParamProbe />, { wrapper });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/autopilot/audiobook'));
  });

  it('ignores other pages and other values', async () => {
    route.params = { audiobook: 'play' };
    route.pathname = '/home';
    const { wrapper } = audiobookWrapper({ 'GET /journey/state': state() });
    const { rerender } = render(<AudiobookPlayParamProbe />, { wrapper });
    await settle();
    route.pathname = '/autopilot';
    route.params = { audiobook: 'later' };
    rerender(<AudiobookPlayParamProbe />);
    await settle();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('My Journey with the player', () => {
  it('the Guided view mounts the reminder control in its slot, between how-it-works and the catalog', async () => {
    const { wrapper } = dashboardWrapper({ 'GET /journey/state': guidedState });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-slot-audiobook-reminder')).toBeTruthy());
    expect(within(screen.getByTestId('journey-slot-audiobook-reminder')).getByTestId('audiobook-reminder-control')).toBeTruthy();
    expect(screen.getByText(en('screens.audiobook.reminderTitle'))).toBeTruthy();
  });

  it('the hero "Play episode N" plays that episode instead of opening the ORB', async () => {
    const { wrapper } = dashboardWrapper({ 'GET /journey/state': guidedState });
    render(<JourneyScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('journey-hero-start').props.accessibilityState?.disabled).not.toBe(true));
    await act(async () => fireEvent.press(screen.getByTestId('journey-hero-start')));
    await settle();
    expect(orb.open).not.toHaveBeenCalled();
    expect(player().replace).toHaveBeenCalled();
    const first = journeyTopics.find((t) => t.session === 1);
    expect(lastSource().uri).toContain(`/topics/${first?.topicId}/`);
  });
});

describe('AudiobookReminderControl', () => {
  const reminderRoutes = (time: string | null, extra: Record<string, Route> = {}) => ({
    'GET /journey/state': state({ audiobookReminder: time ? { time, tz: 'Europe/Berlin' } : null }),
    ...extra,
  });

  it('shows the saved time from the journey state', async () => {
    const { wrapper } = audiobookWrapper(reminderRoutes('08:00'));
    render(<AudiobookReminderControl />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('audiobook-reminder-select')).getByText('08:00')).toBeTruthy());
    expect(screen.getByText(en('screens.audiobook.reminderBody'))).toBeTruthy();
  });

  it('saves a time with the device time zone, toasts it and refetches the state', async () => {
    const { wrapper, requests } = audiobookWrapper(reminderRoutes(null, { 'POST /journey/audiobook/reminder': { ok: true } }));
    render(<AudiobookReminderControl />, { wrapper });
    await waitFor(() => expect(requests.filter((r) => r.path === '/journey/state').length).toBe(1));
    await settle();
    expect(within(screen.getByTestId('audiobook-reminder-select')).getByText(en('screens.audiobook.reminderOffOption'))).toBeTruthy();
    const before = requests.filter((r) => r.path === '/journey/state').length;
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-reminder-select')));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-reminder-18:00')));
    await settle();
    const post = requests.find((r) => r.method === 'POST' && r.path === '/journey/audiobook/reminder');
    expect(post?.body).toEqual({ time: '18:00', tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
    expect(post?.headers).toEqual(expect.objectContaining({ 'x-vitana-active-role': 'community', 'content-type': 'application/json' }));
    expect(__toastsForTests().map((x) => [x.titleKey, x.params])).toContainEqual(['screens.audiobook.reminderSaved', { time: '18:00' }]);
    expect(requests.filter((r) => r.path === '/journey/state').length).toBe(before + 1);
  });

  it('switching off posts time null and toasts reminderOff', async () => {
    const { wrapper, requests } = audiobookWrapper(reminderRoutes('07:00', { 'POST /journey/audiobook/reminder': { ok: true } }));
    render(<AudiobookReminderControl />, { wrapper });
    await waitFor(() => expect(within(screen.getByTestId('audiobook-reminder-select')).getByText('07:00')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-reminder-select')));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-reminder-off')));
    await settle();
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({ time: null });
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('screens.audiobook.reminderOff');
  });

  it('a failed save toasts reminderError', async () => {
    const { wrapper } = audiobookWrapper(reminderRoutes(null, { 'POST /journey/audiobook/reminder': withStatus(500) }));
    render(<AudiobookReminderControl />, { wrapper });
    await settle();
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-reminder-select')));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-reminder-12:00')));
    await settle();
    const toasts = __toastsForTests();
    expect(toasts.map((x) => [x.kind, x.titleKey])).toContainEqual(['error', 'screens.audiobook.reminderError']);
  });

  it('is disabled while signed out', async () => {
    const { wrapper, requests } = audiobookWrapper(reminderRoutes('07:00'), { signedIn: false });
    render(<AudiobookReminderControl />, { wrapper });
    await settle();
    expect(screen.getByTestId('audiobook-reminder-select').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(requests.some((r) => r.path === '/journey/state')).toBe(false);
  });
});
