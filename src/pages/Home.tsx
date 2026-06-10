/**
 * VTID-01900: News Feed — Home Page
 *
 * Longevity science news from curated RSS sources + MAXINA community updates.
 * Mobile: MobileModePill dropdown in UtilityActionButton (standard pattern).
 * Desktop: SplitBar tabs + 3-column grid.
 *
 * Image strategy (computed feed-wide in `cardImages`):
 *   - Primary (imageUrl): article's own RSS / og:image — but only if it is
 *     NOT reused across articles (a shared banner is a generic source default,
 *     e.g. the old "FA!" cover, so we drop it).
 *   - Fallback (fallbackImageUrl): keyword-matched category pool photo, handed
 *     out via a shared usage map so the same stock cover doesn't repeat on
 *     different stories.
 *   - NewsArticleCard renders the fallback as an always-present base layer, so
 *     a card is never imageless even if the primary 404s/hangs/loads blank.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
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
import { WelcomeBackBanner } from "@/components/home/WelcomeBackBanner";
import { DidYouKnowCard } from "@/components/proactive/DidYouKnowCard";
import { PriorityOfDayBanner } from "@/components/PriorityOfDayBanner";
import { useNewsFeedPreferencesStore } from "@/stores/newsFeedPreferencesStore";
import {
  useLongevityNewsFeed,
  useCommunityNews,
  type NewsArticle,
} from "@/hooks/useNewsFeed";
import { pickFeedNewsImage, getArticlePillar } from "@/lib/news-images";
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
    tabFromUrl && ["all", "longevity", "community"].includes(tabFromUrl) ? tabFromUrl : "longevity"
  );
  const setActiveTab = (tab: FilterTab) => {
    setActiveTabState(tab);
    setSearchParams(tab === "longevity" ? {} : { tab }, { replace: true });
  };
  // Keep the active News tab in sync with the URL so the Orb (and deep links)
  // can switch the filter by voice even when already on /home — the initial
  // useState reads ?tab only once at mount. The URL is the source of truth; an
  // absent/invalid tab falls back to the default Longevity feed. Read-only
  // (no setSearchParams here), so it can't loop with the setter above.
  useEffect(() => {
    const t = searchParams.get("tab");
    const next: FilterTab = t && ["all", "longevity", "community"].includes(t) ? (t as FilterTab) : "longevity";
    setActiveTabState((prev) => (prev === next ? prev : next));
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState("");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const {
    data: longevityData, fetchNextPage, hasNextPage, isFetchingNextPage,
    isLoading: isLoadingLongevity, refetch: refetchLongevity,
  } = useLongevityNewsFeed({ limit: 20, enabled: activeTab !== "community" });

  const {
    data: communityData, isLoading: isLoadingCommunity, refetch: refetchCommunity,
  } = useCommunityNews({ limit: 15, enabled: activeTab !== "longevity" });

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

  const handleRefresh = () => { refetchLongevity(); refetchCommunity(); };
  const isLoading = isLoadingLongevity || isLoadingCommunity;

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

  /**
   * Build primary+fallback cover images for the whole visible feed at once.
   * Doing it feed-wide (rather than per card) lets us:
   *   1. Drop source covers that repeat across articles — a banner reused by
   *      several stories is a generic source default (e.g. the old "FA!"
   *      cover), not real article art, so we fall back to a category photo.
   *   2. Hand out DISTINCT category fallbacks via a shared usage map, so the
   *      same stock photo doesn't land on different stories.
   */
  const cardImages = useMemo(() => {
    const map = new Map<string, { primary: string; fallback: string }>();

    // Count how often each source image_url appears — >1 ⇒ generic default.
    const urlCounts = new Map<string, number>();
    for (const a of visibleArticles) {
      if (a.image_url) urlCounts.set(a.image_url, (urlCounts.get(a.image_url) ?? 0) + 1);
    }

    // Shared across the feed so fallbacks are spread, not repeated.
    const fallbackUsage = new Map<string, number>();

    for (const a of visibleArticles) {
      const fallback = pickFeedNewsImage(a.tags, a.id, a.title, a.summary, fallbackUsage);
      const isGenericCover = !!a.image_url && (urlCounts.get(a.image_url) ?? 0) > 1;
      const primary = a.image_url && !isGenericCover ? a.image_url : fallback;
      map.set(a.id, { primary, fallback });
    }
    return map;
  }, [visibleArticles]);

  const getCardImages = (article: NewsArticle): { primary: string; fallback: string } =>
    cardImages.get(article.id) ?? { primary: article.image_url || "", fallback: "" };

  const renderFeedContent = () => (
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
              <ExpandableSearchButton placeholder={isMobile ? "Search..." : "Search news, topics, sources…"} onSearch={(query) => setSearchQuery(query)} />
              {isMobile && <MobileModePill modes={FILTER_MODES} activeMode={activeTab} onModeChange={(v) => setActiveTab(v as FilterTab)} />}
              <UniversalCalendarButton />
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
    </AppLayout>
  );
}
