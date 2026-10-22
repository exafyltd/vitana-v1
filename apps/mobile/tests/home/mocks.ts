/**
 * VTID-05297 (Native Wave 2, home-feed lane) — module mocks for the Home feed
 * tests. Imported BEFORE the code under test so jest hoists the `jest.mock`
 * calls. Stubs the native modules jsdom has no twin for: expo-router (the
 * `router` + `useLocalSearchParams` HomeScreen reads to drive the tab / deep
 * links), react-native-safe-area-context (zero insets) and the secure-store /
 * async-storage the auth + language providers touch. The `mock`-prefixed name
 * is the one jest allows a factory to reference. Follows
 * tests/community/mocks.ts and the inline mocks in tests/news/news.test.tsx.
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

/** The live search params HomeScreen reads; a test sets `mockParams.current` before render. */
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
  usePathname: () => '/home',
  useGlobalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

/** The stubbed expo-router `router`, for asserting navigation / setParams. */
export const router = mockRouter;

export {};
