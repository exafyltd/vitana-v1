/**
 * VTID-05685 (native-parity-test-gaps) — module mocks for the parity-gap route tests.
 * Imported BEFORE the code under test so jest hoists the jest.mock calls.
 *
 * Unlike tests/community/mocks.ts (whose expo-router stub has `Redirect: () => null` and
 * `useLocalSearchParams: () => ({})`), this stub lets a test read what a route file asked
 * for: `redirectCalls` records every `<Redirect href>` and `routeParams` is the object
 * `useLocalSearchParams` returns. The async-storage, secure-store and safe-area stubs are
 * copies of the community ones, not imports.
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

const mockRedirectCalls: Array<{ href: unknown }> = [];
const mockRouteParams: Record<string, string | undefined> = {};
const mockRouter = {
  navigate: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockRouteParams,
  usePathname: () => '/comm/my-groups/g-1',
  useGlobalSearchParams: () => mockRouteParams,
  Redirect: (props: { href: unknown }) => {
    mockRedirectCalls.push({ href: props.href });
    return null;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

/** Every `href` a rendered `<Redirect>` received, in order. */
export const redirectCalls = mockRedirectCalls;
/** The object `useLocalSearchParams()` returns; mutate it before rendering a route. */
export const routeParams = mockRouteParams;
export const router = mockRouter;

export {};
