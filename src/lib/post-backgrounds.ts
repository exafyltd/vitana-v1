/**
 * Facebook-style background presets for text posts.
 *
 * A text post can opt into one of these coloured/gradient surfaces so it stands
 * out in the feed instead of rendering as a small grey paragraph. The id is
 * persisted on `profile_posts.background_style`; the Tailwind classes are looked
 * up here at render time, so the database never stores raw CSS (CSP-safe — no
 * inline styles) and the picker + renderer share a single source of truth.
 *
 * Backgrounds only apply to text-only posts; once an image/video is attached the
 * card frames the media instead and the background is ignored.
 */

export interface PostBackground {
  /** Stable id stored on the post (e.g. "sunset"). */
  id: string;
  /** Tailwind fill classes for the swatch chip and the rendered surface. */
  fillClass: string;
  /** Text colour class that stays legible on the fill. */
  textClass: string;
}

export const POST_BACKGROUNDS: PostBackground[] = [
  { id: "sunset", fillClass: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600", textClass: "text-white" },
  { id: "ocean", fillClass: "bg-gradient-to-br from-cyan-400 to-blue-600", textClass: "text-white" },
  { id: "forest", fillClass: "bg-gradient-to-br from-green-400 to-emerald-600", textClass: "text-white" },
  { id: "berry", fillClass: "bg-gradient-to-br from-fuchsia-500 to-pink-600", textClass: "text-white" },
  { id: "coral", fillClass: "bg-gradient-to-br from-red-400 to-rose-500", textClass: "text-white" },
  { id: "sky", fillClass: "bg-gradient-to-br from-sky-400 to-indigo-500", textClass: "text-white" },
  { id: "midnight", fillClass: "bg-gradient-to-br from-slate-700 to-slate-900", textClass: "text-white" },
  { id: "violet", fillClass: "bg-gradient-to-br from-violet-500 to-purple-700", textClass: "text-white" },
  { id: "gold", fillClass: "bg-gradient-to-br from-amber-300 to-yellow-500", textClass: "text-slate-900" },
  { id: "mint", fillClass: "bg-gradient-to-br from-teal-200 to-emerald-300", textClass: "text-slate-900" },
  { id: "peach", fillClass: "bg-gradient-to-br from-rose-200 to-orange-200", textClass: "text-slate-900" },
  { id: "lavender", fillClass: "bg-gradient-to-br from-violet-200 to-purple-300", textClass: "text-slate-900" },
];

const BY_ID = new Map(POST_BACKGROUNDS.map((b) => [b.id, b]));

/** Resolve a stored background id to its preset, or null for a plain card. */
export function getPostBackground(id: string | null | undefined): PostBackground | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}
