import { t } from "@/lib/i18n-toast";

/**
 * Match-reason phrases are produced server-side (the daily-matches engine and
 * the recommendation edge functions) plus a few synthetic client fallbacks.
 * Several of these are emitted as fixed English strings, so a German user sees
 * English reasons on otherwise-German match cards.
 *
 * This maps each known fixed English phrase to a catalog key so the reason
 * flips with the selected UI language (DE ↔ EN) at render time — and so any
 * legacy English value already stored in `daily_matches` is localized too.
 * Free-text reasons (e.g. an LLM-generated explanation that is already in the
 * user's language) are not in the map and pass through unchanged.
 */
const REASON_KEY: Record<string, string> = {
  // generate-daily-matches → daily_matches.match_reasons
  "Shared wellness interests": "matchReasonSharedInterests",
  "Similar daily routines": "matchReasonDailyRoutines",
  "Compatible fitness goals": "matchReasonFitnessGoals",
  "Matching activity times": "matchReasonActivityTimes",
  "Nearby location": "matchReasonNearby",
  "Similar wellness journey stage": "matchReasonJourneyStage",
  // PeopleMatchCard synthetic reasons
  "Morning routine & wellness goals align": "matchReasonRoutine",
  "Similar activity patterns & interests": "matchReasonActivity",
  "Shared fitness & mindfulness journey": "matchReasonFitness",
  "Compatible lifestyle & schedule": "matchReasonLifestyle",
  "Overlapping health goals": "matchReasonGoals",
  "Mutual wellness interests": "matchReasonInterests",
  // recommendation / discovery fallbacks
  "Suggested based on your profile": "matchReasonGeneric",
  "Great wellness alignment!": "matchReasonGreatAlignment",
};

/** Localize a match-reason string; returns "" for empty input. */
export function localizeMatchReason(reason: string | null | undefined): string {
  if (!reason) return "";
  const key = REASON_KEY[reason.trim()];
  return key ? t(`screens.crossover.${key}`) : reason;
}
