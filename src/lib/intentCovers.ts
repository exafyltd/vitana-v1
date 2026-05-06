/**
 * Find-a-Match cover-photo helpers.
 *
 *  1. `getIntentCoverUrl(intent)` resolves an intent's cover from
 *     either the top-level `cover_url` (preferred, once the gateway
 *     ships the column) or `kind_payload.cover_url` (interim transit
 *     through the existing JSONB blob).
 *
 *  2. `pickThemedCover(theme, seed)` returns a *real* themed photo
 *     URL — Lorem Flickr (Flickr CC pool) tag-themed by category and
 *     deterministic per `seed`. Same seed = same photo across
 *     renders, different seeds = different photos, so every match
 *     card gets its own picture instead of repeating the one local
 *     brand asset. The local brand asset is kept as the
 *     `coverFallbackForTheme(theme)` value, used by callers as the
 *     `<img onError>` fallback if the CDN is unreachable.
 *
 * The proper long-term replacement is a backend `POST /intents/cover/generate`
 * that runs real AI image-gen per user; this util will become a thin
 * client around that endpoint with no consumer-side change.
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

const FALLBACK_BY_THEME: Record<CoverTheme, string> = {
  dance: danceCommunity,
  fitness: wellnessYoga,
  generic: friendsMeetup,
};

/**
 * Larger fallback pool, used when callers want extra variety on the
 * onError path (e.g. cycling per-seed across the brand library
 * instead of always landing on the single per-theme fallback).
 * Currently exported for potential future use; the card today only
 * needs the single per-theme fallback above.
 */
export const BRAND_COVER_LIBRARY: readonly string[] = [
  danceCommunity,
  wellnessYoga,
  morningYogaFlow,
  morningStretch,
  breathingExercise,
  friendsMeetup,
  happyCoffeeGroup,
];

/** Tag bundles passed to Lorem Flickr's `/all` matcher. */
const COVER_TAGS: Record<CoverTheme, string> = {
  dance: 'dance,couple',
  fitness: 'fitness,gym',
  generic: 'people,community',
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
 * Pick a themed cover. Returns a Lorem Flickr URL keyed on (theme,
 * seed) so each match card gets its own real photo and the same
 * card keeps the same photo across renders / re-fetches. Tags steer
 * the result toward the requested theme; quality varies (Flickr CC).
 *
 * Callers should pair this with `coverFallbackForTheme(theme)` on
 * the `<img onError>` so a CDN outage degrades gracefully to a
 * local brand asset rather than a broken image.
 */
export function pickThemedCover(theme: CoverTheme, seed: string): string {
  const tags = COVER_TAGS[theme] ?? COVER_TAGS.generic;
  const lock = hashString(seed);
  return `https://loremflickr.com/1600/1000/${tags}/all?lock=${lock}`;
}

/** Local brand asset to use when the CDN cover fails to load. */
export function coverFallbackForTheme(theme: CoverTheme): string {
  return FALLBACK_BY_THEME[theme] ?? FALLBACK_BY_THEME.generic;
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
