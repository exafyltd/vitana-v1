export interface VitanaIndexTier {
  min: number;
  max: number;
  /**
   * Canonical English label. Used as a stable key for color maps and
   * back-compat. UI surfaces should render `labelKey` via the i18n catalog.
   */
  label: string;
  /** i18n key for the user-facing tier label (e.g. "vitanaIndex.tiers.starting"). */
  labelKey: string;
  color: string;
  description: string;
  /** Short user-facing framing shown on the Index Detail Screen tier badge. */
  framing: string;
}

/**
 * The six honest tiers the Vitana Index is read through. Replaces the older
 * Very Poor / Poor / Fair / Improving / Good / Excellent ladder with
 * aspirational-range framing that's harder to feel like a pass/fail verdict.
 *
 * - Starting / Early / Building are the journey tiers — where new users
 *   begin and climb through during the 90-day arc.
 * - Strong is "where most people land after a real 90-day push."
 * - Really good (600+) is the thriving zone.
 * - Elite (800+) is sustained excellence across all five pillars — a
 *   lifestyle result, not a 90-day goal.
 */
export const VITANA_INDEX_TIERS: VitanaIndexTier[] = [
  {
    min: 0,
    max: 99,
    label: "Starting",
    labelKey: "vitanaIndex.tiers.starting",
    color: "#FECACA", // pastel red
    description: "You've begun. Five pillars, 90 days — let's go.",
    framing: "Just starting",
  },
  {
    min: 100,
    max: 299,
    label: "Early",
    labelKey: "vitanaIndex.tiers.early",
    color: "#FDE68A", // amber
    description: "Baseline established. Every completion counts now.",
    framing: "Baseline established",
  },
  {
    min: 300,
    max: 499,
    label: "Building",
    labelKey: "vitanaIndex.tiers.building",
    color: "#FEF08A", // yellow
    description: "Habits are forming. Keep the balance across all five.",
    framing: "Habits forming",
  },
  {
    min: 500,
    max: 599,
    label: "Strong",
    labelKey: "vitanaIndex.tiers.strong",
    color: "#D9F99D", // lime
    description: "This is where most people land after a real 90-day push.",
    framing: "90-day milestone",
  },
  {
    min: 600,
    max: 799,
    label: "Really good",
    labelKey: "vitanaIndex.tiers.reallyGood",
    color: "#BBF7D0", // light green
    description: "Your practice is working. This is the 'thriving' zone.",
    framing: "Thriving",
  },
  {
    min: 800,
    max: 999,
    label: "Elite",
    labelKey: "vitanaIndex.tiers.elite",
    color: "#BAE6FD", // sky blue
    description: "Sustained excellence across all five pillars. Rare and earned.",
    framing: "Elite",
  },
];

export function getVitanaIndexTier(score: number): VitanaIndexTier {
  return (
    VITANA_INDEX_TIERS.find((tier) => score >= tier.min && score <= tier.max) ||
    VITANA_INDEX_TIERS[0]
  );
}

/**
 * The next tier up from the user's current score, or `null` when already in
 * the top band (Elite). Used by My Journey's 30-day checkpoint copy to
 * frame the goal: "Reach Strong (500+) by lifting Sleep most."
 */
export function nextTier(score: number): VitanaIndexTier | null {
  const current = getVitanaIndexTier(score);
  const idx = VITANA_INDEX_TIERS.indexOf(current);
  if (idx < 0 || idx >= VITANA_INDEX_TIERS.length - 1) return null;
  return VITANA_INDEX_TIERS[idx + 1];
}

/**
 * Points the user needs to gain to cross into the next tier (Δ to
 * `nextTier.min`). Returns `null` when already at Elite.
 */
export function pointsToNextTier(score: number): number | null {
  const next = nextTier(score);
  if (!next) return null;
  return Math.max(0, next.min - score);
}

export function getVitanaIndexPercentage(score: number): number {
  return Math.round((score / 999) * 100);
}

export function formatVitanaIndexScore(score: number): string {
  return score.toString().padStart(3, "0");
}
