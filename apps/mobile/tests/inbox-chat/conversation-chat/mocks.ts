/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — module
 * mocks for the chat / call tests, imported before the code under test so
 * jest hoists them: storage, expo-router (no native router), zero safe-area
 * insets. The `mock`-prefixed names are the ones jest lets a factory use.
 */
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
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
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  usePathname: () => '/inbox',
  useGlobalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

export const router = mockRouter;
export const routeParams = mockParams;
