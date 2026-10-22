/**
 * VTID-05184 — the Health Sync store (N5a, plan change 8): queue with
 * coalescing, one frozen batch per source, read/committed anchors with read
 * cycles, sent_ledger, series_sample_index (35-day TTL + 200,000-row cap),
 * sleep_session_index, deferrals, state and the pass lease. All logic lives
 * here over a TableDriver, so the same code runs on the in-memory driver (CI)
 * and on SQLCipher (device).
 */
import type { Category } from '../contract/v1/catalogue';
import { DAY_MS } from '../time';
import {
  GLOBAL_SCOPE,
  TABLES,
  scopeKey,
  type AnchorRow,
  type CycleRow,
  type DeferralRow,
  type FrozenBatch,
  type LedgerRow,
  type QueueItem,
  type Scope,
  type SeriesIndexRow,
  type SleepIndexRow,
  type TableDriver,
} from './types';

export const SERIES_INDEX_TTL_MS = 35 * DAY_MS;
export const SERIES_INDEX_CAP = 200_000;
export const MAX_QUEUED_ITEMS = 50_000;
const BATCH_KEY = 'current';

const EMPTY_ANCHOR: AnchorRow = { read_anchor: null, committed_anchor: null, next_cycle: 1, backfilled: false, backfill_from_ms: null };

export type NewItem = Omit<QueueItem, 'seq'>;

export class HealthStore {
  constructor(readonly driver: TableDriver) {}

  // ---- state ---------------------------------------------------------------
  async getState<T>(scope: Scope | null, key: string): Promise<T | undefined> {
    return this.driver.get<T>('state', scope ? scopeKey(scope) : GLOBAL_SCOPE, key);
  }

  async setState<T>(scope: Scope | null, key: string, value: T): Promise<void> {
    await this.driver.put('state', scope ? scopeKey(scope) : GLOBAL_SCOPE, key, value);
  }

  private async nextSeq(scope: Scope): Promise<number> {
    const n = ((await this.getState<number>(scope, 'seq')) ?? 0) + 1;
    await this.setState(scope, 'seq', n);
    return n;
  }

  // ---- cycles & anchors ----------------------------------------------------
  async anchor(scope: Scope, type: string): Promise<AnchorRow> {
    return (await this.driver.get<AnchorRow>('anchors', scopeKey(scope), type)) ?? { ...EMPTY_ANCHOR };
  }

  async setAnchor(scope: Scope, type: string, row: AnchorRow): Promise<void> {
    await this.driver.put('anchors', scopeKey(scope), type, row);
  }

  /** Records a finished OS read: the read anchor moves, a new cycle holds the anchor until its items are acked. */
  async openCycle(scope: Scope, type: string, anchor: string | null): Promise<number> {
    const a = await this.anchor(scope, type);
    const id = a.next_cycle;
    await this.setAnchor(scope, type, { ...a, read_anchor: anchor, next_cycle: id + 1 });
    await this.driver.put<CycleRow>('cycles', scopeKey(scope), `${type}:${id}`, { type, id, anchor, live: 0 }, id);
    return id;
  }

  async cycles(scope: Scope, type?: string): Promise<CycleRow[]> {
    const rows = await this.driver.list<CycleRow>('cycles', scopeKey(scope));
    return rows.map((r) => r.value).filter((c) => !type || c.type === type);
  }

  private async adjustLive(scope: Scope, items: readonly Pick<QueueItem, 'type' | 'cycle'>[], delta: number): Promise<void> {
    const counts = new Map<string, number>();
    for (const it of items) counts.set(`${it.type}:${it.cycle}`, (counts.get(`${it.type}:${it.cycle}`) ?? 0) + delta);
    for (const [key, d] of counts) {
      const row = await this.driver.get<CycleRow>('cycles', scopeKey(scope), key);
      if (row) await this.driver.put('cycles', scopeKey(scope), key, { ...row, live: Math.max(0, row.live + d) }, row.id);
    }
  }

  /** Advances committed anchors over every leading cycle whose items are all acked or dropped. */
  async advanceCommitted(scope: Scope, type?: string): Promise<string[]> {
    const advanced: string[] = [];
    const byType = new Map<string, CycleRow[]>();
    for (const c of await this.cycles(scope, type)) {
      const list = byType.get(c.type) ?? [];
      list.push(c);
      byType.set(c.type, list);
    }
    for (const [t, list] of byType) {
      list.sort((a, b) => a.id - b.id);
      let a = await this.anchor(scope, t);
      let moved = false;
      for (const c of list) {
        if (c.live > 0) break;
        a = { ...a, committed_anchor: c.anchor };
        await this.driver.del('cycles', scopeKey(scope), `${t}:${c.id}`);
        moved = true;
      }
      if (moved) {
        await this.setAnchor(scope, t, a);
        advanced.push(t);
      }
    }
    return advanced;
  }

  /**
   * Queue loss (cache purge, corruption): a cycle that still expects live items
   * but none exist any more → the reader restarts from the committed anchor.
   */
  async recoverQueueLoss(scope: Scope): Promise<string[]> {
    const present = new Map<string, number>();
    const count = (it: QueueItem) => present.set(`${it.type}:${it.cycle}`, (present.get(`${it.type}:${it.cycle}`) ?? 0) + 1);
    for (const r of await this.driver.list<QueueItem>('items', scopeKey(scope))) count(r.value);
    const batch = await this.inFlight(scope);
    batch?.items.forEach(count);
    const reset = new Set<string>();
    for (const c of await this.cycles(scope)) {
      if (c.live > 0 && !present.has(`${c.type}:${c.id}`)) reset.add(c.type);
    }
    for (const t of reset) {
      const a = await this.anchor(scope, t);
      for (const c of await this.cycles(scope, t)) await this.driver.del('cycles', scopeKey(scope), `${t}:${c.id}`);
      await this.setAnchor(scope, t, { ...a, read_anchor: a.committed_anchor });
    }
    return [...reset];
  }

  // ---- queue ---------------------------------------------------------------
  /**
   * Adds items. A newer item for the same record_id replaces an older unsent
   * one; an identical one (same hash and kind) is skipped.
   */
  async enqueue(scope: Scope, items: readonly NewItem[]): Promise<{ added: number; replaced: number; skipped: number }> {
    let added = 0;
    let replaced = 0;
    let skipped = 0;
    for (const item of items) {
      const existing = await this.driver.get<QueueItem>('items', scopeKey(scope), item.record_id);
      if (existing && existing.hash === item.hash && existing.kind === item.kind) {
        skipped += 1;
        continue;
      }
      if (existing) {
        await this.adjustLive(scope, [existing], -1);
        replaced += 1;
      } else added += 1;
      const seq = await this.nextSeq(scope);
      await this.driver.put<QueueItem>('items', scopeKey(scope), item.record_id, { ...item, seq }, seq);
      await this.adjustLive(scope, [item], +1);
    }
    return { added, replaced, skipped };
  }

  async queued(scope: Scope, limit?: number): Promise<QueueItem[]> {
    return (await this.driver.list<QueueItem>('items', scopeKey(scope), { limit })).map((r) => r.value);
  }

  async queuedItem(scope: Scope, recordId: string): Promise<QueueItem | undefined> {
    return this.driver.get<QueueItem>('items', scopeKey(scope), recordId);
  }

  async queueSize(scope: Scope): Promise<number> {
    return this.driver.count('items', scopeKey(scope));
  }

  /** Removes queued items (not acked: dropped, moved into a batch or into a deferral). */
  async takeQueued(scope: Scope, recordIds: readonly string[], release: boolean): Promise<QueueItem[]> {
    const out: QueueItem[] = [];
    for (const id of recordIds) {
      const it = await this.driver.get<QueueItem>('items', scopeKey(scope), id);
      if (!it) continue;
      await this.driver.del('items', scopeKey(scope), id);
      out.push(it);
    }
    if (release) await this.adjustLive(scope, out, -1);
    return out;
  }

  /** Releases items that left the system for good (acked or dropped). */
  async release(scope: Scope, items: readonly QueueItem[]): Promise<void> {
    await this.adjustLive(scope, items, -1);
  }

  /** Puts items back at the front of the queue (unless a newer one for the same record_id is queued). */
  async requeue(scope: Scope, items: readonly QueueItem[]): Promise<void> {
    for (const it of items) {
      const newer = await this.driver.get<QueueItem>('items', scopeKey(scope), it.record_id);
      if (newer) {
        await this.adjustLive(scope, [it], -1);
        continue;
      }
      await this.driver.put<QueueItem>('items', scopeKey(scope), it.record_id, it, it.seq);
    }
  }

  /**
   * Purges queued items matching `pred` (and drops them from the frozen
   * batch, which is unfrozen so it is rebuilt without them).
   */
  async purge(scope: Scope, pred: (it: QueueItem) => boolean): Promise<number> {
    let n = 0;
    const drop: QueueItem[] = [];
    for (const r of await this.driver.list<QueueItem>('items', scopeKey(scope))) {
      if (pred(r.value)) {
        await this.driver.del('items', scopeKey(scope), r.key);
        drop.push(r.value);
      }
    }
    const batch = await this.inFlight(scope);
    if (batch && batch.items.some(pred)) {
      const keep = batch.items.filter((it) => !pred(it));
      drop.push(...batch.items.filter(pred));
      await this.deleteBatch(scope);
      await this.requeue(scope, keep);
    }
    n = drop.length;
    await this.release(scope, drop);
    return n;
  }

  // ---- batches -------------------------------------------------------------
  async inFlight(scope: Scope): Promise<FrozenBatch | undefined> {
    return this.driver.get<FrozenBatch>('batches', scopeKey(scope), BATCH_KEY);
  }

  async saveBatch(scope: Scope, b: FrozenBatch): Promise<void> {
    await this.driver.put('batches', scopeKey(scope), BATCH_KEY, b, b.frozen_at);
  }

  async deleteBatch(scope: Scope): Promise<void> {
    await this.driver.del('batches', scopeKey(scope), BATCH_KEY);
  }

  /** Unfreezes the batch: its items go back to the queue (rebuilt later with a new batch_id). */
  async unfreeze(scope: Scope): Promise<QueueItem[]> {
    const b = await this.inFlight(scope);
    if (!b) return [];
    await this.deleteBatch(scope);
    await this.requeue(scope, b.items);
    return b.items;
  }

  // ---- sent_ledger -----------------------------------------------------------
  async ledgerGet(scope: Scope, recordId: string): Promise<LedgerRow | undefined> {
    return this.driver.get<LedgerRow>('sent_ledger', scopeKey(scope), recordId);
  }

  async ledgerPut(scope: Scope, recordId: string, row: LedgerRow): Promise<void> {
    await this.driver.put('sent_ledger', scopeKey(scope), recordId, row, row.start_ms);
  }

  async ledgerDelete(scope: Scope, recordId: string): Promise<void> {
    await this.driver.del('sent_ledger', scopeKey(scope), recordId);
  }

  async ledgerRange(scope: Scope, type: string, fromMs: number, toMs: number): Promise<{ record_id: string; row: LedgerRow }[]> {
    const rows = await this.driver.list<LedgerRow>('sent_ledger', scopeKey(scope), { ordMin: fromMs, ordMax: toMs });
    return rows.filter((r) => r.value.type === type).map((r) => ({ record_id: r.key, row: r.value }));
  }

  /** Keeps at least the backfill window + 30 days. */
  async ledgerPrune(scope: Scope, beforeMs: number): Promise<number> {
    const rows = await this.driver.list<LedgerRow>('sent_ledger', scopeKey(scope), { ordMax: beforeMs });
    for (const r of rows) await this.driver.del('sent_ledger', scopeKey(scope), r.key);
    return rows.length;
  }

  // ---- series_sample_index ---------------------------------------------------
  async indexPut(scope: Scope, sampleId: string, row: SeriesIndexRow): Promise<void> {
    await this.driver.put('series_sample_index', scopeKey(scope), sampleId, row, row.end_ms);
  }

  async indexTake(scope: Scope, sampleId: string): Promise<SeriesIndexRow | undefined> {
    const row = await this.driver.get<SeriesIndexRow>('series_sample_index', scopeKey(scope), sampleId);
    if (row) await this.driver.del('series_sample_index', scopeKey(scope), sampleId);
    return row;
  }

  async indexCount(scope: Scope): Promise<number> {
    return this.driver.count('series_sample_index', scopeKey(scope));
  }

  /** TTL sweep (35 days from the sample's end) and the hard cap (oldest first). */
  async indexSweep(scope: Scope, nowMs: number, cap = SERIES_INDEX_CAP, ttlMs = SERIES_INDEX_TTL_MS): Promise<{ expired: number; evicted: number }> {
    const sk = scopeKey(scope);
    const expired = await this.driver.list('series_sample_index', sk, { ordMax: nowMs - ttlMs });
    for (const r of expired) await this.driver.del('series_sample_index', sk, r.key);
    const count = await this.driver.count('series_sample_index', sk);
    let evicted = 0;
    if (count > cap) {
      const oldest = await this.driver.list('series_sample_index', sk, { limit: count - cap });
      for (const r of oldest) await this.driver.del('series_sample_index', sk, r.key);
      evicted = oldest.length;
    }
    return { expired: expired.length, evicted };
  }

  // ---- sleep_session_index ---------------------------------------------------
  async sleepSessions(scope: Scope): Promise<{ record_id: string; row: SleepIndexRow }[]> {
    return (await this.driver.list<SleepIndexRow>('sleep_session_index', scopeKey(scope))).map((r) => ({ record_id: r.key, row: r.value }));
  }

  async sleepPut(scope: Scope, recordId: string, row: SleepIndexRow): Promise<void> {
    await this.driver.put('sleep_session_index', scopeKey(scope), recordId, row, row.start_ms);
  }

  async sleepDelete(scope: Scope, recordId: string): Promise<void> {
    await this.driver.del('sleep_session_index', scopeKey(scope), recordId);
  }

  // ---- deferrals -------------------------------------------------------------
  async deferPut(scope: Scope, row: DeferralRow): Promise<void> {
    await this.driver.put('deferrals', scopeKey(scope), `${row.type}:${row.start_ms}:${row.length_ms}`, row, row.due_ms);
  }

  async deferrals(scope: Scope, dueBeforeMs?: number): Promise<DeferralRow[]> {
    return (await this.driver.list<DeferralRow>('deferrals', scopeKey(scope), dueBeforeMs === undefined ? {} : { ordMax: dueBeforeMs })).map((r) => r.value);
  }

  async deferDelete(scope: Scope, row: DeferralRow): Promise<void> {
    await this.driver.del('deferrals', scopeKey(scope), `${row.type}:${row.start_ms}:${row.length_ms}`);
  }

  // ---- lease (one pass at a time across background and foreground) ----------
  async tryLease(owner: string, nowMs: number, ttlMs: number): Promise<boolean> {
    const cur = await this.driver.get<{ owner: string; until: number }>('lease', GLOBAL_SCOPE, 'pass');
    if (cur && cur.owner !== owner && cur.until > nowMs) return false;
    await this.driver.put('lease', GLOBAL_SCOPE, 'pass', { owner, until: nowMs + ttlMs });
    return true;
  }

  async releaseLease(owner: string): Promise<void> {
    const cur = await this.driver.get<{ owner: string }>('lease', GLOBAL_SCOPE, 'pass');
    if (cur?.owner === owner) await this.driver.del('lease', GLOBAL_SCOPE, 'pass');
  }

  // ---- scoped wipes ----------------------------------------------------------
  /**
   * Withdrawal / not consented for one category on THIS source only: queued
   * records (not deletions) purged, anchors and change tokens reset, index and
   * deferral rows of its types removed, ledger rows of its types cleared.
   */
  async resetCategory(scope: Scope, category: Category, types: readonly string[]): Promise<number> {
    const purged = await this.purge(scope, (it) => it.category === category && it.kind !== 'deletion');
    const sk = scopeKey(scope);
    for (const t of types) {
      await this.driver.del('anchors', sk, t);
      for (const c of await this.cycles(scope, t)) await this.driver.del('cycles', sk, `${t}:${c.id}`);
    }
    const typeSet = new Set(types);
    for (const r of await this.driver.list<SeriesIndexRow>('series_sample_index', sk)) if (typeSet.has(r.value.type)) await this.driver.del('series_sample_index', sk, r.key);
    for (const r of await this.driver.list<DeferralRow>('deferrals', sk)) if (typeSet.has(r.value.type)) await this.driver.del('deferrals', sk, r.key);
    for (const r of await this.driver.list<LedgerRow>('sent_ledger', sk)) if (typeSet.has(r.value.type)) await this.driver.del('sent_ledger', sk, r.key);
    if (category === 'sleep') await this.driver.deleteScope('sleep_session_index', sk);
    return purged;
  }

  /** Every row of one source (sign-out of that member). */
  async wipeScope(scope: Scope): Promise<void> {
    for (const t of TABLES) await this.driver.deleteScope(t, scopeKey(scope));
  }

  /** Deletes every member's rows except `keepUserId`'s (a different member signed in). */
  async wipeOtherMembers(keepUserId: string | null): Promise<number> {
    let n = 0;
    for (const t of TABLES) {
      for (const s of await this.driver.scopes(t)) {
        if (s === GLOBAL_SCOPE) continue;
        if (keepUserId && s.startsWith(`${keepUserId}|`)) continue;
        await this.driver.deleteScope(t, s);
        n += 1;
      }
    }
    return n;
  }
}

export const queueFull = (size: number) => size >= MAX_QUEUED_ITEMS;
