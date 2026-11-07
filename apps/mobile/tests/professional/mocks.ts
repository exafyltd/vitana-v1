/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — module mocks for
 * the professional tests, imported BEFORE the code under test so jest hoists
 * the `jest.mock` calls (same pattern as tests/settings/mocks.ts): expo-router
 * (the `router` and a settable pathname for the shell's bottom bar), zero
 * safe-area insets. The `mock`-prefixed names are the ones jest lets a factory
 * reference.
 */
import '../helpers/mocks';

/** The pathname `usePathname()` returns; a test sets `mockPath.current` before render. */
export const mockPath: { current: string } = { current: '/professional/dashboard' };

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
  usePathname: () => mockPath.current,
  useGlobalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

export const router = mockRouter;
