/**
 * VTID-05429 (Native Wave 2, profile lane) — module mocks for the profile
 * screen tests. Imported BEFORE the code under test so jest hoists the
 * jest.mock calls. The photo picker is faked; expo-router is stubbed (no native router in jsdom) with
 * controllable search params; safe-area insets are zero; storage is the
 * in-memory mock. `mock`-prefixed names are the ones a jest factory may use.
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

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockRouter = {
  navigate: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  setParams: jest.fn(),
  canGoBack: jest.fn(() => true),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  usePathname: () => '/me/profile',
  useGlobalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

/** The photo library is faked (no device): each test sets the next pick result. */
const mockPicker = {
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async (_opts?: unknown): Promise<unknown> => ({ canceled: true, assets: [] })),
};
jest.mock('expo-image-picker', () => mockPicker);

/** The faked `expo-image-picker`. */
export const picker = mockPicker;

/** The stubbed expo-router `router`, for asserting navigation. */
export const router = mockRouter;
/** Set the route's search params for the next render. */
export const routeParams = mockParams;

export {};
