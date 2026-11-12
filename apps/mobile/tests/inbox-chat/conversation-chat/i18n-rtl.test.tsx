/**
 * VTID-05458 — i18n, RTL and the lane's ledger rows:
 *  - every chatNative / callsNative key exists in all 11 shards with German's placeholders;
 *  - the DM screen renders no raw catalog key in any locale;
 *  - Arabic: the chat layer runs right-to-left and own bubbles sit at the end,
 *    others at the start (the flip comes from `direction`, styles stay logical);
 *  - lane files use start/end, never physical left/right;
 *  - the six conversation-chat ledger rows are native with their own route files.
 */
import '../../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { languageFromLocale } from '../../../src/i18n/I18nProvider';
import { ConversationScreen } from '../../../src/screens/chat/ConversationScreen';
import { chatGateway, createChatDouble, dm, makeChatWrapper, ME, PEER, PROFILES } from './helpers';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

afterAll(() => __setSupabaseForTests(null));

const APP = join(__dirname, '../../..');
const REPO = join(APP, '../..');
const LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'] as const;
const RAW_KEY = /^(chatNative|callsNative|screens|inbox|toasts|common)\.[a-zA-Z0-9_.]+$/;

const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();

describe.each(['chatNative', 'callsNative'])('%s shards', (ns) => {
  const read = (l: string) => flat(JSON.parse(readFileSync(join(REPO, 'src/i18n', l, `${ns}.json`), 'utf8')));
  const de = read('de');

  it('German has keys', () => expect(de.length).toBeGreaterThan(5));

  it.each(LOCALES)('%s has every German key with the same placeholders, none empty', (l) => {
    const other = new Map(read(l));
    expect([...other.keys()].sort()).toEqual(de.map(([k]) => k).sort());
    for (const [k, v] of de) {
      expect({ k, ph: ph(other.get(k) ?? '') }).toEqual({ k, ph: ph(v) });
      expect((other.get(k) ?? '').trim().length).toBeGreaterThan(0);
    }
  });
});

const thread = [dm('m1', PEER, 'Hallo Mia', 1), dm('m2', ME, 'Hi Petra', 2)];
function renderIn(language: string) {
  const d = createChatDouble({ tables: { global_community_profiles: PROFILES } });
  const gw = chatGateway({ [`GET /chat/conversation/${PEER}`]: { data: thread }, 'POST /chat/read': {} });
  return { d, ...render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper: makeChatWrapper({ client: d.client, gateway: gw, language }) }) };
}

const allStrings = (node: unknown): string[] => {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (n == null) return;
    if (typeof n === 'string') out.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (typeof n === 'object') {
      const o = n as { props?: Record<string, unknown>; children?: unknown };
      if (o.props) {
        for (const key of ['accessibilityLabel', 'placeholder', 'accessibilityHint']) if (typeof o.props[key] === 'string') out.push(o.props[key] as string);
      }
      walk(o.children);
    }
  };
  walk(node);
  return out;
};

describe('the DM screen in every locale', () => {
  it.each(LOCALES)('%s renders no raw catalog key', async (l) => {
    const r = renderIn(languageFromLocale(l));
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    const raw = allStrings(r.toJSON()).filter((s) => RAW_KEY.test(s.trim()));
    expect({ l, raw }).toEqual({ l, raw: [] });
    r.unmount();
  });
});

describe('RTL (ar)', () => {
  it('the chat layer is right-to-left; own bubbles at the end, others at the start; Arabic catalog text shows', async () => {
    const { d } = renderIn('ar-XA');
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    expect(StyleSheet.flatten(screen.getByTestId('screen-conversation').props.style).direction).toBe('rtl');
    expect(StyleSheet.flatten(screen.getByTestId('bubble-row-own').props.style).justifyContent).toBe('flex-end');
    expect(StyleSheet.flatten(screen.getByTestId('bubble-row-other').props.style).justifyContent).toBe('flex-start');
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/chatNative.json'), 'utf8')).chatNative;
    act(() => d.emit(`typing:${PEER}`, 'broadcast', 'typing_start', { user_id: PEER, name: 'Petra' }));
    expect(screen.getByText(ar.typing.one.replace('{name}', 'Petra'))).toBeTruthy();
  });

  it('English stays left-to-right', async () => {
    renderIn('en-US');
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    expect(StyleSheet.flatten(screen.getByTestId('screen-conversation').props.style).direction).toBe('ltr');
  });
});

describe('RTL-safe styles', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [
    ...files(join(APP, 'src/screens/chat')),
    ...files(join(APP, 'app/(app)/inbox/u')),
    ...files(join(APP, 'app/(app)/inbox/g')),
    ...files(join(APP, 'app/(app)/inbox/t')),
    join(APP, 'src/ports/chat.tsx'),
    join(APP, 'src/ports/webrtc.ts'),
  ];

  it('finds the lane files', () => expect(laneFiles.length).toBeGreaterThan(20));

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right, and no raw colour', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
    expect(src.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|'(white|black|transparent)'/g) ?? []).toEqual([]);
  });
});

describe('parity ledger', () => {
  const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; web_path: string; status: string; lane?: string }> };
  const lane = new Map<string, string>([
    ['INBOX.CONVERSATION', 'app/(app)/inbox/u/[recipientId]/index.tsx'],
    ['INBOX.GROUP', 'app/(app)/inbox/g/[groupId]/index.tsx'],
    ['/inbox/u/:recipientId/msg/:messageId', 'app/(app)/inbox/u/[recipientId]/msg/[messageId].tsx'],
    ['/inbox/g/:groupId/msg/:messageId', 'app/(app)/inbox/g/[groupId]/msg/[messageId].tsx'],
    ['/inbox/t/:threadId', 'app/(app)/inbox/t/[threadId]/index.tsx'],
    ['/inbox/t/:threadId/msg/:messageId', 'app/(app)/inbox/t/[threadId]/msg/[messageId].tsx'],
  ]);

  it.each([...lane.entries()])('%s is native with its own route file %s', (key, file) => {
    const row = ledger.rows.find((r) => r.key === key);
    expect(row?.status).toBe('native');
    expect(existsSync(join(APP, file))).toBe(true);
  });
});
