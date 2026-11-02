/**
 * VTID-05430 (Native Wave 2, public-profile lane) — the target rule of the web
 * `src/components/LegacyProfileRedirect.tsx` (`/profile/:id`), verbatim: the
 * legacy numeric id → handle table first, then a UUID, then a clean handle
 * (leading `@` dropped, 2–25 of `[a-z0-9_-]`, case-insensitive). Anything else
 * has no target (the web renders NotFound).
 */
const LEGACY_ID_TO_HANDLE: Readonly<Record<string, string>> = {
  '1': 'sarahwellness',
  '2': 'dr-roberts',
  '3': 'maxina',
  '4': 'emmawilson',
  '5': 'jamesdavis',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE_RE = /^[a-z0-9_-]{2,25}$/i;

/** The canonical `/u/…` path for a legacy `/profile/:id`, or null (not found). */
export function legacyProfileTarget(id: string | null | undefined): string | null {
  if (!id) return null;
  const handle = Object.prototype.hasOwnProperty.call(LEGACY_ID_TO_HANDLE, id) ? LEGACY_ID_TO_HANDLE[id] : null;
  if (handle) return `/u/${handle}`;
  if (UUID_RE.test(id)) return `/u/${id}`;
  const cleaned = id.startsWith('@') ? id.slice(1) : id;
  if (HANDLE_RE.test(cleaned)) return `/u/${cleaned}`;
  return null;
}
