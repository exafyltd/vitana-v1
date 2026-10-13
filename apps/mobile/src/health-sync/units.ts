/**
 * VTID-05184 — OS units → contract UCUM units (N5a, plan change 7 "Units").
 *
 * HealthKit is asked for the unit in the catalogue's `hkReadUnit`, so the OS
 * converts; only HealthKit percent needs a factor (HealthKit reports 0–1).
 * Health Connect values come from the typed unit field of each record.
 */
import type { CatalogueEntry } from './contract/v1/catalogue';
import { MINUTE_MS } from './time';

/** Rounds away float noise from OS sums (6 significant decimals is far below any plausibility check). */
export function clean(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

const MASS_TO_KG: Record<string, number> = { kg: 1, g: 0.001, lb: 0.45359237, '[lb_av]': 0.45359237, oz: 0.028349523125, st: 6.35029318 };

/** A mass in any OS unit → kg. Unknown unit → null (the value is not sent). */
export function massToKg(value: number, unit: string): number | null {
  const f = MASS_TO_KG[unit];
  return f === undefined ? null : clean(value * f);
}

/** A HealthKit quantity (in the unit the reader asked for, or the one the sample reports) → wire value. */
export function healthKitToWire(entry: CatalogueEntry, quantity: number, unit?: string): number | null {
  switch (entry.type) {
    case 'body_fat_percentage':
      // HKUnit.percent() is a fraction (0.25 = 25 %); the contract's `%` is 0–100.
      return clean(unit === '%' || unit === undefined ? quantity * 100 : quantity);
    case 'body_weight':
      return unit && unit !== 'kg' ? massToKg(quantity, unit) : clean(quantity);
    default:
      return clean(quantity);
  }
}

type Rec = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const field = (r: Rec, k: string): Rec => (r[k] && typeof r[k] === 'object' ? (r[k] as Rec) : {});

/** A Health Connect record → wire value for record codes (null when the unit field is missing). */
export function healthConnectRecordValue(entry: CatalogueEntry, record: Rec): number | null {
  switch (entry.hcRecordType) {
    case 'Weight': {
      const w = field(record, 'weight');
      if (num(w.inKilograms) !== null) return clean(w.inKilograms as number);
      if (num(w.inPounds) !== null) return massToKg(w.inPounds as number, 'lb');
      if (num(w.inGrams) !== null) return massToKg(w.inGrams as number, 'g');
      return null;
    }
    case 'BodyFat': {
      const p = record.percentage;
      if (num(p) !== null) return clean(p as number);
      return num(field(record, 'percentage').value);
    }
    case 'RestingHeartRate':
      return num(record.beatsPerMinute);
    case 'HeartRateVariabilityRmssd':
      return num(record.heartRateVariabilityMillis);
    case 'ExerciseSession':
    case 'SleepSession': {
      const s = Date.parse(String(record.startTime));
      const e = Date.parse(String(record.endTime));
      return Number.isFinite(s) && Number.isFinite(e) ? clean((e - s) / MINUTE_MS) : null;
    }
    default:
      return null;
  }
}

/** A Health Connect aggregate bucket → wire value for series_sum codes. */
export function healthConnectAggregateValue(entry: CatalogueEntry, result: Rec): number | null {
  switch (entry.hcRecordType) {
    case 'Steps':
      return num(result.COUNT_TOTAL);
    case 'ActiveCaloriesBurned':
      return num(field(result, 'ACTIVE_CALORIES_TOTAL').inKilocalories);
    case 'Distance':
      return num(field(result, 'DISTANCE_TOTAL').inMeters);
    case 'ExerciseSession': {
      const d = field(result, 'EXERCISE_DURATION_TOTAL');
      const s = num(d.inSeconds);
      return s === null ? null : clean(s / 60);
    }
    default:
      return null;
  }
}
