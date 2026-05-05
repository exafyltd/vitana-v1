/**
 * Find-a-Match cover-photo helpers.
 *
 *  1. `getIntentCoverUrl(intent)` resolves an intent's cover from
 *     either the top-level `cover_url` (preferred, once the gateway
 *     ships the column) or `kind_payload.cover_url` (interim transit
 *     through the existing JSONB blob).
 *
 *  2. `pickThemedCover(theme, seed)` deterministically picks one
 *     of the brand's real, themed photographs (imported from
 *     `src/assets/`) so the "✨ Generate for me" path always
 *     produces a presentable real photo. Every URL Vite emits here
 *     is content-hashed and CDN-cacheable. Once a backend AI image
 *     generator exists this util becomes a thin client around
 *     `POST /intents/cover/generate` with no consumer-side change.
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
  // Only one dance photo in the brand library today; backend AI
  // generation or follow-up curation will add variety.
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
 * Pick a themed cover deterministically. Same `seed` for the same
 * `theme` always returns the same URL, so a given intent keeps its
 * cover across renders and re-fetches.
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
