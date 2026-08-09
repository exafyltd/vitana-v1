import { t } from "@/lib/i18n-toast";

/**
 * Match-reason phrases are produced server-side (the `generate-daily-matches`
 * engine and the recommendation edge functions) plus a few synthetic client
 * fallbacks. Historically the engine *localized the reason at generation time*
 * and stored the finished string in `daily_matches.match_reasons`, so a reason
 * generated while the user's profile language was English stayed English even
 * after they switched the app to German — exactly the bug on "My Longevity
 * Journey".
 *
 * The fix is to localize at RENDER time against the active UI language. This
 * module accepts either:
 *   • a structured reason  `{ code, params }`  (the canonical i18n shape the
 *     engine now emits — locale-independent), or
 *   • a legacy display string (already-localized DE *or* EN text stored before
 *     the refactor) which we reverse-map back to a catalog key so it re-renders
 *     in the current language.
 *
 * Free-text reasons we don't recognise (e.g. demo data already in the user's
 * language) pass through unchanged.
 */

/** A reason as stored in `daily_matches.match_reasons` (string = legacy). */
export type MatchReason =
  | string
  | { code: string; params?: Record<string, string | number> };

/** Vitana Index pillar key → catalog sub-key for its localized display name. */
const PILLAR_KEY: Record<string, string> = {
  sleep: "matchReasonPillarSleep",
  nutrition: "matchReasonPillarNutrition",
  exercise: "matchReasonPillarExercise",
  hydration: "matchReasonPillarHydration",
  mental: "matchReasonPillarMental",
};

/** Localized pillar display name (DE + EN) → pillar key, for reverse-mapping
 * legacy strings. Lower-cased lookups. */
const PILLAR_NAME_TO_KEY: Record<string, string> = {
  // English
  sleep: "sleep",
  nutrition: "nutrition",
  exercise: "exercise",
  hydration: "hydration",
  "mental wellbeing": "mental",
  // German
  schlaf: "sleep",
  ernährung: "nutrition",
  bewegung: "exercise",
  flüssigkeitshaushalt: "hydration",
  "mentale gesundheit": "mental",
};

/**
 * Fixed (param-less) display strings the engine has emitted, mapped to a catalog
 * key. Includes the legacy `generate-daily-matches` set, the PeopleMatchCard
 * synthetic reasons, recommendation fallbacks, and the param-less reasons from
 * the current engine in *both* DE and EN.
 */
const REASON_KEY: Record<string, string> = {
  // generate-daily-matches → daily_matches.match_reasons (legacy)
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
  // current engine — param-less reasons (EN + DE)
  "Similar Vitana Index — comparable longevity stage": "matchReasonSimilarIndex",
  "Ähnlicher Vitana-Index – ähnliche Longevity-Phase": "matchReasonSimilarIndex",
  "Active member of the longevity community": "matchReasonActiveMember",
  "Aktives Mitglied der Longevity-Community": "matchReasonActiveMember",
};

/** Localize a pillar key to the active language; unknown keys pass through. */
function localizePillar(pillarKey: string): string {
  const sub = PILLAR_KEY[pillarKey];
  return sub ? t(`screens.crossover.${sub}`) : pillarKey;
}

/** Render a structured reason `{ code, params }` in the active language. */
function localizeCode(
  code: string,
  params?: Record<string, string | number>,
): string {
  switch (code) {
    case "shared_pillar": {
      const pillarKey = String(params?.pillar ?? "");
      const pillar = localizePillar(pillarKey) || pillarKey;
      return t("screens.crossover.matchReasonSharedPillar", { pillar });
    }
    case "similar_index":
      return t("screens.crossover.matchReasonSimilarIndex");
    case "mutual_connections": {
      const count = Number(params?.count ?? 0);
      const key =
        count === 1
          ? "matchReasonMutualConnectionsOne"
          : "matchReasonMutualConnectionsOther";
      return t(`screens.crossover.${key}`, { count });
    }
    case "same_location":
      return t("screens.crossover.matchReasonSameLocation", {
        location: String(params?.location ?? ""),
      });
    case "active_member":
      return t("screens.crossover.matchReasonActiveMember");
    default:
      return "";
  }
}

/**
 * Reverse-map a legacy localized display string (DE or EN) to localized text in
 * the active language. Returns null when the string isn't a known template, so
 * the caller can fall back to passing it through unchanged.
 */
function localizeLegacyString(reason: string): string | null {
  const s = reason.trim();

  // Exact, param-less phrases.
  const exact = REASON_KEY[s];
  if (exact) return t(`screens.crossover.${exact}`);

  // Shared pillar: "You're both strong in X" / "Ihr seid beide stark im Bereich X"
  const pillarMatch =
    s.match(/^You're both strong in (.+)$/i) ||
    s.match(/^Ihr seid beide stark im Bereich (.+)$/i);
  if (pillarMatch) {
    const name = pillarMatch[1].trim();
    const key = PILLAR_NAME_TO_KEY[name.toLowerCase()];
    return t("screens.crossover.matchReasonSharedPillar", {
      pillar: key ? localizePillar(key) : name,
    });
  }

  // Mutual connections: "3 mutual connections" / "1 gemeinsame Kontaktperson"
  const mutualMatch =
    s.match(/^(\d+)\s+mutual connections?$/i) ||
    s.match(/^(\d+)\s+gemeinsame Kontakt(?:e|person)$/i);
  if (mutualMatch) {
    return localizeCode("mutual_connections", { count: Number(mutualMatch[1]) });
  }

  // Same location: "Also in X" / "Auch in X"
  const locMatch = s.match(/^Also in (.+)$/i) || s.match(/^Auch in (.+)$/i);
  if (locMatch) {
    return localizeCode("same_location", { location: locMatch[1].trim() });
  }

  return null;
}

/**
 * Localize a match reason (structured object or legacy string) to the active UI
 * language. Returns "" for empty input.
 */
export function localizeMatchReason(
  reason: MatchReason | null | undefined,
): string {
  if (!reason) return "";

  if (typeof reason === "object") {
    return reason.code ? localizeCode(reason.code, reason.params) : "";
  }

  const s = reason.trim();
  if (!s) return "";
  const localized = localizeLegacyString(s);
  return localized != null ? localized : s;
}

/**
 * Reduce a match reason to a SHORT, localized category label (1–2 words) that
 * tells the user *what* the match is based on — "Gemeinsame Interessen",
 * "Gleicher Ort", "Bewegung" — instead of a long, often-truncated sentence.
 *
 * Used by compact surfaces like the News-feed match card where there is only
 * room for a couple of words. Always returns a localized string (falls back to
 * a generic "shared wellness" category) so the card never shows raw English.
 */
export function matchCategoryLabel(
  reason: MatchReason | null | undefined,
): string {
  const wellness = () => t("screens.crossover.matchCatWellness");
  if (!reason) return wellness();

  // Structured reason `{ code, params }` — the canonical shape.
  if (typeof reason === "object") {
    switch (reason.code) {
      case "shared_pillar": {
        const sub = PILLAR_KEY[String(reason.params?.pillar ?? "")];
        return sub ? t(`screens.crossover.${sub}`) : wellness();
      }
      case "similar_index":
        return t("screens.crossover.matchCatLongevity");
      case "mutual_connections":
        return t("screens.crossover.matchCatFriends");
      case "same_location":
        return t("screens.crossover.matchCatLocation");
      case "active_member":
        return t("screens.crossover.matchCatCommunity");
      default:
        return wellness();
    }
  }

  // Legacy free-text string (DE or EN) — map keywords to a category.
  const raw = reason.trim();
  if (!raw) return wellness();

  // "You're both strong in X" / "Ihr seid beide stark im Bereich X" → pillar.
  const pillarMatch =
    raw.match(/strong in (.+)$/i) || raw.match(/bereich (.+)$/i);
  if (pillarMatch) {
    const key = PILLAR_NAME_TO_KEY[pillarMatch[1].trim().toLowerCase()];
    if (key) return t(`screens.crossover.${PILLAR_KEY[key]}`);
  }

  const s = raw.toLowerCase();
  if (/mutual connection|gemeinsame kontakt|friend|freund/.test(s))
    return t("screens.crossover.matchCatFriends");
  if (/also in|auch in|nearby|in der nähe|location|standort|ort\b/.test(s))
    return t("screens.crossover.matchCatLocation");
  // Check community/member BEFORE longevity: the active-member fallback phrase
  // "Active member of the longevity community" also contains "longevity".
  if (/community|mitglied|active member/.test(s))
    return t("screens.crossover.matchCatCommunity");
  if (/vitana.?index|longevity|journey|wellness-reise/.test(s))
    return t("screens.crossover.matchCatLongevity");
  if (/goal|ziel/.test(s)) return t("screens.crossover.matchCatGoals");
  if (/routine|tagesablauf|tagesabläufe/.test(s))
    return t("screens.crossover.matchCatRoutine");
  if (/fitness/.test(s)) return t("screens.crossover.matchCatFitness");
  if (/lifestyle|lebensstil/.test(s))
    return t("screens.crossover.matchCatLifestyle");
  if (/sport/.test(s)) return t("screens.crossover.matchCatSports");
  if (/activity|aktivit/.test(s))
    return t("screens.crossover.matchCatActivity");
  if (/business|geschäft|geschäft/.test(s))
    return t("screens.crossover.matchCatBusiness");
  if (/interest|interesse/.test(s))
    return t("screens.crossover.matchCatInterests");
  return wellness();
}
