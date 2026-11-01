/**
 * VTID-05320 (messenger-ux-v2/ui-send-status) — optimistic send, statuses and
 * one-tap retry in useGlobalMessages, over mocked gateway / Supabase / Realtime.
 *
 *   - a send shows at once; a network error leaves it "failed" with its text
 *     (no throw, so the composer stays cleared);
 *   - Retry re-posts the SAME client_message_id; a duplicate answer reconciles
 *     to exactly one row and never asks Vitana twice;
 *   - two quick sends keep their order; a realtime echo / refetch of a sent
 *     message never shows it twice;
 *   - after a reload a pending item is re-posted once with its original id and a
 *     failed one shows with Retry; another member never sees it;
 *   - a fallback insert row (other server id) replaces the optimistic bubble;
 *   - DMs get delivered / read from realtime UPDATEs, never backwards; received
 *     DMs are reported to /chat/delivered; DM mentions travel as content_data.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const ME = '11111111-1111-4111-8111-111111111111';
const PEER = '22222222-2222-4222-8222-222222222222';

let currentUser: { id: string; user_metadata: Record<string, unknown>; app_metadata: Record<string, unknown> } | null;
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: currentUser }) }));
vi.mock('@/hooks/useRole', () => ({ useRole: () => ({ dbRole: 'community', currentRole: 'community' }) }));
vi.mock('./useRole', () => ({ useRole: () => ({ dbRole: 'community', currentRole: 'community' }) }));
vi.mock('@/lib/pushNotifications', () => ({ notifyNewMessage: vi.fn() }));
vi.mock('@/lib/appilix', () => ({ isAppilix: () => false }));

// Supabase: every table read is empty; the fallback insert is scripted per test.
const fallbackInsert = vi.fn();
function chain(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable query-builder stub
  const c: any = {
    select: () => c, eq: () => c, in: () => c, or: () => c, order: () => c, limit: () => c, lt: () => c,
    gt: () => c, is: () => c, not: () => c, neq: () => c, update: () => c, upsert: () => c,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
    insert: (row: unknown) => {
      if (table !== 'chat_messages') return c;
      return { select: () => ({ single: () => Promise.resolve(fallbackInsert(row)) }) };
    },
    then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
  };
  return c;
}
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => chain(t),
    rpc: () => Promise.resolve({ data: null, error: null }),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

// Realtime: capture the handlers so tests can play INSERT / UPDATE events.
const handlers: Record<string, (p: { new: unknown }) => void> = {};
vi.mock('@/integrations/supabase/realtime', () => ({
  realtimeChannel: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- channel stub
    const ch: any = {
      on: (_kind: string, filter: { event: string; filter?: string }, cb: (p: { new: unknown }) => void) => {
        handlers[`${filter.event}:${filter.filter ?? ''}`] = cb;
        return ch;
      },
      subscribe: (cb?: (s: string) => void) => { cb?.('SUBSCRIBED'); return ch; },
    };
    return ch;
  },
  removeRealtimeChannel: vi.fn(),
}));

const sendChatMessage = vi.fn();
const markMessagesDelivered = vi.fn().mockResolvedValue(1);
const requestVitanaReply = vi.fn().mockResolvedValue(null);
let serverRows: unknown[] = [];
vi.mock('./useChatApi', () => ({
  fetchConversations: () => Promise.resolve([{ peer_id: '22222222-2222-4222-8222-222222222222', last_message: { id: 'x', sender_id: '22222222-2222-4222-8222-222222222222', receiver_id: '11111111-1111-4111-8111-111111111111', content: 'hey', created_at: '2026-10-21T09:00:00.000Z', read_at: null } }]),
  fetchConversation: () => Promise.resolve(serverRows),
  sendChatMessage: (...a: unknown[]) => sendChatMessage(...a),
  requestVitanaReply: (...a: unknown[]) => requestVitanaReply(...a),
  markChatRead: vi.fn().mockResolvedValue(undefined),
  markAllChatRead: vi.fn().mockResolvedValue(undefined),
  markMessagesDelivered: (...a: unknown[]) => markMessagesDelivered(...a),
}));

import { useGlobalMessages, patchDeliveryState, type GlobalMessage } from './useGlobalMessages';
import { loadOutbox, saveOutbox, clearOutbox, newClientMessageId, __resetOutboxStoresForTests } from '@/lib/messaging/outbox';

function wrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
function setup(threadId: string | null = PEER, qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const r = renderHook(() => useGlobalMessages(threadId, true), { wrapper: wrapper(qc) });
  return { ...r, qc };
}
let seq = 0;
function serverRow(content: string, cid: string | null, over: Record<string, unknown> = {}) {
  seq += 1;
  return { id: `srv-${seq}`, tenant_id: 't', sender_id: ME, receiver_id: PEER, content, created_at: new Date(Date.UTC(2026, 9, 21, 10, 0, seq)).toISOString(), read_at: null, delivered_at: null, client_message_id: cid, ...over };
}
const bodies = (m: GlobalMessage[]) => m.map((x) => `${x.body}:${x.send_status ?? 'server'}`);
// VTID-05320: an outbox item older than OUTBOX_MAX_AGE_MS (7 days) is pruned on
// load, so a reload seed must be recent — a fixed past date becomes a time bomb
// once the suite runs more than 7 days later. Two instants, ordered.
const RECENT_1 = new Date(Date.now() - 120_000).toISOString();
const RECENT_2 = new Date(Date.now() - 119_000).toISOString();

beforeEach(() => {
  __resetOutboxStoresForTests();
  localStorage.clear();
  clearOutbox(ME);
  clearOutbox('someone-else');
  currentUser = { id: ME, user_metadata: {}, app_metadata: {} };
  serverRows = [];
  sendChatMessage.mockReset();
  fallbackInsert.mockReset();
  markMessagesDelivered.mockClear();
  requestVitanaReply.mockClear();
  for (const k of Object.keys(handlers)) delete handlers[k];
});

describe('send → failed → retry (same client_message_id)', () => {
  it('shows the message at once, marks it failed on a network error, and Retry re-posts the same id', async () => {
    sendChatMessage.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fallbackInsert.mockReturnValue({ data: null, error: { code: 'NET', message: 'offline' } });
    currentUser!.app_metadata = { active_tenant_id: 't' };
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.sendMessage({ threadId: PEER, content: 'hello there', queued: true });
    });
    expect(returned).toBeTruthy(); // never throws → composer stays cleared
    await waitFor(() => expect(bodies(result.current.messages)).toEqual(['hello there:failed']));
    const cid = (sendChatMessage.mock.calls[0][2] as { clientMessageId: string }).clientMessageId;
    expect(cid).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.current.messages[0].client_message_id).toBe(cid);

    sendChatMessage.mockResolvedValueOnce(serverRow('hello there', cid));
    await act(async () => { await result.current.retryMessage(cid); });
    expect((sendChatMessage.mock.calls[1][2] as { clientMessageId: string }).clientMessageId).toBe(cid);
    await waitFor(() => expect(bodies(result.current.messages)).toEqual(['hello there:server']));
    expect(loadOutbox(ME)).toEqual([]);
  });

  it('a duplicate answer reconciles to one row and never asks Vitana twice', async () => {
    const { result } = setup('00000000-0000-0000-0000-000000000001');
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    sendChatMessage.mockImplementation(async (_to: string, body: string, opts: { clientMessageId: string }) =>
      ({ ...serverRow(body, opts.clientMessageId, { receiver_id: '00000000-0000-0000-0000-000000000001' }), duplicate: true }));
    await act(async () => { await result.current.sendMessage({ threadId: '00000000-0000-0000-0000-000000000001', content: 'hi vitana', queued: true }); });
    await waitFor(() => expect(bodies(result.current.messages)).toEqual(['hi vitana:server']));
    expect(requestVitanaReply).not.toHaveBeenCalled();
  });

  it('two quick sends keep their order and the composer is never blocked', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    const resolvers: Array<() => void> = [];
    sendChatMessage.mockImplementation((_to: string, body: string, opts: { clientMessageId: string }) =>
      new Promise((res) => resolvers.push(() => res(serverRow(body, opts.clientMessageId)))));
    await act(async () => {
      await result.current.sendMessage({ threadId: PEER, content: 'one', queued: true });
      await result.current.sendMessage({ threadId: PEER, content: 'two', queued: true });
    });
    expect(result.current.isSending).toBe(false);
    expect(bodies(result.current.messages)).toEqual(['one:sending', 'two:sending']);
    // One POST at a time per conversation, in send order.
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(sendChatMessage.mock.calls[0][1]).toBe('one');
    await act(async () => { resolvers[0](); });
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(2));
    expect(sendChatMessage.mock.calls[1][1]).toBe('two');
    await act(async () => { resolvers[1](); });
    await waitFor(() => expect(result.current.messages.map((m) => m.body)).toEqual(['one', 'two']));
    expect(result.current.messages.every((m) => !m.send_status)).toBe(true);
  });

  it('a fallback insert row with another server id replaces the optimistic bubble', async () => {
    currentUser!.app_metadata = { active_tenant_id: 't' };
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    sendChatMessage.mockRejectedValueOnce(new Error('Gateway 502'));
    fallbackInsert.mockImplementation((row: { client_message_id: string; content: string }) =>
      ({ data: serverRow(row.content, row.client_message_id, { id: 'fallback-77' }), error: null }));
    await act(async () => { await result.current.sendMessage({ threadId: PEER, content: 'via fallback', queued: true }); });
    await waitFor(() => expect(result.current.messages.map((m) => `${m.id}:${m.send_status ?? ''}`)).toEqual(['fallback-77:']));
    expect(fallbackInsert.mock.calls[0][0]).toMatchObject({ client_message_id: expect.any(String) });
  });

  it('DM mentions travel as content_data (they were dropped for plain text)', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    sendChatMessage.mockImplementation(async (_t: string, b: string, o: { clientMessageId: string }) => serverRow(b, o.clientMessageId));
    const mentions = [{ user_id: PEER, display_name: 'Ana' }];
    await act(async () => { await result.current.sendMessage({ threadId: PEER, content: 'hi @Ana', contentData: { mentions }, queued: true }); });
    expect(sendChatMessage.mock.calls[0][2]).toMatchObject({ contentData: { mentions } });
  });
});

describe('reload', () => {
  it('re-posts a pending item once with its original id and shows a failed one with Retry', async () => {
    const pending = newClientMessageId();
    const failed = newClientMessageId();
    saveOutbox(ME, [
      { client_message_id: pending, user_id: ME, thread_id: PEER, kind: 'dm', body: 'was in flight', message_type: 'text', created_at: RECENT_1, attempts: 1, status: 'sending' },
      { client_message_id: failed, user_id: ME, thread_id: PEER, kind: 'dm', body: 'had failed', message_type: 'text', created_at: RECENT_2, attempts: 1, status: 'failed' },
    ]);
    sendChatMessage.mockImplementation(async (_t: string, b: string, o: { clientMessageId: string }) => serverRow(b, o.clientMessageId));
    const { result } = setup();
    await waitFor(() => expect(bodies(result.current.messages)).toEqual(['was in flight:server', 'had failed:failed']));
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect((sendChatMessage.mock.calls[0][2] as { clientMessageId: string }).clientMessageId).toBe(pending);
  });

  it('another member on the same device never sees it', async () => {
    saveOutbox(ME, [{ client_message_id: newClientMessageId(), user_id: ME, thread_id: PEER, kind: 'dm', body: 'mine', message_type: 'text', created_at: new Date().toISOString(), attempts: 1, status: 'failed' }]);
    currentUser = { id: 'someone-else', user_metadata: {}, app_metadata: {} };
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    expect(result.current.messages).toEqual([]);
  });
});

describe('delivery state', () => {
  it('realtime UPDATEs of my DM move it to delivered, then read, never back', async () => {
    serverRows = [serverRow('sent one', null)];
    const id = (serverRows[0] as { id: string }).id;
    const { result } = setup();
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    const update = handlers[`UPDATE:sender_id=eq.${ME}`];
    expect(update).toBeTypeOf('function');
    act(() => update({ new: { id, sender_id: ME, receiver_id: PEER, delivered_at: '2026-10-21T10:01:00.000Z', read_at: null } }));
    await waitFor(() => expect(result.current.messages[0].delivered_at).toBe('2026-10-21T10:01:00.000Z'));
    act(() => update({ new: { id, sender_id: ME, receiver_id: PEER, delivered_at: '2026-10-21T10:01:00.000Z', read_at: '2026-10-21T10:02:00.000Z' } }));
    await waitFor(() => expect(result.current.messages[0].read_at).toBe('2026-10-21T10:02:00.000Z'));
    act(() => update({ new: { id, sender_id: ME, receiver_id: PEER, delivered_at: null, read_at: null } }));
    expect(result.current.messages[0].read_at).toBe('2026-10-21T10:02:00.000Z');
  });

  it('patchDeliveryState is monotonic and ignores unknown rows', () => {
    const base = [{ id: 'm1', read_at: '2026-10-21T10:02:00.000Z', delivered_at: '2026-10-21T10:01:00.000Z' }] as GlobalMessage[];
    expect(patchDeliveryState(base, { id: 'm1', read_at: null, delivered_at: null })).toBe(base);
    expect(patchDeliveryState(base, { id: 'other', read_at: 'x' })).toBe(base);
  });

  it('a received DM (realtime INSERT) is reported to /chat/delivered; a group row is not', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    const insert = handlers[`INSERT:receiver_id=eq.${ME}`];
    act(() => insert({ new: { id: 'in-1', sender_id: PEER, receiver_id: ME, content: 'yo', created_at: '2026-10-21T10:00:00.000Z' } }));
    act(() => insert({ new: { id: 'grp-1', sender_id: PEER, receiver_id: ME, group_id: 'g1', content: 'g', created_at: '2026-10-21T10:00:00.000Z' } }));
    await waitFor(() => expect(markMessagesDelivered).toHaveBeenCalled(), { timeout: 2000 });
    const ids = markMessagesDelivered.mock.calls.flatMap((c) => c[0] as string[]);
    expect(ids).toContain('in-1');
    expect(ids).not.toContain('grp-1');
  });
});

describe('review fixes', () => {
  it('several mounted instances share one outbox: a reload re-posts once and nothing is overwritten', async () => {
    const pending = newClientMessageId();
    saveOutbox(ME, [{ client_message_id: pending, user_id: ME, thread_id: PEER, kind: 'dm', body: 'was in flight', message_type: 'text', created_at: RECENT_1, attempts: 1, status: 'sending' }]);
    let release: () => void = () => undefined;
    sendChatMessage.mockImplementation((_t: string, b: string, o: { clientMessageId: string }) =>
      new Promise((res) => { release = () => res(serverRow(b, o.clientMessageId)); }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const list = setup(null, qc);          // e.g. the inbox list
    const open = setup(PEER, qc);          // the open conversation
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(1));
    // A new send from the conversation while the re-post is in flight.
    await act(async () => { await open.result.current.sendMessage({ threadId: PEER, content: 'new one', queued: true }); });
    await act(async () => { release(); });
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(2));
    await act(async () => { release(); });
    await waitFor(() => expect(open.result.current.messages.map((m) => m.body)).toEqual(['was in flight', 'new one']));
    expect(sendChatMessage.mock.calls.map((c) => c[1])).toEqual(['was in flight', 'new one']);
    void list;
  });

  it('a legacy group-thread message is never re-posted automatically (no server dedup)', async () => {
    saveOutbox(ME, [{ client_message_id: newClientMessageId(), user_id: ME, thread_id: 'legacy-thread', kind: 'legacy', body: 'g', message_type: 'text', created_at: new Date().toISOString(), attempts: 1, status: 'sending' }]);
    setup('legacy-thread');
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await new Promise((r) => setTimeout(r, 30));
    expect(fallbackInsert).not.toHaveBeenCalled();
    expect(sendChatMessage).not.toHaveBeenCalled();
  });

  it('two Retry taps post once', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    sendChatMessage.mockRejectedValueOnce(new Error('Gateway 502'));
    await act(async () => { await result.current.sendMessage({ threadId: PEER, content: 'x', queued: true }); });
    await waitFor(() => expect(result.current.messages[0]?.send_status).toBe('failed'));
    const cid = result.current.messages[0].client_message_id!;
    let release: () => void = () => undefined;
    sendChatMessage.mockImplementation((_t: string, b: string, o: { clientMessageId: string }) =>
      new Promise((res) => { release = () => res(serverRow(b, o.clientMessageId)); }));
    await act(async () => {
      void result.current.retryMessage(cid);
      void result.current.retryMessage(cid);
    });
    await act(async () => { release(); });
    await waitFor(() => expect(result.current.messages[0].send_status).toBeUndefined());
    expect(sendChatMessage).toHaveBeenCalledTimes(2); // the failed attempt + one retry
  });

  it('offline: the message stays "Sending" and is posted when the connection returns', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await act(async () => { await result.current.sendMessage({ threadId: PEER, content: 'later', queued: true }); });
    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(bodies(result.current.messages)).toEqual(['later:sending']);
    onLine.mockReturnValue(true);
    sendChatMessage.mockImplementation(async (_t: string, b: string, o: { clientMessageId: string }) => serverRow(b, o.clientMessageId));
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(bodies(result.current.messages)).toEqual(['later:server']));
    onLine.mockRestore();
  });

  it('a non-composer caller (e.g. a calendar invite) waits for the stored row and gets an error on failure', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    sendChatMessage.mockImplementationOnce(async (_t: string, b: string, o: { clientMessageId: string }) => serverRow(b, o.clientMessageId, { id: 'srv-real' }));
    let got: { id: string } | undefined;
    await act(async () => { got = (await result.current.sendMessage({ threadId: PEER, content: 'invite', type: 'calendar_invite' })) as { id: string }; });
    expect(got!.id).toBe('srv-real');
    sendChatMessage.mockRejectedValueOnce(new Error('Gateway 502'));
    await expect(act(async () => { await result.current.sendMessage({ threadId: PEER, content: 'boom' }); })).rejects.toThrow('send_failed');
    expect(result.current.messages.some((m) => m.send_status === 'failed')).toBe(false);
  });

  it('an unsent message can be discarded', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isMessagesLoading).toBe(false));
    sendChatMessage.mockRejectedValueOnce(new Error('Gateway 502'));
    await act(async () => { await result.current.sendMessage({ threadId: PEER, content: 'oops', queued: true }); });
    await waitFor(() => expect(result.current.messages[0]?.send_status).toBe('failed'));
    act(() => result.current.discardMessage(result.current.messages[0].client_message_id!));
    expect(result.current.messages).toEqual([]);
    expect(loadOutbox(ME)).toEqual([]);
  });

  it('sign-out clears the member\'s outbox from the device', async () => {
    saveOutbox(ME, [{ client_message_id: newClientMessageId(), user_id: ME, thread_id: PEER, kind: 'dm', body: 'secret', message_type: 'text', created_at: new Date().toISOString(), attempts: 1, status: 'failed' }]);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = renderHook(() => useGlobalMessages(PEER, true), { wrapper: wrapper(qc) });
    await waitFor(() => expect(r.result.current.messages).toHaveLength(1));
    currentUser = null;
    r.rerender();
    await waitFor(() => expect(localStorage.getItem('vitana:chat:outbox:v1:' + ME)).toBeNull());
  });
});

