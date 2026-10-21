/**
 * VTID-05320 (messenger-ux-v2/ui-send-status) — the send outbox.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadOutbox,
  saveOutbox,
  upsertItem,
  removeItem,
  mergeOutbox,
  reconcileByClientId,
  clearOutbox,
  outboxKey,
  tempIdFor,
  newClientMessageId,
  OUTBOX_MAX_AGE_MS,
  type OutboxItem,
} from './outbox';

const A = 'user-a';
const B = 'user-b';

function item(over: Partial<OutboxItem> = {}): OutboxItem {
  return {
    client_message_id: newClientMessageId(),
    user_id: A,
    thread_id: 'peer-1',
    kind: 'dm',
    body: 'hello',
    message_type: 'text',
    created_at: new Date().toISOString(),
    attempts: 0,
    status: 'sending',
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  clearOutbox(A);
  clearOutbox(B);
  vi.restoreAllMocks();
});

describe('client ids', () => {
  it('are RFC 4122 v4 UUIDs and unique', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newClientMessageId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('persistence', () => {
  it('keeps a member\'s DM items across a reload, under their own key', () => {
    const i = item({ status: 'failed' });
    saveOutbox(A, [i]);
    expect(localStorage.getItem(outboxKey(A))).toContain(i.client_message_id);
    expect(loadOutbox(A).map((x) => x.client_message_id)).toEqual([i.client_message_id]);
  });

  it('never loads one member\'s items for another member', () => {
    saveOutbox(A, [item()]);
    expect(loadOutbox(B)).toEqual([]);
    // Even a tampered key holding A's item is filtered by user_id.
    localStorage.setItem(outboxKey(B), localStorage.getItem(outboxKey(A))!);
    expect(loadOutbox(B)).toEqual([]);
  });

  it('drops items older than 7 days', () => {
    const old = item({ created_at: new Date(Date.now() - OUTBOX_MAX_AGE_MS - 1000).toISOString() });
    const fresh = item();
    saveOutbox(A, [old, fresh]);
    expect(loadOutbox(A).map((x) => x.client_message_id)).toEqual([fresh.client_message_id]);
  });

  it('keeps legacy group-thread items in memory only (no server dedup to re-post safely)', () => {
    const legacy = item({ kind: 'legacy' });
    saveOutbox(A, [legacy]);
    expect(localStorage.getItem(outboxKey(A))).toBeNull();
    expect(loadOutbox(A).map((x) => x.client_message_id)).toEqual([legacy.client_message_id]);
  });

  it('falls back to memory when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const i = item();
    expect(() => saveOutbox(A, [i])).not.toThrow();
    expect(loadOutbox(A).map((x) => x.client_message_id)).toEqual([i.client_message_id]);
  });

  it('is cleared on sign-out', () => {
    saveOutbox(A, [item(), item({ kind: 'legacy' })]);
    clearOutbox(A);
    expect(loadOutbox(A)).toEqual([]);
  });
});

describe('rendering and reconciliation', () => {
  it('appends the open thread\'s unsent items after its server rows, in send order', () => {
    const first = item({ created_at: '2026-10-21T10:00:00.000Z' });
    const second = item({ created_at: '2026-10-21T10:00:01.000Z', status: 'failed' });
    const other = item({ thread_id: 'peer-2' });
    let items: OutboxItem[] = [];
    items = upsertItem(items, second);
    items = upsertItem(items, first);
    items = upsertItem(items, other);
    const rows = mergeOutbox([{ id: 'srv-1' }], items, 'peer-1');
    expect(rows.map((r) => r.id)).toEqual(['srv-1', tempIdFor(first.client_message_id), tempIdFor(second.client_message_id)]);
    expect((rows[2] as { send_status: string }).send_status).toBe('failed');
  });

  it('hides an item whose real row already arrived (realtime echo / refetch)', () => {
    const i = item();
    const rows = mergeOutbox([{ id: 'srv-1', client_message_id: i.client_message_id }], [i], 'peer-1');
    expect(rows.map((r) => r.id)).toEqual(['srv-1']);
  });

  it('reconciles by client id, whatever server id the row got (gateway or fallback insert)', () => {
    const cid = newClientMessageId();
    const cached = [{ id: 'srv-0' }, { id: tempIdFor(cid), client_message_id: cid }];
    const real = { id: 'fallback-row-77', client_message_id: cid };
    expect(reconcileByClientId(cached, real, cid).map((r) => r.id)).toEqual(['srv-0', 'fallback-row-77']);
    // A second copy (duplicate answer) never adds another row.
    expect(reconcileByClientId([...cached.slice(0, 1), real], real, cid).map((r) => r.id)).toEqual(['srv-0', 'fallback-row-77']);
  });

  it('removeItem drops exactly that send', () => {
    const a = item();
    const b = item();
    expect(removeItem([a, b], a.client_message_id)).toEqual([b]);
  });
});
