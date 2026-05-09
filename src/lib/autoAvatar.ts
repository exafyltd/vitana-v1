/**
 * VTID-02806i — Playful auto-generated profile avatars.
 *
 * Every member is rendered with a profile photo, even before they
 * upload one of their own. We pick deterministically from a curated
 * mix of DiceBear avatar styles + a palette of soft gradient
 * backgrounds, keyed by a stable identifier (vitana_id → handle →
 * user_id). Same seed → same avatar across every device, every
 * session, every list. New seeds → fresh avatar from the rotation.
 *
 * Goal:
 *   - Never an empty avatar tile.
 *   - Visually distinct enough between users that they stand out in
 *     a list of ~hundreds.
 *   - Friendly, illustrated, *clearly* an auto-generated placeholder
 *     so the user is gently nudged to upload their own.
 *
 * Cost: free. DiceBear ships SVGs from a public CDN that is already
 * allow-listed in the app's CSP (the demo data has used it for
 * months).
 *
 * Variety: the helper rotates across ~15 illustration styles, each
 * with hundreds of internal variations driven by the seed, then
 * applies one of 10 background gradients on top. Effective space is
 * deep into the thousands per (handle space × style × bg) grid.
 */

// 15 curated styles. Mix of cute humans, robots, cartoon objects
// (icons covers sports / animals / plants / vehicles / household),
// and abstract shapes — same flavour the user asked for.
const DICEBEAR_STYLES = [
  "lorelei",
  "lorelei-neutral",
  "adventurer",
  "big-ears",
  "big-smile",
  "bottts",
  "bottts-neutral",
  "croodles",
  "fun-emoji",
  "icons",
  "notionists",
  "notionists-neutral",
  "personas",
  "pixel-art",
  "shapes",
  "thumbs",
] as const;

// Soft pastel palette — blends well with the app's light + dark
// surfaces and keeps avatar tiles legible at small sizes.
const BG_COLORS = [
  "b6e3f4",
  "c0aede",
  "d1d4f9",
  "ffd5dc",
  "ffdfbf",
  "a3e7c5",
  "fde68a",
  "fca5a5",
  "9ecbff",
  "fbcfe8",
] as const;

// Stable, fast 32-bit string hash. We don't need crypto strength —
// just consistent across browsers and reasonably distributed.
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0; // unsigned
}

export interface AutoAvatarOpts {
  /** Pixel size hint (DiceBear renders SVG; this is mostly for cache key). */
  size?: number;
}

/**
 * Build a deterministic public DiceBear URL for the given seed.
 * Empty / undefined seeds fall back to a neutral default so callers
 * never need to guard.
 */
export function getAutoAvatarUrl(seed: string | null | undefined, opts: AutoAvatarOpts = {}): string {
  const safeSeed = (seed && seed.trim().length > 0) ? seed : "vitana";
  const h = djb2(safeSeed);
  const style = DICEBEAR_STYLES[h % DICEBEAR_STYLES.length];
  const bg = BG_COLORS[(h >>> 8) % BG_COLORS.length];
  const params = new URLSearchParams({
    seed: safeSeed,
    backgroundType: "gradientLinear",
    backgroundColor: bg,
    radius: "50",
  });
  if (opts.size) params.set("size", String(opts.size));
  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}

export interface AvatarSubject {
  avatar_url?: string | null;
  avatarUrl?: string | null;
  user_id?: string | null;
  userId?: string | null;
  vitana_id?: string | null;
  vitanaId?: string | null;
  handle?: string | null;
  display_name?: string | null;
  displayName?: string | null;
  name?: string | null;
}

/**
 * Resolve the URL the UI should render for a profile-shaped object.
 * Returns the user's uploaded avatar when set, otherwise a stable
 * auto-generated DiceBear avatar keyed by the most stable identifier
 * available on the subject.
 */
export function getDisplayAvatarUrl(
  subject: AvatarSubject | null | undefined,
  opts: AutoAvatarOpts = {},
): string {
  if (!subject) return getAutoAvatarUrl(null, opts);
  const uploaded = subject.avatar_url ?? subject.avatarUrl;
  if (typeof uploaded === "string" && uploaded.length > 0) return uploaded;
  const seed =
    subject.vitana_id ??
    subject.vitanaId ??
    subject.handle ??
    subject.user_id ??
    subject.userId ??
    subject.display_name ??
    subject.displayName ??
    subject.name ??
    null;
  return getAutoAvatarUrl(seed, opts);
}
