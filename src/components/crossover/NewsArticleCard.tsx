import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";
import { NewsArticleCardMenu } from "@/components/crossover/NewsArticleCardMenu";

export interface NewsArticleCardProps {
  title: string;
  description?: string;
  imageUrl: string;
  /**
   * Optional fallback image used when the primary `imageUrl` fails to load
   * (e.g. og:image blocked/broken). When unset, only the primary is used.
   */
  fallbackImageUrl?: string;
  category?: string;
  timestamp?: string;
  sourceName?: string;
  sourceAvatarUrl?: string;
  /** Stable article id — enables save / hide / "show less" preferences. */
  articleId?: string;
  /** External article URL — used by Share, Copy link, Open in browser. */
  link?: string | null;
  /** Article tags — used by "Show less like this". */
  tags?: string[];
  className?: string;
  onClick?: () => void;
}

/**
 * NewsArticleCard — news-feed card matching the unified design:
 *   ┌──────────────────────────┐
 *   │        IMAGE (16:9)      │
 *   ├──────────────────────────┤
 *   │ CATEGORY • timestamp     │
 *   │ Title (bold, 2 lines)    │
 *   │ Description (2 lines)    │
 *   │ ⊙ Source name       ⋯    │
 *   └──────────────────────────┘
 *
 * Image occupies a fixed 16:9 top section so every article card is
 * visually symmetric and unified. Text is clamped to stay inside the
 * card regardless of length.
 */
const NewsArticleCardBase = React.forwardRef<HTMLDivElement, NewsArticleCardProps>(
  (
    {
      title,
      description,
      imageUrl,
      fallbackImageUrl,
      category,
      timestamp,
      sourceName,
      sourceAvatarUrl,
      articleId,
      link,
      tags,
      className,
      onClick,
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(imageUrl);
    const [hasFallenBack, setHasFallenBack] = useState(false);
    const avatarLetter = (sourceName || "•").trim().charAt(0).toUpperCase();

    // Reset image state when the primary URL changes (e.g. different article)
    React.useEffect(() => {
      setCurrentSrc(imageUrl);
      setImageLoaded(false);
      setHasFallenBack(false);
    }, [imageUrl]);

    const handleImageError = () => {
      if (!hasFallenBack && fallbackImageUrl && fallbackImageUrl !== imageUrl) {
        setHasFallenBack(true);
        setImageLoaded(false);
        setCurrentSrc(fallbackImageUrl);
      }
    };

    return (
      <Card
        ref={ref}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-card",
          "shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300",
          "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          className
        )}
        onClick={onClick}
        tabIndex={0}
        role="button"
        aria-label={`Read article: ${title}`}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* Image — fixed 16:9 aspect ratio so every card is symmetric */}
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.8) 50%, hsl(var(--muted) / 0.6) 100%)",
            }}
          />
          {currentSrc && (
            <img
              src={currentSrc}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-all duration-500",
                "group-hover:scale-[1.03]",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </div>

        {/* Text content — stays inside the card via line-clamp + padding */}
        <CardContent className="p-4 pt-3">
          {/* Category • Timestamp */}
          {(category || timestamp) && (
            <div className="flex items-center gap-2 text-xs mb-2">
              {category && (
                <span className="font-bold uppercase tracking-wide text-primary">
                  {category}
                </span>
              )}
              {category && timestamp && (
                <span className="text-muted-foreground">•</span>
              )}
              {timestamp && (
                <span className="text-muted-foreground">{timestamp}</span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-base font-bold leading-snug text-foreground line-clamp-2">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}

          {/* Footer — source + kebab */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-7 w-7 shrink-0">
                {sourceAvatarUrl && <AvatarImage src={sourceAvatarUrl} alt="" />}
                <AvatarFallback className="text-xs font-semibold text-foreground/70">
                  {avatarLetter}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm text-foreground/80">
                {sourceName}
              </span>
            </div>

            {articleId ? (
              <NewsArticleCardMenu
                articleId={articleId}
                title={title}
                link={link}
                tags={tags}
                sourceName={sourceName}
                className="shrink-0 -mr-1"
              />
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }
);

NewsArticleCardBase.displayName = "NewsArticleCard";

const MemoizedNewsArticleCard = React.memo(NewsArticleCardBase);
MemoizedNewsArticleCard.displayName = "MemoizedNewsArticleCard";

const NewsArticleCard = withCardId(MemoizedNewsArticleCard, "CT-CX-NEWS-ARTICLE");

export { NewsArticleCard, NewsArticleCardBase };
