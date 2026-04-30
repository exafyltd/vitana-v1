/**
 * Vitana Index — slope-projection helpers.
 *
 * Mirrors the gateway's `services/gateway/src/lib/vitana-pillars.ts#projectDay90`
 * so the Index Sheet 30-day horizon and the My Journey trajectory card share
 * the same math the backend voice/operator path uses.
 *
 * Linear extrapolation only — deliberate. Anything fancier needs more than
 * 7 days of data and risks overfitting; the user-facing copy ("at this pace
 * you land around …") is honest about the caveat.
 */

export interface IndexHistoryPoint {
  date: string;
  score: number;
}

const MIN_INDEX = 0;
const MAX_INDEX = 999;

function clampIndex(score: number): number {
  return Math.max(MIN_INDEX, Math.min(MAX_INDEX, Math.round(score)));
}

/**
 * Compute the 7-day trend (Δ score over the last 7 history points).
 * Returns null when the history is too short to derive a slope.
 */
export function trend7d(history: IndexHistoryPoint[]): number | null {
  if (history.length < 2) return null;
  const tail = history.slice(-7);
  return tail[tail.length - 1].score - tail[0].score;
}

/**
 * Project the user's score `daysAhead` days from now using their 7-day trend,
 * capped at the 90-day finish line. Used by the My Journey checkpoints
 * ("By Day {N+7}", "By Day {N+30}") so each card quotes the same slope math
 * the backend voice tool uses.
 *
 *   daysToProject = min(daysAhead, max(0, 90 - daysSinceStart))
 *   projected     = clamp(0, 999, total + trend × daysToProject / 7)
 */
export function projectDays(
  total: number,
  trend: number | null,
  daysAhead: number,
  daysSinceStart: number,
): number | null {
  if (!Number.isFinite(total) || trend === null || !Number.isFinite(trend)) return null;
  if (!Number.isFinite(daysAhead) || daysAhead < 0) return null;
  const daysRemaining = Math.max(0, 90 - daysSinceStart);
  const daysToProject = Math.min(daysAhead, daysRemaining);
  if (daysToProject === 0) return clampIndex(total);
  return clampIndex(total + (trend * daysToProject) / 7);
}

/**
 * Project the user's Day-90 score from current total + 7-day trend.
 * Mirrors the backend voice tool so the Assistant and the Index Sheet
 * always quote the same number.
 *
 *   projected = clamp(0, 999, total + trend_7d × days_remaining / 7)
 *
 * Returns null when input is missing — callers should fall back to
 * aspirational framing rather than a phantom projection.
 *
 * Post-Day-90 accounts (`daysSinceStart > 90`) clamp to the current total
 * rather than returning null, matching the pre-refactor behaviour so any
 * caller relying on a stable Day-90 number for mature accounts keeps
 * getting one.
 */
export function projectDay90(
  total: number,
  trend: number | null,
  daysSinceStart: number,
): number | null {
  const daysAhead = Math.max(0, 90 - daysSinceStart);
  return projectDays(total, trend, daysAhead, daysSinceStart);
}

/**
 * Project a 30-day arc from a history series. Returns the historical points
 * (with `isProjection=false`) followed by a single projected anchor at
 * `last.day + 30` (with `isProjection=true`). Used by the Index Sheet's
 * compact horizon chart.
 *
 * `history` is expected to be sorted ascending by date. Days are encoded as
 * the integer offset from "today" (negative for past entries, 0 for today).
 *
 * Returns an empty array when `history.length < 7` so the UI can show its
 * "need a few more days of data" placeholder rather than a fabricated curve.
 */
export interface ProjectedPoint {
  day: number;
  score: number;
  isProjection: boolean;
}

const HORIZON_DAYS = 30;

export function buildHorizonPoints(history: IndexHistoryPoint[]): ProjectedPoint[] {
  if (history.length < 7) return [];

  const todayMs = new Date().setHours(0, 0, 0, 0);
  const points: ProjectedPoint[] = history.map((h) => ({
    day: Math.floor((new Date(h.date).getTime() - todayMs) / 86400000),
    score: h.score,
    isProjection: false,
  }));

  const last = points[points.length - 1];
  const tail = points.slice(-7);
  const first = tail[0];
  const slope =
    tail.length > 1 && last.day !== first.day
      ? (last.score - first.score) / (last.day - first.day)
      : 0;
  const projectedScore = clampIndex(last.score + slope * HORIZON_DAYS);

  return [...points, { day: last.day + HORIZON_DAYS, score: projectedScore, isProjection: true }];
}
