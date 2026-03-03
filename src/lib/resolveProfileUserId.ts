/**
 * Resolve a stable UUID for profile queries.
 * Rejects placeholder strings like "current-user" to prevent
 * invalid DB queries that silently return 0.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string | undefined | null): value is string {
  return !!value && UUID_RE.test(value);
}

/**
 * Returns the first valid UUID from the candidates list, or undefined.
 * Typical usage: resolveProfileUserId(profile.user_id, profile.id, user?.id)
 */
export function resolveProfileUserId(
  ...candidates: (string | undefined | null)[]
): string | undefined {
  for (const c of candidates) {
    if (isValidUUID(c)) return c;
  }
  return undefined;
}
