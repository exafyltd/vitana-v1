/**
 * VTID-05298 — news cover-image selection and longevity-pillar mapping
 * (src/lib/news-images.ts). Pure, IO-free: category pools keyed off an
 * article's tags/title/summary and a deterministic FNV-1a pick. The native
 * `NewsArticleCard` twin and the news reader use it the same way the web does.
 */
export * from '@/lib/news-images';
