/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the
 * `PresenceIndicator` dot on a direct conversation card's avatar (web
 * MobileConversationCard.tsx:75-81 + useUserPresence; review fix 1): no dot on
 * a group card; the Vitana bot is always online; statuses come from the
 * `thread_presence` read (normalised by staleness) and the `presence_global`
 * channel sync; once subscribed the member tracks themself and upserts the
 * heartbeat row, as the web does. Every read / write lands in the double.
 */
import '../../helpers/no-network';
import './mocks';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { InboxScreen } from '../../../src/screens/inbox/InboxScreen';
import { VITANA_BOT_USER_ID } from '../../../src/screens/inbox/data/threads-model';
import { __resetPresenceForTests, normalizePresenceStatus } from '../../../src/screens/inbox/data/presence';
import { ANNA, BEN, ME, inboxWrapper, loadedRoutes, loadedTables } from './helpers';

afterEach(() => __resetPresenceForTests());
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const minsAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const presenceRows = [
  { user_id: ANNA, thread_id: '00000000-0000-0000-0000-000000000000', context: 'global', last_seen: minsAgo(2) },
  { user_id: BEN, thread_id: '00000000-0000-0000-0000-000000000000', context: 'global', last_seen: minsAgo(20) },
  { user_id: 'u-tenant', thread_id: 'x', context: 'tenant', last_seen: minsAgo(1) },
];

const label = (id: string) => screen.getByTestId(`inbox-card-${id}-presence`).props.accessibilityLabel;

async function renderInbox(tables: Record<string, Array<Record<string, unknown>>> = { ...loadedTables, thread_presence: presenceRows }) {
  const h = inboxWrapper(loadedRoutes, { tables });
  render(<InboxScreen />, { wrapper: h.wrapper });
  await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
  return h;
}

describe('conversation card presence dot', () => {
  it('draws the dot on direct cards only, from the thread_presence read; Vitana is always online', async () => {
    const { queries } = await renderInbox();
    await waitFor(() => expect(label(ANNA)).toBe('Active'));
    expect(label(BEN)).toBe('Away');
    expect(label(VITANA_BOT_USER_ID)).toBe('Active');
    expect(screen.queryByTestId('inbox-card-chat_group:g-1-presence')).toBeNull();
    const read = queries.find((q) => q.table === 'thread_presence' && q.op === 'select');
    expect(read?.columns).toBe('*');
    expect(read?.filters[0]).toEqual(['eq', 'context', 'global']);
    const [op, col, since] = read!.filters[1];
    expect([op, col]).toEqual(['gte', 'last_seen']);
    expect(Math.abs(Date.now() - 24 * 60 * 60 * 1000 - new Date(since).getTime())).toBeLessThan(60_000);
  });

  it('a member nobody has seen is offline; the presence_global sync marks them online', async () => {
    const { channels, syncPresence } = await renderInbox({ ...loadedTables, thread_presence: [] });
    expect(label(BEN)).toBe('Offline');
    const ch = channels.find((c) => c.name === 'presence_global');
    expect(ch?.opts).toEqual({ config: { presence: { key: ME }, broadcast: { self: true } } });
    act(() => syncPresence('presence_global', { [BEN]: [{ user_id: BEN, status: 'online' }], [ANNA]: [{ user_id: ANNA, status: 'idle' }] }));
    expect(label(BEN)).toBe('Active');
    expect(label(ANNA)).toBe('Away');
  });

  it('tracks the member on the channel and upserts their heartbeat row (the only write of the list)', async () => {
    const { channels, queries } = await renderInbox();
    const ch = channels.find((c) => c.name === 'presence_global')!;
    await waitFor(() => expect(ch.tracked).toHaveLength(1));
    expect(ch.tracked[0]).toMatchObject({ user_id: ME, status: 'online' });
    await waitFor(() => expect(queries.some((q) => q.table === 'thread_presence' && q.op === 'upsert')).toBe(true));
    const upsert = queries.find((q) => q.op === 'upsert')!;
    expect(upsert.values).toEqual({ user_id: ME, thread_id: '00000000-0000-0000-0000-000000000000', context: 'global', last_seen: expect.any(String) });
    expect(upsert.options).toEqual({ onConflict: 'user_id,thread_id,context' });
    expect(queries.filter((q) => q.op !== 'select').map((q) => `${q.op} ${q.table}`)).toEqual(['upsert thread_presence']);
  });

  it('normalises staleness like the web: >30 min offline, >15 min away', () => {
    const now = Date.now();
    expect(normalizePresenceStatus('online', new Date(now - 5 * 60_000).toISOString(), now)).toBe('online');
    expect(normalizePresenceStatus('online', new Date(now - 16 * 60_000).toISOString(), now)).toBe('away');
    expect(normalizePresenceStatus('online', new Date(now - 31 * 60_000).toISOString(), now)).toBe('offline');
    expect(normalizePresenceStatus('idle', new Date(now).toISOString(), now)).toBe('away');
    expect(normalizePresenceStatus(null, null, now)).toBe('offline');
  });
});
