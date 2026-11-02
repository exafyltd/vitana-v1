/**
 * VTID-05431 (Native Wave 2, settings lane) — module mocks for the settings
 * tests, imported BEFORE the code under test so jest hoists the `jest.mock`
 * calls (same pattern as tests/home/mocks.ts): expo-router (the `router`,
 * the live search params and `<Redirect>`), zero safe-area insets. The
 * `mock`-prefixed names are the ones jest lets a factory reference.
 */
import '../helpers/mocks';

/** The live search params the screens read; a test sets `mockParams.current` before render. */
export const mockParams: { current: Record<string, string | undefined> } = { current: {} };
/** Every `<Redirect href>` rendered. */
export const mockRedirects: string[] = [];

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
  usePathname: () => '/settings',
  useGlobalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => {
    mockRedirects.push(href);
    return null;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

// expo-linking needs the native manifest to build an app link; the app scheme is a placeholder here.
jest.mock('expo-linking', () => ({ createURL: (path: string) => `vitana-dev://${path}` }));

export const router = mockRouter;
