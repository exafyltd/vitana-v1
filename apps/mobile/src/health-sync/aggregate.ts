/**
 * VTID-05184 — device pre-aggregation of series codes (N5a, plan change 7; contract §3.1).
 *
 * Pure: no native module, no network. One item per aligned UTC interval:
 *   5 minutes when the interval starts at or after now − 29 days,
 *   1 hour    when it starts before now − 31 days,
 *   deferred  in the two-day band between (re-derived from the OS once it is
 *             older than 31 days and sent as a 1-hour item).
 * The band keeps device/server clock skew and a slow queue from producing a
 * MISALIGNED_BUCKET or a 1-hour value stored as a 5-minute bucket (F5).
 */
import type { StatsV1 } from './contract/v1/wire';
import { DAY_MS, HOUR_MS, MINUTE_MS, isoUtc } from './time';
import { clean } from './units';

export const FIVE_MIN_MS = 5 * MINUTE_MS;
export const ONE_HOUR_MS = HOUR_MS;
/** 5-minute intervals only when start ≥ now − 29 days. */
export const FIVE_MIN_MAX_AGE_MS = 29 * DAY_MS;
/** 1-hour intervals only when start < now − 31 days. */
export const ONE_HOUR_MIN_AGE_MS = 31 * DAY_MS;

export interface IntervalKey {
  startMs: number;
  lengthMs: number;
}

export function alignDown(ms: number, lengthMs: number): number {
  return Math.floor(ms / lengthMs) * lengthMs;
}

export function alignUp(ms: number, lengthMs: number): number {
  return Math.ceil(ms / lengthMs) * lengthMs;
}

/** 5 min, 1 h, or null (the deferral band) for an interval starting at `startMs`. */
export function intervalLengthFor(startMs: number, nowMs: number): number | null {
  if (startMs >= nowMs - FIVE_MIN_MAX_AGE_MS) return FIVE_MIN_MS;
  if (startMs < nowMs - ONE_HOUR_MIN_AGE_MS) return ONE_HOUR_MS;
  return null;
}

/** When a deferred hour becomes sendable as a 1-hour item. */
export function deferralDueMs(hourStartMs: number): number {
  return hourStartMs + ONE_HOUR_MIN_AGE_MS + 1;
}

/** Is a queued interval still valid to send at `nowMs` (pre-send band re-check)? */
export function intervalStillValid(key: IntervalKey, nowMs: number): boolean {
  return intervalLengthFor(key.startMs, nowMs) === key.lengthMs;
}

export interface Coverage {
  /** Intervals that can be (re)computed now. */
  intervals: IntervalKey[];
  /** Hour starts in the band: defer until they are older than 31 days. */
  deferredHours: number[];
}

/**
 * The intervals a sample spanning [startMs, endMs] touches. A zero-length
 * sample touches the interval that contains it.
 */
export function intervalsTouched(startMs: number, endMs: number, nowMs: number): Coverage {
  const intervals = new Map<string, IntervalKey>();
  const deferred = new Set<number>();
  const last = Math.max(startMs, endMs - 1);
  for (let t = alignDown(startMs, FIVE_MIN_MS); t <= last; t += FIVE_MIN_MS) {
    const len = intervalLengthFor(t, nowMs);
    if (len === FIVE_MIN_MS) intervals.set(`${t}:${len}`, { startMs: t, lengthMs: len });
    else {
      const hour = alignDown(t, ONE_HOUR_MS);
      if (len === ONE_HOUR_MS && intervalLengthFor(hour, nowMs) === ONE_HOUR_MS) intervals.set(`${hour}:${ONE_HOUR_MS}`, { startMs: hour, lengthMs: ONE_HOUR_MS });
      else deferred.add(hour);
    }
  }
  return { intervals: [...intervals.values()], deferredHours: [...deferred] };
}

export interface Region {
  fromMs: number;
  toMs: number;
  lengthMs: number;
}

/**
 * Splits [fromMs, toMs) into the 1-hour region, the band (deferred hours) and
 * the 5-minute region. Only closed intervals (end ≤ now) are returned; the
 * still-open 5-minute interval is reported in `openIntervalStart`.
 */
export function regionsFor(fromMs: number, toMs: number, nowMs: number): { regions: Region[]; deferredHours: number[]; openIntervalStart: number | null } {
  const regions: Region[] = [];
  const deferredHours: number[] = [];
  const end = Math.min(toMs, nowMs);
  // 1-hour region: hour starts < now − 31d.
  const hourLimit = alignUp(nowMs - ONE_HOUR_MIN_AGE_MS, ONE_HOUR_MS); // first hour start NOT in the region
  const hFrom = alignDown(fromMs, ONE_HOUR_MS);
  const hTo = Math.min(hourLimit, alignUp(end, ONE_HOUR_MS));
  if (hFrom < hTo) regions.push({ fromMs: hFrom, toMs: hTo, lengthMs: ONE_HOUR_MS });
  // 5-minute region: starts ≥ now − 29d, closed (end ≤ now).
  const fiveFrom = Math.max(alignDown(fromMs, FIVE_MIN_MS), alignUp(nowMs - FIVE_MIN_MAX_AGE_MS, FIVE_MIN_MS));
  const fiveTo = alignDown(end, FIVE_MIN_MS);
  if (fiveFrom < fiveTo) regions.push({ fromMs: fiveFrom, toMs: fiveTo, lengthMs: FIVE_MIN_MS });
  // Band: hours between.
  const bandFrom = Math.max(hFrom, hourLimit);
  const bandTo = Math.min(alignUp(end, ONE_HOUR_MS), alignUp(nowMs - FIVE_MIN_MAX_AGE_MS, ONE_HOUR_MS));
  for (let h = bandFrom; h < bandTo; h += ONE_HOUR_MS) deferredHours.push(h);
  const open = alignDown(Math.min(toMs, nowMs), FIVE_MIN_MS);
  const openIntervalStart = toMs > open && open >= fromMs && intervalLengthFor(open, nowMs) === FIVE_MIN_MS ? open : null;
  return { regions, deferredHours, openIntervalStart };
}

/** Every interval start of a region. */
export function regionStarts(r: Region): number[] {
  const out: number[] = [];
  for (let t = r.fromMs; t < r.toMs; t += r.lengthMs) out.push(t);
  return out;
}

export function seriesRecordId(type: string, startMs: number): string {
  return `${type}:${isoUtc(startMs)}`;
}

/** {n,sum,min,max} of a set of values (null when empty). */
export function seriesStats(values: readonly number[]): StatsV1 | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of finite) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { n: finite.length, sum: clean(sum), min, max };
}

/**
 * Buckets point samples (heart rate) by each sample's own time into the
 * intervals of a region; empty intervals are absent from the result.
 */
export function bucketStats(samples: readonly { timeMs: number; value: number }[], region: Region): Map<number, StatsV1> {
  const groups = new Map<number, number[]>();
  for (const s of samples) {
    if (s.timeMs < region.fromMs || s.timeMs >= region.toMs) continue;
    const k = alignDown(s.timeMs, region.lengthMs);
    const g = groups.get(k);
    if (g) g.push(s.value);
    else groups.set(k, [s.value]);
  }
  const out = new Map<number, StatsV1>();
  for (const [k, vals] of groups) {
    const st = seriesStats(vals);
    if (st) out.set(k, st);
  }
  return out;
}
