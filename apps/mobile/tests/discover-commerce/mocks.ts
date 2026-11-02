/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — module mocks for
 * the Discover screen tests, imported BEFORE the code under test (jest hoists
 * the jest.mock calls). expo-router's router and params, the safe area,
 * expo-video (a recording fake player per source), expo-web-browser and the
 * React Native share sheet / Linking are stubbed; the `mock`-prefixed names
 * are the ones a jest factory may reference. No network anywhere.
 */
import '../helpers/mocks';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() };
const mockParams: { current: Record<string, string | undefined> } = { current: {} };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => '/discover',
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

export type FakePlayer = { source: string; loop: boolean; muted: boolean; play: jest.Mock; pause: jest.Mock };
const mockPlayers: FakePlayer[] = [];

jest.mock('expo-video', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: (source: string, setup?: (p: FakePlayer) => void) => {
      const ref = React.useRef(null);
      if (!ref.current) {
        const p: FakePlayer = { source, loop: false, muted: false, play: jest.fn(), pause: jest.fn() };
        setup?.(p);
        mockPlayers.push(p);
        ref.current = p;
      }
      return ref.current;
    },
    VideoView: (props: { testID?: string }) => React.createElement(View, { testID: props.testID }),
  };
});

const mockOpenBrowser = jest.fn(async () => ({ type: 'opened' }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(), openBrowserAsync: mockOpenBrowser }));

export const router = mockRouter;
export const searchParams = mockParams;
export const players = mockPlayers;
export const openBrowser = mockOpenBrowser;
