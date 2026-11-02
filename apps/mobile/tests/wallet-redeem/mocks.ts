/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — module mocks for the
 * redeem tests, imported BEFORE the code under test (jest hoists jest.mock).
 * expo-router's router and search params are stubbed; no device, no network.
 */
import '../helpers/mocks';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => '/redeem',
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

export const router = mockRouter;
export const searchParams = mockParams;
