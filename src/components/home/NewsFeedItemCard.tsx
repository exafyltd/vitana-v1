/**
 * VTID-03319 — typed cards for the unified "All News" feed.
 *
 * Renders the discriminated-union FeedItem with a purpose-built card per kind
 * (match, spotlight performer, community post with inline muted video) and
 * delegates public articles to the existing NewsArticleCard. Each card carries
 * a "why you're seeing this" label and navigates to the right destination:
 *   - match / performer / post author → /u/:user_id
 *   - article                         → /news/:id (existing detail route)
 */
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NewsArticleCard } from "@/components/crossover/NewsArticleCard";
import { CommunityPostCard } from "@/components/home/CommunityPostCard";
import { getNewsImage } from "@/lib/news-images";
import { formatDistanceToNow } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import { matchCategoryLabel } from "@/lib/matchReason";
import { reasonKeyFor, type FeedItem, type ArticleFeedItem } from "@/lib/news-feed-ranker";
import { VitanaRecommendationCard } from "@/components/vitana/VitanaRecommendationCard";
import { FeatureAnnouncementCard } from "@/components/home/FeatureAnnouncementCard";

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function NewsFeedItemCard({
  item,
  onArticleClick,
  onOpen,
  autoOpenComments,
}: {
  item: FeedItem;
  onArticleClick: (article: ArticleFeedItem) => void;
  onOpen?: (item: FeedItem) => void;
  autoOpenComments?: boolean;
}) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const openProfile = (userId: string) => {
    onOpen?.(item);
    navigate(`/u/${userId}`);
  };

  if (item.kind === "article") {
    const fallback = getNewsImage(item.tags, item.id, item.title, item.summary || undefined);
    return (
      <NewsArticleCard
        articleId={item.id}
        title={item.title}
        description={item.summary || undefined}
        imageUrl={item.image_url || fallback}
        fallbackImageUrl={fallback}
        category={t(reasonKeyFor(item))}
        timestamp={timeAgo(item.published_at)}
        sourceName={item.source_name}
        link={item.link}
        tags={item.tags}
        onClick={() => onArticleClick(item)}
      />
    );
  }

  if (item.kind === "feature_announcement") {
    return (
      <FeatureAnnouncementCard
        variant={item.variant}
        featureTitle={item.feature_title}
        description={item.description}
        deepLink={item.deep_link}
        onOpen={() => onOpen?.(item)}
      />
    );
  }

  if (item.kind === "match") {
    if (dismissed) return null;
    return (
      <VitanaRecommendationCard
        feature="find-a-match"
        eyebrow={t("screens.home.findAMatchEyebrow")}
        onOpen={() => openProfile(item.user_id)}
        onDismiss={() => setDismissed(true)}
        dismissLabel={t('screens.vitanaIdentity.dismissCard')}
        cornerBadge={
          <svg
            viewBox="0 0 80 88"
            className="pointer-events-none absolute right-2.5 top-[44px] h-[88px] w-[80px]"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="matchQualityBadgeGradient" cx="32%" cy="24%" r="80%">
                <stop offset="0%" stopColor="#FFD9E8" />
                <stop offset="38%" stopColor="#FF9EC4" />
                <stop offset="68%" stopColor="#F0629A" />
                <stop offset="100%" stopColor="#C23E76" />
              </radialGradient>
            </defs>
            <path
              fill="url(#matchQualityBadgeGradient)"
              d="M18,14 H29 A11,11 0 0 1 51,14 H62 A8,8 0 0 1 70,22 V66 A8,8 0 0 1 62,74 H51 A11,11 0 0 0 29,74 H18 A8,8 0 0 1 10,66 V22 A8,8 0 0 1 18,14 Z"
            />
            <text
              x="40"
              y="38.5"
              textAnchor="middle"
              dominantBaseline="central"
              fontWeight="800"
              fontSize="15"
              fill="#ffffff"
            >
              {t("screens.home.matchPercent", { score: item.compatibility_score })}
            </text>
          </svg>
        }
      >
        <div className="flex items-center gap-1.5 pr-24">
          <Avatar className="h-7 w-7 shrink-0">
            {item.avatar_url && <AvatarImage src={item.avatar_url} alt="" />}
            <AvatarFallback>{(item.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground leading-tight">{item.display_name}</p>
            <p className="truncate text-xs text-muted-foreground leading-tight">
              {matchCategoryLabel(item.match_reason)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 pr-24">{t("screens.home.findAMatchSubtext")}</p>
        <span className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors pr-24">
          <span className="truncate">{t("screens.vitanaIdentity.viewMatch")}</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
        </span>
      </VitanaRecommendationCard>
    );
  }

  if (item.kind === "performer") {
    if (dismissed) return null;
    return (
      <VitanaRecommendationCard
        feature="find-a-match"
        eyebrow={t("screens.home.findAMatchEyebrow")}
        onOpen={() => openProfile(item.user_id)}
        onDismiss={() => setDismissed(true)}
        dismissLabel={t('screens.vitanaIdentity.dismissCard')}
        widget={
          <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-teal-300 shadow-sm">
            <span className="text-[10px] font-bold leading-none text-emerald-900">
              {item.improvement > 0 ? t("screens.home.improvementPts", { pts: item.improvement }) : "—"}
            </span>
          </div>
        }
      >
        <div className="flex items-center gap-1.5">
          <Avatar className="h-7 w-7 shrink-0">
            {item.avatar_url && <AvatarImage src={item.avatar_url} alt="" />}
            <AvatarFallback>{(item.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground leading-tight">{item.display_name}</p>
            <p className="truncate text-xs text-muted-foreground leading-tight">
              {t("screens.home.mostImproved")}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t("screens.home.findAMatchSubtext")}</p>
        <span className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors">
          <span className="truncate">{t("screens.vitanaIdentity.viewMatch")}</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
        </span>
      </VitanaRecommendationCard>
    );
  }

  // Community post (text / image / inline-muted video) — interactive: inline
  // heart + expandable comments + the role-aware moderation menu, rendered by
  // its own card so the like/comment hook is called unconditionally.
  return <CommunityPostCard item={item} onOpen={onOpen} autoOpenComments={autoOpenComments} />;
}
