/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — module mocks for the
 * Daily Diary tests, imported BEFORE the code under test (jest hoists the
 * jest.mock calls). The photo picker and the audio recorder are faked (no
 * device); expo-router's search params are stubbed; `readFileBase64` (a local
 * file read) returns a fixed payload. The `mock`-prefixed names are the ones
 * a jest factory may reference.
 */
import '../helpers/mocks';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => '/daily-diary',
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

const mockPicker = {
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async (_opts?: unknown) => ({
    canceled: false,
    assets: [{ uri: 'file:///p1.jpg', base64: 'QUJD', mimeType: 'image/jpeg', fileName: 'p1.jpg' }],
  })),
  launchCameraAsync: jest.fn(async (_opts?: unknown) => ({
    canceled: false,
    assets: [{ uri: 'file:///cam.jpg', base64: 'REVG', mimeType: 'image/jpeg', fileName: null }],
  })),
};
jest.mock('expo-image-picker', () => mockPicker);

const mockRecorder = {
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(),
  stop: jest.fn(async () => undefined),
  uri: 'file:///rec.m4a' as string | null,
};
const mockAudio = {
  RecordingPresets: { HIGH_QUALITY: { extension: '.m4a' } },
  useAudioRecorder: () => mockRecorder,
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => undefined),
};
jest.mock('expo-audio', () => mockAudio);

const mockReadFile = jest.fn(async (_uri: string) => 'QVVESU8=');
jest.mock('../../src/ports/diary-capture', () => ({
  ...jest.requireActual('../../src/ports/diary-capture'),
  readFileBase64: (uri: string) => mockReadFile(uri),
}));

export const router = mockRouter;
export const searchParams = mockParams;
export const picker = mockPicker;
export const recorder = mockRecorder;
export const audio = mockAudio;
export const readFile = mockReadFile;
