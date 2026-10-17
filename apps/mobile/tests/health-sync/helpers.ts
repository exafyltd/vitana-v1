/**
 * VTID-05184 — test doubles for the Health Sync module: fake HealthKit and
 * Health Connect libraries (in-memory samples, anchors, change tokens), a
 * scripted gateway, a fixed clock and a seeded PRNG. No network, no device.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv2020 from 'ajv/dist/2020';
import { ungzip } from 'pako';
import type { HttpPort, HttpRequest, HttpResponse } from '../../src/health-sync/ports';
import type { HealthKitApi } from '../../src/health-sync/readers/healthkit';
import type { HealthConnectApi } from '../../src/health-sync/readers/health-connect';
import { HealthStore } from '../../src/health-sync/store/store';
import { createMemoryDriver } from '../../src/health-sync/store/memory-driver';
import { SyncEngine, type EngineHooks } from '../../src/health-sync/engine';
import { createGatewayClient } from '../../src/health-sync/gateway';
import { createHealthKitReader } from '../../src/health-sync/readers/healthkit';
import { createHealthConnectReader } from '../../src/health-sync/readers/health-connect';
import { sourceFor } from '../../src/health-sync/serialize';
import type { PlatformReader } from '../../src/health-sync/readers/types';
import type { Category } from '../../src/health-sync/contract/v1/catalogue';
import type { SourceV1 } from '../../src/health-sync/contract/v1/wire';

export const CONTRACT_DIR = join(__dirname, '../../src/health-sync/contract/v1');
export const golden = JSON.parse(readFileSync(join(CONTRACT_DIR, 'golden.json'), 'utf8'));
export const schema = JSON.parse(readFileSync(join(CONTRACT_DIR, 'contract-v1.schema.json'), 'utf8'));
export const GOLDEN_CLOCK = Date.parse(golden.clock);
export const GOLDEN_INSTALL = '0b7f6d52-3a1e-4c2f-8d9a-1e2f3a4b5c6d';
export const G1 = 'https://g1-test.example.org';

const ajv = new Ajv2020({ strict: false, allErrors: true });
export const validateBatch = ajv.compile(schema);

export function goldenCase(name: string) {
  const c = golden.cases.find((x: { name: string }) => x.name === name);
  if (!c) throw new Error(`no golden case ${name}`);
  return c;
}

/** mulberry32 */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class FakeClock {
  constructor(public t: number) {}
  now = () => this.t;
  advance(ms: number) {
    this.t += ms;
  }
}

// ---------------------------------------------------------------------------
// Fake HealthKit
// ---------------------------------------------------------------------------
export interface HkSample {
  uuid: string;
  startDate: Date;
  endDate: Date;
  quantity?: number;
  unit?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  sourceRevision?: { source: { bundleIdentifier: string } };
  [k: string]: unknown;
}

export class FakeHealthKit implements HealthKitApi {
  version = 0;
  samples = new Map<string, Map<string, HkSample & { v: number }>>();
  deleted = new Map<string, { uuid: string; v: number }[]>();
  calls: { fn: string; args: unknown[] }[] = [];
  protectedData = true;

  add(id: string, s: HkSample) {
    this.version += 1;
    const m = this.samples.get(id) ?? new Map();
    m.set(s.uuid, { ...s, v: this.version });
    this.samples.set(id, m);
  }
  remove(id: string, uuid: string) {
    this.version += 1;
    this.samples.get(id)?.delete(uuid);
    const d = this.deleted.get(id) ?? [];
    d.push({ uuid, v: this.version });
    this.deleted.set(id, d);
  }
  private within(s: HkSample, opts: Record<string, unknown>) {
    const f = (opts.filter as { date?: { startDate?: Date; endDate?: Date } } | undefined)?.date;
    if (!f) return true;
    return (!f.startDate || s.endDate.getTime() >= f.startDate.getTime()) && (!f.endDate || s.startDate.getTime() < f.endDate.getTime());
  }
  private anchored(id: string, opts: Record<string, unknown>) {
    const after = opts.anchor ? Number(opts.anchor) : 0;
    const samples = [...(this.samples.get(id)?.values() ?? [])].filter((s) => s.v > after && this.within(s, opts));
    const deletedSamples = (this.deleted.get(id) ?? []).filter((d) => d.v > after && after > 0).map((d) => ({ uuid: d.uuid }));
    return { samples, deletedSamples, newAnchor: String(this.version) };
  }
  isHealthDataAvailable() {
    return true;
  }
  isProtectedDataAvailable() {
    return this.protectedData;
  }
  async requestAuthorization(req: { toRead?: readonly string[]; toShare?: readonly string[] }) {
    this.calls.push({ fn: 'requestAuthorization', args: [req] });
    return true;
  }
  async queryQuantitySamplesWithAnchor(id: string, opts: Record<string, unknown>) {
    this.calls.push({ fn: 'queryQuantitySamplesWithAnchor', args: [id, opts] });
    return this.anchored(id, opts);
  }
  async queryCategorySamplesWithAnchor(id: string, opts: Record<string, unknown>) {
    this.calls.push({ fn: 'queryCategorySamplesWithAnchor', args: [id, opts] });
    return this.anchored(id, opts);
  }
  async queryWorkoutSamplesWithAnchor(opts: Record<string, unknown>) {
    this.calls.push({ fn: 'queryWorkoutSamplesWithAnchor', args: [opts] });
    const r = this.anchored('HKWorkoutType', opts);
    return { workouts: r.samples, deletedSamples: r.deletedSamples, newAnchor: r.newAnchor };
  }
  async queryStatisticsCollectionForQuantity(id: string, _stats: readonly string[], anchorDate: Date, interval: { minute?: number; hour?: number }, opts: Record<string, unknown> = {}) {
    this.calls.push({ fn: 'queryStatisticsCollectionForQuantity', args: [id, interval] });
    const len = (interval.hour ?? 0) * 3_600_000 + (interval.minute ?? 0) * 60_000;
    const sums = new Map<number, number>();
    for (const s of this.samples.get(id)?.values() ?? []) {
      if (!this.within(s, opts)) continue;
      const k = anchorDate.getTime() + Math.floor((s.startDate.getTime() - anchorDate.getTime()) / len) * len;
      sums.set(k, (sums.get(k) ?? 0) + (s.quantity ?? 0));
    }
    return [...sums.entries()].sort((a, b) => a[0] - b[0]).map(([k, sum]) => ({ startDate: new Date(k), endDate: new Date(k + len), sumQuantity: { unit: 'x', quantity: sum }, sources: [] }));
  }
  async queryQuantitySamples(id: string, opts: Record<string, unknown>) {
    return [...(this.samples.get(id)?.values() ?? [])].filter((s) => this.within(s, opts));
  }
  async configureBackgroundTypes(ids: string[]) {
    this.calls.push({ fn: 'configureBackgroundTypes', args: [ids] });
    return true;
  }
  async clearBackgroundTypes() {
    this.calls.push({ fn: 'clearBackgroundTypes', args: [] });
    return true;
  }
}

// ---------------------------------------------------------------------------
// Fake Health Connect
// ---------------------------------------------------------------------------
export interface HcRecord {
  metadata: { id: string; dataOrigin?: string };
  startTime?: string;
  endTime?: string;
  time?: string;
  [k: string]: unknown;
}

export class FakeHealthConnect implements HealthConnectApi {
  version = 0;
  records = new Map<string, Map<string, HcRecord & { v: number }>>();
  deleted = new Map<string, { id: string; v: number }[]>();
  granted: { accessType: string; recordType: string }[] = [];
  sdkStatus = 3;
  expired = new Set<string>();
  calls: { fn: string; args: unknown[] }[] = [];

  add(type: string, r: HcRecord) {
    this.version += 1;
    const m = this.records.get(type) ?? new Map();
    m.set(r.metadata.id, { ...r, v: this.version });
    this.records.set(type, m);
  }
  remove(type: string, id: string) {
    this.version += 1;
    this.records.get(type)?.delete(id);
    const d = this.deleted.get(type) ?? [];
    d.push({ id, v: this.version });
    this.deleted.set(type, d);
  }
  async getSdkStatus() {
    return this.sdkStatus;
  }
  async initialize() {
    return true;
  }
  async requestPermission(perms: { accessType: 'read'; recordType: string }[]) {
    this.calls.push({ fn: 'requestPermission', args: [perms] });
    return perms;
  }
  async getGrantedPermissions() {
    return this.granted;
  }
  private start(r: HcRecord) {
    return Date.parse(String(r.startTime ?? r.time));
  }
  private end(r: HcRecord) {
    return Date.parse(String(r.endTime ?? r.time));
  }
  async readRecords(type: string, opts: Record<string, unknown>) {
    const f = opts.timeRangeFilter as { startTime: string; endTime: string };
    const from = Date.parse(f.startTime);
    const to = Date.parse(f.endTime);
    const records = [...(this.records.get(type)?.values() ?? [])].filter((r) => this.end(r) >= from && this.start(r) < to);
    return { records, pageToken: undefined };
  }
  async aggregateGroupByDuration(req: Record<string, unknown>) {
    const type = req.recordType as string;
    const f = req.timeRangeFilter as { startTime: string; endTime: string };
    const sl = req.timeRangeSlicer as { duration: string; length: number };
    const len = sl.length * (sl.duration === 'HOURS' ? 3_600_000 : 60_000);
    const from = Date.parse(f.startTime);
    const to = Date.parse(f.endTime);
    const sums = new Map<number, number>();
    for (const r of this.records.get(type)?.values() ?? []) {
      const s = this.start(r);
      if (s < from || s >= to) continue;
      const k = from + Math.floor((s - from) / len) * len;
      const v = type === 'Steps' ? Number(r.count) : type === 'Distance' ? Number((r.distance as { inMeters: number }).inMeters) : type === 'ActiveCaloriesBurned' ? Number((r.energy as { inKilocalories: number }).inKilocalories) : (this.end(r) - s) / 1000;
      sums.set(k, (sums.get(k) ?? 0) + v);
    }
    return [...sums.entries()].map(([k, v]) => ({
      startTime: new Date(k).toISOString(),
      endTime: new Date(k + len).toISOString(),
      result:
        type === 'Steps'
          ? { COUNT_TOTAL: v }
          : type === 'Distance'
            ? { DISTANCE_TOTAL: { inMeters: v } }
            : type === 'ActiveCaloriesBurned'
              ? { ACTIVE_CALORIES_TOTAL: { inKilocalories: v } }
              : { EXERCISE_DURATION_TOTAL: { inSeconds: v } },
    }));
  }
  async getChanges(req: { changesToken?: string; recordTypes?: string[] }) {
    const type = (req.recordTypes ?? [])[0];
    this.calls.push({ fn: 'getChanges', args: [req] });
    if (req.changesToken && this.expired.has(type)) {
      this.expired.delete(type);
      return { upsertionChanges: [], deletionChanges: [], nextChangesToken: '', changesTokenExpired: true, hasMore: false };
    }
    const after = req.changesToken ? Number(req.changesToken) : this.version;
    const upsertionChanges = [...(this.records.get(type)?.values() ?? [])].filter((r) => r.v > after).map((record) => ({ record }));
    const deletionChanges = (this.deleted.get(type) ?? []).filter((d) => d.v > after).map((d) => ({ recordId: d.id }));
    return { upsertionChanges, deletionChanges, nextChangesToken: String(this.version), changesTokenExpired: false, hasMore: false };
  }
}

// ---------------------------------------------------------------------------
// Scripted gateway
// ---------------------------------------------------------------------------
export type Responder = (req: HttpRequest) => HttpResponse | undefined;

export class FakeHttp implements HttpPort {
  requests: HttpRequest[] = [];
  responders: Responder[] = [];
  queue: HttpResponse[] = [];
  async request(req: HttpRequest): Promise<HttpResponse> {
    this.requests.push(req);
    for (const r of this.responders) {
      const out = r(req);
      if (out) return out;
    }
    if (req.url.endsWith('/api/v1/health/ingest') && this.queue.length) return this.queue.shift() as HttpResponse;
    return { status: 200, headers: {}, json: ingestOkFor(req) };
  }
  batches(): Record<string, unknown>[] {
    return this.requests.filter((r) => r.method === 'POST' && r.url.endsWith('/api/v1/health/ingest')).map(decodeBody);
  }
}

export function decodeBody(req: HttpRequest): Record<string, unknown> {
  if (req.body instanceof Uint8Array) return JSON.parse(ungzip(req.body, { to: 'string' }));
  return JSON.parse(String(req.body));
}

/** A plain 200 that stores everything. */
export function ingestOkFor(req: HttpRequest): unknown {
  if (!req.url.endsWith('/api/v1/health/ingest')) return { ok: true };
  const b = decodeBody(req) as { batch_id: string; records: unknown[]; deletions: unknown[] };
  return { ok: true, batch_id: b.batch_id, replay: false, counts: { stored: b.records.length, duplicate: 0, updated: 0, deleted: b.deletions.length, rejected: 0 }, rejected: [], source_state: 'connected' };
}

export const res = (status: number, json: unknown, headers: Record<string, string> = {}): HttpResponse => ({ status, headers, json });

export const noopAuth = {
  getSession: async () => ({ user_id: 'user-a', tenant_id: 't' }),
  getAccessToken: async () => 'token',
  refresh: jest.fn(async () => true),
  onChange: () => () => undefined,
};

export interface Harness {
  engine: SyncEngine;
  store: HealthStore;
  http: FakeHttp;
  clock: FakeClock;
  reader: PlatformReader;
  hooks: EngineHooks & { events: { name: string; args: unknown[] }[]; counts: Record<string, number> };
  source: SourceV1;
}

export function uuidSeq(ids: string[]): () => string {
  let i = 0;
  return () => ids[i++] ?? `00000000-0000-4000-8000-${String(i++).padStart(12, '0')}`;
}

export function makeHooks(): Harness['hooks'] {
  const events: { name: string; args: unknown[] }[] = [];
  const counts: Record<string, number> = {};
  const rec = (name: string) => (...args: unknown[]) => {
    events.push({ name, args });
  };
  return {
    events,
    counts,
    onNotConsented: rec('notConsented') as (c: Category) => void,
    onConsentMap: rec('consentMap'),
    onSourceState: rec('sourceState'),
    onPaused: rec('paused'),
    onSuccess: rec('success'),
    count: (code: string, n = 1) => {
      counts[code] = (counts[code] ?? 0) + n;
    },
    flag: rec('flag'),
  };
}

export function harness(opts: {
  platform: 'ios' | 'android';
  hk?: FakeHealthKit;
  hc?: FakeHealthConnect;
  now?: number;
  installId?: string;
  ids?: string[];
  tz?: string;
  store?: HealthStore;
  os?: string;
  source?: SourceV1;
}): Harness {
  const clock = new FakeClock(opts.now ?? GOLDEN_CLOCK);
  const http = new FakeHttp();
  const tz = opts.tz ?? 'Europe/Berlin';
  const reader = opts.platform === 'ios' ? createHealthKitReader(opts.hk ?? new FakeHealthKit()) : createHealthConnectReader(opts.hc ?? new FakeHealthConnect(), () => tz);
  const store = opts.store ?? new HealthStore(createMemoryDriver());
  const source =
    opts.source ??
    sourceFor(opts.platform, {
      install_id: opts.installId ?? GOLDEN_INSTALL,
      os_version: opts.platform === 'ios' ? '18.1' : '15',
      app_version: '1.0.0',
      manufacturer: opts.platform === 'ios' ? 'Apple' : 'Google',
      model: opts.platform === 'ios' ? 'Watch7,1' : 'Pixel 9',
    });
  const hooks = makeHooks();
  const engine = new SyncEngine(
    {
      store,
      reader,
      gateway: createGatewayClient({ gatewayUrl: G1 }, http, noopAuth),
      auth: noopAuth,
      clock,
      logger: { log: () => undefined },
      source,
      os: opts.os ?? opts.platform,
      deviceTz: () => tz,
      uuid: uuidSeq(opts.ids ?? []),
      rand: () => 0.5,
    },
    hooks,
  );
  return { engine, store, http, clock, reader, hooks, source };
}

/** Marks every type as already backfilled with a read anchor (so the next read is incremental). */
export async function markBackfilled(h: Harness, userId: string, anchor: string | null) {
  const scope = h.engine.scopeFor(userId);
  for (const t of ['steps', 'active_energy', 'exercise_minutes', 'distance', 'workout', 'sleep_session', 'heart_rate', 'resting_heart_rate', 'hrv_sdnn', 'hrv_rmssd', 'body_weight', 'body_fat_percentage']) {
    await h.store.setAnchor(scope, t, { read_anchor: anchor, committed_anchor: anchor, next_cycle: 1, backfilled: true, backfill_from_ms: h.clock.now() - 90 * 86_400_000 });
  }
  return scope;
}

/** Normalises timestamps to instants for "compare as instants". */
export function instantsNormalised(body: unknown): unknown {
  return JSON.parse(JSON.stringify(body), (k, v) => (['start', 'end'].includes(k) && typeof v === 'string' ? Date.parse(v) : v));
}

export const ALL_TYPES_FOR = (platform: 'ios' | 'android') =>
  new Set(
    ['steps', 'active_energy', 'exercise_minutes', 'distance', 'workout', 'sleep_session', 'heart_rate', 'resting_heart_rate', 'body_weight', 'body_fat_percentage', platform === 'ios' ? 'hrv_sdnn' : 'hrv_rmssd'],
  );
