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
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, UserPlus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NewsArticleCard } from "@/components/crossover/NewsArticleCard";
import { CommunityPostCard } from "@/components/home/CommunityPostCard";
import { getNewsImage } from "@/lib/news-images";
import { formatDistanceToNow } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import { reasonKeyFor, type FeedItem, type ArticleFeedItem } from "@/lib/news-feed-ranker";

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

/** Small "why you're seeing this" label shown atop every non-article card. */
function WhyLabel({ item, icon }: { item: FeedItem; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
      {icon}
      <span className="truncate">{t(reasonKeyFor(item))}</span>
    </div>
  );
}

const cardShell =
  "group relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-card " +
  "shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 " +
  "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] " +
  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";

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
    return (
      <Card
        className={cardShell}
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
        <CardContent className="p-4">
          <WhyLabel item={item} icon={<Sparkles className="h-3.5 w-3.5" />} />
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              {item.avatar_url && <AvatarImage src={item.avatar_url} alt="" />}
              <AvatarFallback>{(item.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{item.display_name}</p>
              {item.match_reason && (
                <p className="truncate text-sm text-muted-foreground">{item.match_reason}</p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              {t("screens.home.matchScore", { score: item.compatibility_score })}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
            <UserPlus className="h-4 w-4" />
            {t("screens.home.viewProfile")}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (item.kind === "performer") {
    return (
      <Card
        className={cardShell}
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
        <CardContent className="p-4">
          <WhyLabel item={item} icon={<TrendingUp className="h-3.5 w-3.5" />} />
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
        </CardContent>
      </Card>
    );
  }

  // Community post (text / image / inline-muted video) — interactive: inline
  // heart + expandable comments, rendered by its own card so the like/comment
  // hook is called unconditionally.
  return <CommunityPostCard item={item} onOpen={onOpen} />;
}
