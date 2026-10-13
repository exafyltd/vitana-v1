/**
 * VTID-05100 (Companion Messages, Phase 2) — the Vitana thread sits on top of
 * the inbox only while it has an unread Vitana message; once read it sorts
 * by activity like any other thread.
 */
import { describe, it, expect } from 'vitest';
import { compareInboxThreads, isVitanaThread, type InboxOrderThread } from './inboxThreadOrder';
import { VITANA_BOT_USER_ID } from './vitanaBotIdentity';

const ME = 'me';
const none = new Set<string>();

function thread(id: string, updated_at: string, unread = 0, peer = id): InboxOrderThread {
  return {
    id,
    type: 'direct',
    updated_at,
    unread_count: unread,
    participants: [{ user_id: ME }, { user_id: peer }],
  };
}

const order = (threads: InboxOrderThread[], pinned: Set<string> = none) =>
  [...threads].sort((a, b) => compareInboxThreads(a, b, pinned, ME)).map((t) => t.id);

describe('inbox order — Vitana thread on top while unread (VTID-05100)', () => {
  const alice = thread('alice', '2026-10-13T10:00:00Z', 2);
  const bob = thread('bob', '2026-10-13T09:00:00Z');

  it('lifts an unread Vitana thread above newer threads and pinned threads', () => {
    const vitana = thread(VITANA_BOT_USER_ID, '2026-10-12T06:00:00Z', 1);
    expect(order([alice, bob, vitana])).toEqual([VITANA_BOT_USER_ID, 'alice', 'bob']);
    expect(order([alice, bob, vitana], new Set(['bob']))).toEqual([VITANA_BOT_USER_ID, 'bob', 'alice']);
  });

  it('sorts a read Vitana thread by activity like any other thread', () => {
    const vitanaRead = thread(VITANA_BOT_USER_ID, '2026-10-12T06:00:00Z', 0);
    expect(order([vitanaRead, alice, bob])).toEqual(['alice', 'bob', VITANA_BOT_USER_ID]);
    const vitanaNewest = thread(VITANA_BOT_USER_ID, '2026-10-13T11:00:00Z', 0);
    expect(order([alice, bob, vitanaNewest])).toEqual([VITANA_BOT_USER_ID, 'alice', 'bob']);
  });

  it('keeps the no-messages placeholder (2000-01-01, no unread) at the bottom', () => {
    const placeholder = thread(VITANA_BOT_USER_ID, '2000-01-01T00:00:00.000Z', 0);
    expect(order([placeholder, alice, bob])).toEqual(['alice', 'bob', VITANA_BOT_USER_ID]);
  });

  it('never lifts another unread thread — only Vitana', () => {
    const vitanaRead = thread(VITANA_BOT_USER_ID, '2026-10-13T12:00:00Z', 0);
    const oldUnread = thread('carol', '2026-10-01T00:00:00Z', 5);
    expect(order([oldUnread, vitanaRead])).toEqual([VITANA_BOT_USER_ID, 'carol']);
  });

  it('recognises a Vitana DM by its participant when the thread id is not the bot id', () => {
    const legacy = thread('legacy-uuid', '2026-10-01T00:00:00Z', 1, VITANA_BOT_USER_ID);
    expect(isVitanaThread(legacy, ME)).toBe(true);
    expect(order([alice, legacy])).toEqual(['legacy-uuid', 'alice']);
    const group = { ...legacy, type: 'group' };
    expect(isVitanaThread(group, ME)).toBe(false);
  });
});
