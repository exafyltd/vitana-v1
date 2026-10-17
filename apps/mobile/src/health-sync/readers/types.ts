/**
 * VTID-05184 — the platform reader interface (N5a, plan change 7). The sync
 * engine is platform-agnostic; HealthKit and Health Connect each implement
 * these primitives. Readers are created only through a lazy `require`, after
 * the platform and the N4 flag were checked.
 */
import type { CatalogueEntry, SyncPlatform } from '../contract/v1/catalogue';
import type { StageSpan } from '../sleep';

export interface RawSample {
  id: string;
  startMs: number;
  endMs: number;
  /** Wire value (record codes), already in the catalogue unit; absent for series samples. */
  value?: number;
  tz?: string;
  origin?: string;
  /** Health Connect sleep sessions: mapped stages. */
  stages?: StageSpan[];
  /** HealthKit sleep stage samples: HKCategoryValueSleepAnalysis. */
  sleepValue?: number;
  /** HealthKit sleep grouping key (source bundle id). */
  sourceKey?: string;
}

export interface ChangeSet {
  upserts: RawSample[];
  deletedIds: string[];
  nextAnchor: string;
  /** Health Connect: the change token expired (about 30 days without a sync). */
  expired: boolean;
}

export interface Permitted {
  types: Set<string>;
  history: boolean;
  background: boolean;
}

export interface PlatformReader {
  readonly platform: SyncPlatform;
  /** HealthKit: an anchor-less anchored query returns every sample in the window; Health Connect returns only a token. */
  readonly initialChangesIncludeWindow: boolean;
  available(): Promise<boolean>;
  /** Read-only OS request; never a write/share type. */
  requestRead(entries: readonly CatalogueEntry[], opts: { history: boolean; background: boolean }): Promise<void>;
  /** Granted read access, or null when the OS does not reveal it (HealthKit hides read denial). */
  permitted(): Promise<Permitted | null>;
  changes(entry: CatalogueEntry, anchor: string | null, window: { fromMs: number; toMs: number }): Promise<ChangeSet>;
  /** series_sum: OS totals per aligned interval (de-duplicated across phone and watch by the OS). */
  seriesSums(entry: CatalogueEntry, fromMs: number, toMs: number, lengthMs: number): Promise<{ startMs: number; value: number }[]>;
  /** series_stats: point samples, bucketed on the device. */
  seriesSamples(entry: CatalogueEntry, fromMs: number, toMs: number): Promise<{ timeMs: number; value: number }[]>;
  /** Record codes (and HealthKit sleep stage samples) overlapping [fromMs, toMs). */
  records(entry: CatalogueEntry, fromMs: number, toMs: number): Promise<RawSample[]>;
  /** Background delivery hooks (iOS observers); no-ops on Android. */
  configureBackground?(entries: readonly CatalogueEntry[]): Promise<void>;
  clearBackground?(): Promise<void>;
  /** iOS: false while the device is locked (protected data unavailable). */
  dataAccessible?(): boolean;
}
