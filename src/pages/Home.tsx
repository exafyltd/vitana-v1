/**
 * VTID-01900: News Feed — Home Page
 *
 * Longevity science news from curated RSS sources + MAXINA community updates.
 * Mobile: MobileModePill dropdown in UtilityActionButton (standard pattern).
 * Desktop: SplitBar tabs + 3-column grid.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
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
import { NewsCard } from "@/components/crossover/NewsCard";
import {
  useLongevityNewsFeed,
  useCommunityNews,
  type NewsArticle,
} from "@/hooks/useNewsFeed";
import { getNewsImage, mapTagToPillar } from "@/lib/news-images";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

type FilterTab = "all" | "longevity" | "community";

const FILTER_MODES = [
  { value: "all", label: "All News", icon: "📰" },
  { value: "longevity", label: "Longevity", icon: "🧬" },
  { value: "community", label: "Community", icon: "👥" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ── Data fetching ──────────────────────────────────────────────
  const {
    data: longevityData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingLongevity,
    refetch: refetchLongevity,
  } = useLongevityNewsFeed({
    limit: 20,
    enabled: activeTab !== "community",
  });

  const {
    data: communityData,
    isLoading: isLoadingCommunity,
    refetch: refetchCommunity,
  } = useCommunityNews({
    limit: 15,
    enabled: activeTab !== "longevity",
  });

  // ── Merge & filter articles ────────────────────────────────────
  const articles = useMemo(() => {
    const allArticles: NewsArticle[] = [];

    if (activeTab !== "community" && longevityData?.pages) {
      for (const page of longevityData.pages) {
        for (const item of page.items) {
          allArticles.push({
            id: item.id,
            source: "longevity",
            source_name: item.source_name,
            title: item.title,
            link: item.link,
            summary: item.summary,
            image_url: item.image_url || null,
            published_at: item.published_at,
            tags: item.tags,
            category: item.tags[0] || "general",
          });
        }
      }
    }

    if (activeTab !== "longevity" && communityData) {
      allArticles.push(...communityData);
    }

    allArticles.sort(
      (a, b) =>
        new Date(b.published_at).getTime() -
        new Date(a.published_at).getTime()
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return allArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          a.source_name.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return allArticles;
  }, [longevityData, communityData, activeTab, searchQuery]);

  // ── Infinite scroll via IntersectionObserver ────────────────────
  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        hasNextPage &&
        !isFetchingNextPage &&
        activeTab !== "community"
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, activeTab]
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "200px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleArticleClick = (article: NewsArticle) => {
    if (article.source === "longevity" && article.link) {
      window.open(article.link, "_blank", "noopener,noreferrer");
    } else if (article.link) {
      navigate(article.link);
    }
  };

  const handleRefresh = () => {
    refetchLongevity();
    refetchCommunity();
  };

  const isLoading = isLoadingLongevity || isLoadingCommunity;

  const mapToCardCategory = (
    article: NewsArticle
  ):
    | "event"
    | "community"
    | "wellness"
    | "achievement"
    | "people"
    | "media"
    | "group"
    | undefined => {
    switch (article.category) {
      case "community_event":
        return "event";
      case "media":
        return "media";
      case "member_spotlight":
        return "people";
      default:
        return "wellness";
    }
  };

  const formatTimestamp = (dateStr: string): string => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "";
    }
  };

  // ── Shared feed content (used by both mobile and desktop) ──────
  const renderFeedContent = () => (
    <>
      {/* Loading state */}
      {isLoading && articles.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading news…</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && articles.length === 0 && (
        <div className="text-center py-20 px-4">
          <p className="text-lg text-muted-foreground">No news articles yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Articles will appear once the feed sources are fetched.
          </p>
          <Button variant="outline" className="mt-4" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      )}

      {/* Mobile feed: single-column vertical scroll */}
      {articles.length > 0 && (
        <div className="md:hidden flex flex-col gap-2 mt-2">
          {articles.map((article) => (
            <div key={article.id} className="h-[280px]">
              <NewsCard
                title={article.title}
                description={article.summary || undefined}
                imageUrl={article.image_url || getNewsImage(article.tags, article.id)}
                category={mapToCardCategory(article)}
                pillar={mapTagToPillar(article.tags)}
                author={{ name: article.source_name }}
                timestamp={formatTimestamp(article.published_at)}
                onClick={() => handleArticleClick(article)}
                className="h-full rounded-none md:rounded-lg"
              />
            </div>
          ))}
        </div>
      )}

      {/* Desktop grid: 3-column with hero first card */}
      {articles.length > 0 && (
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
          {articles.map((article, index) => (
            <div
              key={article.id}
              className={
                index === 0
                  ? "lg:col-span-2 min-h-[320px]"
                  : "min-h-[260px]"
              }
            >
              <NewsCard
                title={article.title}
                description={article.summary || undefined}
                imageUrl={article.image_url || getNewsImage(article.tags, article.id)}
                category={mapToCardCategory(article)}
                pillar={mapTagToPillar(article.tags)}
                author={{ name: article.source_name }}
                timestamp={formatTimestamp(article.published_at)}
                onClick={() => handleArticleClick(article)}
                className="h-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="h-1" />

      {/* Loading more */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading more…
          </span>
        </div>
      )}

      {/* End of feed */}
      {!hasNextPage &&
        !isFetchingNextPage &&
        articles.length > 0 &&
        activeTab !== "community" && (
          <p className="text-center text-sm text-muted-foreground py-8">
            You're all caught up.
          </p>
        )}
    </>
  );

  return (
    <AppLayout>
      <SEO
        title="News | MAXINA"
        description="Longevity science & community updates"
        canonical={window.location.href}
      />

      <div className={
        isMobile
          ? "px-2 pt-2 pb-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen"
          : "p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen"
      }>
        <div className={isMobile ? "" : "max-w-7xl mx-auto"}>

          {/* Header */}
          <StandardHeader
            title="News"
            description="Longevity science & community updates"
            emoji="📰"
          />

          {/* ── UNIFIED UTILITY BAR (matches Health/Discover/MediaHub pattern) ── */}
          <UtilityActionButton
            className="min-w-0"
            compact={isMobile}
            afterGiftVoucherChildren={isMobile ? (
              <>
                <VitanaIndexChip />
                <AutopilotChip
                  pendingCount={0}
                  onClick={() => setAutopilotOpen(true)}
                />
              </>
            ) : undefined}
            trailingElement={!isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={handleRefresh}
                title="Refresh news"
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            ) : undefined}
          >
            <div className="flex items-center gap-2 min-w-max">
              <ExpandableSearchButton
                placeholder={isMobile ? "Search..." : "Search news, topics, sources…"}
                onSearch={(query) => setSearchQuery(query)}
              />
              {/* Mobile: MobileModePill dropdown (standard pattern) */}
              {isMobile && (
                <MobileModePill
                  modes={FILTER_MODES}
                  activeMode={activeTab}
                  onModeChange={(v) => setActiveTab(v as FilterTab)}
                />
              )}
              <UniversalCalendarButton />
              {/* Mobile: refresh as pill button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
            </div>
          </UtilityActionButton>

          {/* ── DESKTOP: SplitBar tabs ── */}
          {!isMobile && (
            <div className="mt-5">
              <SplitBar
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as FilterTab)}
                className="w-full"
              >
                <SplitBarList>
                  <SplitBarTrigger value="all">All</SplitBarTrigger>
                  <SplitBarTrigger value="longevity">Longevity</SplitBarTrigger>
                  <SplitBarTrigger value="community">Community</SplitBarTrigger>
                </SplitBarList>
                <SplitBarContent value={activeTab}>
                  {renderFeedContent()}
                </SplitBarContent>
              </SplitBar>
            </div>
          )}

          {/* ── MOBILE: feed content directly (no SplitBar) ── */}
          {isMobile && renderFeedContent()}
        </div>
      </div>
    </AppLayout>
  );
}
