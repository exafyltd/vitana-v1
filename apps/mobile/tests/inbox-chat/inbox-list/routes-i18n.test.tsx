/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the route files
 * (reachable on a cold start: no existing app/ file shadows them, the
 * resolver lists them native, the ledger rows are native), the shell badge
 * registration, and i18n + RTL (tasks.md inbox-list task 4): the three
 * screens render no unresolved catalog key in all 11 locales, Arabic renders
 * from the Arabic catalog, the lane's files use no physical left/right, and
 * every inboxNative key exists in all 11 shards with German's placeholders.
 */
import '../../helpers/no-network';
import './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { LOCALES } from '../../../src/i18n';
import { languageFromLocale } from '../../../src/i18n/I18nProvider';
import { NATIVE_ROUTES, resolveWebPath } from '../../../src/navigation/resolve';
import { InboxScreen } from '../../../src/screens/inbox/InboxScreen';
import { ArchivedScreen } from '../../../src/screens/inbox/ArchivedScreen';
import { InspirationScreen } from '../../../src/screens/inbox/InspirationScreen';
import { __resetInboxUnreadForTests } from '../../../src/screens/inbox/data/unread';
import { ANNA, inboxWrapper, loadedRoutes, loadedTables } from './helpers';

afterEach(() => __resetInboxUnreadForTests());
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const APP = join(__dirname, '../../..');
const REPO = join(APP, '../..');
const ROUTES = [
  ['/inbox', 'app/(app)/inbox/index.tsx', 'InboxScreen', 'INBOX.OVERVIEW'],
  ['/inbox/archived', 'app/(app)/inbox/archived.tsx', 'ArchivedScreen', 'INBOX.ARCHIVED'],
  ['/inbox/inspiration', 'app/(app)/inbox/inspiration.tsx', 'InspirationScreen', 'INBOX.INSPIRATION'],
] as const;

describe('routes', () => {
  it.each(ROUTES)('%s: route file renders its screen and is the only file for the path', (path, file, screenName) => {
    const src = readFileSync(join(APP, file), 'utf8');
    expect(src).toContain(`src/screens/inbox/${screenName}`);
    expect(src).toMatch(/export default function/);
    const dir = join(APP, 'app/(app)');
    const rel = path.slice(1);
    // No sibling file shadows the route (e.g. app/(app)/inbox.tsx next to inbox/index.tsx).
    const shadows = path === '/inbox' ? [join(dir, 'inbox.tsx'), join(APP, 'app/inbox.tsx'), join(APP, 'app/inbox/index.tsx')] : [join(dir, `${rel}/index.tsx`), join(APP, `app/${rel}.tsx`)];
    expect(shadows.filter(existsSync)).toEqual([]);
  });

  it.each(ROUTES)('%s resolves native and its ledger row is native', (path, _f, _s, key) => {
    expect(NATIVE_ROUTES).toContain(path);
    expect(resolveWebPath(path)).toMatchObject({ kind: 'native', href: path });
    const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; status: string; web_path: string }> };
    expect(ledger.rows.find((r) => r.key === key)).toMatchObject({ status: 'native', web_path: path });
  });

  it('the conversation routes stay with the conversation-chat lane (unported here)', () => {
    expect(resolveWebPath('/inbox/u/abc').kind).toBe('unported');
    expect(resolveWebPath('/inbox/g/abc').kind).toBe('unported');
  });

  it('the shell inboxUnread badge source is registered at port load', () => {
    const src = readFileSync(join(APP, 'src/ports/badges.ts'), 'utf8');
    expect(src).toMatch(/registerBadgeSource\('inboxUnread', useInboxUnreadCount\)/);
  });
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

const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
const shard = (l: string, ns: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, `${ns}.json`), 'utf8'));
const raw = (root: ReactTestInstance) => allStrings(root).filter((s) => RAW_KEY.test(s.trim()));

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: inbox, new sheet, archived and inspiration render no unresolved key', async (locale) => {
    const language = languageFromLocale(locale);
    const inbox = inboxWrapper(loadedRoutes, { tables: loadedTables }, language);
    const a = render(<InboxScreen />, { wrapper: inbox.wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-menu'));
    const rawList = raw(a.root);
    fireEvent.press(screen.getByTestId('inbox-new'));
    const rawSheet = raw(a.root);
    a.unmount();

    const b = render(<ArchivedScreen />, { wrapper: inboxWrapper({}, {}, language).wrapper });
    const rawArchived = raw(b.root);
    b.unmount();
    const c = render(<InspirationScreen />, { wrapper: inboxWrapper({}, {}, language).wrapper });
    fireEvent.press(screen.getByTestId('inspiration-actions'));
    const rawInspiration = raw(c.root);
    c.unmount();
    expect({ locale, rawList, rawSheet, rawArchived, rawInspiration }).toEqual({ locale, rawList: [], rawSheet: [], rawArchived: [], rawInspiration: [] });
  }, 30_000);

  it('Arabic (RTL) renders the inbox and Archived from the Arabic catalog', async () => {
    const { wrapper } = inboxWrapper(loadedRoutes, { tables: loadedTables }, 'ar-XA');
    const a = render(<InboxScreen />, { wrapper });
    expect(screen.getByText(shard('ar', 'inbox').inbox.title)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    expect(screen.getByText(shard('ar', 'inbox').inbox.actions.new)).toBeTruthy();
    a.unmount();
    render(<ArchivedScreen />, { wrapper: inboxWrapper({}, {}, 'ar-XA').wrapper });
    expect(screen.getByText(shard('ar', 'inboxNative').inboxNative.archivedDescription)).toBeTruthy();
  });

  it('every inboxNative key exists in all 11 shards with the same placeholders as German', () => {
    const de = flat(shard('de', 'inboxNative'));
    expect(de.length).toBeGreaterThanOrEqual(30);
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(flat(shard(l, 'inboxNative')));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) {
        expect({ l, k, empty: !(other.get(k) ?? '').trim() }).toEqual({ l, k, empty: false });
        expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
      }
    }
  });
});

describe('RTL-safe styles', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [...files(join(APP, 'src/screens/inbox')), ...['index', 'archived', 'inspiration'].map((n) => join(APP, `app/(app)/inbox/${n}.tsx`)), join(APP, 'src/ports/inbox.tsx')];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(12);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});
