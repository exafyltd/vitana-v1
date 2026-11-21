/**
 * VTID-05677 (native-wave2-media-hub-r2/media-hub) — the Media Hub's shared
 * shapes: the Shorts tag allow-list (class A, re-exported by name) and the
 * three short types generated from `src/hooks/useShorts.ts`
 * (packages/core/extract.json entry `media`; never edit the generated file).
 */
export { SHORTS_TAG_IDS, type ShortsTagId } from '@/lib/shortsTags';
export type { Short, FetchShortsParams, DeleteShortInput } from './extracted/media.generated';
