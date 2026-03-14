/**
 * Vitana Bot Identity — single source of truth for the AI assistant's
 * display identity across all UI surfaces (chat, notifications, etc.)
 *
 * UUID is deterministic: 00000000-0000-0000-0000-000000000001
 * Same across all environments and seeded in auth.users, profiles,
 * app_users, and global_community_profiles.
 */

export const VITANA_BOT_USER_ID =
  (import.meta as any).env?.VITE_VITANA_BOT_USER_ID ||
  "00000000-0000-0000-0000-000000000001";

export const VITANA_BOT_DISPLAY_NAME = "Vitana";

export const VITANA_BOT_AVATAR_URL = "/vitana-orb-avatar.png";

/** Check whether a user ID belongs to the Vitana AI bot */
export function isVitanaBot(userId: string | null | undefined): boolean {
  return !!userId && userId === VITANA_BOT_USER_ID;
}

/** Get display name for a user, with Vitana bot override */
export function resolveDisplayName(
  userId: string | null | undefined,
  fallbackName?: string
): string {
  if (isVitanaBot(userId)) return VITANA_BOT_DISPLAY_NAME;
  return fallbackName || "Unknown User";
}

/** Get avatar URL for a user, with Vitana bot override */
export function resolveAvatarUrl(
  userId: string | null | undefined,
  fallbackUrl?: string | null
): string | null {
  if (isVitanaBot(userId)) return VITANA_BOT_AVATAR_URL;
  return fallbackUrl || null;
}
