/**
 * VTID-05184 — Health Sync catalogue v1, hand-written (N5a, plan change 2).
 *
 * tests/health-sync/contract.test.ts compares this table with the vendored
 * golden "contract self-check" catalogue (types, categories, kinds, UCUM units
 * and the HealthKit / Health Connect identifiers). A type that is not listed
 * here is never read and never requested from the OS.
 */

export const CATEGORIES = ['activity', 'sleep', 'heart', 'body'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Kind = 'series_sum' | 'series_stats' | 'record';

/** Health Connect record types this module reads (react-native-health-connect `RecordType`). */
export type HcRecordType =
  | 'Steps'
  | 'ActiveCaloriesBurned'
  | 'ExerciseSession'
  | 'Distance'
  | 'SleepSession'
  | 'HeartRate'
  | 'RestingHeartRate'
  | 'HeartRateVariabilityRmssd'
  | 'Weight'
  | 'BodyFat';

export interface CatalogueEntry {
  readonly type: string;
  readonly category: Category;
  readonly kind: Kind;
  /** UCUM unit on the wire. */
  readonly unit: string;
  /** HealthKit identifier, exactly as in the contract (null: not read on iOS). */
  readonly healthkit: string | null;
  /** Health Connect identifier, exactly as in the contract (null: not read on Android). */
  readonly health_connect: string | null;
  /** The Health Connect record type behind `health_connect`. */
  readonly hcRecordType: HcRecordType | null;
  /** The HealthKit unit string the reader asks for (converted to `unit` by units.ts). */
  readonly hkReadUnit: string | null;
}

export const CONSENT_KEY: Record<Category, string> = {
  activity: 'sync_activity',
  sleep: 'sync_sleep',
  heart: 'sync_heart',
  body: 'sync_body',
};

export const CATALOGUE_V1: readonly CatalogueEntry[] = [
  { type: 'steps', category: 'activity', kind: 'series_sum', unit: '{steps}', healthkit: 'HKQuantityTypeIdentifierStepCount', health_connect: 'StepsRecord', hcRecordType: 'Steps', hkReadUnit: 'count' },
  { type: 'active_energy', category: 'activity', kind: 'series_sum', unit: 'kcal', healthkit: 'HKQuantityTypeIdentifierActiveEnergyBurned', health_connect: 'ActiveCaloriesBurnedRecord', hcRecordType: 'ActiveCaloriesBurned', hkReadUnit: 'kcal' },
  { type: 'exercise_minutes', category: 'activity', kind: 'series_sum', unit: 'min', healthkit: 'HKQuantityTypeIdentifierAppleExerciseTime', health_connect: 'ExerciseSessionRecord.EXERCISE_DURATION_TOTAL', hcRecordType: 'ExerciseSession', hkReadUnit: 'min' },
  { type: 'distance', category: 'activity', kind: 'series_sum', unit: 'm', healthkit: 'HKQuantityTypeIdentifierDistanceWalkingRunning', health_connect: 'DistanceRecord', hcRecordType: 'Distance', hkReadUnit: 'm' },
  { type: 'workout', category: 'activity', kind: 'record', unit: 'min', healthkit: 'HKWorkoutType', health_connect: 'ExerciseSessionRecord', hcRecordType: 'ExerciseSession', hkReadUnit: null },
  { type: 'sleep_session', category: 'sleep', kind: 'record', unit: 'min', healthkit: 'HKCategoryTypeIdentifierSleepAnalysis', health_connect: 'SleepSessionRecord', hcRecordType: 'SleepSession', hkReadUnit: null },
  { type: 'heart_rate', category: 'heart', kind: 'series_stats', unit: '/min', healthkit: 'HKQuantityTypeIdentifierHeartRate', health_connect: 'HeartRateRecord', hcRecordType: 'HeartRate', hkReadUnit: 'count/min' },
  { type: 'resting_heart_rate', category: 'heart', kind: 'record', unit: '/min', healthkit: 'HKQuantityTypeIdentifierRestingHeartRate', health_connect: 'RestingHeartRateRecord', hcRecordType: 'RestingHeartRate', hkReadUnit: 'count/min' },
  { type: 'hrv_sdnn', category: 'heart', kind: 'record', unit: 'ms', healthkit: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', health_connect: null, hcRecordType: null, hkReadUnit: 'ms' },
  { type: 'hrv_rmssd', category: 'heart', kind: 'record', unit: 'ms', healthkit: null, health_connect: 'HeartRateVariabilityRmssdRecord', hcRecordType: 'HeartRateVariabilityRmssd', hkReadUnit: null },
  { type: 'body_weight', category: 'body', kind: 'record', unit: 'kg', healthkit: 'HKQuantityTypeIdentifierBodyMass', health_connect: 'WeightRecord', hcRecordType: 'Weight', hkReadUnit: 'kg' },
  { type: 'body_fat_percentage', category: 'body', kind: 'record', unit: '%', healthkit: 'HKQuantityTypeIdentifierBodyFatPercentage', health_connect: 'BodyFatRecord', hcRecordType: 'BodyFat', hkReadUnit: '%' },
];

const BY_TYPE = new Map(CATALOGUE_V1.map((e) => [e.type, e]));

export function entryFor(type: string): CatalogueEntry | undefined {
  return BY_TYPE.get(type);
}

export function categoryOf(type: string): Category | undefined {
  return BY_TYPE.get(type)?.category;
}

export type SyncPlatform = 'ios' | 'android';

/** The entries a platform can read (HealthKit-only and Health-Connect-only types filtered). */
export function entriesFor(platform: SyncPlatform, categories?: readonly Category[]): CatalogueEntry[] {
  return CATALOGUE_V1.filter(
    (e) => (platform === 'ios' ? e.healthkit !== null : e.health_connect !== null) && (!categories || categories.includes(e.category)),
  );
}

/** Android manifest READ permission per Health Connect record type (with-health-connect-permissions.js mirrors it). */
export const HC_READ_PERMISSION: Record<HcRecordType, string> = {
  Steps: 'android.permission.health.READ_STEPS',
  ActiveCaloriesBurned: 'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  ExerciseSession: 'android.permission.health.READ_EXERCISE',
  Distance: 'android.permission.health.READ_DISTANCE',
  SleepSession: 'android.permission.health.READ_SLEEP',
  HeartRate: 'android.permission.health.READ_HEART_RATE',
  RestingHeartRate: 'android.permission.health.READ_RESTING_HEART_RATE',
  HeartRateVariabilityRmssd: 'android.permission.health.READ_HEART_RATE_VARIABILITY',
  Weight: 'android.permission.health.READ_WEIGHT',
  BodyFat: 'android.permission.health.READ_BODY_FAT',
};

export const HC_HISTORY_PERMISSION = 'android.permission.health.READ_HEALTH_DATA_HISTORY';
export const HC_BACKGROUND_PERMISSION = 'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND';
