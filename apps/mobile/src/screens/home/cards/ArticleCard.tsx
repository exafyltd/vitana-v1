/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the feed's article card. A thin
 * mapper around the news lane's `NewsArticleCard` (the single owner, consumed
 * through `src/ports/news-card`): it turns an `ArticleFeedItem` into that
 * card's props exactly as the web Home's `getCardImages` / `getCategoryLabel`
 * do — primary `image_url` with the keyword-matched category photo as the
 * fallback, and an uppercase pillar label. React 19: typed with `ReactElement`.
 */
import type { ReactElement } from 'react';
import { NewsArticleCard } from '../../../ports/news-card';
import { getNewsImage, getArticlePillar } from '../../../ports/news';
import { useI18n } from '../../../i18n/I18nProvider';
import type { ArticleFeedItem } from '../../../ports/feed';
import { formatTimeAgo } from './time';

export function ArticleCard({ item, onPress }: { item: ArticleFeedItem; onPress: () => void }): ReactElement {
  const { locale } = useI18n();
  const categoryImage = getNewsImage(item.tags, item.id, item.title, item.summary);
  const pillar = getArticlePillar(item.tags, item.title, item.summary);
  const category = (pillar || 'NUTRITION').toUpperCase();
  return (
    <NewsArticleCard
      title={item.title}
      description={item.summary ?? undefined}
      imageUrl={item.image_url || categoryImage}
      fallbackImageUrl={categoryImage}
      category={category}
      timestamp={formatTimeAgo(item.published_at, locale)}
      sourceName={item.source_name}
      onPress={onPress}
      testID={`feed-article-${item.id}`}
    />
  );
}
