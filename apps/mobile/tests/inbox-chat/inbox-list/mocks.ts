/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — module mocks for
 * the inbox list tests, imported BEFORE the code under test (jest hoists the
 * jest.mock calls). expo-router's router is recorded (a conversation tap
 * navigates by path), safe-area insets are zero, and React Native's
 * Clipboard is a recorder. The `mock`-prefixed names are the ones a jest
 * factory may reference.
 */
import '../../helpers/mocks';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  usePathname: () => '/inbox',
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

const mockClipboard = { setString: jest.fn(), getString: jest.fn(async () => '') };
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({ __esModule: true, default: mockClipboard }));

export const router = mockRouter;
export const clipboard = mockClipboard;
