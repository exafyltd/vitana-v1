/**
 * VTID-05184 — local store rows (N5a, plan change 8).
 *
 * Everything is keyed by (user_id, install_id, kind): one native install is
 * exactly one source. Queued values live only in the encrypted cache database
 * (SQLCipher, cache directory: outside iCloud and Android Auto Backup).
 */
import type { Category } from '../contract/v1/catalogue';
import type { DeletionV1, RecordV1, SourceKind, SyncMode } from '../contract/v1/wire';

export interface Scope {
  user_id: string;
  install_id: string;
  kind: SourceKind;
}

export const scopeKey = (s: Scope): string => `${s.user_id}|${s.install_id}|${s.kind}`;
export const GLOBAL_SCOPE = '*';

export type ItemKind = 'record' | 'series' | 'deletion';

export interface QueueItem {
  record_id: string;
  type: string;
  category: Category;
  kind: ItemKind;
  payload: RecordV1 | DeletionV1;
  hash: string;
  /** Read cycle this item came from (committed-anchor bookkeeping). */
  cycle: number;
  mode: SyncMode;
  /** FIFO order. */
  seq: number;
  /** Series items: interval, for the pre-send band re-check. */
  startMs?: number;
  lengthMs?: number;
}

export interface FrozenBatch {
  batch_id: string;
  items: QueueItem[];
  mode: SyncMode;
  frozen_at: number;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
  /** The exact JSON sent on the first attempt; every retry sends the same bytes. */
  json: string;
  gzip: boolean;
  auth_retried: boolean;
}

export interface CycleRow {
  type: string;
  id: number;
  /** The read anchor reached by this cycle. */
  anchor: string | null;
  /** Items of this cycle not yet acked or dropped. */
  live: number;
}

export interface AnchorRow {
  read_anchor: string | null;
  committed_anchor: string | null;
  next_cycle: number;
  /** First connect (backfill) done for this type. */
  backfilled: boolean;
  /** The window the backfill covered (re-derived on an expired Health Connect token). */
  backfill_from_ms: number | null;
}

export interface LedgerRow {
  type: string;
  hash: string;
  start_ms: number;
  /** Interval length for series items (detects hours that already hold 5-minute buckets). */
  length_ms: number | null;
}

export interface SeriesIndexRow {
  type: string;
  intervals: { startMs: number; lengthMs: number }[];
  deferredHours: number[];
  end_ms: number;
}

export interface SleepIndexRow {
  sample_ids: string[];
  start_ms: number;
  end_ms: number;
  hash: string;
}

export interface DeferralRow {
  type: string;
  start_ms: number;
  length_ms: number;
  due_ms: number;
}

export type Table =
  | 'items'
  | 'batches'
  | 'cycles'
  | 'anchors'
  | 'sent_ledger'
  | 'series_sample_index'
  | 'sleep_session_index'
  | 'deferrals'
  | 'state'
  | 'lease';

export const TABLES: readonly Table[] = [
  'items',
  'batches',
  'cycles',
  'anchors',
  'sent_ledger',
  'series_sample_index',
  'sleep_session_index',
  'deferrals',
  'state',
  'lease',
];

export interface Row<T> {
  key: string;
  value: T;
  ord: number;
}

export interface ListOptions {
  ordMin?: number;
  ordMax?: number;
  limit?: number;
  desc?: boolean;
}

/**
 * The storage primitive. Two implementations: in-memory (tests, and the
 * conformance suite today) and SQLite/SQLCipher (device; the same suite runs
 * against it on G1).
 */
export interface TableDriver {
  get<T>(table: Table, scope: string, key: string): Promise<T | undefined>;
  put<T>(table: Table, scope: string, key: string, value: T, ord?: number): Promise<void>;
  del(table: Table, scope: string, key: string): Promise<void>;
  list<T>(table: Table, scope: string, opts?: ListOptions): Promise<Row<T>[]>;
  count(table: Table, scope: string): Promise<number>;
  deleteScope(table: Table, scope: string): Promise<void>;
  scopes(table: Table): Promise<string[]>;
}
