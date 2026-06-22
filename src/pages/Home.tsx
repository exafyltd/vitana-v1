/**
 * VTID-01900: News Feed — Home Page
 *
 * Longevity science news from curated RSS sources + MAXINA community updates.
 * Mobile: MobileModePill dropdown in UtilityActionButton (standard pattern).
 * Desktop: SplitBar tabs + 3-column grid.
 *
 * Image strategy (per card):
 *   - Primary (imageUrl): article's own RSS / og:image (unique per article)
 *   - Fallback (fallbackImageUrl): keyword-matched category pool photo
 *   - NewsCard swaps to fallback automatically if primary fails to load.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { RefreshCw, Loader2, Plus } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { MobileModePill } from "@/components/ui/MobileModePill";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import {
  SplitBar,
  SplitBarContent,
  SplitBarList,
  SplitBarTrigger,
} from "@/components/ui/split-bar";
import { NewsArticleCard } from "@/components/crossover/NewsArticleCard";
import { CreateContentPopup } from "@/components/CreateContentPopup";
import { MobileCreatePostSheet } from "@/components/profile/mobile/MobileCreatePostSheet";
import { WelcomeBackBanner } from "@/components/home/WelcomeBackBanner";
import { DidYouKnowCard } from "@/components/proactive/DidYouKnowCard";
import { PriorityOfDayBanner } from "@/components/PriorityOfDayBanner";
import { useNewsFeedPreferencesStore } from "@/stores/newsFeedPreferencesStore";
import {
  useLongevityNewsFeed,
  useCommunityNews,
  type NewsArticle,
} from "@/hooks/useNewsFeed";
import { isFeedV2Enabled } from "@/lib/feature-flags";
import { useAllNewsFeed } from "@/hooks/useAllNewsFeed";
import { NewsFeedItemCard } from "@/components/home/NewsFeedItemCard";
import { track } from "@/lib/product-analytics/client";
import type { FeedItem, ArticleFeedItem } from "@/lib/news-feed-ranker";
import { getNewsImage, getArticlePillar } from "@/lib/news-images";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
type FilterTab = "all" | "longevity" | "community";

const FILTER_MODES = [
  { value: "all", label: "All News", icon: "📰" },
  { value: "longevity", label: "Longevity", icon: "🧬" },
  { value: "community", label: "Community", icon: "👥" },
];


export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as FilterTab | null;
  const [activeTab, setActiveTabState] = useState<FilterTab>(
    tabFromUrl && ["all", "longevity", "community"].includes(tabFromUrl) ? tabFromUrl : "all"
  );
  const setActiveTab = (tab: FilterTab) => {
    setActiveTabState(tab);
    setSearchParams(tab === "all" ? {} : { tab }, { replace: true });
  };
  // Keep the active News tab in sync with the URL so the Orb (and deep links)
  // can switch the filter by voice even when already on /home — the initial
  // useState reads ?tab only once at mount. The URL is the source of truth; an
  // absent/invalid tab falls back to the default All feed. Read-only
  // (no setSearchParams here), so it can't loop with the setter above.
  useEffect(() => {
    const t = searchParams.get("tab");
    const next: FilterTab = t && ["all", "longevity", "community"].includes(t) ? (t as FilterTab) : "all";
    setActiveTabState((prev) => (prev === next ? prev : next));
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState("");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const {
    data: longevityData, fetchNextPage, hasNextPage, isFetchingNextPage,
    isLoading: isLoadingLongevity, refetch: refetchLongevity,
  } = useLongevityNewsFeed({ limit: 20, enabled: activeTab !== "community" });

  const {
    data: communityData, isLoading: isLoadingCommunity, refetch: refetchCommunity,
  } = useCommunityNews({
    // The Community tab always pulls community items (incl. followed users'
    // posts), even when feed v2 powers the "All" tab. Under v2-off it also
    // feeds the "All" tab as before.
    limit: 15,
    enabled: activeTab === "community" || (activeTab !== "longevity" && !isFeedV2Enabled()),
  });

  // VTID-03319: unified, ranked feed powers the "All" tab when feed v2 is on.
  const feedV2 = isFeedV2Enabled();
  const {
    items: feedItems, isLoading: isLoadingFeedV2, refetch: refetchFeedV2,
  } = useAllNewsFeed({ enabled: feedV2 && activeTab === "all" });

  // One impression event per tab activation (fire-and-forget).
  useEffect(() => {
    track("news_feed_viewed", {
      event_type: "content",
      feature_key: "news_feed",
      properties: { tab: activeTab, feed_v2: feedV2 },
    });
  }, [activeTab, feedV2]);

  const articles = useMemo(() => {
    const allArticles: NewsArticle[] = [];
    if (activeTab !== "community" && longevityData?.pages) {
      for (const page of longevityData.pages) {
        for (const item of page.items) {
          allArticles.push({
            id: item.id, source: "longevity", source_name: item.source_name,
            title: item.title, link: item.link, summary: item.summary,
            image_url: item.image_url || null, published_at: item.published_at,
            tags: item.tags, category: item.tags[0] || "general",
          });
        }
      }
    }
    if (activeTab !== "longevity" && communityData) allArticles.push(...communityData);
    allArticles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return allArticles.filter((a) =>
        a.title.toLowerCase().includes(q) || (a.summary && a.summary.toLowerCase().includes(q)) ||
        a.source_name.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return allArticles;
  }, [longevityData, communityData, activeTab, searchQuery]);

  // Apply user feed preferences — hide dismissed articles + muted sources.
  // When on the Longevity tab with a pillar selected, also filter by pillar.
  const hiddenArticleIds = useNewsFeedPreferencesStore((s) => s.hiddenArticleIds);
  const mutedSources = useNewsFeedPreferencesStore((s) => s.mutedSources);
  const visibleArticles = useMemo(() => {
    const hidden = new Set(hiddenArticleIds);
    const muted = new Set(mutedSources);
    return articles.filter((a) => !hidden.has(a.id) && !muted.has(a.source_name));
  }, [articles, hiddenArticleIds, mutedSources]);

  const observerRef = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && activeTab !== "community") fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, activeTab]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleArticleClick = (article: NewsArticle) => {
    navigate(`/news/${article.id}`, { state: { article } });
  };

  const handleRefresh = () => { refetchLongevity(); refetchCommunity(); refetchFeedV2(); };
  const isLoading = isLoadingLongevity || isLoadingCommunity;

  // VTID-03319: open handlers for the unified feed (analytics + navigation).
  const handleFeedItemOpen = (item: FeedItem) => {
    track("news_feed_item_opened", {
      event_type: "content",
      feature_key: "news_feed_v2",
      properties: { kind: item.kind, item_id: item.id },
    });
  };
  const handleFeedArticleClick = (article: ArticleFeedItem) => {
    const rawId = article.id.replace(/^article-/, "");
    handleFeedItemOpen(article);
    navigate(`/news/${rawId}`, {
      state: {
        article: {
          id: rawId, source: "longevity", source_name: article.source_name,
          title: article.title, link: article.link, summary: article.summary,
          image_url: article.image_url, published_at: article.published_at,
          tags: article.tags, category: article.tags[0] || "general",
        } satisfies NewsArticle,
      },
    });
  };

  const renderV2Feed = () => (
    <>
      {isLoadingFeedV2 && feedItems.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">{t('screens.home.loadingNews')}</span>
        </div>
      )}
      {!isLoadingFeedV2 && feedItems.length === 0 && (
        <div className="text-center py-20 px-4">
          <p className="text-lg text-muted-foreground">{t('screens.home.noNewsArticlesYet')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('screens.home.articlesWillAppearOnceFeedSources')}</p>
          <Button variant="outline" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />{t('screens.home.refresh')}
          </Button>
        </div>
      )}
      {feedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 mt-2 md:mt-5">
          {feedItems.map((item) => (
            <NewsFeedItemCard
              key={item.id}
              item={item}
              onArticleClick={handleFeedArticleClick}
              onOpen={handleFeedItemOpen}
            />
          ))}
        </div>
      )}
      {!isLoadingFeedV2 && feedItems.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">{t('screens.home.youReAllCaughtUp')}</p>
      )}
    </>
  );

  // Pillar/source → the short uppercase category label shown above the title
  // (e.g. "COMMUNITY", "LONGEVITY", "NUTRITION", …)
  const getCategoryLabel = (article: NewsArticle): string => {
    if (article.source === "community") return "COMMUNITY";
    const pillar = getArticlePillar(article.tags, article.title, article.summary);
    return (pillar || "NUTRITION").toUpperCase();
  };

  const formatTimestamp = (dateStr: string): string => {
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); } catch { return ""; }
  };

  /** Build primary+fallback image URLs for an article. */
  const getCardImages = (article: NewsArticle): { primary: string; fallback: string } => {
    const categoryImage = getNewsImage(article.tags, article.id, article.title, article.summary);
    // Primary: RSS/og:image if we have one, else use category image as primary (and no fallback needed)
    return {
      primary: article.image_url || categoryImage,
      fallback: categoryImage,
    };
  };

  const renderFeedContent = () => {
    if (activeTab === "all" && feedV2) return renderV2Feed();
    return (
    <>
      {isLoading && articles.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">{t('screens.home.loadingNews')}</span>
        </div>
      )}
      {!isLoading && articles.length === 0 && (
        <div className="text-center py-20 px-4">
          <p className="text-lg text-muted-foreground">{t('screens.home.noNewsArticlesYet')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('screens.home.articlesWillAppearOnceFeedSources')}</p>
          <Button variant="outline" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />{t('screens.home.refresh')}
          </Button>
        </div>
      )}
      {visibleArticles.length > 0 && (
        <div className="md:hidden flex flex-col gap-3 mt-2">
          {visibleArticles.map((article) => {
            const { primary, fallback } = getCardImages(article);
            return (
              <NewsArticleCard
                key={article.id}
                articleId={article.id}
                title={article.title}
                description={article.summary || undefined}
                imageUrl={primary}
                fallbackImageUrl={fallback}
                category={getCategoryLabel(article)}
                timestamp={formatTimestamp(article.published_at)}
                sourceName={article.source_name}
                link={article.link}
                tags={article.tags}
                onClick={() => handleArticleClick(article)}
              />
            );
          })}
        </div>
      )}
      {visibleArticles.length > 0 && (
        <div className="hidden md:grid md:grid-cols-3 gap-5 mt-5">
          {visibleArticles.map((article) => {
            const { primary, fallback } = getCardImages(article);
            return (
              <NewsArticleCard
                key={article.id}
                articleId={article.id}
                title={article.title}
                description={article.summary || undefined}
                imageUrl={primary}
                fallbackImageUrl={fallback}
                category={getCategoryLabel(article)}
                timestamp={formatTimestamp(article.published_at)}
                sourceName={article.source_name}
                link={article.link}
                tags={article.tags}
                onClick={() => handleArticleClick(article)}
              />
            );
          })}
        </div>
      )}
      <div ref={observerRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">{t('screens.home.loadingMore')}</span>
        </div>
      )}
      {!hasNextPage && !isFetchingNextPage && articles.length > 0 && activeTab !== "community" && (
        <p className="text-center text-sm text-muted-foreground py-8">{t('screens.home.youReAllCaughtUp')}</p>
      )}
    </>
    );
  };

  return (
    <AppLayout>
      <SEO title={t('screens.home.newsMaxina')} description="Longevity science & community updates" canonical={window.location.href} />
      <div className={isMobile
        ? "px-4 pt-2 pb-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen"
        : "p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen"
      }>
        <div className={isMobile ? "" : "max-w-7xl mx-auto"}>
          <StandardHeader title={t('screens.home.news')} description="Longevity science & community updates" emoji="📰" />
          <UtilityActionButton className="min-w-0" compact={isMobile}
            afterGiftVoucherChildren={isMobile ? (<><VitanaIndexChip /><AutopilotChip pendingCount={0} onClick={() => setAutopilotOpen(true)} /></>) : undefined}
            trailingElement={!isMobile ? (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={handleRefresh} title={t('screens.home.refreshNews')} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            ) : undefined}
          >
            <div className="flex items-center gap-2 min-w-max">
              <ExpandableSearchButton placeholder={isMobile ? t('screens.home.searchShort') : t('screens.home.searchNewsTopicsSources')} onSearch={(query) => setSearchQuery(query)} />
              {isMobile && <MobileModePill modes={FILTER_MODES} activeMode={activeTab} onModeChange={(v) => setActiveTab(v as FilterTab)} />}
              <UniversalCalendarButton />
              <Button size="sm" onClick={() => setCreatePostOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('screens.home.createPost')}
              </Button>
            </div>
          </UtilityActionButton>
          <div className="mt-3 space-y-2">
            <WelcomeBackBanner />
            <DidYouKnowCard />
            <PriorityOfDayBanner />
          </div>
          {!isMobile && (
            <div className="mt-5">
              <SplitBar value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)} className="w-full">
                <SplitBarList>
                  <SplitBarTrigger value="all">{t('screens.home.all')}</SplitBarTrigger>
                  <SplitBarTrigger value="longevity">{t('screens.home.longevity')}</SplitBarTrigger>
                  <SplitBarTrigger value="community">{t('screens.home.community')}</SplitBarTrigger>
                </SplitBarList>
                <SplitBarContent value={activeTab}>{renderFeedContent()}</SplitBarContent>
              </SplitBar>
            </div>
          )}
          {isMobile && renderFeedContent()}
        </div>
      </div>
      {isMobile ? (
        <MobileCreatePostSheet open={createPostOpen} onOpenChange={setCreatePostOpen} />
      ) : (
        <CreateContentPopup isOpen={createPostOpen} onClose={() => setCreatePostOpen(false)} />
      )}
    </AppLayout>
  );
}
