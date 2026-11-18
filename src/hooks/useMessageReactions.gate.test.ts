/**
 * Expanded reactions — web gate. While REACTION_PICKER_ENABLED is off, the hook adds only the six quick reactions.
 * Removals are never gated. With the flag on, any emoji of the shared set is added.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const flag = vi.hoisted(() => ({ on: false }));
const ME = 'u-me';
const MSG = 'm1';
const APPLE = '\u{1F34E}';
const HEART = '\u2764\uFE0F';

const state: { rows: Array<Record<string, string>>; inserts: unknown[]; deletes: number } = { rows: [], inserts: [], deletes: 0 };

vi.mock('@/lib/reactions/reactionEmoji', async (orig) => ({
  ...(await orig<typeof import('@/lib/reactions/reactionEmoji')>()),
  get REACTION_PICKER_ENABLED() {
    return flag.on;
  },
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: ME } }) }));
vi.mock('@/lib/i18n-toast', () => ({ notifyError: vi.fn(), t: (k: string) => k }));
vi.mock('@/integrations/supabase/realtime', () => {
  const ch = { on: () => ch, subscribe: () => ch };
  return { realtimeChannel: () => ch, removeRealtimeChannel: vi.fn() };
});
vi.mock('@/integrations/supabase/client', () => {
  const del = (filters: unknown[]) => {
    const b: any = {
      eq: (...a: unknown[]) => (filters.push(a), b),
      then: (res: (v: unknown) => void) => {
        state.deletes += 1;
        res({ error: null });
      },
    };
    return b;
  };
  return {
    supabase: {
      rpc: vi.fn(async () => ({ data: state.rows.map((r) => ({ ...r })), error: null })),
      from: vi.fn(() => ({
        insert: async (row: unknown) => {
          state.inserts.push(row);
          return { error: null };
        },
        delete: () => del([]),
      })),
    },
  };
});

import { useMessageReactions } from './useMessageReactions';

beforeEach(() => {
  flag.on = false;
  state.rows = [{ message_id: MSG, user_id: ME, emoji: APPLE, created_at: '2026-11-18T10:00:00.000Z' }];
  state.inserts = [];
  state.deletes = 0;
});

describe('web reactions gate: picker flag off', () => {
  it('refuses to add an emoji outside the six', async () => {
    const { result } = renderHook(() => useMessageReactions(MSG));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addReaction('\u{1F33B}');
    });
    expect(state.inserts).toHaveLength(0);
  });
  it('adds a quick reaction, including the bare heart in its canonical form', async () => {
    const { result } = renderHook(() => useMessageReactions(MSG));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addReaction('\u2764');
    });
    expect(state.inserts).toEqual([expect.objectContaining({ emoji: HEART })]);
  });
  it('removes an outside-six reaction the member already has', async () => {
    const { result } = renderHook(() => useMessageReactions(MSG));
    await waitFor(() => expect(result.current.reactionSummary).toHaveLength(1));
    await act(async () => {
      await result.current.removeReaction(APPLE);
    });
    expect(state.deletes).toBe(1);
  });
});

describe('web reactions gate: picker flag on', () => {
  it('adds an emoji outside the six', async () => {
    flag.on = true;
    const { result } = renderHook(() => useMessageReactions(MSG));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addReaction('\u{1F33B}');
    });
    expect(state.inserts).toEqual([expect.objectContaining({ emoji: '\u{1F33B}' })]);
  });
});
