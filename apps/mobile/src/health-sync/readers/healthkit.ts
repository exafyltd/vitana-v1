/**
 * VTID-05184 — Apple Health reader (@kingstinct/react-native-healthkit 16.0.0).
 *
 * Read-only: `requestAuthorization({ toRead, toShare: [] })`. Change detection
 * with anchored queries (samples, deletedSamples, newAnchor); series totals
 * with `queryStatisticsCollectionForQuantity` (cumulativeSum, anchored at the
 * aligned UTC boundary); heart rate from samples (HealthKit statistics have no
 * count, open question 4). HealthKit does not reveal read denial, so
 * `permitted()` is null on iOS.
 */
import type { CatalogueEntry } from '../contract/v1/catalogue';
import { healthKitToWire } from '../units';
import type { ChangeSet, Permitted, PlatformReader, RawSample } from './types';

type AnyRec = Record<string, unknown>;

/** The subset of the library this reader uses (structural, so tests can mock it). */
export interface HealthKitApi {
  isHealthDataAvailable(): boolean;
  isProtectedDataAvailable?(): boolean;
  requestAuthorization(req: { toRead?: readonly string[]; toShare?: readonly string[] }): Promise<boolean>;
  queryQuantitySamplesWithAnchor(id: string, opts: AnyRec): Promise<{ samples: readonly AnyRec[]; deletedSamples: readonly { uuid: string }[]; newAnchor: string }>;
  queryCategorySamplesWithAnchor(id: string, opts: AnyRec): Promise<{ samples: readonly AnyRec[]; deletedSamples: readonly { uuid: string }[]; newAnchor: string }>;
  queryWorkoutSamplesWithAnchor(opts: AnyRec): Promise<{ workouts?: readonly AnyRec[]; samples?: readonly AnyRec[]; deletedSamples: readonly { uuid: string }[]; newAnchor: string }>;
  queryStatisticsCollectionForQuantity(id: string, stats: readonly string[], anchorDate: Date, interval: { minute?: number; hour?: number }, opts?: AnyRec): Promise<readonly AnyRec[]>;
  queryQuantitySamples(id: string, opts: AnyRec): Promise<readonly AnyRec[]>;
  queryCategorySamples?(id: string, opts: AnyRec): Promise<readonly AnyRec[]>;
  configureBackgroundTypes?(ids: string[], frequency: unknown): Promise<boolean>;
  clearBackgroundTypes?(): Promise<boolean>;
}

const ms = (d: unknown): number => (d instanceof Date ? d.getTime() : Date.parse(String(d)));
const tzOf = (s: AnyRec): string | undefined => {
  const md = s.metadata as AnyRec | undefined;
  const tz = md?.HKTimeZone;
  return typeof tz === 'string' && tz.length > 0 ? tz : undefined;
};
const originOf = (s: AnyRec): string | undefined => {
  const rev = s.sourceRevision as AnyRec | undefined;
  const src = rev?.source as AnyRec | undefined;
  const id = src?.bundleIdentifier;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
};

/** HKUpdateFrequency.hourly */
const HOURLY = 2;

export function createHealthKitReader(api: HealthKitApi): PlatformReader {
  const toRaw = (entry: CatalogueEntry, s: AnyRec): RawSample | null => {
    const startMs = ms(s.startDate);
    const endMs = ms(s.endDate);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
    const raw: RawSample = { id: String(s.uuid), startMs, endMs, tz: tzOf(s), origin: originOf(s) };
    if (entry.type === 'sleep_session') {
      raw.sleepValue = Number(s.value);
      raw.sourceKey = originOf(s) ?? 'unknown';
    } else if (entry.type === 'workout') {
      raw.value = (endMs - startMs) / 60_000;
    } else if (entry.kind === 'record') {
      const v = healthKitToWire(entry, Number(s.quantity), typeof s.unit === 'string' ? s.unit : entry.hkReadUnit ?? undefined);
      if (v === null) return null;
      raw.value = v;
    }
    return raw;
  };

  const dateFilter = (fromMs: number, toMs: number) => ({ date: { startDate: new Date(fromMs), endDate: new Date(toMs) } });

  return {
    platform: 'ios',
    initialChangesIncludeWindow: true,
    async available() {
      return api.isHealthDataAvailable();
    },
    async requestRead(entries) {
      const toRead = entries.map((e) => e.healthkit).filter((x): x is string => !!x);
      if (toRead.length === 0) return;
      await api.requestAuthorization({ toRead, toShare: [] });
    },
    async permitted(): Promise<Permitted | null> {
      return null;
    },
    async changes(entry, anchor, window): Promise<ChangeSet> {
      const opts: AnyRec = { limit: 0, filter: dateFilter(window.fromMs, window.toMs) };
      if (anchor) opts.anchor = anchor;
      let res: { samples?: readonly AnyRec[]; workouts?: readonly AnyRec[]; deletedSamples: readonly { uuid: string }[]; newAnchor: string };
      if (entry.type === 'workout') res = await api.queryWorkoutSamplesWithAnchor(opts);
      else if (entry.type === 'sleep_session') res = await api.queryCategorySamplesWithAnchor(entry.healthkit as string, opts);
      else res = await api.queryQuantitySamplesWithAnchor(entry.healthkit as string, { ...opts, unit: entry.hkReadUnit ?? undefined });
      const list = res.workouts ?? res.samples ?? [];
      return {
        upserts: list.map((s) => toRaw(entry, s)).filter((x): x is RawSample => x !== null),
        deletedIds: res.deletedSamples.map((d) => d.uuid),
        nextAnchor: res.newAnchor,
        expired: false,
      };
    },
    async seriesSums(entry, fromMs, toMs, lengthMs) {
      const interval = lengthMs >= 3_600_000 ? { hour: lengthMs / 3_600_000 } : { minute: lengthMs / 60_000 };
      const rows = await api.queryStatisticsCollectionForQuantity(entry.healthkit as string, ['cumulativeSum'], new Date(fromMs), interval, {
        filter: dateFilter(fromMs, toMs),
        unit: entry.hkReadUnit ?? undefined,
      });
      const out: { startMs: number; value: number }[] = [];
      for (const r of rows) {
        const sum = (r.sumQuantity as { quantity?: number } | undefined)?.quantity;
        const start = ms(r.startDate);
        if (typeof sum === 'number' && Number.isFinite(start) && start >= fromMs && start < toMs) out.push({ startMs: start, value: sum });
      }
      return out;
    },
    async seriesSamples(entry, fromMs, toMs) {
      const rows = await api.queryQuantitySamples(entry.healthkit as string, { limit: 0, filter: dateFilter(fromMs, toMs), unit: entry.hkReadUnit ?? undefined });
      return rows.map((r) => ({ timeMs: ms(r.startDate), value: Number(r.quantity) })).filter((s) => Number.isFinite(s.timeMs) && Number.isFinite(s.value));
    },
    async records(entry, fromMs, toMs) {
      const set = await this.changes(entry, null, { fromMs, toMs });
      return set.upserts.filter((s) => s.endMs > fromMs && s.startMs < toMs);
    },
    async configureBackground(entries) {
      const ids = entries.map((e) => e.healthkit).filter((x): x is string => !!x);
      if (api.configureBackgroundTypes) await api.configureBackgroundTypes(ids, HOURLY);
    },
    async clearBackground() {
      if (api.clearBackgroundTypes) await api.clearBackgroundTypes();
    },
    dataAccessible() {
      return api.isProtectedDataAvailable ? api.isProtectedDataAvailable() : true;
    },
  };
}

/** Lazy: requires the Nitro module only when called (iOS, flag on). */
export function loadHealthKitReader(): PlatformReader {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const api = require('@kingstinct/react-native-healthkit') as unknown as HealthKitApi;
  return createHealthKitReader(api);
}
