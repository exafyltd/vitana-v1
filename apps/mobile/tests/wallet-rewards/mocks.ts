/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — module mocks for the
 * rewards screen tests. Imported BEFORE the code under test so jest hoists the
 * `jest.mock` calls. Same stubs as tests/home/mocks.ts: expo-router (the
 * `router` + `useLocalSearchParams` the screen reads for the `tab` /
 * `shipping` params), react-native-safe-area-context (zero insets) and the
 * secure-store / async-storage the auth + language providers touch.
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
  usePathname: () => '/wallet/rewards',
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
