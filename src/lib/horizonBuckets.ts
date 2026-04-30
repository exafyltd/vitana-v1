/**
 * Bucket Autopilot actions onto the My Journey path: Today / Next 3 / This
 * week / 30 days / Future. Pure, deterministic, empty-bucket-safe — driven
 * entirely by inputs so it can be unit-tested without timers or context.
 *
 * The Autopilot payload doesn't yet carry an explicit `horizon` / `dueAt`
 * (see the Open Backend Follow-Ups in the plan). Until it does, we look for
 * those fields opportunistically and fall back to `wave_id` (legacy
 * onboarding waves), then to a deterministic Future placement so nothing is
 * dropped.
 */

import type { AutopilotAction } from "@/types/autopilot";

export type HorizonBucket = "today" | "next3" | "thisWeek" | "month" | "future";

export const HORIZON_BUCKETS: HorizonBucket[] = [
  "today",
  "next3",
  "thisWeek",
  "month",
  "future",
];

interface BucketableExtras {
  dueAt?: string | Date | null;
  horizon?: HorizonBucket | string | null;
  wave_id?: number | string | null;
}

type Bucketable = AutopilotAction & BucketableExtras;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function bucketFromDueAt(dueAt: Date, now: Date): HorizonBucket {
  const today0 = startOfDay(now).getTime();
  const due0 = startOfDay(dueAt).getTime();
  const days = Math.round((due0 - today0) / DAY_MS);
  if (days <= 0) return "today";
  if (days <= 3) return "next3";
  if (days <= 7) return "thisWeek";
  if (days <= 30) return "month";
  return "future";
}

/**
 * Map a wave identifier to its journey horizon. Accepts both legacy formats:
 *   - `"wave-1"` / `"wave-2"` (current API)
 *   - `1` / `2` / `"1"` / `"2"` (older payloads / test fixtures)
 * Used by My Journey's path bucketing AND its checkpoint week-fallback so
 * "horizon missing" doesn't leak through as "future" for legacy data.
 */
export function bucketFromWaveId(waveId: number | string): HorizonBucket {
  const raw = typeof waveId === "string" ? waveId.replace(/^wave-/, "") : String(waveId);
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return "future";
  if (n <= 0) return "today";
  if (n === 1) return "next3";
  if (n === 2) return "thisWeek";
  if (n === 3) return "month";
  return "future";
}

function explicitHorizon(value: string | null | undefined): HorizonBucket | null {
  if (!value) return null;
  const normalized = value as HorizonBucket;
  return HORIZON_BUCKETS.includes(normalized) ? normalized : null;
}

function classify(action: Bucketable, now: Date): HorizonBucket {
  const explicit = explicitHorizon(typeof action.horizon === "string" ? action.horizon : null);
  if (explicit) return explicit;

  if (action.dueAt) {
    const d = action.dueAt instanceof Date ? action.dueAt : new Date(action.dueAt);
    if (!isNaN(d.getTime())) return bucketFromDueAt(d, now);
  }

  if (action.wave_id !== undefined && action.wave_id !== null) {
    return bucketFromWaveId(action.wave_id);
  }

  return "future";
}

export interface BucketResult {
  today: AutopilotAction[];
  next3: AutopilotAction[];
  thisWeek: AutopilotAction[];
  month: AutopilotAction[];
  future: AutopilotAction[];
}

/**
 * Group actions into the 5 horizon buckets, preserving input order within
 * each bucket so the output is fully deterministic.
 *
 * `now` is injectable for testability; defaults to the current time.
 */
export function bucketActions(
  actions: AutopilotAction[],
  now: Date = new Date(),
): BucketResult {
  const result: BucketResult = {
    today: [],
    next3: [],
    thisWeek: [],
    month: [],
    future: [],
  };
  for (const action of actions) {
    const bucket = classify(action as Bucketable, now);
    result[bucket].push(action);
  }
  return result;
}
