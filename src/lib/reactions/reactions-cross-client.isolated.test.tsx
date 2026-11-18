/**
 * Full emoji reactions — cross-client check, WEB half, against an ISOLATED local
 * database (Postgres + PostgREST started by the validation harness; never a shared
 * or live system). Opt-in: it runs only when ISODB_REST_URL points at 127.0.0.1,
 * so CI and normal `npx vitest run` skip it.
 *
 * Step `web` (after the mobile half added 🍎 as Alice):
 *   - Alice on web sees 🍎 as her own reaction; Bob on web sees it too;
 *   - Alice taps the 🍎 chip (the real ReactionCluster wired to the real hook) and
 *     the row is gone from the database;
 *   - legacy heart: Bob adds a bare U+2764; it is stored canonical, shows as one
 *     heart chip with Alice's existing heart (count 2), and Bob's tap removes only
 *     his row (Alice's existing heart is kept);
 *   - cap: a seventh distinct emoji for Alice is refused by the database with the
 *     cap message; removal still works.
 * The mobile half is apps/mobile/tests/inbox-chat/conversation-chat/reactions-cross-client.isolated.test.tsx.
 */
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { PostgrestClient } from '@supabase/postgrest-js';
import { describe, expect, it, vi } from 'vitest';

const REST = process.env.ISODB_REST_URL ?? '';
const isolated = /^http:\/\/127\.0\.0\.1:\d+$/.test(REST) && process.env.ISODB_STEP === 'web';
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const MSG = '33333333-3333-4333-8333-333333333333';
const APPLE = '\u{1F34E}';
const HEART = '\u2764\uFE0F';
const BARE_HEART = '\u2764';

const localOnly: typeof fetch = (input, init) => {
  const url = new URL(String(input instanceof Request ? input.url : input));
  if (url.hostname !== '127.0.0.1') throw new Error(`refusing non-local host ${url.hostname}`);
  return fetch(input, init);
};
const jwtOf = (u: string) => (u === ALICE ? process.env.ISODB_JWT_ALICE : process.env.ISODB_JWT_BOB) ?? '';
const dbAs = (u: string) => new PostgrestClient(REST, { headers: { Authorization: `Bearer ${jwtOf(u)}` }, fetch: localOnly });

const session = vi.hoisted(() => ({ user: '' }));
const notifyError = vi.hoisted(() => vi.fn());
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: session.user } }) }));
vi.mock('@/lib/i18n-toast', () => ({ notifyError, t: (k: string) => k }));
vi.mock('@/integrations/supabase/realtime', () => {
  const ch = { on: () => ch, subscribe: () => ch };
  return { realtimeChannel: () => ch, removeRealtimeChannel: () => undefined };
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => dbAs(session.user).from(t),
    rpc: (fn: string, args: unknown) => dbAs(session.user).rpc(fn, args as never),
  },
}));

import { useMessageReactions } from '@/hooks/useMessageReactions';
import { ReactionCluster } from '@/components/messages/ReactionCluster';

async function rows() {
  const { data, error } = await dbAs(ALICE).from('message_reactions').select('emoji, user_id').eq('message_id', MSG);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ emoji: string; user_id: string }>;
}

/** The web chat as `user`: the real hook feeding the real reaction chips, as MessageBubble wires them. */
function openAs(user: string) {
  session.user = user;
  const hook = renderHook(() => useMessageReactions(MSG));
  const Chips = () => (
    <ReactionCluster
      reactions={hook.result.current.reactionSummary}
      onReactionClick={(e) => void hook.result.current.addReaction(e)}
      onReactionRemove={(e) => void hook.result.current.removeReaction(e)}
      onShowPopover={() => undefined}
    />
  );
  return { hook, Chips };
}

(isolated ? describe : describe.skip)('cross-client reactions — web half (isolated database)', () => {
  it('shows the mobile 🍎 on web and removes it from web', async () => {
    expect(await rows()).toContainEqual({ emoji: APPLE, user_id: ALICE });

    const bob = openAs(BOB);
    await waitFor(() => expect(bob.hook.result.current.reactionSummary.find((r) => r.emoji === APPLE)).toMatchObject({ count: 1, hasUserReacted: false }));
    bob.hook.unmount();

    const alice = openAs(ALICE);
    await waitFor(() => expect(alice.hook.result.current.reactionSummary.find((r) => r.emoji === APPLE)).toMatchObject({ count: 1, hasUserReacted: true }));
    const chips = render(<alice.Chips />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: `1 ${APPLE} reactions` }));
    });
    await waitFor(async () => expect(await rows()).not.toContainEqual({ emoji: APPLE, user_id: ALICE }));
    chips.unmount();
    alice.hook.unmount();
    console.log(`[web] Bob and Alice saw ${APPLE}; Alice's tap removed the row`);
  });

  it('a legacy bare heart is one heart reaction and toggles as one', async () => {
    const bob = openAs(BOB);
    await waitFor(() => expect(bob.hook.result.current.loading).toBe(false));
    await act(async () => {
      await bob.hook.result.current.addReaction(BARE_HEART);
    });
    expect(await rows()).toContainEqual({ emoji: HEART, user_id: BOB }); // stored canonical
    expect((await rows()).filter((r) => r.emoji === BARE_HEART)).toHaveLength(0);

    bob.hook.unmount();
    const again = openAs(BOB); // reload
    await waitFor(() => expect(again.hook.result.current.reactionSummary.filter((r) => r.emoji.startsWith(BARE_HEART))).toEqual([expect.objectContaining({ emoji: HEART, count: 2, hasUserReacted: true })]));
    const chips = render(<again.Chips />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: `2 ${HEART} reactions` }));
    });
    await waitFor(async () => expect(await rows()).not.toContainEqual({ emoji: HEART, user_id: BOB }));
    expect(await rows()).toContainEqual({ emoji: HEART, user_id: ALICE }); // the existing reaction is kept
    chips.unmount();
    again.hook.unmount();
    console.log('[web] bare heart stored canonical, one chip (count 2), Bob toggled only his own heart off');
  });

  it('a seventh distinct emoji is refused by the database with the cap message; removal still works', async () => {
    const alice = openAs(ALICE);
    await waitFor(() => expect(alice.hook.result.current.loading).toBe(false));
    const mine = async () => new Set((await rows()).filter((r) => r.user_id === ALICE).map((r) => r.emoji));
    for (const e of ['\u{1F525}', '\u{1F33B}', '\u26BD', '\u{1F600}', '\u{1F44B}', '\u{1F436}']) {
      if ((await mine()).size >= 6) break;
      if (!(await mine()).has(e)) await act(async () => { await alice.hook.result.current.addReaction(e); });
    }
    expect((await mine()).size).toBe(6);
    notifyError.mockClear();
    await act(async () => {
      await alice.hook.result.current.addReaction('\u{1F34F}');
    });
    expect(notifyError).toHaveBeenCalledWith('chatNative.reactions.capReached');
    expect((await mine()).size).toBe(6);
    expect((await mine()).has('\u{1F34F}')).toBe(false);
    await act(async () => {
      await alice.hook.result.current.removeReaction('\u{1F600}');
    });
    expect((await mine()).has('\u{1F600}')).toBe(false);
    alice.hook.unmount();
    console.log('[web] seventh distinct emoji refused (reaction_cap_reached -> cap message); removal under the cap works');
  });
});
