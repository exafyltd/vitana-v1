/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — module mocks for the
 * Talk-to-Vitana tests. Imported BEFORE the code under test so jest hoists the
 * `jest.mock` calls: expo-router (the `router`, the live search params a test
 * sets in `mockParams.current`), zero safe-area insets, and the secure-store /
 * async-storage the auth + language providers and the feature-card hide touch.
 * Follows tests/support/mocks.ts.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'x',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

/** The live search params the screen reads; a test sets `mockParams.current` before render. */
export const mockParams: { current: Record<string, string | undefined> } = { current: {} };

const mockRouter = {
  navigate: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  usePathname: () => '/comm/talk-to-vitana',
  useGlobalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

export const router = mockRouter;

export {};
