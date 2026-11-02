/**
 * VTID-05428 (Native Wave 2, profile-settings-r2 / delete-account) — fixture /
 * fake-gateway unit tests for the public `/delete-account` twin of the web
 * `src/pages/legal/DeleteAccount.tsx`.
 *
 * No network: the no-network guard is imported first and the Supabase client
 * is the in-memory double installed by makeWrapper, with a MOCKED
 * `functions.invoke`. The destructive deletion request is built and asserted
 * against that mock; nothing is ever sent (requirements R5.1/R5.2). React 19:
 * components are typed with `ReactElement`; no global `JSX`.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement, ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  // A getter: the factory can run before this module's own `const` initialises.
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => ({}),
  usePathname: () => '/delete-account',
  useGlobalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

import { timeoutManager } from '@tanstack/react-query';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider } from '../../src/ports/ui';
import { LOCALES, translate } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { resolveWebPath } from '../../src/navigation/resolve';
import { DeleteAccountScreen } from '../../src/screens/delete-account/DeleteAccountScreen';
import {
  ACCOUNT_DELETION_FUNCTION,
  buildAccountDeletionRequest,
  isDeleteConfirmed,
  requestAccountDeletion,
} from '../../src/screens/delete-account/request';

/*
 * A successful deletion signs out, and the AuthProvider's signOut calls
 * `queryClient.clear()` while the screen is still mounted. The tenant-registry
 * observer then keeps a query that is no longer in the cache; on unmount it
 * schedules that query's 24 h gc timer, which the wrapper's afterEach clear()
 * cannot reach, so jest would never exit. React Query's timers are unref'd in
 * this file (they still fire when the process is alive); nothing else changes.
 */
timeoutManager.setTimeoutProvider({
  setTimeout: (cb: () => void, ms: number) => {
    const h = setTimeout(cb, ms);
    (h as unknown as { unref?: () => void }).unref?.();
    return h;
  },
  clearTimeout: (h: ReturnType<typeof setTimeout> | undefined) => clearTimeout(h),
  setInterval: (cb: () => void, ms: number) => {
    const h = setInterval(cb, ms);
    (h as unknown as { unref?: () => void }).unref?.();
    return h;
  },
  clearInterval: (h: ReturnType<typeof setInterval> | undefined) => clearInterval(h),
});

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

afterAll(() => __setSupabaseForTests(null));
afterEach(() => jest.clearAllMocks());

type InvokeResult = { data: unknown; error: { message: string } | null };

/** The Supabase double with a mocked `functions.invoke` (the deletion edge function). */
function double(opts: { signedIn: boolean; invoke?: () => InvokeResult | Promise<InvokeResult> }) {
  const d = createSupabaseDouble({
    session: opts.signedIn ? fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } }) : null,
    tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }] },
  });
  const invoke = jest.fn(async () => (opts.invoke ? opts.invoke() : { data: { ok: true }, error: null }));
  d.client.functions = { invoke };
  return { ...d, invoke };
}

function renderScreen(client: unknown, opts: { language?: string; direction?: 'ltr' | 'rtl' } = {}) {
  const Wrapped = ({ children }: { children: ReactNode }): ReactElement => (
    <UIProvider colorScheme="light" direction={opts.direction ?? 'ltr'}>
      {children}
    </UIProvider>
  );
  return render(
    <Wrapped>
      <DeleteAccountScreen />
    </Wrapped>,
    { wrapper: makeWrapper({ client, language: opts.language ?? 'en-US' }) },
  );
}

const en = (key: string, params?: Record<string, string>) => translate('en', key, params);

async function reachConfirm() {
  fireEvent.press(await screen.findByTestId('delete-account-start'));
  await screen.findByTestId('delete-account-confirm');
}

describe('the request builder (never sent)', () => {
  it('builds the web request: the request-account-deletion edge function with an empty body', () => {
    expect(ACCOUNT_DELETION_FUNCTION).toBe('request-account-deletion');
    expect(buildAccountDeletionRequest()).toEqual({ name: 'request-account-deletion', options: { body: {} } });
  });

  it('accepts the typed check like the web: trimmed, case-insensitive "DELETE" only', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(true);
    expect(isDeleteConfirmed('  delete ')).toBe(true);
    expect(isDeleteConfirmed('DELET')).toBe(false);
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('LÖSCHEN')).toBe(false);
  });

  it('sends the built request through the injected (mocked) client only', async () => {
    const d = double({ signedIn: true });
    await expect(requestAccountDeletion(d.client)).resolves.toEqual({ ok: true });
    expect(d.invoke).toHaveBeenCalledTimes(1);
    expect(d.invoke).toHaveBeenCalledWith('request-account-deletion', { body: {} });
  });

  it('maps an invoke error, a not-ok body and a thrown error to a failure', async () => {
    await expect(requestAccountDeletion(double({ signedIn: true, invoke: () => ({ data: null, error: { message: 'boom' } }) }).client)).resolves.toEqual({ ok: false, message: 'boom' });
    await expect(requestAccountDeletion(double({ signedIn: true, invoke: () => ({ data: { ok: false, error: 'nope' }, error: null }) }).client)).resolves.toEqual({ ok: false, message: 'nope' });
    await expect(requestAccountDeletion(double({ signedIn: true, invoke: () => ({ data: { ok: false }, error: null }) }).client)).resolves.toEqual({ ok: false, message: null });
    await expect(
      requestAccountDeletion(
        double({
          signedIn: true,
          invoke: () => {
            throw new Error('offline');
          },
        }).client,
      ),
    ).resolves.toEqual({ ok: false, message: 'offline' });
  });
});

describe('signed out (public route, no AuthGate)', () => {
  it('renders the web signed-out view and sends nothing', async () => {
    const d = double({ signedIn: false });
    renderScreen(d.client);
    expect(await screen.findByTestId('delete-account-signed-out')).toBeTruthy();
    expect(screen.getByText(en('screens.legal.signRequired'))).toBeTruthy();
    expect(screen.getByText(en('screens.legal.youNeedSignYourAccountBefore'))).toBeTruthy();
    expect(screen.getByText(en('screens.legal.deleteAccount'))).toBeTruthy();
    expect(screen.queryByTestId('delete-account-start')).toBeNull();
    fireEvent.press(screen.getByTestId('delete-account-sign-in'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/maxina');
    expect(d.invoke).not.toHaveBeenCalled();
  });

  it('the back control goes back', async () => {
    renderScreen(double({ signedIn: false }).client);
    fireEvent.press(await screen.findByTestId('delete-account-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('signed in: info → confirm (typed check) → dialog', () => {
  it('renders the info step with the five data categories and the privacy link', async () => {
    renderScreen(double({ signedIn: true }).client);
    expect(await screen.findByTestId('delete-account-info')).toBeTruthy();
    for (const k of [
      'deleteYourAccount',
      'thisActionPermanentCannotUndone',
      'whenYouDeleteYourAccountWe',
      'yourProfilePreferencesPersonalData',
      'chatMessagesAiConversationsDiaryEntries',
      'uploadedPhotosVideosFiles',
      'eventRsvpsMembershipsCommunityActivity',
      'bookmarksSupplementsHealthData',
      'deleteMyAccount',
    ]) {
      expect(screen.getByText(en(`screens.legal.${k}`))).toBeTruthy();
    }
    fireEvent.press(screen.getByTestId('delete-account-privacy'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/privacy');
    expect(screen.queryByTestId('delete-account-signed-out')).toBeNull();
  });

  it('Permanently Delete stays disabled until DELETE is typed; Cancel clears and returns to info', async () => {
    const d = double({ signedIn: true });
    renderScreen(d.client);
    await reachConfirm();
    const submit = screen.getByTestId('delete-account-submit');
    expect(submit.props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('delete-account-input'), 'DELET');
    expect(screen.getByTestId('delete-account-submit').props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('delete-account-input'), ' delete ');
    expect(screen.getByTestId('delete-account-submit').props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByTestId('delete-account-cancel'));
    expect(await screen.findByTestId('delete-account-info')).toBeTruthy();
    await reachConfirm();
    expect(screen.getByTestId('delete-account-input').props.value).toBe('');
    expect(d.invoke).not.toHaveBeenCalled();
  });

  it('the final dialog: Cancel sends nothing', async () => {
    const d = double({ signedIn: true });
    renderScreen(d.client);
    await reachConfirm();
    fireEvent.changeText(screen.getByTestId('delete-account-input'), 'DELETE');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    expect(await screen.findByText(en('screens.legal.finalConfirmation'))).toBeTruthy();
    expect(screen.getByText(en('screens.legal.thisWillPermanentlyDeleteYourAccount'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('delete-account-dialog-cancel'));
    // The kit unmounts a closed dialog after its exit animation (a real timer).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(screen.queryByTestId('delete-account-dialog-confirm')).toBeNull();
    expect(screen.getByTestId('delete-account-confirm')).toBeTruthy();
    expect(d.invoke).not.toHaveBeenCalled();
  });

  it('confirming builds the request against the mocked gateway, signs out locally and shows done', async () => {
    const d = double({ signedIn: true });
    renderScreen(d.client);
    await reachConfirm();
    fireEvent.changeText(screen.getByTestId('delete-account-input'), 'DELETE');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    fireEvent.press(await screen.findByTestId('delete-account-dialog-confirm'));
    expect(await screen.findByTestId('delete-account-done')).toBeTruthy();
    expect(d.invoke).toHaveBeenCalledTimes(1);
    expect(d.invoke).toHaveBeenCalledWith('request-account-deletion', { body: {} });
    expect(d.client.auth.signOut).toHaveBeenCalled();
    expect(screen.getByText(en('screens.legal.accountDeleted'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('delete-account-home'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/');
  });

  it('shows the deleting step while the (mocked) request is pending', async () => {
    let release: (r: InvokeResult) => void = () => undefined;
    const d = double({ signedIn: true, invoke: () => new Promise<InvokeResult>((r) => (release = r)) });
    renderScreen(d.client);
    await reachConfirm();
    fireEvent.changeText(screen.getByTestId('delete-account-input'), 'DELETE');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    fireEvent.press(await screen.findByTestId('delete-account-dialog-confirm'));
    expect(await screen.findByTestId('delete-account-deleting')).toBeTruthy();
    expect(screen.getByText(en('screens.legal.deletingYourAccount'))).toBeTruthy();
    release({ data: { ok: true }, error: null });
    expect(await screen.findByTestId('delete-account-done')).toBeTruthy();
  });

  it.each([
    ['the server message', { data: { ok: false, error: 'Deletion is locked' }, error: null }, 'Deletion is locked'],
    ['the catalog fallback', { data: { ok: false }, error: null }, null],
  ] as const)('a failed request shows the error step with %s; Try Again returns to info', async (_name, result, message) => {
    const d = double({ signedIn: true, invoke: () => result as InvokeResult });
    renderScreen(d.client);
    await reachConfirm();
    fireEvent.changeText(screen.getByTestId('delete-account-input'), 'DELETE');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    fireEvent.press(await screen.findByTestId('delete-account-dialog-confirm'));
    expect(await screen.findByTestId('delete-account-error')).toBeTruthy();
    expect(screen.getByText(en('screens.legal.somethingWentWrong'))).toBeTruthy();
    expect(screen.getByText(message ?? en('deleteAccountNative.errorFallback'))).toBeTruthy();
    expect(d.client.auth.signOut).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('delete-account-retry'));
    expect(await screen.findByTestId('delete-account-info')).toBeTruthy();
  });
});

/** A dotted catalog key that t() returned unresolved. */
const RAW_KEY = /^[a-zA-Z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

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

describe.each([...LOCALES])('%s', (locale) => {
  it('signed-out and info views render without a raw key', async () => {
    const language = languageFromLocale(locale);
    const out = renderScreen(double({ signedIn: false }).client, { language, direction: locale === 'ar' ? 'rtl' : 'ltr' });
    await screen.findByTestId('delete-account-signed-out');
    expect(allStrings(out.UNSAFE_root).filter((s) => RAW_KEY.test(s.trim()))).toEqual([]);
    out.unmount();
    const signedIn = renderScreen(double({ signedIn: true }).client, { language, direction: locale === 'ar' ? 'rtl' : 'ltr' });
    await screen.findByTestId('delete-account-info');
    expect(allStrings(signedIn.UNSAFE_root).filter((s) => RAW_KEY.test(s.trim()))).toEqual([]);
  });

  it('has every deleteAccountNative key (DE-first shard mirrored)', () => {
    const de = JSON.parse(readFileSync(join(REPO, 'src/i18n/de/deleteAccountNative.json'), 'utf8')).deleteAccountNative;
    const shard = JSON.parse(readFileSync(join(REPO, `src/i18n/${locale}/deleteAccountNative.json`), 'utf8')).deleteAccountNative;
    expect(Object.keys(shard).sort()).toEqual(Object.keys(de).sort());
    for (const v of Object.values(shard)) expect(typeof v === 'string' && v.length > 0).toBe(true);
  });
});

describe('RTL and source rules', () => {
  it('Arabic renders right-to-left: the back arrow is mirrored', async () => {
    renderScreen(double({ signedIn: false }).client, { language: languageFromLocale('ar'), direction: 'rtl' });
    const arrow = await screen.findByTestId('delete-account-back-icon', { includeHiddenElements: true });
    expect(JSON.stringify(arrow.props.style)).toContain('"scaleX":-1');
  });

  const sources = (dir: string): string[] =>
    existsSync(dir) ? readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? sources(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : [])) : [];
  const files = [...sources(join(APP, 'src/screens/delete-account')), join(APP, 'app/(public)/delete-account.tsx')];

  it('no physical left/right in the lane sources', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect({ f, hits: src.match(/\b(marginLeft|marginRight|paddingLeft|paddingRight|left|right|borderLeft\w*|borderRight\w*)\s*:/g) ?? [] }).toEqual({ f, hits: [] });
      expect({ f, align: /textAlign:\s*['"](left|right)['"]/.test(src) }).toEqual({ f, align: false });
    }
  });

  it('the route lives in the (public) group, never under (app)', () => {
    expect(existsSync(join(APP, 'app/(public)/delete-account.tsx'))).toBe(true);
    expect(existsSync(join(APP, 'app/(app)/delete-account.tsx'))).toBe(false);
  });

  it('/delete-account resolves as a native route', () => {
    expect(resolveWebPath('/delete-account').kind).toBe('native');
  });
});
