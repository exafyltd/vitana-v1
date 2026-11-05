/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — module
 * mocks for the Audiobook tests, imported BEFORE the code under test (jest
 * hoists the jest.mock calls). `expo-audio` is a fake player that records
 * every call (source, play, pause, seek, rate, lock screen) and lets a test
 * push playback status updates; expo-router's router and route hooks are
 * stubs a test can steer; the ORB provider is a controller double.
 */
import '../helpers/mocks';

type Listener = (status: Record<string, unknown>) => void;

const mockAudio = {
  listeners: new Set<Listener>(),
  player: null as null | Record<string, jest.Mock | number | boolean>,
  created: 0,
  preload: jest.fn(async (_source: unknown) => undefined),
  clearPreloadedSource: jest.fn(async (_source: unknown) => undefined),
  setAudioModeAsync: jest.fn(async (_mode: unknown) => undefined),
  /** Pushes a playback status (defaults: loaded, not playing, no error). */
  emit(status: Record<string, unknown>) {
    const full = { playing: false, currentTime: 0, duration: 0, didJustFinish: false, isLoaded: true, error: null, ...status };
    const p = mockAudio.player;
    if (p) {
      p.playing = full.playing as boolean;
      p.currentTime = full.currentTime as number;
      p.duration = full.duration as number;
    }
    for (const l of [...mockAudio.listeners]) l(full);
  },
  reset() {
    mockAudio.listeners.clear();
    mockAudio.player = null;
    mockAudio.created = 0;
    mockAudio.preload.mockClear();
    mockAudio.clearPreloadedSource.mockClear();
    mockAudio.setAudioModeAsync.mockClear();
  },
};

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => {
    mockAudio.created += 1;
    const player: Record<string, jest.Mock | number | boolean> = {
      playing: false,
      currentTime: 0,
      duration: 0,
      replace: jest.fn(),
      play: jest.fn(() => {
        player.playing = true;
      }),
      pause: jest.fn(() => {
        player.playing = false;
      }),
      seekTo: jest.fn(async (s: number) => {
        player.currentTime = s;
      }),
      setPlaybackRate: jest.fn(),
      setActiveForLockScreen: jest.fn(),
      clearLockScreenControls: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn((_event: string, l: Listener) => {
        mockAudio.listeners.add(l);
        return { remove: () => mockAudio.listeners.delete(l) };
      }),
    };
    mockAudio.player = player;
    return player;
  }),
  preload: (s: unknown) => mockAudio.preload(s),
  clearPreloadedSource: (s: unknown) => mockAudio.clearPreloadedSource(s),
  setAudioModeAsync: (m: unknown) => mockAudio.setAudioModeAsync(m),
}));

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };
const mockRoute: { pathname: string; params: Record<string, string> } = { pathname: '/autopilot', params: {} };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockRoute.params,
  useGlobalSearchParams: () => mockRoute.params,
  usePathname: () => mockRoute.pathname,
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

const mockOrb = { open: jest.fn(async () => undefined) };
jest.mock('../../src/orb/ui/OrbProvider', () => ({
  useOrbSession: () => ({ controller: mockOrb, state: { open: false, phase: null, muted: false, liveText: null, snapshot: null } }),
}));

export const audio = mockAudio;
export const router = mockRouter;
export const route = mockRoute;
export const orb = mockOrb;
