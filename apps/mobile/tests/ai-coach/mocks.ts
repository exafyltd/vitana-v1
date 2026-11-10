/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — module mocks for the AI
 * coach tests, imported BEFORE the code under test so jest hoists the
 * `jest.mock` calls (same pattern as tests/settings/mocks.ts): expo-router
 * (the `router` the screens navigate with), zero safe-area insets.
 */
import '../helpers/mocks';

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
  useLocalSearchParams: () => ({}),
  usePathname: () => '/ai',
  useGlobalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

jest.mock('expo-linking', () => ({ createURL: (path: string) => `vitana-dev://${path}` }));

export const router = mockRouter;
