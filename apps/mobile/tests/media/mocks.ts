/**
 * VTID-05677 (native-wave2-media-hub-r2/media-hub) — module mocks for the Media
 * Hub tests, imported BEFORE the code under test (jest hoists the jest.mock
 * calls). expo-router's params and router are stubbed; expo-video and
 * expo-audio are faked players the tests can drive (no device); the pickers
 * return fixed files; `config.webBaseUrl` is switchable. No network.
 */
import '../helpers/mocks';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockRedirects: unknown[] = [];

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => '/comm/media-hub',
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirects.push(href);
    return null;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

const mockEnv: { base: string | undefined } = { base: undefined };
jest.mock('../../src/ports/env', () => {
  const actual = jest.requireActual('../../src/ports/env');
  return { ...actual, config: new Proxy(actual.config, { get: (t, k) => (k === 'webBaseUrl' ? mockEnv.base : Reflect.get(t, k)) }) };
});

type Listener = (payload: unknown) => void;
type FakeVideoPlayer = {
  source: unknown;
  loop: boolean;
  muted: boolean;
  currentTime: number;
  play: jest.Mock;
  pause: jest.Mock;
  replace: jest.Mock;
  addListener: (event: string, cb: Listener) => { remove: () => void };
  emit: (event: string, payload: unknown) => void;
};
const mockVideoPlayers: FakeVideoPlayer[] = [];
jest.mock('expo-video', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: (source: unknown, setup?: (p: FakeVideoPlayer) => void) => {
      const ref = React.useRef(null as FakeVideoPlayer | null);
      if (!ref.current) {
        const listeners: Record<string, Set<Listener>> = {};
        const player: FakeVideoPlayer = {
          source,
          loop: false,
          muted: false,
          currentTime: 0,
          play: jest.fn(),
          pause: jest.fn(),
          replace: jest.fn(),
          addListener: (event, cb) => {
            (listeners[event] ??= new Set()).add(cb);
            return { remove: () => listeners[event].delete(cb) };
          },
          emit: (event, payload) => listeners[event]?.forEach((cb) => cb(payload)),
        };
        mockVideoPlayers.push(player);
        setup?.(player);
        ref.current = player;
      }
      return ref.current;
    },
    VideoView: (props: { testID?: string }) => React.createElement(View, { testID: props.testID ?? 'video-view' }),
  };
});

type FakeAudioPlayer = { uri: string; play: jest.Mock; pause: jest.Mock; remove: jest.Mock; emit: (status: Record<string, unknown>) => void; addListener: (event: string, cb: Listener) => { remove: () => void } };
const mockAudioPlayers: FakeAudioPlayer[] = [];
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn((source: { uri: string }) => {
    const subs = new Set<Listener>();
    const player: FakeAudioPlayer = {
      uri: source.uri,
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      addListener: (_e, cb) => {
        subs.add(cb);
        return { remove: () => subs.delete(cb) };
      },
      emit: (status) => subs.forEach((cb) => cb(status)),
    };
    mockAudioPlayers.push(player);
    return player;
  }),
  setAudioModeAsync: jest.fn(async () => undefined),
}));

const mockImagePicker = {
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async (_opts?: unknown) => ({
    canceled: false,
    assets: [{ uri: 'file:///clip.mp4', fileName: 'clip.mp4', mimeType: 'video/mp4', fileSize: 1024, duration: 42000 }],
  })),
};
jest.mock('expo-image-picker', () => mockImagePicker);

const mockDocPicker = {
  getDocumentAsync: jest.fn(async (_opts?: unknown) => ({ canceled: false, assets: [{ uri: 'file:///song.mp3', name: 'song.mp3', mimeType: 'audio/mpeg', size: 2048 }] })),
};
jest.mock('expo-document-picker', () => mockDocPicker);

export const router = mockRouter;
export const searchParams = mockParams;
export const redirects = mockRedirects;
export const env = mockEnv;
export const videoPlayers = mockVideoPlayers;
export const audioPlayers = mockAudioPlayers;
export const imagePicker = mockImagePicker;
export const docPicker = mockDocPicker;
