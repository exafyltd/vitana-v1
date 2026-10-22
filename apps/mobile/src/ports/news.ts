/**
 * VTID-05298 (Native Wave 2, news lane) — the news helpers through one port,
 * from `@vitana/core/news-images` (the pure web `src/lib/news-images.ts`).
 * Screen files read these only through this port, never from `@vitana/core`
 * directly (tests/ports.test.ts).
 */
export { getNewsImage, getArticlePillar, mapTagToPillar, LONGEVITY_PILLARS, type LongevityPillar } from '@vitana/core/news-images';
