/**
 * Full emoji reactions — web: a legacy bare heart (U+2764 without U+FE0F) and the
 * canonical heart are one reaction. They show as one chip with one count, and
 * toggling that chip off removes the member's own row whatever form it is stored in.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const BARE_HEART = '\u2764';
const HEART = '\u2764\uFE0F';
const ME = 'u-me';
const PEER = 'u-peer';

type Row = { message_id: string; user_id: string; emoji: string; created_at: string };
const state: { rows: Row[]; deletes: Array<Array<[string, unknown]>>; inserts: Row[] } = { rows: [], deletes: [], inserts: [] };

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: ME } }) }));
vi.mock('@/lib/i18n-toast', () => ({ notifyError: vi.fn(), t: (k: string) => k }));
vi.mock('@/integrations/supabase/realtime', () => {
  const ch = { on: () => ch, subscribe: () => ch };
  return { realtimeChannel: () => ch, removeRealtimeChannel: vi.fn() };
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: state.rows.map((r) => ({ ...r })), error: null })),
    from: vi.fn(() => {
      const filters: Array<[string, unknown]> = [];
      const del = {
        eq: (col: string, val: unknown) => {
          filters.push([col, val]);
          return del;
        },
        then: (resolve: (v: { error: null }) => void) => {
          state.deletes.push(filters);
          resolve({ error: null });
        },
      };
      return {
        insert: async (row: Row) => {
          state.inserts.push(row);
          return { error: null };
        },
        delete: () => del,
      };
    }),
  },
}));

import { useMessageReactions } from './useMessageReactions';

beforeEach(() => {
  state.rows = [
    { message_id: 'm1', user_id: PEER, emoji: HEART, created_at: '2026-11-17T10:00:00.000Z' },
    { message_id: 'm1', user_id: ME, emoji: BARE_HEART, created_at: '2026-11-17T10:01:00.000Z' },
  ];
  state.deletes = [];
  state.inserts = [];
});

describe('useMessageReactions — legacy heart variants', () => {
  it('shows a bare and a canonical heart as one reaction with one count', async () => {
    const { result } = renderHook(() => useMessageReactions('m1'));
    await waitFor(() => expect(result.current.reactions).toHaveLength(2));
    expect(result.current.reactionSummary).toHaveLength(1);
    expect(result.current.reactionSummary[0]).toMatchObject({ emoji: HEART, count: 2, hasUserReacted: true });
  });

  it('toggling the heart chip off deletes my own row in the form it is stored in', async () => {
    const { result } = renderHook(() => useMessageReactions('m1'));
    await waitFor(() => expect(result.current.reactions).toHaveLength(2));
    await act(async () => {
      await result.current.removeReaction(result.current.reactionSummary[0].emoji);
    });
    expect(state.deletes).toHaveLength(1);
    expect(state.deletes[0]).toEqual(
      expect.arrayContaining([['message_id', 'm1'], ['user_id', ME], ['emoji', BARE_HEART], ['created_at', '2026-11-17T10:01:00.000Z']]),
    );
    expect(result.current.reactionSummary[0]).toMatchObject({ emoji: HEART, count: 1, hasUserReacted: false });
  });

  it('a bare-heart add is written in the canonical form', async () => {
    state.rows = [];
    const { result } = renderHook(() => useMessageReactions('m1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addReaction(BARE_HEART);
    });
    expect(state.inserts).toEqual([expect.objectContaining({ message_id: 'm1', user_id: ME, emoji: HEART })]);
  });
});
