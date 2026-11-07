/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — module mocks for the
 * patient tests, imported BEFORE the code under test so jest hoists the
 * `jest.mock` calls (same pattern as tests/settings/mocks.ts): expo-router
 * (the `router` and a settable pathname for the shell's bottom bar), zero
 * safe-area insets. The `mock`-prefixed names are the ones jest lets a
 * factory reference.
 */
import '../helpers/mocks';

/** The pathname `usePathname()` returns; a test sets `mockPathname.current` before render. */
export const mockPathname: { current: string } = { current: '/patient/dashboard' };

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
  usePathname: () => mockPathname.current,
  useGlobalSearchParams: () => ({}),
  Redirect: () => null,
  Stack: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

jest.mock('expo-linking', () => ({ createURL: (path: string) => `vitana-dev://${path}` }));

export const router = mockRouter;
