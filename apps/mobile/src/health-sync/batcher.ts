/**
 * VTID-05184 — batch building and gzip (N5a, plan change 8).
 *
 * FIFO, ≤ 1,000 records and ≤ 1,000 deletions, packed against a size budget of
 * 3.8 MB serialised and 480 KB gzipped (margins under the contract's 4 MB /
 * 512 KB). pako 2.1.0 encodes the JSON string itself (TextEncoder when
 * present, else its own UTF-8 encoder), so nothing depends on Hermes having
 * TextEncoder; its Uint8Array output is the fetch body.
 */
import { gzip } from 'pako';
import { LIMITS, type BatchV1, type DeletionV1, type RecordV1 } from './contract/v1/wire';
import type { QueueItem } from './store/types';

export interface BatchBudget {
  maxRecords: number;
  maxDeletions: number;
  maxJsonBytes: number;
  maxGzipBytes: number;
}

export const DEFAULT_BUDGET: BatchBudget = {
  maxRecords: LIMITS.maxRecords,
  maxDeletions: LIMITS.maxDeletions,
  maxJsonBytes: 3_800_000,
  maxGzipBytes: 480 * 1024,
};

/** UTF-8 byte length of a string without TextEncoder. */
export function utf8Length(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i += 1;
    } else n += 3;
  }
  return n;
}

/** Room for the envelope (contract_version, batch_id, source, sync_mode, brackets). */
export const ENVELOPE_BYTES = 1_024;

/**
 * The FIFO prefix that fits: same sync_mode as the first item, within the
 * record/deletion counts and the serialised-size budget.
 */
export function selectBatch(items: readonly QueueItem[], budget: BatchBudget = DEFAULT_BUDGET): QueueItem[] {
  if (items.length === 0) return [];
  const mode = items[0].mode;
  const out: QueueItem[] = [];
  let records = 0;
  let deletions = 0;
  let bytes = ENVELOPE_BYTES;
  for (const it of items) {
    if (it.mode !== mode) continue;
    const size = utf8Length(JSON.stringify(it.payload)) + 1;
    const isDel = it.kind === 'deletion';
    if (isDel ? deletions >= budget.maxDeletions : records >= budget.maxRecords) continue;
    if (bytes + size > budget.maxJsonBytes) break;
    out.push(it);
    bytes += size;
    if (isDel) deletions += 1;
    else records += 1;
    if (records >= budget.maxRecords && deletions >= budget.maxDeletions) break;
  }
  return out;
}

export function splitPayload(items: readonly QueueItem[]): { records: RecordV1[]; deletions: DeletionV1[] } {
  const records: RecordV1[] = [];
  const deletions: DeletionV1[] = [];
  for (const it of items) {
    if (it.kind === 'deletion') deletions.push(it.payload as DeletionV1);
    else records.push(it.payload as RecordV1);
  }
  return { records, deletions };
}

export interface Encoded {
  body: Uint8Array | string;
  contentEncoding: 'gzip' | null;
  jsonBytes: number;
  sentBytes: number;
}

export function encodeJson(json: string, useGzip: boolean): Encoded {
  const jsonBytes = utf8Length(json);
  if (!useGzip) return { body: json, contentEncoding: null, jsonBytes, sentBytes: jsonBytes };
  const body = gzip(json);
  return { body, contentEncoding: 'gzip', jsonBytes, sentBytes: body.length };
}

/** Does an encoded body fit the budget? */
export function fits(e: Encoded, budget: BatchBudget): boolean {
  return e.jsonBytes <= budget.maxJsonBytes && (e.contentEncoding === 'gzip' ? e.sentBytes <= budget.maxGzipBytes : e.sentBytes <= budget.maxGzipBytes);
}

/**
 * Builds the largest FIFO batch whose encoding fits; halves the selection
 * until it does (a single item always fits the contract's own limits).
 */
export function fitBatch(items: readonly QueueItem[], build: (sel: QueueItem[]) => BatchV1, budget: BatchBudget = DEFAULT_BUDGET, useGzip = true): { items: QueueItem[]; json: string; encoded: Encoded } | null {
  let sel = selectBatch(items, budget);
  while (sel.length > 0) {
    const json = JSON.stringify(build(sel));
    const encoded = encodeJson(json, useGzip);
    if (fits(encoded, budget) || sel.length === 1) return { items: sel, json, encoded };
    sel = sel.slice(0, Math.ceil(sel.length / 2));
  }
  return null;
}
