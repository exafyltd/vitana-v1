/**
 * Find-a-Match cover-photo helpers.
 *
 * Two responsibilities:
 *
 *  1. `getIntentCoverUrl(intent)` — resolve an intent's cover URL from
 *     either a top-level `cover_url` (preferred, once the backend
 *     ships the column) or `kind_payload.cover_url` (interim:
 *     transit through the existing JSONB blob so this PR can ship
 *     ahead of a DB migration).
 *
 *  2. `pickThemedCover(category, seed)` — deterministically pick one
 *     of a small curated set of dance / fitness / generic landscape
 *     SVGs from `/public/intent-covers/`. Used as the "✨ Generate
 *     for me" fallback so users always have a presentable cover
 *     even before any AI image-gen backend exists. The endpoint
 *     shape matches what the backend will expose later — this
 *     util will become a thin client around `POST /intents/cover/generate`
 *     once that lands.
 */

import type { UserIntent } from './intentApi';

export type CoverTheme = 'dance' | 'fitness' | 'generic';

const COVERS: Record<CoverTheme, string[]> = {
  dance: [
    '/intent-covers/dance/01.svg',
    '/intent-covers/dance/02.svg',
    '/intent-covers/dance/03.svg',
  ],
  fitness: [
    '/intent-covers/fitness/01.svg',
    '/intent-covers/fitness/02.svg',
    '/intent-covers/fitness/03.svg',
  ],
  generic: [
    '/intent-covers/generic/01.svg',
    '/intent-covers/generic/02.svg',
  ],
};

export function themeFromCategory(category: string | null | undefined): CoverTheme {
  if (!category) return 'generic';
  if (category.startsWith('dance.')) return 'dance';
  if (category.startsWith('fitness.')) return 'fitness';
  return 'generic';
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Pick a themed cover deterministically. The same `seed` for the
 * same `theme` always returns the same URL — so a given intent
 * keeps its cover across re-renders and re-fetches.
 */
export function pickThemedCover(theme: CoverTheme, seed: string): string {
  const list = COVERS[theme] ?? COVERS.generic;
  const idx = hashString(seed) % list.length;
  return list[idx];
}

/** Resolve an intent's cover URL from any field that might carry it. */
export function getIntentCoverUrl(
  intent: Pick<UserIntent, 'cover_url' | 'kind_payload'> | null | undefined,
): string | null {
  if (!intent) return null;
  if (intent.cover_url) return intent.cover_url;
  const fromPayload = (intent.kind_payload as Record<string, unknown> | null | undefined)?.cover_url;
  return typeof fromPayload === 'string' && fromPayload.length > 0 ? fromPayload : null;
}
