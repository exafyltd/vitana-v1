/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — module mocks for the sharing tests.
 * Imported before the code under test so jest hoists the jest.mock calls. expo-router is stubbed
 * (no native router under jest): `router` records navigation, `Redirect` records its target, and
 * `params` is the route-param bag a test fills. The `mock`-prefixed names are the ones jest allows
 * a factory to reference.
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

// The device port (share sheet, clipboard, date field) imports these native modules at load.
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: false })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));
jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  useAudioRecorder: () => ({}),
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: false })),
  setAudioModeAsync: jest.fn(async () => undefined),
  createAudioPlayer: jest.fn(() => {
    throw new Error('tests use the fake device');
  }),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true), setImageAsync: jest.fn(async () => undefined) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })) }));
jest.mock('expo-contacts/legacy', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  getContactsAsync: jest.fn(async () => ({ data: [] })),
  Fields: {},
}));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({}), VideoView: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null, DateTimePickerAndroid: { open: jest.fn() } }));

const mockRouter = {
  navigate: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
const mockParams: { current: Record<string, string> } = { current: {} };
const mockRedirects: string[] = [];
let mockPathname = '/sharing';

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => mockPathname,
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

/** The stubbed expo-router `router`, for asserting navigation. */
export const router = mockRouter;
/** Route params the next render reads (`useLocalSearchParams`). */
export const params = mockParams;
/** Every `<Redirect href>` rendered so far. */
export const redirects = mockRedirects;
export function setPathname(next: string): void {
  mockPathname = next;
}

export {};
