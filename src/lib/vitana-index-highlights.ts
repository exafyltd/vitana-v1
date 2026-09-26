/**
 * VTID-04470 — what the profile is allowed to say about a member's Vitana
 * Index, derived ONLY from data the app already has.
 *
 * The Index is computed from five pillar scores, so a pillar score that rose
 * over the trailing window is a real, direct contributor to the Index moving —
 * that is the only relationship this module claims. It never names an
 * activity ("running"), never states a percentile or rank (the platform has
 * no community ranking for the Index — the old "Top X%" chip was score/999),
 * and returns `kind: "none"` when there is not enough history to say anything.
 *
 * Pure: no React, no i18n. Callers render the result through the catalog.
 */
import type {
  VitanaIndexPillars,
  VitanaPillarKey,
} from "@/hooks/useVitanaIndex";

export const HIGHLIGHT_PILLARS: VitanaPillarKey[] = [
  "nutrition",
  "hydration",
  "exercise",
  "sleep",
  "mental",
];

/** A pillar must move at least this much to count as a "lift". */
export const MIN_PILLAR_GAIN = 3;
/** Index points over the window that make the week read as "rising fast".
 *  Mirrors the ">= 20 — huge week" threshold in VitanaIndexSheet. */
export const RISING_FAST_DELTA = 20;

export interface IndexHighlightInput {
  total: number;
  history: Array<{ date: string; score: number }>;
  pillarHistory?: Array<{ date: string; pillars: Partial<VitanaIndexPillars> }>;
  pillars?: VitanaIndexPillars | null;
  trend?: "up" | "down" | "stable";
  isBaseline?: boolean;
}

export interface IndexHighlights {
  /**
   * boost    — one or more pillars measurably rose over the window.
   * strongest — no rise to report, but real pillar scores exist; name the
   *             highest pillar as the strongest AREA (no causal claim).
   * none     — not enough data; the caller shows the encouraging fallback.
   */
  kind: "boost" | "strongest" | "none";
  /** Pillars that rose, largest gain first (max 3). Empty unless kind=boost. */
  lifts: Array<{ pillar: VitanaPillarKey; gain: number }>;
  /** Highest-scoring pillar, when kind=strongest. */
  strongest: VitanaPillarKey | null;
  /** Index change across the window, or null when there is no history. */
  weekDelta: number | null;
  /** "rising_fast" / "improving" only when history supports it. */
  momentum: "rising_fast" | "improving" | null;
}

const EMPTY: IndexHighlights = {
  kind: "none",
  lifts: [],
  strongest: null,
  weekDelta: null,
  momentum: null,
};

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function deriveIndexHighlights(
  input: IndexHighlightInput | null | undefined,
): IndexHighlights {
  if (!input || !finite(input.total) || input.total <= 0) return EMPTY;

  const history = (input.history ?? []).filter((h) => finite(h.score));
  const weekDelta =
    history.length >= 2 ? history[history.length - 1].score - history[0].score : null;

  let momentum: IndexHighlights["momentum"] = null;
  if (weekDelta !== null && weekDelta >= RISING_FAST_DELTA) momentum = "rising_fast";
  else if (weekDelta !== null && weekDelta > 0 && input.trend === "up") momentum = "improving";

  // Per-pillar gain: last known value minus first known value in the window.
  const ph = input.pillarHistory ?? [];
  const lifts: IndexHighlights["lifts"] = [];
  if (ph.length >= 2) {
    for (const key of HIGHLIGHT_PILLARS) {
      const series = ph.map((r) => r.pillars?.[key]).filter(finite);
      if (series.length < 2) continue;
      const gain = series[series.length - 1] - series[0];
      if (gain >= MIN_PILLAR_GAIN) lifts.push({ pillar: key, gain });
    }
    lifts.sort((a, b) => b.gain - a.gain);
  }

  if (lifts.length > 0) {
    return { kind: "boost", lifts: lifts.slice(0, 3), strongest: null, weekDelta, momentum };
  }

  // No measured rise. A baseline (seeded) model says nothing about the
  // member's own habits, so it cannot name a "strongest area" either.
  const pillars = input.pillars;
  if (pillars && !input.isBaseline) {
    const values = HIGHLIGHT_PILLARS.map((k) => pillars[k]).filter(finite);
    const max = Math.max(...values);
    const min = Math.min(...values);
    // All-equal pillars (e.g. the 10/10/10/10/10 defaults) have no leader.
    if (values.length === HIGHLIGHT_PILLARS.length && max > min) {
      const strongest = HIGHLIGHT_PILLARS.find((k) => pillars[k] === max) ?? null;
      return { kind: "strongest", lifts: [], strongest, weekDelta, momentum };
    }
  }

  return { ...EMPTY, weekDelta, momentum };
}
