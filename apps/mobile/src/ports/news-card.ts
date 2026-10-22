/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the news-feed card through one
 * port. The news lane owns `NewsArticleCard` (VTID-05298,
 * src/screens/news/NewsArticleCard.tsx, design decision 3: a single owner);
 * Home consumes that one owner through this port rather than reaching into the
 * news lane's screen folder directly.
 */
export { NewsArticleCard, type NewsArticleCardProps } from '../screens/news/NewsArticleCard';
