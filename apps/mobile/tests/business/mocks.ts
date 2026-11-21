/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — module mocks for the
 * business-lane tests, imported BEFORE the code under test so jest hoists the
 * `jest.mock` calls (same pattern as tests/settings/mocks.ts): expo-router
 * (the router, the live search params and pathname, `<Redirect>`,
 * `useFocusEffect` as a mount effect), zero safe-area insets, the device
 * modules the screens reach through src/ports/business-ui.tsx
 * (expo-web-browser, expo-image-picker, expo-file-system) and the
 * native sign-in SDKs (as in tests/helpers/mocks.ts). The `mock`-prefixed names
 * are the ones jest lets a factory reference.
 */
// The shared shell mocks (tests/helpers/mocks.ts), repeated here rather than
// imported: jest hoists this file's own `jest.mock` calls above its imports,
// so an imported factory for the same module would replace expo-web-browser's below.
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({ AFTER_FIRST_UNLOCK: 'x', getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({ AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 }, signInAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: jest.fn(() => 'uuid-1'), digestStringAsync: jest.fn(async () => 'h') }));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn() },
  isSuccessResponse: () => false,
}));

/** The live search params / pathname the screens read; a test sets them before render. */
export const mockParams: { current: Record<string, string | undefined> } = { current: {} };
export const mockPath: { current: string } = { current: '/commerce' };
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

jest.mock('expo-router', () => {
  const react = jest.requireActual('react');
  return {
    router: mockRouter,
    useLocalSearchParams: () => mockParams.current,
    useGlobalSearchParams: () => mockParams.current,
    usePathname: () => mockPath.current,
    useFocusEffect: (cb: () => void) => react.useEffect(() => cb(), [cb]),
    Redirect: ({ href }: { href: string }) => {
      mockRedirects.push(href);
      return null;
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

jest.mock('expo-linking', () => ({ createURL: (path: string) => `vitana-dev://${path}` }));

// A test build's endpoints (fake hosts, never a real one): the gateway origin
// the MCP address is built from, the auth link base, the web origin of invite links.
jest.mock('../../src/ports/env', () => {
  const actual = jest.requireActual('../../src/ports/env');
  return {
    ...actual,
    config: {
      ...actual.config,
      gatewayUrl: 'https://gateway.test',
      supabaseUrl: 'https://supabase.test',
      supabasePublishableKey: 'sb_publishable_test',
      authRedirectUrl: 'https://app.test',
      webBaseUrl: 'https://web.test',
    },
  };
});

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })), openAuthSessionAsync: jest.fn() }));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

/** The document the next `File.pickFileAsync` returns (null = cancelled). */
export const mockPickedFile: { current: { name: string; size: number; text: string } | null } = { current: null };
jest.mock('expo-file-system', () => {
  class File {
    name: string;
    size: number;
    uri: string;
    exists = false;
    private body: string;
    constructor(...parts: unknown[]) {
      this.name = String(parts[parts.length - 1]);
      this.size = 0;
      this.uri = `file:///cache/${this.name}`;
      this.body = '';
    }
    static async pickFileAsync() {
      const f = mockPickedFile.current;
      if (!f) return { canceled: true, result: null };
      const file = new File(f.name);
      file.size = f.size;
      file.body = f.text;
      return { canceled: false, result: file };
    }
    create() {
      this.exists = true;
    }
    delete() {
      this.exists = false;
    }
    write(text: string) {
      this.body = text;
    }
    async text() {
      return this.body;
    }
  }
  return { File, Paths: { cache: { uri: 'file:///cache/' } } };
});

export const router = mockRouter;
