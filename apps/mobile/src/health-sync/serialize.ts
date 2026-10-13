/**
 * VTID-05184 — wire items and batch bodies (N5a, plan changes 7–8).
 *
 * Pure. Field order follows the golden fixtures, so the JSON is byte-identical
 * to `golden.json` for the same inputs.
 */
import type { CatalogueEntry } from './contract/v1/catalogue';
import { CONTRACT_VERSION, type BatchV1, type DeletionV1, type RecordV1, type SleepStageV1, type SourceV1, type StatsV1, type SyncMode } from './contract/v1/wire';
import { seriesRecordId } from './aggregate';
import { isoLocal, isoUtc, isoUtcSeconds, MINUTE_MS } from './time';
import { clean } from './units';

export function seriesItem(entry: CatalogueEntry, startMs: number, lengthMs: number, payload: { value: number } | { stats: StatsV1 }, tz: string): RecordV1 {
  const item: RecordV1 = { record_id: seriesRecordId(entry.type, startMs), type: entry.type } as RecordV1;
  if ('value' in payload) item.value = clean(payload.value);
  else item.stats = payload.stats;
  item.unit = entry.unit;
  item.start = isoUtcSeconds(startMs);
  item.end = isoUtc(startMs + lengthMs);
  item.tz = tz;
  return item;
}

export interface RecordInput {
  id: string;
  startMs: number;
  endMs: number;
  value: number;
  tz: string;
  origin?: string;
  stages?: { stage: SleepStageV1['stage']; startMs: number; endMs: number }[];
}

export function recordItem(entry: CatalogueEntry, r: RecordInput): RecordV1 {
  const item: RecordV1 = {
    record_id: r.id,
    type: entry.type,
    value: clean(r.value),
    unit: entry.unit,
    start: isoLocal(r.startMs, r.tz),
    end: isoLocal(r.endMs, r.tz),
    tz: r.tz,
  };
  if (r.origin) item.origin_app_id = r.origin.slice(0, 256);
  if (r.stages && r.stages.length > 0) {
    item.stages = r.stages.map((s) => ({ stage: s.stage, start: isoLocal(s.startMs, r.tz), end: isoLocal(s.endMs, r.tz) }));
  }
  return item;
}

/** Sleep session: value = end − start in minutes (golden fixture; open question 5). */
export function sleepItem(entry: CatalogueEntry, r: Omit<RecordInput, 'value'>): RecordV1 {
  return recordItem(entry, { ...r, value: (r.endMs - r.startMs) / MINUTE_MS });
}

export function deletionItem(type: string, recordId: string): DeletionV1 {
  return { record_id: recordId, type };
}

export type RunningOs = string;

export interface DeviceInfo {
  install_id: string;
  os_version: string;
  app_version: string;
  manufacturer?: string | null;
  model?: string | null;
}

/**
 * The only producer of `source` (plan change 8, F1 backstop): iOS → Apple
 * Health, Android → Health Connect, anything else throws.
 */
export function sourceFor(os: RunningOs, info: DeviceInfo): SourceV1 {
  let base: Pick<SourceV1, 'kind' | 'platform'>;
  if (os === 'ios') base = { kind: 'apple_health', platform: 'ios' };
  else if (os === 'android') base = { kind: 'health_connect', platform: 'android' };
  else throw new Error(`Health Sync runs on iOS and Android only (got ${os}).`);
  const src: SourceV1 = {
    kind: base.kind,
    install_id: info.install_id,
    platform: base.platform,
    os_version: String(info.os_version).slice(0, 32) || 'unknown',
    app_version: String(info.app_version).slice(0, 32) || 'unknown',
  };
  const device: { manufacturer?: string; model?: string } = {};
  if (info.manufacturer) device.manufacturer = info.manufacturer.slice(0, 64);
  if (info.model) device.model = info.model.slice(0, 64);
  if (device.manufacturer || device.model) src.device = device;
  return src;
}

export class SourceMismatchError extends Error {
  readonly code = 'client_error';
}

/** Refuses a batch whose kind/platform pair is not one of the two, or not the running OS. */
export function assertSourceConsistent(batch: Pick<BatchV1, 'source'>, runningOs: RunningOs): void {
  const { kind, platform } = batch.source;
  const ok = (kind === 'apple_health' && platform === 'ios') || (kind === 'health_connect' && platform === 'android');
  if (!ok) throw new SourceMismatchError(`source ${kind}/${platform} is not a valid pair`);
  if (platform !== runningOs) throw new SourceMismatchError(`source platform ${platform} is not the running OS ${runningOs}`);
}

export function batchBody(batchId: string, source: SourceV1, mode: SyncMode, records: RecordV1[], deletions: DeletionV1[]): BatchV1 {
  return { contract_version: CONTRACT_VERSION, batch_id: batchId, source, sync_mode: mode, records, deletions };
}

/** 53-bit content hash (cyrb53) for change detection against `sent_ledger`. Not a security hash. */
export function contentHash(value: unknown): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
