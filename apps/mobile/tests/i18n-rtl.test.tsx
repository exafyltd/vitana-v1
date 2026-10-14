/** VTID-05186 (N3, plan changes 12–13) — the shell in all 11 locales, Arabic RTL, no physical left/right. */
import './helpers/no-network';
import './helpers/mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseDouble, fakeSession } from './helpers/supabase-double';
import { makeWrapper } from './helpers/providers';
import { ShellRoot } from '../src/shell/ShellRoot';
import { MobileAppShell } from '../src/shell/components/MobileAppShell';
import { __setSupabaseForTests } from '../src/auth/client';
import { LOCALES } from '../src/i18n';
import { languageFromLocale } from '../src/i18n/I18nProvider';
import { useLanguage } from '../src/identity/LanguageProvider';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn() },
  usePathname: () => '/home',
  useGlobalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  // The N2 kit reads insets from the context (src/ui/foundation/insets.ts); null = zero insets.
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

afterAll(() => __setSupabaseForTests(null));
beforeEach(async () => {
  await AsyncStorage.clear();
});

/** A dotted catalog key that t() returned unresolved. */
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

function allStrings(root: ReactTestInstance): string[] {
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

function double(stt?: string) {
  return createSupabaseDouble({
    session: fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } }),
    tables: {
      tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }],
      profiles: [{ user_id: 'u-1', display_name: 'Ana', handle: null }],
      user_preferences: stt ? [{ user_id: 'u-1', stt_language: stt, tts_voice: null }] : [],
    },
    rpc: { get_role_preference: () => ({ data: [{ role: 'community' }], error: null }), get_my_permitted_roles: () => ({ data: { ok: true, roles: ['community', 'patient'] }, error: null }) },
  });
}

function Shell() {
  return (
    <ShellRoot>
      <MobileAppShell>
        <Text>page</Text>
      </MobileAppShell>
    </ShellRoot>
  );
}

describe.each([...LOCALES])('%s', (locale) => {
  it('renders the shell and the open drawer without a raw key', async () => {
    const language = languageFromLocale(locale);
    render(<Shell />, { wrapper: makeWrapper({ client: double(language).client, language }) });
    fireEvent.press(await screen.findByTestId('top-bar-menu'));
    await screen.findByTestId('drawer-row-logout');
    const raw = allStrings(screen.root).filter((s) => RAW_KEY.test(s));
    expect(raw).toEqual([]);
    await waitFor(() => expect(StyleSheet.flatten(screen.getByTestId('shell-root').props.style).direction).toBe(locale === 'ar' ? 'rtl' : 'ltr'));
  });
});

it('a language change writes stt_language once and flips direction without a remount', async () => {
  const d = double('de-DE');
  let setLanguage: (l: string) => Promise<void> = async () => undefined;
  let mounts = 0;
  function Probe() {
    setLanguage = useLanguage().setLanguage;
    return null;
  }
  function Counted() {
    const [n] = [++mounts];
    return <Text testID="mounts">{String(n > 0)}</Text>;
  }
  render(
    <ShellRoot>
      <Probe />
      <Counted />
    </ShellRoot>,
    { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) },
  );
  await waitFor(() => expect(d.calls.some((c) => c.fn === 'from.user_preferences.select')).toBe(true));
  const root = screen.getByTestId('shell-root');
  await act(async () => {
    await setLanguage('ar-XA');
  });
  expect(StyleSheet.flatten(screen.getByTestId('shell-root').props.style).direction).toBe('rtl');
  expect(screen.getByTestId('shell-root')).toBe(root);
  expect(d.writes.filter((w) => w.table === 'user_preferences')).toEqual([{ table: 'user_preferences', values: { stt_language: 'ar-XA' }, filters: [['user_id', 'u-1']] }]);
});

it('no physical left/right in shell or auth screen styles (logical start/end only)', () => {
  const roots = [join(__dirname, '../src/shell'), join(__dirname, '../src/screens')];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) {
        const text = readFileSync(full, 'utf8');
        const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)\s*:|textAlign:\s*'(left|right)'/g;
        for (const m of text.matchAll(re)) offenders.push(`${full}: ${m[0]}`);
      }
    }
  };
  roots.forEach(walk);
  expect(offenders).toEqual([]);
});
