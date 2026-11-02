/**
 * VTID-05430 (Native Wave 2, public-profile lane) — module mocks for the public
 * profile tests. Imported BEFORE the code under test so jest hoists the
 * `jest.mock` calls. Stubs expo-router (the `router`, the live search params
 * and `Redirect`, which records its target), the safe-area context, the
 * secure-store / async-storage the auth + language providers touch, and the two
 * shells: the screen picks `MobileAppShell` or `PublicShell` itself, so the
 * tests only need to see WHICH shell wraps it (each shell has its own tests in
 * tests/shell.test.tsx). The `mock`-prefixed names are the ones jest allows a
 * factory to reference. Follows tests/home/mocks.ts.
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

/** The live route params the screens read; a test sets `mockParams.current` before render. */
export const mockParams: { current: Record<string, string | undefined> } = { current: {} };

/** Every `<Redirect href>` rendered, in order. */
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
  usePathname: () => '/u/sample',
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

jest.mock('../../src/shell/components/MobileAppShell', () => {
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return { MobileAppShell: ({ children }: { children: unknown }) => React.createElement(View, { testID: 'mobile-app-shell' }, children) };
});
jest.mock('../../src/shell/components/PublicShell', () => {
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return { PublicShell: ({ children }: { children: unknown }) => React.createElement(View, { testID: 'public-shell' }, children) };
});

/** The stubbed expo-router `router`, for asserting navigation. */
export const router = mockRouter;

export {};
