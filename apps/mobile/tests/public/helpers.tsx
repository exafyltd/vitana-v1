/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — test
 * harness for the public screens: module mocks (imported BEFORE the code under
 * test; jest hoists jest.mock), a signed-out / signed-in provider wrapper over
 * the Supabase double, and a fake insert client for /apply. No network: the
 * test files import `../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import '../helpers/mocks';
import type { ReactTestInstance } from 'react-test-renderer';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { configure } from '@testing-library/react-native';

// Screens load async (kit, catalogs, queries); give findBy/waitFor room on a loaded runner.
configure({ asyncUtilTimeout: 5000 });

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: mockRouter,
    useLocalSearchParams: () => mockParams.current,
    useGlobalSearchParams: () => mockParams.current,
    usePathname: () => '/',
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

export const router = mockRouter;
export const searchParams = mockParams;

export function resetMocks(params: Record<string, string> = {}) {
  mockParams.current = params;
  Object.values(mockRouter).forEach((f) => f.mockClear());
  mockRouter.canGoBack.mockImplementation(() => true);
}

/** Provider wrapper: signed out unless `signedIn`; the member's web language value (e.g. `de-DE`). */
export function publicWrapper({ language = 'de-DE', signedIn = false }: { language?: string; signedIn?: boolean } = {}) {
  const d = createSupabaseDouble(signedIn ? { session: fakeSession('u-1') } : {});
  return { wrapper: makeWrapper({ client: d.client, language }), client: d.client };
}

/** A Supabase double whose `from('test_user_applications').insert()` answers with `error` and records the rows. */
export function insertClient(base: any, error: { code?: string } | null = null) {
  const inserts: Array<{ table: string; rows: any }> = [];
  base.from = jest.fn((table: string) => ({
    insert: async (rows: any) => {
      inserts.push({ table, rows });
      return { error };
    },
  }));
  return inserts;
}

/** A dotted catalog key that t() returned unresolved. */
export const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

export function allStrings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    for (const k of ['accessibilityLabel', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}
