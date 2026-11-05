/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — module mocks for the
 * subscriptions tests. Imported BEFORE the code under test so jest hoists the
 * `jest.mock` calls. Same stubs as tests/home/mocks.ts: expo-router (the
 * `router` + `useLocalSearchParams` the redeem card reads for `?code=`),
 * react-native-safe-area-context (zero insets) and the secure-store /
 * async-storage the auth + language providers (and the launch-grant
 * dismissal) touch. expo-web-browser is a stub (tests spy on it; nothing
 * opens) and `useFocusEffect` runs its callback like a mount effect.
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

/** The live search params the screens read; a test sets `mockParams.current` before render. */
export const mockParams: { current: Record<string, string | undefined> } = { current: {} };

const mockRouter = {
  navigate: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: async () => ({ type: 'opened' }),
  openAuthSessionAsync: async () => ({ type: 'cancel' }),
}));

jest.mock('expo-router', () => ({
  router: mockRouter,
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(cb, [cb]),
  useLocalSearchParams: () => mockParams.current,
  usePathname: () => '/wallet/subscriptions',
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
