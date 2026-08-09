import { t } from "@/lib/i18n-toast";

/**
 * Life-Compass goals and journey north-stars are stored server-side as fixed
 * English seed strings (e.g. "Improve quality of life and extend lifespan",
 * "Earn from recommendations"). The Life Compass *popup* renders them in German
 * because it uses the localized category presets — but the My Journey hero and
 * the north-star chips render the raw stored value, so a German user sees
 * English there.
 *
 * This maps each known seeded English goal to a catalog key so the goal flips
 * with the selected UI language at render time. Free-text custom goals the user
 * wrote themselves are not in the map and pass through unchanged.
 *
 * Add new seeded goals here (and to screens.autopilotdashboard.goalLabels in
 * both locales) as the catalog grows.
 */
const GOAL_KEY: Record<string, string> = {
  "Improve quality of life and extend lifespan": "improveQualityExtendLifespan",
  "Build Financial Freedom": "buildFinancialFreedom",
  "Transform Health": "transformHealth",
  "Find Life Partner": "findLifePartner",
  "Advance Career": "advanceCareer",
  "Master New Skills": "masterNewSkills",
  "Spiritual Life": "spiritualLife",
  "Earn from recommendations": "earnFromRecommendations",
};

/** Localize a Life-Compass goal / north-star string; passes unknown text through. */
export function localizeGoal(goal: string | null | undefined): string {
  if (!goal) return "";
  const key = GOAL_KEY[goal.trim()];
  return key ? t(`screens.autopilotdashboard.goalLabels.${key}`) : goal;
}
