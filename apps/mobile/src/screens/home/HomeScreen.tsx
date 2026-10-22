/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the native Home screen, a port
 * of the mobile-web (`useIsMobile`) branch of `src/pages/Home.tsx`. The `tab`
 * search param drives the All / Community feeds (web `FilterTab`): `all`
 * (HOME.OVERVIEW / HOME.NEWS_ALL) shows the composed, ranked feed —
 * `useAllNewsFeed` ranked with the pure `rankFeed`, interleaved with the top
 * open enrichment cards (`useEnrichmentCards` → `pickHomeServerCards` →
 * `withHomeNewCards` → `composeFeed`); `community` (HOME.NEWS_COMMUNITY) shows
 * the chronological community articles (`useCommunityNews`). A FlatList of one
 * card per `FeedItem.kind`, each wrapped in `FeedItemErrorBoundary` keyed by
 * the item id, with pull-to-refresh (RefreshControl → refetch) and infinite
 * scroll (onEndReached → fetchNextPage, All feed only — the web gates endless
 * scroll off the community tab). The All / Community switch is the shell's
 * `MobileModePill`, writing the param back via `router.setParams`.
 *
 * In scope for FEAT-002 (documented deferrals, picked up by later home FEATs):
 *  - The web header chips (VitanaIndexChip / AutopilotChip) are bound to web
 *    hooks (`useVitanaStreaks`, `useAutopilot`) and surfaces that belong to
 *    other lanes; the shell exposes no native chip twin, so they are omitted
 *    here. The All / Community mode control is the MobileModePill the FEAT
 *    names.
 *  - Create-post, comments and notif overlays (the `/home/compose`,
 *    `/home/comments`, `/home/notif` routes) are their own FEAT; this screen
 *    is the feed.
 * React 19: typed with `ReactElement`.
 */
import { useMemo, type ReactElement } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, DelayedLoader, Text, useUITheme } from '../../ports/ui';
import { radius } from '../../ports/tokens';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import {
  composeFeed,
  withHomeNewCards,
  pickHomeServerCards,
  type ComposedEntry,
  type FeedItem,
  type ArticleFeedItem,
  type PostFeedItem,
  type PerformerFeedItem,
  type FeatureAnnouncementFeedItem,
  type NewMemberFeedItem,
} from '../../ports/feed';
import { useAllNewsFeed, useCommunityNews } from './data/feed';
import { useEnrichmentCards, type EnrichmentCard as EnrichmentCardData } from './data/enrichment';
import type { NewsArticle } from './types';
import { FeedItemErrorBoundary } from './FeedItemErrorBoundary';
import { ArticleCard } from './cards/ArticleCard';
import { CommunityPostCard } from './cards/CommunityPostCard';
import { NewMemberCard } from './cards/NewMemberCard';
import { EnrichmentCard } from './cards/EnrichmentCard';
import { FeatureAnnouncementCard, PerformerCard } from './cards/ServerCard';

export type HomeTab = 'all' | 'community';

/** One rendered row of the feed list. */
type FeedRow =
  | { key: string; type: 'card'; card: EnrichmentCardData }
  | { key: string; type: 'item'; item: FeedItem }
  | { key: string; type: 'article'; article: NewsArticle };

function articleToFeedItem(article: NewsArticle): ArticleFeedItem {
  return {
    id: article.id,
    kind: 'article',
    source_name: article.source_name,
    title: article.title,
    summary: article.summary,
    image_url: article.image_url,
    link: article.link,
    tags: article.tags,
    published_at: article.published_at,
  };
}

export function HomeScreen(): ReactElement {
  const { colors } = useUITheme();
  const { t, locale } = useI18n();
  const params = useLocalSearchParams<{ tab?: string }>();
  const activeTab: HomeTab = params.tab === 'community' ? 'community' : 'all';

  const allFeed = useAllNewsFeed({ enabled: activeTab === 'all' });
  const community = useCommunityNews({ enabled: activeTab === 'community' });
  const { cards: enrichmentCards, dismiss } = useEnrichmentCards('home', { active: activeTab === 'all' });

  // All tab: the top open enrichment cards woven into the ranked feed, exactly
  // as the web Home does — pickHomeServerCards → withHomeNewCards → composeFeed.
  const allRows = useMemo<FeedRow[]>(() => {
    const newCards = pickHomeServerCards(enrichmentCards);
    const vitanaCards = withHomeNewCards(newCards, []);
    const composed: ComposedEntry<EnrichmentCardData>[] = composeFeed(allFeed.items, vitanaCards);
    return composed.map((entry): FeedRow =>
      entry.type === 'vitana'
        ? { key: `card-${entry.card.card_type}`, type: 'card', card: entry.card }
        : { key: entry.item.id, type: 'item', item: entry.item },
    );
  }, [allFeed.items, enrichmentCards]);

  // Community tab: the chronological community articles (web `visibleArticles`
  // on the community tab) — new-member rows render the new-member card, the
  // rest the article card.
  const communityRows = useMemo<FeedRow[]>(
    () =>
      (community.data ?? []).map((article): FeedRow =>
        article.member_user_id
          ? {
              key: article.id,
              type: 'item',
              item: {
                id: article.id,
                kind: 'new_member',
                user_id: article.member_user_id,
                display_name: article.member_display_name ?? article.title,
                avatar_url: article.image_url,
                bio: article.summary,
                published_at: article.published_at,
              } satisfies NewMemberFeedItem,
            }
          : { key: article.id, type: 'article', article },
      ),
    [community.data],
  );

  const rows = activeTab === 'all' ? allRows : communityRows;
  const isLoading = activeTab === 'all' ? allFeed.isLoading : community.isLoading;
  const isError = activeTab === 'all' ? allFeed.isError : community.isError;

  const onRefresh = () => {
    if (activeTab === 'all') allFeed.refetch();
    else void community.refetch();
  };

  const onEndReached = () => {
    // Endless scroll is the All feed's, as the web gates it off the community tab.
    if (activeTab === 'all' && allFeed.hasNextPage && !allFeed.isFetchingNextPage) void allFeed.fetchNextPage();
  };

  const modes: ModeOption[] = [
    { value: 'all', label: t('screens.home.all'), icon: '📰' },
    { value: 'community', label: t('screens.home.community'), icon: '👥' },
  ];

  const onModeChange = (value: string) => {
    router.setParams({ tab: value === 'all' ? undefined : value });
  };

  const feedItemErrorFallback = (
    <View style={[styles.itemError, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
      <Text variant="caption" muted style={styles.center}>
        {t('screens.home.feedItemError')}
      </Text>
    </View>
  );

  const renderRow = ({ item: row }: { item: FeedRow }): ReactElement => {
    let node: ReactElement;
    if (row.type === 'card') {
      node = <EnrichmentCard card={row.card} onDismiss={dismiss} />;
    } else if (row.type === 'article') {
      node = <ArticleCard item={articleToFeedItem(row.article)} onPress={() => openArticle(row.article)} />;
    } else {
      node = renderFeedItem(row.item);
    }
    return <FeedItemErrorBoundary fallback={feedItemErrorFallback}>{node}</FeedItemErrorBoundary>;
  };

  const openArticle = (article: NewsArticle) => {
    navigateToWebPath(`/news/${article.id}?article=${encodeURIComponent(JSON.stringify(article))}`);
  };

  const openArticleItem = (item: ArticleFeedItem) => {
    const rawId = item.id.replace(/^article-/, '');
    const article: NewsArticle = {
      id: rawId,
      source: 'longevity',
      source_name: item.source_name,
      title: item.title,
      link: item.link,
      summary: item.summary,
      image_url: item.image_url,
      published_at: item.published_at,
      tags: item.tags,
      category: item.tags[0] || 'general',
    };
    navigateToWebPath(`/news/${rawId}?article=${encodeURIComponent(JSON.stringify(article))}`);
  };

  function renderFeedItem(item: FeedItem): ReactElement {
    switch (item.kind) {
      case 'article':
        return <ArticleCard item={item} onPress={() => openArticleItem(item)} />;
      case 'post':
        return <CommunityPostCard item={item as PostFeedItem} onPress={() => navigateToWebPath(`/post/${item.source}/${item.post_id}`)} />;
      case 'new_member':
        return <NewMemberCard item={item as NewMemberFeedItem} />;
      case 'feature_announcement':
        return <FeatureAnnouncementCard item={item as FeatureAnnouncementFeedItem} />;
      case 'performer':
        return <PerformerCard item={item as PerformerFeedItem} />;
      default:
        // `match` is not produced by the native feed (deferred in FEAT-001);
        // render nothing rather than an unknown card.
        return <View testID={`feed-unhandled-${item.id}`} />;
    }
  }

  const header = (
    <View style={styles.header}>
      <Text variant="title" accessibilityRole="header">
        {t('homeNative.title')}
      </Text>
      <MobileModePill modes={modes} activeMode={activeTab} onModeChange={onModeChange} title={t('homeNative.selectFeed')} />
    </View>
  );

  if (isLoading && rows.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-home">
        {header}
        <DelayedLoader accessibilityLabel={t('screens.home.loadingNews')} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-home">
      <FlatList
        testID="home-feed-list"
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.mutedForeground} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          isError ? (
            <View style={styles.center} testID="home-feed-error">
              <Text muted style={styles.centerBody}>
                {t('screens.home.noNewsArticlesYet')}
              </Text>
              <Button variant="outline" size="sm" onPress={onRefresh} testID="home-feed-retry">
                {t('screens.home.refresh')}
              </Button>
            </View>
          ) : (
            <View style={styles.center} testID="home-feed-empty">
              <Text accessibilityRole="header">{t('screens.home.noNewsArticlesYet')}</Text>
              <Text muted style={styles.centerBody}>
                {t('screens.home.articlesWillAppearOnceFeedSources')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          activeTab === 'all' && allFeed.isFetchingNextPage ? (
            <View style={styles.footer} testID="home-feed-loading-more">
              <Text variant="caption" muted>
                {t('screens.home.loadingMore')}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function Separator(): ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 16, gap: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  separator: { height: 12 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  centerBody: { textAlign: 'center' },
  footer: { alignItems: 'center', paddingVertical: 16 },
  itemError: { paddingHorizontal: 16, paddingVertical: 20 },
});
