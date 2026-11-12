/**
 * VTID-05511 — module mocks for the marketplace-orders tests, imported BEFORE
 * the code under test (jest hoists the jest.mock calls). expo-router's router
 * and search params are stubbed; the system browser (`expo-web-browser`) is a
 * recorder (a Stripe page is never opened); the share sheet and the URL
 * opener are recorders too.
 */
import '../helpers/mocks';
import { Linking, Share } from 'react-native';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams: { current: Record<string, string> } = { current: {} };
const mockPath: { current: string } = { current: '/discover/doctors-coaches' };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => mockPath.current,
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

// '../helpers/mocks' already mocks expo-web-browser (auth sessions); the system-browser opener is added to that mock.
const mockBrowser = jest.requireMock('expo-web-browser') as { openAuthSessionAsync: jest.Mock; openBrowserAsync: jest.Mock };
mockBrowser.openBrowserAsync = jest.fn(async (_url: string) => ({ type: 'opened' }));

export const share = jest.spyOn(Share, 'share').mockImplementation(async () => ({ action: Share.sharedAction }));
export const openURL = jest.spyOn(Linking, 'openURL').mockImplementation(async () => true);

export const router = mockRouter;
export const searchParams = mockParams;
export const pathname = mockPath;
export const browser = mockBrowser;
