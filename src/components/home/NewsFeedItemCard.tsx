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
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NewsArticleCard } from "@/components/crossover/NewsArticleCard";
import { CommunityPostCard } from "@/components/home/CommunityPostCard";
import { getNewsImage } from "@/lib/news-images";
import { formatDistanceToNow } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import { matchCategoryLabel } from "@/lib/matchReason";
import { reasonKeyFor, type FeedItem, type ArticleFeedItem } from "@/lib/news-feed-ranker";
import { VitanaRecommendationHeader } from "@/components/vitana/VitanaRecommendationHeader";
import { cn } from "@/lib/utils";

/** Sunburst tick marks for the match dial — 12 evenly spaced rays around the score. */
const MATCH_RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6; // 30° steps
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return {
    x1: 32 + 23 * cos,
    y1: 32 + 23 * sin,
    x2: 32 + 31 * cos,
    y2: 32 + 31 * sin,
  };
});

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

/**
 * Vitana identity + destination feature shown atop every
 * algorithmically-surfaced card (match, spotlight performer) — never on
 * community posts or public articles, which come from a real person/source,
 * not Vitana.
 */
function MatchFeatureHeader() {
  return <VitanaRecommendationHeader feature="find-a-match" className="pr-6 mb-3" />;
}

const baseCardShell =
  "group relative cursor-pointer overflow-hidden rounded-2xl border " +
  "shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 " +
  "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] " +
  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";

// Match/performer cards are Vitana-branded, so — like the top News banners —
// they get a happy tinted background instead of the plain card surface.
const matchCardShell = cn(baseCardShell, "border-sky-300/30 bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-sky-500/10");
const performerCardShell = cn(baseCardShell, "border-emerald-300/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10");

export function NewsFeedItemCard({
  item,
  onArticleClick,
  onOpen,
}: {
  item: FeedItem;
  onArticleClick: (article: ArticleFeedItem) => void;
  onOpen?: (item: FeedItem) => void;
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

  if (item.kind === "match") {
    if (dismissed) return null;
    return (
      <Card
        className={matchCardShell}
        role="button"
        tabIndex={0}
        onClick={() => openProfile(item.user_id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openProfile(item.user_id);
          }
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="absolute top-2 right-2 z-10 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
          aria-label={t('screens.vitanaIdentity.dismissCard')}
        >
          <X className="w-4 h-4" />
        </button>
        <CardContent className="p-4">
          <MatchFeatureHeader />
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              {item.avatar_url && <AvatarImage src={item.avatar_url} alt="" />}
              <AvatarFallback>{(item.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{item.display_name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {matchCategoryLabel(item.match_reason)}
              </p>
            </div>
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center text-amber-500">
              <svg
                viewBox="0 0 64 64"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                {MATCH_RAYS.map((r, i) => (
                  <line
                    key={i}
                    x1={r.x1}
                    y1={r.y1}
                    x2={r.x2}
                    y2={r.y2}
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                ))}
              </svg>
              <div className="flex h-11 w-11 flex-col items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-300 shadow-sm">
                <span className="text-xs font-bold leading-none text-amber-800">
                  {t("screens.home.matchPercent", { score: item.compatibility_score })}
                </span>
                <span className="mt-0.5 text-[8px] font-semibold leading-none text-amber-700">
                  {t("screens.home.matchLabel")}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
            {t("screens.vitanaIdentity.viewMatch")}
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (item.kind === "performer") {
    if (dismissed) return null;
    return (
      <Card
        className={performerCardShell}
        role="button"
        tabIndex={0}
        onClick={() => openProfile(item.user_id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openProfile(item.user_id);
          }
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="absolute top-2 right-2 z-10 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
          aria-label={t('screens.vitanaIdentity.dismissCard')}
        >
          <X className="w-4 h-4" />
        </button>
        <CardContent className="p-4">
          <MatchFeatureHeader />
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              {item.avatar_url && <AvatarImage src={item.avatar_url} alt="" />}
              <AvatarFallback>{(item.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{item.display_name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {t("screens.home.mostImproved")}
              </p>
            </div>
            {item.improvement > 0 && (
              <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-600">
                {t("screens.home.improvementPts", { pts: item.improvement })}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
            {t("screens.vitanaIdentity.viewMatch")}
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Community post (text / image / inline-muted video) — interactive: inline
  // heart + expandable comments + the role-aware moderation menu, rendered by
  // its own card so the like/comment hook is called unconditionally.
  return <CommunityPostCard item={item} onOpen={onOpen} />;
}
