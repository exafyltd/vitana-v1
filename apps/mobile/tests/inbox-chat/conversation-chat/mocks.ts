/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — module
 * mocks for the chat / call tests, imported before the code under test so
 * jest hoists them: storage, expo-router (no native router), zero safe-area
 * insets, stub expo-image-picker / expo-audio modules (the tests register a
 * fake chat device instead, see fakeDevice in helpers.tsx), stub
 * expo-clipboard / expo-video / expo-document-picker / the date-time picker,
 * and the ORB
 * activation port. The `mock`-prefixed names are the ones jest lets a
 * factory use.
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
    throw new Error('tests use the fake chat device');
  }),
}));
jest.mock(
  'react-native-webrtc',
  () => {
    throw new Error('tests never load react-native-webrtc');
  },
  { virtual: true },
);

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true), setImageAsync: jest.fn(async () => undefined) }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })) }));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({}), VideoView: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null, DateTimePickerAndroid: { open: jest.fn() } }));

const mockActivateOrb = jest.fn(() => true);
jest.mock('../../../src/ports/orb-activate', () => ({ useActivateOrb: () => mockActivateOrb }));

export const router = mockRouter;
export const activateOrb = mockActivateOrb;
export const routeParams = mockParams;

// The chat screens pull in the device, video and picker modules: the first
// render of a suite on a busy CI runner can take longer than jest's 5 s.
jest.setTimeout(20_000);
