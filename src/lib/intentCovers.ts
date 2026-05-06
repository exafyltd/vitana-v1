/**
 * Find-a-Match cover-photo helpers.
 *
 *  1. `getIntentCoverUrl(intent)` resolves an intent's cover from
 *     either the top-level `cover_url` (preferred, once the gateway
 *     ships the column) or `kind_payload.cover_url` (interim transit
 *     through the existing JSONB blob).
 *
 *  2. `pickThemedCover(theme, seed)` deterministically picks one
 *     of the brand's curated landscape photos. Same `seed` for the
 *     same `theme` always returns the same URL, so a given match
 *     keeps its cover across renders and re-fetches.
 *
 * NOTE: an earlier iteration routed this through Lorem Flickr for
 * per-card variety. That CDN's CC pool returned virtual-avatar
 * adult content tagged as "couple" / "dance" — unacceptable on
 * this surface — so we reverted to the curated brand library.
 * Variety per match returns when the gateway ships a real,
 * content-safety-checked image-gen pipeline behind
 * `POST /intents/cover/generate`. The picker's signature is
 * unchanged so the consumer doesn't change.
 */

import danceCommunity from '@/assets/actions/community-dance-group.jpg';
import wellnessYoga from '@/assets/actions/wellness-yoga-nature.jpg';
import morningYogaFlow from '@/assets/ai-feed/morning-yoga-flow.jpg';
import morningStretch from '@/assets/shorts-morning-stretch.jpg';
import breathingExercise from '@/assets/shorts-breathing-exercise.jpg';
import friendsMeetup from '@/assets/actions/friends-meetup-selfie.jpg';
import happyCoffeeGroup from '@/assets/happy-coffee-group.jpg';

import type { UserIntent } from './intentApi';

export type CoverTheme = 'dance' | 'fitness' | 'generic';

const COVERS: Record<CoverTheme, string[]> = {
  // Only one curated dance photo today; backend AI gen will add
  // variety. Until then dance covers will repeat — acceptable
  // tradeoff vs. exposing the open Flickr CC pool.
  dance: [danceCommunity],
  fitness: [wellnessYoga, morningYogaFlow, morningStretch, breathingExercise],
  generic: [friendsMeetup, happyCoffeeGroup],
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
 * Pick a themed cover deterministically from the curated brand
 * library. Same `seed` for the same `theme` always returns the
 * same URL.
 */
export function pickThemedCover(theme: CoverTheme, seed: string): string {
  const list = COVERS[theme] ?? COVERS.generic;
  const idx = hashString(seed) % list.length;
  return list[idx];
}

/**
 * Local brand asset to use as the `<img onError>` fallback for
 * cover images. Same as `pickThemedCover()` today; kept as a
 * separate function so the card's onError handler doesn't need to
 * know which seed it was originally rendered with.
 */
export function coverFallbackForTheme(theme: CoverTheme): string {
  const list = COVERS[theme] ?? COVERS.generic;
  return list[0];
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
