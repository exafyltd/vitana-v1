/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — module mocks for the
 * `/assistant` tests, imported BEFORE the code under test so jest hoists the
 * `jest.mock` calls (same pattern as tests/settings/mocks.ts): expo-router
 * (the `router` and the live search params), zero safe-area insets and an
 * `expo-audio` player double that records what was played and finishes at
 * once. The `mock`-prefixed names are the ones jest lets a factory reference.
 */
import '../helpers/mocks';

/** The live search params the screen reads; a test sets `mockParams.current` before render. */
export const mockParams: { current: Record<string, string | undefined> } = { current: {} };

const mockRouter = {
  navigate: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn((p: Record<string, string | undefined>) => {
    mockParams.current = { ...mockParams.current, ...p };
  }),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  usePathname: () => '/assistant',
  useGlobalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

/** Every source handed to the audio player, with the volume it was set to. */
export const mockPlayed: Array<{ uri: string; volume: number }> = [];

jest.mock('expo-audio', () => ({
  createAudioPlayer: (source: { uri: string }) => {
    let listener: ((s: { didJustFinish: boolean }) => void) | null = null;
    const player = {
      volume: 1,
      addListener: (_event: string, cb: (s: { didJustFinish: boolean }) => void) => {
        listener = cb;
        return { remove: () => undefined };
      },
      play: () => {
        mockPlayed.push({ uri: source.uri, volume: player.volume });
        setTimeout(() => listener?.({ didJustFinish: true }), 0);
      },
      remove: jest.fn(),
    };
    return player;
  },
}));

export const router = mockRouter;
