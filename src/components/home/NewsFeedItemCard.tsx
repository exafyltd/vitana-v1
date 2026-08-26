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
import { ArrowRight, Heart, Sparkles } from "lucide-react";
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
        widget={
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <Heart className="absolute inset-0 h-10 w-10 text-pink-400 fill-pink-400" aria-hidden="true" />
            <Sparkles className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-pink-200" aria-hidden="true" />
            <div className="relative flex flex-col items-center">
              <span className="text-[10px] font-bold leading-none text-white">
                {t("screens.home.matchPercent", { score: item.compatibility_score })}
              </span>
              <span className="mt-0.5 text-[6px] font-semibold leading-none text-white/90">
                {t("screens.home.matchLabel")}
              </span>
            </div>
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
              {matchCategoryLabel(item.match_reason)}
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
