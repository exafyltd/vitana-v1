/**
 * VTID-05184 — Health Connect reader (react-native-health-connect 4.1.3).
 *
 * READ permissions only (+ ReadHealthDataHistory, + BackgroundAccessPermission).
 * Change detection with one change token per record type (`getChanges`;
 * `changesTokenExpired` after about 30 days without a sync). Series totals with
 * `aggregateGroupByDuration`; heart rate from HeartRateRecord.samples,
 * bucketed by each sample's own time.
 */
import type { CatalogueEntry, HcRecordType } from '../contract/v1/catalogue';
import { HC_SLEEP_STAGE, type StageSpan } from '../sleep';
import { healthConnectAggregateValue, healthConnectRecordValue } from '../units';
import type { ChangeSet, Permitted, PlatformReader, RawSample } from './types';

type AnyRec = Record<string, unknown>;

/** SDK_AVAILABLE in androidx.health.connect.client.HealthConnectClient. */
export const SDK_AVAILABLE = 3;

export interface HealthConnectApi {
  getSdkStatus(): Promise<number>;
  initialize(): Promise<boolean>;
  requestPermission(perms: { accessType: 'read'; recordType: string }[]): Promise<{ accessType: string; recordType: string }[]>;
  getGrantedPermissions(): Promise<{ accessType: string; recordType: string }[]>;
  readRecords(recordType: string, opts: AnyRec): Promise<{ records: AnyRec[]; pageToken?: string }>;
  aggregateGroupByDuration(req: AnyRec): Promise<{ result: AnyRec; startTime: string; endTime: string }[]>;
  getChanges(req: { changesToken?: string; recordTypes?: string[] }): Promise<{
    upsertionChanges: { record: AnyRec }[];
    deletionChanges: { recordId: string }[];
    nextChangesToken: string;
    changesTokenExpired: boolean;
    hasMore: boolean;
  }>;
}

const ms = (s: unknown) => Date.parse(String(s));

export function createHealthConnectReader(api: HealthConnectApi, deviceTz: () => string): PlatformReader {
  let initialized = false;
  const init = async () => {
    if (!initialized) initialized = await api.initialize();
    return initialized;
  };

  const toRaw = (entry: CatalogueEntry, r: AnyRec): RawSample | null => {
    const md = (r.metadata ?? {}) as AnyRec;
    const id = typeof md.id === 'string' ? md.id : null;
    const startMs = ms(r.startTime ?? r.time);
    const endMs = ms(r.endTime ?? r.time);
    if (!id || !Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
    const raw: RawSample = { id, startMs, endMs, tz: deviceTz() };
    const origin = md.dataOrigin;
    if (typeof origin === 'string' && origin) raw.origin = origin;
    if (entry.kind === 'record') {
      const v = healthConnectRecordValue(entry, r);
      if (v === null) return null;
      raw.value = v;
    }
    if (entry.hcRecordType === 'SleepSession' && Array.isArray(r.stages)) {
      const stages: StageSpan[] = [];
      for (const s of r.stages as AnyRec[]) {
        const stage = HC_SLEEP_STAGE[Number(s.stage)];
        if (stage) stages.push({ stage, startMs: ms(s.startTime), endMs: ms(s.endTime) });
      }
      raw.stages = stages;
    }
    return raw;
  };

  const between = (fromMs: number, toMs: number) => ({ operator: 'between', startTime: new Date(fromMs).toISOString(), endTime: new Date(toMs).toISOString() });

  const readAll = async (recordType: HcRecordType, fromMs: number, toMs: number): Promise<AnyRec[]> => {
    const out: AnyRec[] = [];
    let pageToken: string | undefined;
    do {
      const res = await api.readRecords(recordType, { timeRangeFilter: between(fromMs, toMs), pageToken });
      out.push(...res.records);
      pageToken = res.pageToken || undefined;
    } while (pageToken);
    return out;
  };

  return {
    platform: 'android',
    initialChangesIncludeWindow: false,
    async available() {
      try {
        return (await api.getSdkStatus()) === SDK_AVAILABLE && (await init());
      } catch {
        return false;
      }
    },
    async requestRead(entries, opts) {
      await init();
      const types = [...new Set(entries.map((e) => e.hcRecordType).filter((x): x is HcRecordType => !!x))];
      const perms: { accessType: 'read'; recordType: string }[] = types.map((recordType) => ({ accessType: 'read', recordType }));
      if (opts.history) perms.push({ accessType: 'read', recordType: 'ReadHealthDataHistory' });
      if (opts.background) perms.push({ accessType: 'read', recordType: 'BackgroundAccessPermission' });
      if (perms.length) await api.requestPermission(perms);
    },
    async permitted(): Promise<Permitted | null> {
      const granted = await api.getGrantedPermissions();
      const reads = granted.filter((p) => p.accessType === 'read').map((p) => p.recordType);
      return {
        types: new Set(reads.filter((t) => t !== 'ReadHealthDataHistory' && t !== 'BackgroundAccessPermission')),
        history: reads.includes('ReadHealthDataHistory'),
        background: reads.includes('BackgroundAccessPermission'),
      };
    },
    async changes(entry, anchor): Promise<ChangeSet> {
      const upserts: RawSample[] = [];
      const deletedIds: string[] = [];
      let token = anchor ?? undefined;
      for (;;) {
        const res = await api.getChanges({ changesToken: token, recordTypes: [entry.hcRecordType as string] });
        if (res.changesTokenExpired) return { upserts: [], deletedIds: [], nextAnchor: '', expired: true };
        for (const u of res.upsertionChanges) {
          const raw = toRaw(entry, u.record);
          if (raw) upserts.push(raw);
        }
        for (const d of res.deletionChanges) deletedIds.push(d.recordId);
        token = res.nextChangesToken;
        if (!res.hasMore) break;
      }
      return { upserts, deletedIds, nextAnchor: token ?? '', expired: false };
    },
    async seriesSums(entry, fromMs, toMs, lengthMs) {
      const slicer = lengthMs >= 3_600_000 ? { duration: 'HOURS', length: lengthMs / 3_600_000 } : { duration: 'MINUTES', length: lengthMs / 60_000 };
      const rows = await api.aggregateGroupByDuration({ recordType: entry.hcRecordType, timeRangeFilter: between(fromMs, toMs), timeRangeSlicer: slicer });
      const out: { startMs: number; value: number }[] = [];
      for (const r of rows) {
        const v = healthConnectAggregateValue(entry, r.result);
        const start = ms(r.startTime);
        if (v !== null && Number.isFinite(start)) out.push({ startMs: start, value: v });
      }
      return out;
    },
    async seriesSamples(entry, fromMs, toMs) {
      const out: { timeMs: number; value: number }[] = [];
      for (const r of await readAll(entry.hcRecordType as HcRecordType, fromMs, toMs)) {
        for (const s of (r.samples as AnyRec[] | undefined) ?? []) {
          const t = ms(s.time);
          const v = Number(s.beatsPerMinute);
          if (Number.isFinite(t) && Number.isFinite(v) && t >= fromMs && t < toMs) out.push({ timeMs: t, value: v });
        }
      }
      return out;
    },
    async records(entry, fromMs, toMs) {
      return (await readAll(entry.hcRecordType as HcRecordType, fromMs, toMs)).map((r) => toRaw(entry, r)).filter((x): x is RawSample => x !== null);
    },
  };
}

/** Lazy: requires the native module only when called (Android, flag on). */
export function loadHealthConnectReader(deviceTz: () => string): PlatformReader {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const api = require('react-native-health-connect') as unknown as HealthConnectApi;
  return createHealthConnectReader(api, deviceTz);
}
