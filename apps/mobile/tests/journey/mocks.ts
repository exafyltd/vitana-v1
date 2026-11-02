/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — module mocks for
 * the My Journey tests, imported BEFORE the code under test (jest hoists the
 * jest.mock calls). expo-router's router is stubbed; the ORB provider is
 * replaced by a controller double (its real module loads the native voice
 * engine); the `mock`-prefixed names are the ones a jest factory may reference.
 */
import '../helpers/mocks';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => '/autopilot',
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

const mockOrb = { open: jest.fn(async () => undefined) };
jest.mock('../../src/orb/ui/OrbProvider', () => ({
  useOrbSession: () => ({ controller: mockOrb, state: { open: false, phase: null, muted: false, liveText: null, snapshot: null } }),
}));

export const router = mockRouter;
export const searchParams = mockParams;
export const orb = mockOrb;
