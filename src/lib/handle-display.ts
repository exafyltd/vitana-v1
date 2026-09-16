/**
 * VTID-03978: decide whether a profile "handle" is safe to show to a person.
 *
 * Several profile screens seed their local state with
 * `contextProfile.handle || user.id` so that the `/u/:identifier` route can
 * still resolve the owner while the real profile row is loading (or failed to
 * load). That fallback is a routing identifier, not a handle — but the same
 * value was also rendered as "@<uuid>" on the identity card, which is exactly
 * what members saw during the 2026-09-16 production slowdown when the
 * login-time profiles fetch timed out.
 *
 * Routing keeps using the raw identifier; display goes through here.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strip a leading "@" and surrounding whitespace. */
export function normalizeHandle(handle: string | null | undefined): string {
  if (typeof handle !== 'string') return '';
  return handle.trim().replace(/^@+/, '');
}

/** True when the value is a real, human-readable handle (not empty, not a UUID). */
export function isDisplayableHandle(handle: string | null | undefined): boolean {
  const h = normalizeHandle(handle);
  return h.length > 0 && !UUID_RE.test(h);
}

/**
 * The handle to render (without "@"), or undefined when nothing should be
 * shown — callers render the "@handle" line only when this is defined.
 */
export function displayHandle(handle: string | null | undefined): string | undefined {
  return isDisplayableHandle(handle) ? normalizeHandle(handle) : undefined;
}
