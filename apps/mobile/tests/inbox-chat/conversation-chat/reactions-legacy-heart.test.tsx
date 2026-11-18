/**
 * Full emoji reactions — mobile: a legacy bare heart (U+2764 without U+FE0F) and
 * the canonical heart are one reaction. They show as one entry with one count,
 * and removing the heart deletes my own row in the form it is stored in.
 */
import '../../helpers/no-network';
import './mocks';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { useReactions } from '../../../src/screens/chat/data/useReactions';
import { createChatDouble, ME, PEER } from './helpers';

const BARE_HEART = '\u2764';
const HEART = '\u2764\uFE0F';

jest.setTimeout(30_000);
afterAll(() => __setSupabaseForTests(null));

function setup() {
  const rows = [
    { message_id: 'p1', user_id: PEER, emoji: HEART, created_at: '2026-11-17T10:00:00.000Z' },
    { message_id: 'p1', user_id: ME, emoji: BARE_HEART, created_at: '2026-11-17T10:01:00.000Z' },
  ];
  const d = createChatDouble({ rpc: { get_message_reactions_text: () => ({ data: rows.map((r) => ({ ...r })), error: null }) } });
  __setSupabaseForTests(d.client as never);
  return d;
}

describe('reactions — legacy heart variants (mobile)', () => {
  it('shows a bare and a canonical heart as one reaction with one count', async () => {
    setup();
    const { result } = renderHook(() => useReactions('p1', ME));
    await waitFor(() => expect(result.current.summary).toHaveLength(1));
    expect(result.current.summary[0]).toMatchObject({ emoji: HEART, count: 2, hasUserReacted: true });
  });

  it('removing the heart deletes my own row in the form it is stored in', async () => {
    const d = setup();
    const { result } = renderHook(() => useReactions('p1', ME));
    await waitFor(() => expect(result.current.summary[0]?.count).toBe(2));
    await act(async () => {
      await result.current.removeReaction(HEART);
    });
    const del = d.writes.find((w) => w.table === 'message_reactions' && w.op === 'delete');
    expect(del?.filters).toEqual(
      expect.arrayContaining([['eq', 'message_id', 'p1'], ['eq', 'user_id', ME], ['eq', 'emoji', BARE_HEART], ['eq', 'created_at', '2026-11-17T10:01:00.000Z']]),
    );
  });

  it('a bare-heart add is written in the canonical form', async () => {
    const d = createChatDouble();
    __setSupabaseForTests(d.client as never);
    const { result } = renderHook(() => useReactions('p1', ME));
    await act(async () => {
      expect(await result.current.addReaction(BARE_HEART)).toBe('added');
    });
    expect(d.writes.find((w) => w.table === 'message_reactions')?.values).toMatchObject({ message_id: 'p1', user_id: ME, emoji: HEART });
  });
});
