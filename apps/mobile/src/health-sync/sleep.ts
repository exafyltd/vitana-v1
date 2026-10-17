/**
 * VTID-05184 — sleep sessions (N5a, plan change 7 "Sleep").
 *
 * Health Connect has SleepSessionRecord with stages. HealthKit has only stage
 * samples: samples of the same source with gaps under SLEEP_GROUP_GAP_MIN form
 * one session (a planner choice, not an Apple convention — open question 5),
 * capped at SLEEP_SESSION_MAX_H (split at the longest internal gap; an
 * unsplittable group is dropped and counted as `sleep_session_over_cap`).
 */
import { LIMITS, type SleepStage } from './contract/v1/wire';
import { HOUR_MS, MINUTE_MS } from './time';

export const SLEEP_GROUP_GAP_MIN = 60;
export const SLEEP_SESSION_MAX_H = 24;

/** HKCategoryValueSleepAnalysis → contract stage. */
export const HK_SLEEP_STAGE: Record<number, SleepStage> = {
  0: 'in_bed', // inBed
  1: 'asleep', // asleepUnspecified
  2: 'awake', // awake
  3: 'light', // asleepCore
  4: 'deep', // asleepDeep
  5: 'rem', // asleepREM
};

/** Health Connect SleepSessionRecord.Stage → contract stage (UNKNOWN = 0 is dropped). */
export const HC_SLEEP_STAGE: Record<number, SleepStage> = {
  1: 'awake', // AWAKE
  2: 'asleep', // SLEEPING
  3: 'out_of_bed', // OUT_OF_BED
  4: 'light', // LIGHT
  5: 'deep', // DEEP
  6: 'rem', // REM
  7: 'awake', // AWAKE_IN_BED
};

export interface StageSpan {
  stage: SleepStage;
  startMs: number;
  endMs: number;
}

export interface HkSleepSample {
  id: string;
  startMs: number;
  endMs: number;
  value: number;
  sourceKey: string;
  tz?: string;
  origin?: string;
}

export interface GroupedSession {
  record_id: string;
  sampleIds: string[];
  startMs: number;
  endMs: number;
  stages: StageSpan[];
  tz?: string;
  origin?: string;
}

export interface GroupOptions {
  gapMin?: number;
  maxH?: number;
}

function toSession(samples: HkSleepSample[]): GroupedSession {
  const sorted = [...samples].sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
  const stages: StageSpan[] = [];
  for (const s of sorted) {
    const stage = HK_SLEEP_STAGE[s.value];
    if (stage) stages.push({ stage, startMs: s.startMs, endMs: s.endMs });
  }
  return {
    record_id: sorted[0].id,
    sampleIds: sorted.map((s) => s.id),
    startMs: Math.min(...sorted.map((s) => s.startMs)),
    endMs: Math.max(...sorted.map((s) => s.endMs)),
    stages,
    tz: sorted.find((s) => s.tz)?.tz,
    origin: sorted.find((s) => s.origin)?.origin,
  };
}

/** Splits a group over the cap at its longest internal gap, recursively. */
function splitOverCap(group: HkSleepSample[], maxMs: number, out: HkSleepSample[][], dropped: { count: number }): void {
  const start = Math.min(...group.map((s) => s.startMs));
  const end = Math.max(...group.map((s) => s.endMs));
  if (end - start <= maxMs) {
    out.push(group);
    return;
  }
  const sorted = [...group].sort((a, b) => a.startMs - b.startMs);
  let bestGap = 0;
  let bestAt = -1;
  let maxEnd = sorted[0].endMs;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].startMs - maxEnd;
    if (gap > bestGap) {
      bestGap = gap;
      bestAt = i;
    }
    maxEnd = Math.max(maxEnd, sorted[i].endMs);
  }
  if (bestAt < 0) {
    dropped.count += 1;
    return;
  }
  splitOverCap(sorted.slice(0, bestAt), maxMs, out, dropped);
  splitOverCap(sorted.slice(bestAt), maxMs, out, dropped);
}

/** Groups HealthKit stage samples into sessions per source. */
export function groupHealthKitSleep(samples: readonly HkSleepSample[], opts: GroupOptions = {}): { sessions: GroupedSession[]; overCap: number } {
  const gapMs = (opts.gapMin ?? SLEEP_GROUP_GAP_MIN) * MINUTE_MS;
  const maxMs = (opts.maxH ?? SLEEP_SESSION_MAX_H) * HOUR_MS;
  const bySource = new Map<string, HkSleepSample[]>();
  for (const s of samples) {
    if (HK_SLEEP_STAGE[s.value] === undefined) continue;
    const list = bySource.get(s.sourceKey);
    if (list) list.push(s);
    else bySource.set(s.sourceKey, [s]);
  }
  const groups: HkSleepSample[][] = [];
  for (const list of bySource.values()) {
    list.sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
    let current: HkSleepSample[] = [];
    let currentEnd = -Infinity;
    for (const s of list) {
      if (current.length > 0 && s.startMs - currentEnd >= gapMs) {
        groups.push(current);
        current = [];
        currentEnd = -Infinity;
      }
      current.push(s);
      currentEnd = Math.max(currentEnd, s.endMs);
    }
    if (current.length) groups.push(current);
  }
  const capped: HkSleepSample[][] = [];
  const dropped = { count: 0 };
  for (const g of groups) splitOverCap(g, maxMs, capped, dropped);
  const sessions = capped.map(toSession).sort((a, b) => a.startMs - b.startMs);
  return { sessions, overCap: dropped.count };
}

/**
 * At most 200 stages (F2): adjacent stages of the same kind are merged; if
 * still over, the session goes without stages (undefined).
 */
export function capStages(stages: readonly StageSpan[]): StageSpan[] | undefined {
  const sorted = [...stages].sort((a, b) => a.startMs - b.startMs);
  if (sorted.length <= LIMITS.maxStages) return sorted;
  const merged: StageSpan[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.stage === s.stage) last.endMs = Math.max(last.endMs, s.endMs);
    else merged.push({ ...s });
  }
  return merged.length <= LIMITS.maxStages ? merged : undefined;
}
