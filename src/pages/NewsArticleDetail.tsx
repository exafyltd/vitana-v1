import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NewsArticleCardMenu } from "@/components/crossover/NewsArticleCardMenu";
import { useTranslation } from "@/hooks/useTranslation";
import { getNewsImage, getArticlePillar } from "@/lib/news-images";
import type { NewsArticle } from "@/hooks/useNewsFeed";

export default function NewsArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { translate } = useTranslation();

  const article: NewsArticle | undefined = (location.state as any)?.article;

  useEffect(() => {
    if (!article) navigate("/home", { replace: true });
  }, [article, navigate]);

  if (!article) return null;

  const fallbackUrl = getNewsImage(article.tags, article.id, article.title, article.summary);
  const primaryUrl = article.image_url || fallbackUrl;

  const pillar = getArticlePillar(article.tags, article.title, article.summary);
  const categoryLabel = article.source === "community"
    ? "COMMUNITY"
    : (pillar || "NUTRITION").toUpperCase();
  const timestamp = (() => {
    try {
      return formatDistanceToNow(new Date(article.published_at), { addSuffix: true });
    } catch {
      return "";
    }
  })();
  const avatarLetter = (article.source_name || "•").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={() => navigate(-1)}
          aria-label={translate("newsCard.detail.back", "Back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-[10px] font-semibold">
              {avatarLetter}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate text-foreground/80">
            {article.source_name}
          </span>
        </div>
        <NewsArticleCardMenu
          articleId={article.id}
          title={article.title}
          link={article.link}
          tags={article.tags}
          sourceName={article.source_name}
        />
      </header>

      {/* Scrollable body */}
      <main className="flex-1 overflow-y-auto">
        <HeroImage primaryUrl={primaryUrl} fallbackUrl={fallbackUrl} />

        {/* Article header */}
        <div className="px-4 pt-4 pb-2">
          {(categoryLabel || timestamp) && (
            <div className="flex items-center gap-2 text-xs mb-3">
              {categoryLabel && (
                <span className="font-bold uppercase tracking-wide text-primary">
                  {categoryLabel}
                </span>
              )}
              {categoryLabel && timestamp && (
                <span className="text-muted-foreground">•</span>
              )}
              {timestamp && (
                <span className="text-muted-foreground">{timestamp}</span>
              )}
            </div>
          )}
          <h1 className="text-xl font-bold leading-tight text-foreground">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-4">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs font-semibold text-foreground/70">
                {avatarLetter}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-foreground/70">{article.source_name}</span>
            {timestamp && (
              <span className="text-xs text-muted-foreground ml-auto">{timestamp}</span>
            )}
          </div>
        </div>

        {/* Read full article CTA */}
        {article.link && (
          <div className="px-4 pt-6 pb-4">
            <Button
              className="w-full gap-2"
              onClick={() =>
                window.open(article.link!, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="h-4 w-4" />
              {translate("newsCard.detail.readOn", "Read full article on")}{" "}
              {article.source_name}
            </Button>
          </div>
        )}

        {/* Secondary open in browser */}
        {article.link && (
          <div className="px-4 pb-8">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() =>
                window.open(article.link!, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="h-4 w-4" />
              {translate("newsCard.detail.openInBrowser", "Open in browser")}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function HeroImage({ primaryUrl, fallbackUrl }: { primaryUrl: string; fallbackUrl: string }) {
  const [src, setSrc] = useState(primaryUrl);
  const [hasFallenBack, setHasFallenBack] = useState(false);

  useEffect(() => {
    setSrc(primaryUrl);
    setHasFallenBack(false);
  }, [primaryUrl]);

  return (
    <div className="relative w-full aspect-[16/9] bg-muted">
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => {
          if (!hasFallenBack && fallbackUrl !== src) {
            setHasFallenBack(true);
            setSrc(fallbackUrl);
          }
        }}
      />
    </div>
  );
}
