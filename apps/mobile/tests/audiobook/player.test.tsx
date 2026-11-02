/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — the
 * native Audiobook player and mini player (twins of
 * src/context/AudiobookPlayerProvider.tsx and
 * src/components/audiobook/AudiobookMiniPlayer.tsx): episodes loaded / empty
 * / error, the stream request (URL, Bearer, active role), play / pause /
 * previous (seek) / next, speed, sleep timer, end of topic and episode (the
 * listen record, the end-of-episode card, "Try it now"), Ask Vitana, close,
 * the lock screen, resume and sign-out. Fake gateway + fake expo-audio
 * player; every built request asserted; no network.
 */
import '../helpers/no-network';
import { audio, orb, router } from './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text as RNText } from 'react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __setAudiobookOriginForTests } from '../../src/ports/audiobook';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { translate } from '../../src/i18n';
import { AudiobookMiniPlayer } from '../../src/screens/audiobook/AudiobookMiniPlayer';
import { POSITION_PREFIX, RATE_KEY, useAudiobookPlayer } from '../../src/screens/audiobook/AudiobookPlayerProvider';
import { AUDIOBOOK_EVENT } from '../../src/screens/audiobook/events';
import { ORIGIN, TOKEN, audiobookWrapper, baseRoutes, flush, state, withStatus, type Route } from './helpers';

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
  overlayBus.clear();
  await AsyncStorage.clear();
});

const settle = async () => {
  await act(async () => {
    await flush();
    await flush();
  });
};

/** A "Play" button (the hero's "Play episode N") plus the mini player. */
function Harness({ opts }: { opts?: { topicId?: string; episode?: number } }) {
  const player = useAudiobookPlayer();
  return (
    <>
      <Pressable testID="start" onPress={() => void player?.start(opts)}>
        <RNText>start</RNText>
      </Pressable>
      <AudiobookMiniPlayer />
    </>
  );
}

async function startPlayer(routes: Record<string, Route> = baseRoutes(), opts?: { topicId?: string; episode?: number }, language?: string) {
  const ctx = audiobookWrapper(routes, { language });
  render(<Harness opts={opts} />, { wrapper: ctx.wrapper });
  await settle();
  await act(async () => fireEvent.press(screen.getByTestId('start')));
  await settle();
  return ctx;
}

const player = () => audio.player as unknown as Record<string, jest.Mock>;
const lastSource = () => player().replace.mock.calls.at(-1)?.[0] as { uri: string; headers: Record<string, string> };

describe('Audiobook player — episodes loaded', () => {
  it('loads the curriculum and journey state, then streams the first topic with the member token and the community role', async () => {
    const { requests } = await startPlayer();
    const gets = requests.filter((r) => r.method === 'GET').map((r) => `${r.path}?${r.query.toString()}`);
    expect(gets).toEqual(expect.arrayContaining(['/journey-checklist?locale=en', '/journey/state?']));
    expect(lastSource()).toEqual({
      uri: `${ORIGIN}/api/v1/journey/audiobook/topics/T001/audio?lang=en`,
      headers: { 'x-vitana-active-role': 'community', authorization: `Bearer ${TOKEN}` },
    });
    expect(player().play).toHaveBeenCalled();
    expect(audio.setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true, interruptionMode: 'doNotMix' });
    // The mini player: episode eyebrow, title, the loading spinner until the player reports "loaded".
    expect(screen.getByTestId('audiobook-mini-player')).toBeTruthy();
    expect(screen.getByText(en('screens.audiobook.episodeN', { n: 1 }))).toBeTruthy();
    expect(screen.getByTestId('audiobook-track-title').props.children).toBe('Meet Vitana');
    expect(screen.getByTestId('audiobook-loading')).toBeTruthy();
    await act(async () => audio.emit({ playing: true, currentTime: 1, duration: 100 }));
    expect(screen.queryByTestId('audiobook-loading')).toBeNull();
    expect(screen.getByTestId('audiobook-play-pause').props.accessibilityLabel).toBe(en('screens.audiobook.pause'));
    expect(screen.getByTestId('audiobook-progress').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 1 });
    // The next topic is fetched ahead (web prefetchNext).
    expect(audio.preload).toHaveBeenCalledWith({ uri: `${ORIGIN}/api/v1/journey/audiobook/topics/T002/audio?lang=en`, headers: expect.objectContaining({ authorization: `Bearer ${TOKEN}` }) });
  });

  it('starts at the first unheard episode, in the member language, and on the lock screen', async () => {
    await startPlayer(baseRoutes({ 'GET /journey/state': state({ completedSessionNumbers: [1] }) }), undefined, 'de-DE');
    expect(lastSource().uri).toBe(`${ORIGIN}/api/v1/journey/audiobook/topics/T003/audio?lang=de`);
    expect(player().setActiveForLockScreen).toHaveBeenLastCalledWith(
      true,
      { title: 'The Vitana Index', artist: 'Vitana', albumTitle: translate('de', 'screens.audiobook.albumTitle', { n: 2 }) },
      { showSeekBackward: true, showSeekForward: true },
    );
  });

  it('starts a requested episode (the hero "Play episode N") and resumes the saved position of that topic', async () => {
    await AsyncStorage.setItem(`${POSITION_PREFIX}.u-1`, JSON.stringify({ topicId: 'T003', time: 42 }));
    await startPlayer(baseRoutes(), { episode: 2 });
    expect(lastSource().uri).toContain('/topics/T003/');
    expect(player().seekTo).toHaveBeenCalledWith(42);
  });

  it('emits the web listening events on the bus', async () => {
    const seen: string[] = [];
    overlayBus.on(AUDIOBOOK_EVENT, (d) => seen.push((d as { name: string }).name));
    await startPlayer();
    expect(seen).toEqual(['play_started', 'track_started']);
  });
});

describe('Audiobook player — empty and error', () => {
  it('no published episodes → the empty line, no Retry', async () => {
    await startPlayer(baseRoutes({ 'GET /journey-checklist': { ok: true, topics: [] } }));
    expect(screen.getByText(en('screens.audiobook.empty'))).toBeTruthy();
    expect(screen.queryByTestId('audiobook-retry')).toBeNull();
    expect(player().replace).not.toHaveBeenCalled();
  });

  it('the curriculum fails → the network line; Retry asks again and plays', async () => {
    let fail = true;
    const { requests } = await startPlayer(baseRoutes({ 'GET /journey-checklist': () => (fail ? withStatus(500) : { ok: true, topics: [] }) }));
    expect(screen.getByText(en('screens.audiobook.network'))).toBeTruthy();
    fail = false;
    const before = requests.filter((r) => r.path === '/journey-checklist').length;
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-retry')));
    await settle();
    expect(requests.filter((r) => r.path === '/journey-checklist').length).toBe(before + 1);
    expect(screen.getByText(en('screens.audiobook.empty'))).toBeTruthy();
  });

  it('the stream fails and the gateway answers 422 → "not in your language yet" + Ask Vitana opens the ORB', async () => {
    const { requests } = await startPlayer(baseRoutes({ 'GET /journey/audiobook/topics/T001/audio': withStatus(422) }));
    await act(async () => audio.emit({ isLoaded: false, error: 'HTTP 422' }));
    await settle();
    const probe = requests.find((r) => r.path === '/journey/audiobook/topics/T001/audio');
    expect(probe?.query.get('lang')).toBe('en');
    expect(probe?.headers).toEqual(expect.objectContaining({ 'x-vitana-active-role': 'community', authorization: `Bearer ${TOKEN}` }));
    expect(screen.getByText(en('screens.audiobook.unavailable'))).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-error-ask-vitana')));
    expect(player().pause).toHaveBeenCalled();
    expect(orb.open).toHaveBeenCalled();
  });

  it('the stream fails and the gateway answers 500 → the network line and Retry replays the topic', async () => {
    await startPlayer(baseRoutes({ 'GET /journey/audiobook/topics/T001/audio': withStatus(500) }));
    await act(async () => audio.emit({ isLoaded: false, error: 'HTTP 500' }));
    await settle();
    expect(screen.getByText(en('screens.audiobook.network'))).toBeTruthy();
    const calls = player().replace.mock.calls.length;
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-retry')));
    await settle();
    expect(player().replace.mock.calls.length).toBe(calls + 1);
    expect(lastSource().uri).toContain('/topics/T001/');
  });
});

describe('Audiobook player — controls', () => {
  it('play / pause toggles the audio element', async () => {
    await startPlayer();
    await act(async () => audio.emit({ playing: true, currentTime: 5, duration: 100 }));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-play-pause')));
    expect(player().pause).toHaveBeenCalled();
    await act(async () => audio.emit({ playing: false, currentTime: 5, duration: 100 }));
    expect(screen.getByTestId('audiobook-play-pause').props.accessibilityLabel).toBe(en('screens.audiobook.play'));
    const plays = player().play.mock.calls.length;
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-play-pause')));
    expect(player().play.mock.calls.length).toBe(plays + 1);
  });

  it('previous restarts the topic after 3 s (seek to 0), otherwise steps back; next plays the next topic', async () => {
    await startPlayer();
    await act(async () => audio.emit({ playing: true, currentTime: 2, duration: 100 }));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-next')));
    await settle();
    expect(lastSource().uri).toContain('/topics/T002/');
    await act(async () => audio.emit({ playing: true, currentTime: 30, duration: 100 }));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-previous')));
    expect(player().seekTo).toHaveBeenLastCalledWith(0);
    await act(async () => audio.emit({ playing: true, currentTime: 1, duration: 100 }));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-previous')));
    await settle();
    expect(lastSource().uri).toContain('/topics/T001/');
  });

  it('speed cycles 1 → 1.25 → 1.5 → 1 on the player and is stored per device', async () => {
    await startPlayer();
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-speed')));
    expect(player().setPlaybackRate).toHaveBeenLastCalledWith(1.25);
    expect(screen.getByTestId('audiobook-speed').props.accessibilityLabel).toBe(en('screens.audiobook.speed', { rate: 1.25 }));
    expect(screen.getByText('1.25×')).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem(RATE_KEY)).toBe('1.25'));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-speed')));
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-speed')));
    expect(player().setPlaybackRate).toHaveBeenLastCalledWith(1);
  });

  it('the sleep timer cycles off → 15 → 30 min and pauses when it runs out', async () => {
    await startPlayer();
    jest.useFakeTimers();
    try {
      await act(async () => fireEvent.press(screen.getByTestId('audiobook-sleep')));
      expect(screen.getByTestId('audiobook-sleep').props.accessibilityLabel).toBe(en('screens.audiobook.sleepOn', { min: 15 }));
      expect(screen.getByText('15′')).toBeTruthy();
      await act(async () => fireEvent.press(screen.getByTestId('audiobook-sleep')));
      expect(screen.getByTestId('audiobook-sleep').props.accessibilityLabel).toBe(en('screens.audiobook.sleepOn', { min: 30 }));
      const pauses = player().pause.mock.calls.length;
      await act(async () => {
        jest.advanceTimersByTime(30 * 60 * 1000);
      });
      expect(player().pause.mock.calls.length).toBe(pauses + 1);
      expect(screen.getByTestId('audiobook-sleep').props.accessibilityLabel).toBe(en('screens.audiobook.sleepOff'));
    } finally {
      jest.useRealTimers();
    }
  });

  it('Ask Vitana pauses and opens the ORB; close hides the mini player and clears the lock screen', async () => {
    await startPlayer();
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-ask-vitana')));
    expect(player().pause).toHaveBeenCalled();
    expect(orb.open).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-close')));
    expect(screen.queryByTestId('audiobook-mini-player')).toBeNull();
    expect(player().clearLockScreenControls).toHaveBeenCalled();
  });
});

describe('Audiobook player — end of topic and episode', () => {
  it('records the listened topic, plays on, and shows the end-of-episode card after the last topic of an episode', async () => {
    const { requests } = await startPlayer();
    await act(async () => audio.emit({ playing: true, currentTime: 99, duration: 100 }));
    await act(async () => audio.emit({ playing: false, currentTime: 100, duration: 100, didJustFinish: true }));
    await settle();
    expect(lastSource().uri).toContain('/topics/T002/');
    expect(screen.queryByTestId('audiobook-episode-summary')).toBeNull();
    await act(async () => audio.emit({ playing: true, currentTime: 1, duration: 50 }));
    await act(async () => audio.emit({ playing: false, currentTime: 50, duration: 50, didJustFinish: true }));
    await settle();
    const listened = requests.filter((r) => r.method === 'POST' && r.path === '/journey/session-listened').map((r) => ({ session: r.body.session, topicId: r.body.topicId }));
    expect(listened).toEqual([
      { session: 1, topicId: 'T001' },
      { session: 1, topicId: 'T002' },
    ]);
    expect(requests.find((r) => r.path === '/journey/session-listened')?.body.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByTestId('audiobook-episode-summary')).toBeTruthy();
    expect(screen.getByText(en('screens.audiobook.episodeDone', { n: 1 }))).toBeTruthy();
    expect(screen.getByText(en('screens.audiobook.episodeDoneReward'))).toBeTruthy();
    expect(lastSource().uri).toContain('/topics/T003/');
    // "Try it now" for T002 (practice target `memory`) opens /memory and dismisses the card.
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-try-it-now')));
    expect(router.navigate).toHaveBeenCalledWith('/memory');
    expect(screen.queryByTestId('audiobook-episode-summary')).toBeNull();
  });

  it('after the last topic of the Audiobook it says so and disables play', async () => {
    await startPlayer(baseRoutes(), { topicId: 'T003' });
    await act(async () => audio.emit({ playing: false, currentTime: 10, duration: 10, didJustFinish: true }));
    await settle();
    expect(screen.getByTestId('audiobook-track-title').props.children).toBe(en('screens.audiobook.finished'));
    expect(screen.getByTestId('audiobook-play-pause').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });
});

describe('Audiobook player — sign out', () => {
  it('signing out stops playback and hides the mini player', async () => {
    let session: unknown = null;
    const listeners: Array<(e: string, s: unknown) => void> = [];
    const client = {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: { access_token: TOKEN, refresh_token: 'r', user: { id: 'u-1', app_metadata: {}, user_metadata: {} } } }, error: null })),
        onAuthStateChange: jest.fn((cb: (e: string, s: unknown) => void) => {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: () => undefined } } };
        }),
        startAutoRefresh: jest.fn(),
        stopAutoRefresh: jest.fn(),
        signOut: jest.fn(async () => ({ error: null })),
      },
    };
    const ctx = audiobookWrapper(baseRoutes(), { client });
    render(<Harness />, { wrapper: ctx.wrapper });
    await settle();
    await act(async () => fireEvent.press(screen.getByTestId('start')));
    await settle();
    expect(screen.getByTestId('audiobook-mini-player')).toBeTruthy();
    await act(async () => listeners.forEach((l) => l('SIGNED_OUT', session)));
    await settle();
    expect(screen.queryByTestId('audiobook-mini-player')).toBeNull();
    expect(player().pause).toHaveBeenCalled();
    session = undefined;
  });
});
