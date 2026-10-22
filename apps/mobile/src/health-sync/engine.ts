/**
 * VTID-05184 — the sync engine (N5a, plan changes 7–9): read changes per type,
 * pre-aggregate, diff against sent_ledger, queue, batch, send and apply every
 * contract answer. Platform-agnostic: it talks to a PlatformReader, the
 * HealthStore and the GatewayClient only.
 */
import { categoryOf, entriesFor, entryFor, type CatalogueEntry, type Category } from './contract/v1/catalogue';
import { LIMITS, type BatchV1, type DeletionV1, type IngestOk, type RecordV1, type SourceV1, type StatsV1, type SyncMode } from './contract/v1/wire';
import {
  FIVE_MIN_MS,
  ONE_HOUR_MS,
  alignDown,
  bucketStats,
  deferralDueMs,
  intervalStillValid,
  intervalsTouched,
  regionsFor,
  seriesRecordId,
  type IntervalKey,
} from './aggregate';
import { DEFAULT_BUDGET, fitBatch, splitPayload, encodeJson, type BatchBudget } from './batcher';
import type { GatewayClient } from './gateway';
import type { AuthPort, ClockPort, LoggerPort } from './ports';
import { RECORD_ACTIONS, NETWORK_BACKOFF, backoffMs, classify, type Classified } from './responses';
import type { PlatformReader, RawSample } from './readers/types';
import { assertSourceConsistent, batchBody, contentHash, deletionItem, recordItem, seriesItem, sleepItem, SourceMismatchError } from './serialize';
import { capStages, groupHealthKitSleep, SLEEP_GROUP_GAP_MIN, SLEEP_SESSION_MAX_H } from './sleep';
import { HealthStore, MAX_QUEUED_ITEMS, SERIES_INDEX_TTL_MS, type NewItem } from './store/store';
import type { FrozenBatch, QueueItem, Scope } from './store/types';
import type { PausedReason } from './state';
import { DAY_MS, HOUR_MS, MINUTE_MS, parseInstant } from './time';

/** Earliest `start` the store accepts (F10). */
export const STORE_EPOCH_MS = Date.UTC(2025, 6, 1);
export const BACKFILL_DAYS = LIMITS.defaultBackfillDays;
/** Health Connect without READ_HEALTH_DATA_HISTORY reaches 30 days before the first grant. */
export const BACKFILL_DAYS_NO_HISTORY = 30;
export const MAX_BATCHES_PER_HOUR = 60;
export const MAX_BATCHES_PER_DAY = 500;
export const DAILY_ITEMS = 50_000;
export const DAILY_ITEMS_GRACE = 250_000;
export const GRACE_DAYS = 7;
export const UNFREEZE_AFTER_MS = 24 * HOUR_MS;
export const FUTURE_TOLERANCE_MS = LIMITS.futureToleranceMinutes * MINUTE_MS;
export const INVALID_STREAK_LIMIT = 3;

export interface EngineDeps {
  store: HealthStore;
  reader: PlatformReader;
  gateway: GatewayClient;
  auth: AuthPort;
  clock: ClockPort;
  logger: LoggerPort;
  source: SourceV1;
  /** The running OS (Platform.OS) — the pre-send source check compares against it. */
  os: string;
  deviceTz: () => string;
  uuid: () => string;
  rand?: () => number;
  sleepGapMin?: number;
  sleepMaxH?: number;
}

export interface EngineHooks {
  onNotConsented(category: Category): void;
  onConsentMap(map: Partial<Record<Category, 'granted' | 'not_granted'>>): void;
  onSourceState(state: string): void;
  onPaused(reason: PausedReason): void;
  onSuccess(at: number): void;
  count(code: string, n?: number): void;
  flag(name: 'contract_mismatch' | 'client_error', details?: string[]): void;
}

export type SendOutcome = 'sent' | 'idle' | 'wait' | 'stop';

interface Pacing {
  hour: number[];
  day: string;
  dayBatches: number;
  dayItems: number;
  first_sync_at: number | null;
}

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export class SyncEngine {
  budget: BatchBudget = { ...DEFAULT_BUDGET };

  constructor(
    readonly deps: EngineDeps,
    readonly hooks: EngineHooks,
  ) {}

  scopeFor(userId: string): Scope {
    return { user_id: userId, install_id: this.deps.source.install_id, kind: this.deps.source.kind };
  }

  private get now() {
    return this.deps.clock.now();
  }

  /** Earliest start ever read: max(now − 400 days, 2025-07-01). */
  minStartMs(now = this.now): number {
    return Math.max(now - LIMITS.tooOldDays * DAY_MS, STORE_EPOCH_MS);
  }

  backfillFromMs(history: boolean, now = this.now): number {
    const days = this.deps.reader.platform === 'android' && !history ? BACKFILL_DAYS_NO_HISTORY : BACKFILL_DAYS;
    return Math.max(now - days * DAY_MS, this.minStartMs(now));
  }

  // ---------------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------------

  /** Reads one category's types (only the ones `allowed` by the contract self-check and the OS). */
  async readCategory(scope: Scope, category: Category, opts: { allowedTypes: Set<string>; history: boolean }): Promise<number> {
    let n = 0;
    for (const entry of entriesFor(this.deps.reader.platform, [category])) {
      if (!opts.allowedTypes.has(entry.type)) continue;
      if ((await this.deps.store.queueSize(scope)) >= MAX_QUEUED_ITEMS) {
        this.hooks.count('queue_full');
        break; // the OS keeps the data and the read anchor does not move
      }
      n += await this.readType(scope, entry, opts.history);
    }
    return n;
  }

  async readType(scope: Scope, entry: CatalogueEntry, history: boolean): Promise<number> {
    const { store, reader } = this.deps;
    const now = this.now;
    const a = await store.anchor(scope, entry.type);
    const first = !a.backfilled;
    const backfillFrom = this.backfillFromMs(history, now);
    const window = { fromMs: first ? backfillFrom : this.minStartMs(now), toMs: now };
    let set = await reader.changes(entry, first ? null : a.read_anchor, window);
    let reconcile = first;
    let expiredToken = false;
    if (set.expired) {
      // Expired Health Connect token: re-derive the original backfill window and upload only the diff.
      this.hooks.count('changes_token_expired');
      set = await reader.changes(entry, null, window);
      reconcile = true;
      expiredToken = true;
    }
    const mode: SyncMode = first ? 'backfill' : 'incremental';
    let holdAnchor = false;
    const items: NewItem[] = [];
    const cycle = { id: 0 };
    const reconcileFrom = first ? backfillFrom : a.backfill_from_ms !== null ? Math.max(a.backfill_from_ms, backfillFrom) : backfillFrom;

    if (entry.kind !== 'record') {
      const dirty = new Map<string, IntervalKey>();
      const deferredHours = new Set<number>();
      let unknownDeletion = false;
      for (const u of set.upserts) {
        if (u.endMs < window.fromMs) continue;
        const cov = intervalsTouched(Math.max(u.startMs, window.fromMs), u.endMs, now);
        cov.intervals.forEach((k) => dirty.set(`${k.startMs}:${k.lengthMs}`, k));
        cov.deferredHours.forEach((h) => deferredHours.add(h));
        if (u.endMs > now - SERIES_INDEX_TTL_MS) {
          await store.indexPut(scope, u.id, { type: entry.type, intervals: cov.intervals, deferredHours: cov.deferredHours, end_ms: u.endMs });
        }
      }
      for (const id of set.deletedIds) {
        const row = await store.indexTake(scope, id);
        if (!row) unknownDeletion = true;
        else {
          row.intervals.forEach((k) => dirty.set(`${k.startMs}:${k.lengthMs}`, k));
          row.deferredHours.forEach((h) => deferredHours.add(h));
        }
      }
      if (unknownDeletion) this.hooks.count('series_reconciliation');
      if (reconcile || unknownDeletion) {
        items.push(...(await this.recomputeRange(scope, entry, reconcile ? reconcileFrom : backfillFrom, now, mode, cycle)));
      } else {
        for (const len of [FIVE_MIN_MS, ONE_HOUR_MS]) {
          const keys = [...dirty.values()].filter((k) => k.lengthMs === len).map((k) => k.startMs);
          if (keys.length === 0) continue;
          items.push(...(await this.recomputeRange(scope, entry, Math.min(...keys), Math.max(...keys) + len, mode, cycle)));
        }
      }
      for (const h of deferredHours) await this.deferHour(scope, entry, h);
    } else if (entry.type === 'sleep_session' && reader.platform === 'ios') {
      const r = await this.readHealthKitSleep(scope, entry, set.upserts, set.deletedIds, { reconcile, fromMs: reconcile ? reconcileFrom : window.fromMs, now, mode, cycle });
      items.push(...r.items);
      holdAnchor = r.hold;
    } else {
      let upserts = set.upserts;
      if ((first && !reader.initialChangesIncludeWindow) || expiredToken) {
        // first connect on Health Connect, or an expired token: the window from the OS.
        upserts = await reader.records(entry, reconcileFrom, now);
      }
      if (expiredToken) {
        const current = new Set(upserts.map((u) => u.id));
        for (const { record_id } of await store.ledgerRange(scope, entry.type, reconcileFrom, now + DAY_MS)) {
          if (!current.has(record_id)) items.push(this.deletion(entry, record_id, mode, cycle));
        }
      }
      for (const u of upserts) {
        if (u.startMs < this.minStartMs(now)) continue;
        if (u.endMs > now + FUTURE_TOLERANCE_MS) {
          holdAnchor = true; // read again once it has ended
          continue;
        }
        const item = await this.recordQueueItem(scope, entry, u, mode, cycle);
        if (item) items.push(item);
      }
      for (const id of set.deletedIds) items.push(this.deletion(entry, id, mode, cycle));
    }

    const nextAnchor = holdAnchor ? a.read_anchor : set.nextAnchor;
    cycle.id = await store.openCycle(scope, entry.type, nextAnchor);
    // Backfill goes newest first; incremental changes in time order.
    const dir = mode === 'backfill' ? -1 : 1;
    items.sort((x, y) => dir * ((x.startMs ?? startOf(x)) - (y.startMs ?? startOf(y))));
    await store.enqueue(scope, items.map((it) => ({ ...it, cycle: cycle.id })));
    const after = await store.anchor(scope, entry.type);
    await store.setAnchor(scope, entry.type, { ...after, backfilled: true, backfill_from_ms: after.backfill_from_ms ?? backfillFrom });
    await store.advanceCommitted(scope, entry.type);
    return items.length;
  }

  private deletion(entry: CatalogueEntry, recordId: string, mode: SyncMode, cycle: { id: number }): NewItem {
    const payload = deletionItem(entry.type, recordId);
    return { record_id: recordId, type: entry.type, category: entry.category, kind: 'deletion', payload, hash: `del:${recordId}`, cycle: cycle.id, mode };
  }

  private async unchanged(scope: Scope, recordId: string, hash: string): Promise<boolean> {
    const queued = await this.deps.store.queuedItem(scope, recordId);
    if (queued) return queued.hash === hash;
    return (await this.deps.store.ledgerGet(scope, recordId))?.hash === hash;
  }

  private async recordQueueItem(scope: Scope, entry: CatalogueEntry, u: RawSample, mode: SyncMode, cycle: { id: number }): Promise<NewItem | null> {
    const tz = u.tz ?? this.deps.deviceTz();
    let payload: RecordV1;
    if (entry.type === 'sleep_session') {
      payload = sleepItem(entry, { id: u.id, startMs: u.startMs, endMs: u.endMs, tz, origin: u.origin, stages: u.stages ? capStages(u.stages) : undefined });
    } else {
      if (u.value === undefined) return null;
      payload = recordItem(entry, { id: u.id, startMs: u.startMs, endMs: u.endMs, value: u.value, tz, origin: u.origin });
    }
    const hash = contentHash(payload);
    if (await this.unchanged(scope, u.id, hash)) return null;
    return { record_id: u.id, type: entry.type, category: entry.category, kind: 'record', payload, hash, cycle: cycle.id, mode, startMs: u.startMs };
  }

  /** Defers a band hour unless it already holds 5-minute buckets on the server. */
  private async deferHour(scope: Scope, entry: CatalogueEntry, hourStart: number): Promise<void> {
    const five = await this.deps.store.ledgerRange(scope, entry.type, hourStart, hourStart + ONE_HOUR_MS);
    if (five.some((r) => r.row.length_ms === FIVE_MIN_MS)) {
      this.hooks.count('band_hour_has_5min');
      return;
    }
    await this.deps.store.deferPut(scope, { type: entry.type, start_ms: hourStart, length_ms: ONE_HOUR_MS, due_ms: deferralDueMs(hourStart) });
  }

  /**
   * Recomputes every closed interval in [fromMs, toMs) from the OS and diffs it
   * against the ledger (and the queue): new/changed → item, emptied → deletion,
   * unchanged → nothing. Band hours become deferrals; the open interval a
   * deferral due at its end.
   */
  async recomputeRange(scope: Scope, entry: CatalogueEntry, fromMs: number, toMs: number, mode: SyncMode, cycle: { id: number }): Promise<NewItem[]> {
    const { store, reader } = this.deps;
    const now = this.now;
    const tz = this.deps.deviceTz();
    const out: NewItem[] = [];
    const { regions, deferredHours, openIntervalStart } = regionsFor(Math.max(fromMs, this.minStartMs(now)), toMs, now);
    for (const r of regions) {
      const results = new Map<number, { value: number } | { stats: StatsV1 }>();
      if (entry.kind === 'series_sum') {
        for (const row of await reader.seriesSums(entry, r.fromMs, r.toMs, r.lengthMs)) {
          if (row.value !== 0 && row.startMs % r.lengthMs === 0) results.set(row.startMs, { value: row.value });
        }
      } else {
        for (const [start, stats] of bucketStats(await reader.seriesSamples(entry, r.fromMs, r.toMs), r)) results.set(start, { stats });
      }
      const ledger = await store.ledgerRange(scope, entry.type, r.fromMs, r.toMs);
      // Hours whose data the server already holds as 5-minute buckets are left alone.
      const skipHours = new Set<number>();
      if (r.lengthMs === ONE_HOUR_MS) for (const l of ledger) if (l.row.length_ms === FIVE_MIN_MS) skipHours.add(alignDown(l.row.start_ms, ONE_HOUR_MS));
      for (const [start, payload] of results) {
        if (skipHours.has(start)) continue;
        const item = seriesItem(entry, start, r.lengthMs, payload, tz);
        const hash = contentHash(item);
        if (await this.unchanged(scope, item.record_id, hash)) continue;
        out.push({ record_id: item.record_id, type: entry.type, category: entry.category, kind: 'series', payload: item, hash, cycle: cycle.id, mode, startMs: start, lengthMs: r.lengthMs });
      }
      for (const l of ledger) {
        if (l.row.length_ms !== r.lengthMs || results.has(l.row.start_ms) || skipHours.has(l.row.start_ms)) continue;
        out.push(this.deletion(entry, l.record_id, mode, cycle));
      }
      // A queued (never stored) interval that is now empty simply leaves the queue.
      const emptiedQueued: string[] = [];
      for (const it of await store.queued(scope)) {
        if (it.type === entry.type && it.kind === 'series' && it.lengthMs === r.lengthMs && it.startMs !== undefined && it.startMs >= r.fromMs && it.startMs < r.toMs && !results.has(it.startMs) && !(await store.ledgerGet(scope, it.record_id))) {
          emptiedQueued.push(it.record_id);
        }
      }
      if (emptiedQueued.length) await store.takeQueued(scope, emptiedQueued, true);
    }
    for (const h of deferredHours) await this.deferHour(scope, entry, h);
    if (openIntervalStart !== null) {
      await store.deferPut(scope, { type: entry.type, start_ms: openIntervalStart, length_ms: FIVE_MIN_MS, due_ms: openIntervalStart + FIVE_MIN_MS });
    }
    return out;
  }

  /** HealthKit sleep: regroup stage samples around what changed; regrouping deletes the old record_id. */
  private async readHealthKitSleep(
    scope: Scope,
    entry: CatalogueEntry,
    upserts: RawSample[],
    deletedIds: string[],
    ctx: { reconcile: boolean; fromMs: number; now: number; mode: SyncMode; cycle: { id: number } },
  ): Promise<{ items: NewItem[]; hold: boolean }> {
    const { store, reader } = this.deps;
    const sessions = await store.sleepSessions(scope);
    let affFrom = Infinity;
    let affTo = -Infinity;
    const touch = (s: number, e: number) => {
      affFrom = Math.min(affFrom, s);
      affTo = Math.max(affTo, e);
    };
    upserts.forEach((u) => touch(u.startMs, u.endMs));
    const gone = new Set(deletedIds);
    for (const s of sessions) if (s.row.sample_ids.some((id) => gone.has(id))) touch(s.row.start_ms, s.row.end_ms);
    if (ctx.reconcile) touch(ctx.fromMs, ctx.now);
    if (!Number.isFinite(affFrom)) return { items: [], hold: false };
    const margin = (this.deps.sleepMaxH ?? SLEEP_SESSION_MAX_H) * HOUR_MS;
    const from = Math.max(affFrom - margin, this.minStartMs(ctx.now));
    const samples = await reader.records(entry, from, Math.min(affTo + margin, ctx.now + DAY_MS));
    const grouped = groupHealthKitSleep(
      samples.filter((s) => s.sleepValue !== undefined).map((s) => ({ id: s.id, startMs: s.startMs, endMs: s.endMs, value: s.sleepValue as number, sourceKey: s.sourceKey ?? 'unknown', tz: s.tz, origin: s.origin })),
      { gapMin: this.deps.sleepGapMin ?? SLEEP_GROUP_GAP_MIN, maxH: this.deps.sleepMaxH ?? SLEEP_SESSION_MAX_H },
    );
    if (grouped.overCap) this.hooks.count('sleep_session_over_cap', grouped.overCap);
    const items: NewItem[] = [];
    let hold = false;
    const produced = new Set(grouped.sessions.map((s) => s.record_id));
    for (const s of sessions) {
      const overlaps = s.row.end_ms >= affFrom && s.row.start_ms <= affTo;
      if (overlaps && !produced.has(s.record_id)) {
        items.push(this.deletion(entry, s.record_id, ctx.mode, ctx.cycle));
        await store.sleepDelete(scope, s.record_id);
      }
    }
    for (const g of grouped.sessions) {
      if (g.startMs < this.minStartMs(ctx.now)) continue;
      if (g.endMs > ctx.now + FUTURE_TOLERANCE_MS) {
        hold = true;
        continue;
      }
      const payload = sleepItem(entry, { id: g.record_id, startMs: g.startMs, endMs: g.endMs, tz: g.tz ?? this.deps.deviceTz(), origin: g.origin, stages: capStages(g.stages) });
      const hash = contentHash(payload);
      await store.sleepPut(scope, g.record_id, { sample_ids: g.sampleIds, start_ms: g.startMs, end_ms: g.endMs, hash });
      if (await this.unchanged(scope, g.record_id, hash)) continue;
      items.push({ record_id: g.record_id, type: entry.type, category: entry.category, kind: 'record', payload, hash, cycle: ctx.cycle.id, mode: ctx.mode, startMs: g.startMs });
    }
    return { items, hold };
  }

  /** Due deferrals: re-derived from the OS now (never re-bucketed from stale values). */
  async processDeferrals(scope: Scope, allowedTypes: Set<string>): Promise<number> {
    const { store } = this.deps;
    const now = this.now;
    let n = 0;
    for (const d of await store.deferrals(scope, now + 1)) {
      const entry = entryFor(d.type);
      await store.deferDelete(scope, d);
      if (!entry || !allowedTypes.has(d.type)) continue;
      const a = await store.anchor(scope, d.type);
      const cycle = { id: await store.openCycle(scope, d.type, a.read_anchor) };
      const items = await this.recomputeRange(scope, entry, d.start_ms, d.start_ms + d.length_ms, 'incremental', cycle);
      await store.enqueue(scope, items.map((it) => ({ ...it, cycle: cycle.id })));
      await store.advanceCommitted(scope, d.type);
      n += items.length;
    }
    return n;
  }

  // ---------------------------------------------------------------------------
  // Sending
  // ---------------------------------------------------------------------------

  private async pacing(scope: Scope): Promise<Pacing> {
    const p = (await this.deps.store.getState<Pacing>(scope, 'pacing')) ?? { hour: [], day: dayKey(this.now), dayBatches: 0, dayItems: 0, first_sync_at: null };
    const now = this.now;
    p.hour = p.hour.filter((t) => t > now - HOUR_MS);
    if (p.day !== dayKey(now)) {
      p.day = dayKey(now);
      p.dayBatches = 0;
      p.dayItems = 0;
    }
    return p;
  }

  /** ≤ 60 batches per hour per source (half the gateway's limit) and inside the store's daily quotas (F9, F10). */
  async paced(scope: Scope, items: number): Promise<boolean> {
    const p = await this.pacing(scope);
    const grace = p.first_sync_at !== null && this.now - p.first_sync_at < GRACE_DAYS * DAY_MS;
    if (p.hour.length >= MAX_BATCHES_PER_HOUR) return false;
    if (p.dayBatches >= MAX_BATCHES_PER_DAY) return false;
    if (p.dayItems + items > (grace || p.first_sync_at === null ? DAILY_ITEMS_GRACE : DAILY_ITEMS)) return false;
    return true;
  }

  private async recordSend(scope: Scope, items: number): Promise<void> {
    const p = await this.pacing(scope);
    p.hour.push(this.now);
    p.dayBatches += 1;
    p.dayItems += items;
    if (p.first_sync_at === null) p.first_sync_at = this.now;
    await this.deps.store.setState(scope, 'pacing', p);
  }

  /** Pre-send band re-check: a queued 5-minute item that entered the band becomes a deferral. */
  private async recheckBand(scope: Scope, queue: QueueItem[]): Promise<QueueItem[]> {
    const now = this.now;
    const stale = queue.filter((it) => it.kind === 'series' && it.startMs !== undefined && it.lengthMs !== undefined && !intervalStillValid({ startMs: it.startMs, lengthMs: it.lengthMs }, now));
    if (stale.length === 0) return queue;
    await this.deps.store.takeQueued(scope, stale.map((s) => s.record_id), true);
    for (const s of stale) {
      const entry = entryFor(s.type);
      if (entry) await this.deferHour(scope, entry, alignDown(s.startMs as number, ONE_HOUR_MS));
    }
    this.hooks.count('band_deferred', stale.length);
    const ids = new Set(stale.map((s) => s.record_id));
    return queue.filter((q) => !ids.has(q.record_id));
  }

  /** Freezes the next batch (content + batch_id fixed for every retry). */
  async freeze(scope: Scope): Promise<FrozenBatch | null> {
    const { store } = this.deps;
    let queue = await store.queued(scope, LIMITS.maxRecords + LIMITS.maxDeletions);
    queue = await this.recheckBand(scope, queue);
    if (queue.length === 0) return null;
    const batchId = this.deps.uuid();
    const fit = fitBatch(queue, (sel) => this.body(batchId, sel), this.budget, true);
    if (!fit) return null;
    const taken = await store.takeQueued(scope, fit.items.map((i) => i.record_id), false);
    const b: FrozenBatch = { batch_id: batchId, items: taken, mode: taken[0].mode, frozen_at: this.now, attempts: 0, next_attempt_at: this.now, last_error: null, json: fit.json, gzip: true, auth_retried: false };
    await store.saveBatch(scope, b);
    return b;
  }

  body(batchId: string, items: readonly QueueItem[]): BatchV1 {
    const { records, deletions } = splitPayload(items);
    return batchBody(batchId, this.deps.source, items[0]?.mode ?? 'incremental', records, deletions);
  }

  /** Sends at most one batch. */
  async sendOne(scope: Scope): Promise<SendOutcome> {
    const { store, gateway } = this.deps;
    const now = this.now;
    let b = await store.inFlight(scope);
    if (b && now - b.frozen_at > UNFREEZE_AFTER_MS) {
      // Still unsent after 24 h: rebuilt with a new batch_id (record-level idempotency makes that safe).
      await store.unfreeze(scope);
      b = undefined;
    }
    if (b && b.next_attempt_at > now) return 'wait';
    if (!b) {
      const peek = await store.queued(scope, 1);
      if (peek.length === 0) return 'idle';
      if (!(await this.paced(scope, Math.min(await store.queueSize(scope), LIMITS.maxRecords)))) return 'wait';
      b = (await this.freeze(scope)) ?? undefined;
      if (!b) return 'idle';
    } else if (!(await this.paced(scope, b.items.length))) return 'wait';

    try {
      assertSourceConsistent(JSON.parse(b.json) as BatchV1, this.deps.os);
    } catch (err) {
      if (!(err instanceof SourceMismatchError)) throw err;
      await store.deleteBatch(scope);
      await store.release(scope, b.items);
      this.hooks.flag('client_error');
      this.hooks.onPaused('client_error');
      return 'stop';
    }
    const encoded = encodeJson(b.json, b.gzip);
    const res = await gateway.postBatch(encoded.body, b.gzip);
    await this.recordSend(scope, b.items.length);
    return this.apply(scope, b, classify(res));
  }

  /** Every contract answer → its effect on queue, anchors and state (plan change 9). */
  async apply(scope: Scope, b: FrozenBatch, c: Classified): Promise<SendOutcome> {
    const { store, auth } = this.deps;
    const now = this.now;
    const retryLater = async (delay: number, code: string) => {
      await store.saveBatch(scope, { ...b, attempts: b.attempts + 1, next_attempt_at: now + delay, last_error: code });
      return 'wait' as const;
    };

    if (c.type === 'transport') {
      this.hooks.count(`transport_${c.reason}`);
      return retryLater(backoffMs(b.attempts, NETWORK_BACKOFF.baseMs, NETWORK_BACKOFF.capMs, this.deps.rand), c.reason);
    }
    if (c.type === 'ok') return this.applyOk(scope, b, c.body);

    this.hooks.count(c.code);
    const action = c.action;
    switch (action.kind) {
      case 'drop_invalid': {
        await store.deleteBatch(scope);
        await store.release(scope, b.items);
        await store.advanceCommitted(scope);
        const details = Array.isArray(c.body.details) ? (c.body.details as { path?: string; code?: string }[]).map((d) => `${d.path ?? ''}:${d.code ?? ''}`) : [];
        const streak = ((await store.getState<number>(scope, 'invalid_streak')) ?? 0) + 1;
        await store.setState(scope, 'invalid_streak', streak);
        this.hooks.flag('client_error', details);
        if (streak >= INVALID_STREAK_LIMIT) {
          this.hooks.onPaused('client_error');
          return 'stop';
        }
        return 'sent';
      }
      case 'upgrade_required':
        await store.saveBatch(scope, { ...b, last_error: c.code });
        this.hooks.onPaused('upgrade_required');
        return 'stop';
      case 'refresh_and_retry':
        if (!b.auth_retried && (await auth.refresh())) {
          await store.saveBatch(scope, { ...b, auth_retried: true, last_error: c.code });
          return 'sent';
        }
        await store.saveBatch(scope, { ...b, auth_retried: false, last_error: c.code });
        this.hooks.onPaused('auth_paused');
        return 'stop';
      case 'auth_paused':
        await store.saveBatch(scope, { ...b, last_error: c.code });
        this.hooks.onPaused('auth_paused');
        return 'stop';
      case 'consent_required': {
        await store.deleteBatch(scope);
        await store.release(scope, b.items);
        const cats = (c.body.categories ?? []) as Category[];
        for (const cat of cats) await this.notConsented(scope, cat);
        await store.advanceCommitted(scope);
        return 'sent';
      }
      case 'source_paused':
        await this.pauseSource(scope);
        this.hooks.onPaused('source_paused');
        return 'stop';
      case 'server_disabled':
        await store.saveBatch(scope, { ...b, last_error: c.code });
        this.hooks.onPaused('server_disabled');
        return 'stop';
      case 'rebuild_new_id':
        await store.unfreeze(scope);
        return 'sent';
      case 'split':
        this.budget = {
          maxRecords: Math.max(1, Math.floor(this.budget.maxRecords / 2)),
          maxDeletions: Math.max(1, Math.floor(this.budget.maxDeletions / 2)),
          maxJsonBytes: Math.floor(this.budget.maxJsonBytes / 2),
          maxGzipBytes: Math.floor(this.budget.maxGzipBytes / 2),
        };
        await store.unfreeze(scope);
        return 'sent';
      case 'retry_without_gzip':
        if (b.gzip) {
          await store.saveBatch(scope, { ...b, gzip: false, last_error: c.code });
          return 'sent';
        }
        await store.saveBatch(scope, { ...b, last_error: c.code });
        this.hooks.flag('client_error');
        this.hooks.onPaused('client_error');
        return 'stop';
      case 'retry_after':
        return retryLater(c.retryAfterMs ?? backoffMs(b.attempts, NETWORK_BACKOFF.baseMs, NETWORK_BACKOFF.capMs, this.deps.rand), c.code);
      case 'backoff':
        return retryLater(backoffMs(b.attempts, action.baseMs, action.capMs, this.deps.rand), c.code);
    }
  }

  private async applyOk(scope: Scope, b: FrozenBatch, body: IngestOk): Promise<SendOutcome> {
    const { store } = this.deps;
    const rejected = new Map((body.rejected ?? []).map((r) => [r.record_id, r.code]));
    const done: QueueItem[] = [];
    const requeue: QueueItem[] = [];
    const notConsented = new Set<Category>();
    for (const it of b.items) {
      const code = rejected.get(it.record_id);
      if (!code) {
        if (it.kind === 'deletion') await store.ledgerDelete(scope, it.record_id);
        else {
          const p = it.payload as RecordV1;
          await store.ledgerPut(scope, it.record_id, { type: it.type, hash: it.hash, start_ms: it.startMs ?? parseInstant(p.start), length_ms: it.lengthMs ?? null });
        }
        done.push(it);
        continue;
      }
      this.hooks.count(code);
      const action = RECORD_ACTIONS[code] ?? 'drop';
      if (action === 'requeue_new_batch') requeue.push(it);
      else {
        done.push(it);
        if (action === 'not_consented') notConsented.add(it.category);
        if (action === 'drop_contract_mismatch') this.hooks.flag('contract_mismatch');
      }
    }
    await store.deleteBatch(scope);
    await store.release(scope, done);
    // STORE_UNAVAILABLE per record: re-send in a NEW batch.
    await store.requeue(scope, requeue);
    for (const cat of notConsented) await this.notConsented(scope, cat);
    if (body.consent) this.hooks.onConsentMap(body.consent);
    if (body.source_state) this.hooks.onSourceState(body.source_state);
    await store.setState(scope, 'invalid_streak', 0);
    await store.advanceCommitted(scope);
    this.hooks.onSuccess(this.now);
    return 'sent';
  }

  /** CATEGORY_NOT_CONSENTED / 403 / withdrawal — scoped to (this install's source, that category) only. */
  async notConsented(scope: Scope, category: Category): Promise<void> {
    const types = entriesFor(this.deps.reader.platform, [category]).map((e) => e.type);
    await this.deps.store.resetCategory(scope, category, types);
    this.hooks.onNotConsented(category);
  }

  /** 409 SOURCE_PAUSED: queued records (not deletions) purged, committed anchors kept, readers rewound to them. */
  async pauseSource(scope: Scope): Promise<void> {
    const { store } = this.deps;
    await store.purge(scope, (it) => it.kind !== 'deletion');
    for (const entry of entriesFor(this.deps.reader.platform)) {
      const a = await store.anchor(scope, entry.type);
      for (const c of await store.cycles(scope, entry.type)) await store.driver.del('cycles', `${scope.user_id}|${scope.install_id}|${scope.kind}`, `${entry.type}:${c.id}`);
      await store.setAnchor(scope, entry.type, { ...a, read_anchor: a.committed_anchor });
    }
  }
}

function startOf(it: NewItem): number {
  if (it.kind === 'deletion') return Number.MAX_SAFE_INTEGER;
  return parseInstant((it.payload as RecordV1).start);
}

export function categoriesOfTypes(types: Iterable<string>): Set<Category> {
  const out = new Set<Category>();
  for (const t of types) {
    const c = categoryOf(t);
    if (c) out.add(c);
  }
  return out;
}

export type { DeletionV1 };
