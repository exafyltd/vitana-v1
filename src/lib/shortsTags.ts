/**
 * Canonical allow-list of Shorts tags.
 *
 * SYNC WITH: vitana-platform/services/gateway/src/constants/shorts-tags.ts
 *
 * Used by the upload modals (Unified + Bulk) and validated server-side by
 * the auto-metadata endpoint. Keep both lists in lock-step until this moves
 * to a DB-backed config endpoint.
 */
export const SHORTS_TAG_IDS = [
  'nutrition',
  'sleep',
  'longevity',
  'motivation',
  'mindfulness',
  'fitness',
  'mentalHealth',
  'wellness',
  'education',
  'lifestyle',
] as const;

export type ShortsTagId = (typeof SHORTS_TAG_IDS)[number];
