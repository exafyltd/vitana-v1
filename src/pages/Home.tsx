/**
 * VTID-01900: News Feed — Home Page
 *
 * Longevity science news from curated RSS sources + MAXINA community updates.
 * Rich card display with cover photos, category filters, infinite scrolling.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Loader2, ExternalLink } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
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

type FilterTab = "all" | "longevity" | "community";

export default function Home() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

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

    // Longevity news from gateway API (paginated)
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
            image_url: null, // Will use category images
            published_at: item.published_at,
            tags: item.tags,
            category: item.tags[0] || "general",
          });
        }
      }
    }

    // Community news from Supabase
    if (activeTab !== "longevity" && communityData) {
      allArticles.push(...communityData);
    }

    // Sort merged feed by date (newest first)
    allArticles.sort(
      (a, b) =>
        new Date(b.published_at).getTime() -
        new Date(a.published_at).getTime()
    );

    // Filter by search query
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

  // ── Article click handler ──────────────────────────────────────
  const handleArticleClick = (article: NewsArticle) => {
    if (article.source === "longevity" && article.link) {
      window.open(article.link, "_blank", "noopener,noreferrer");
    } else if (article.link) {
      navigate(article.link);
    }
  };

  // ── Refresh ────────────────────────────────────────────────────
  const handleRefresh = () => {
    refetchLongevity();
    refetchCommunity();
  };

  const isLoading = isLoadingLongevity || isLoadingCommunity;

  // ── Map to NewsCard category ───────────────────────────────────
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

  // ── Format timestamp safely ────────────────────────────────────
  const formatTimestamp = (dateStr: string): string => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "";
    }
  };

  return (
    <AppLayout>
      <SEO
        title="News | MAXINA"
        description="Longevity science & community updates"
        canonical={window.location.href}
      />

      <div className="p-4 md:p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <StandardHeader
            title="News"
            description="Longevity science & community updates"
            emoji="📰"
          />

          {/* Utility bar */}
          <UtilityActionButton
            trailingElement={
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
            }
          >
            <ExpandableSearchButton
              placeholder="Search news, topics, sources…"
              onSearch={(query) => setSearchQuery(query)}
            />
          </UtilityActionButton>

          {/* Category filter tabs */}
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
              {/* Loading state */}
              {isLoading && articles.length === 0 && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-3 text-muted-foreground">
                    Loading news…
                  </span>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && articles.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-lg text-muted-foreground">
                    No news articles yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Articles will appear once the feed sources are fetched.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              )}

              {/* News grid */}
              {articles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
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
                        imageUrl={
                          article.image_url ||
                          getNewsImage(article.tags)
                        }
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

              {/* Loading more indicator */}
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
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </AppLayout>
  );
}
