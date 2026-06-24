/**
 * VIP authors — community-face accounts that are always boosted to the very top
 * of the News feed, regardless of whether the viewer follows them.
 *
 * Rationale: a handful of accounts are important for how the community *looks*
 * to every member (founders, headline coaches, brand faces). Because the feed
 * otherwise orders posts purely by recency, a brand-new VIP account — which has
 * no followers yet — would still be visible, but a VIP's slightly older post
 * could be pushed below a flood of fresher community posts. Pinning these
 * authors guarantees their posts lead the feed for everyone.
 *
 * Matching is by **normalised display name** (case/space-insensitive) and/or by
 * **user_id**. Names are how the team thinks about these people and need no DB
 * lookup; user_ids are the robust fallback if a display name ever changes — add
 * them here once known and they take precedence.
 *
 * To add/remove a VIP: edit the lists below. No other code change is needed.
 */

/** Normalise a display name for comparison: trim, collapse whitespace, lowercase. */
export function normalizeVipName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** VIP display names (exact human spelling — normalised at comparison time). */
export const VIP_AUTHOR_NAMES: readonly string[] = [
  "Malika Dzumaev",
  "Detlef Soost",
  "Mariia Maksina",
];

/** VIP user_ids (optional, takes precedence over name matching). */
export const VIP_AUTHOR_USER_IDS: readonly string[] = [
  // e.g. "a27552a3-0257-4305-8ed0-351a80fd3701",
];

const VIP_NAME_SET = new Set(VIP_AUTHOR_NAMES.map(normalizeVipName));
const VIP_ID_SET = new Set(VIP_AUTHOR_USER_IDS);

/** True when the author (by user_id or display name) is a pinned VIP. */
export function isVipAuthor(userId: string | null | undefined, displayName: string | null | undefined): boolean {
  if (userId && VIP_ID_SET.has(userId)) return true;
  const n = normalizeVipName(displayName);
  return n.length > 0 && VIP_NAME_SET.has(n);
}
