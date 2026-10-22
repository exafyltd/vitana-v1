/**
 * VTID-05296 (N-W2 community-hub) — module mocks for the community screen
 * tests. Imported BEFORE the code under test so jest hoists the jest.mock
 * calls. expo-router's `router`/navigation hooks are stubbed (no native
 * router in jsdom); safe-area insets are zero. The `mock`-prefixed name is
 * the one jest allows a factory to reference.
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

const mockRouter = {
  navigate: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => ({}),
  usePathname: () => '/comm/groups',
  useGlobalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

/** The stubbed expo-router `router`, for asserting navigation. */
export const router = mockRouter;

export {};
