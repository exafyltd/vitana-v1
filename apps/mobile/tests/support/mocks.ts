/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — module mocks for the
 * support / connectors tests. Imported BEFORE the code under test so jest
 * hoists the `jest.mock` calls: expo-router (the `router`, the live search
 * params a test sets in `mockParams.current`, and a `Redirect` that records its
 * href), zero safe-area insets, and the secure-store / async-storage the auth +
 * language providers touch. Follows tests/home/mocks.ts.
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

/** Every `<Redirect href>` rendered. */
export const mockRedirects: unknown[] = [];

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
  usePathname: () => '/support',
  useGlobalSearchParams: () => ({}),
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

export const router = mockRouter;

export {};
