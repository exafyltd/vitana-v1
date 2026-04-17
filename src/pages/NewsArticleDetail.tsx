import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NewsArticleCardMenu } from "@/components/crossover/NewsArticleCardMenu";
import { useTranslation } from "@/hooks/useTranslation";
import { getNewsImage, getArticlePillar } from "@/lib/news-images";
import { cn } from "@/lib/utils";
import type { NewsArticle } from "@/hooks/useNewsFeed";

const IFRAME_TIMEOUT_MS = 6000;

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

  const imageUrl =
    article.image_url ||
    getNewsImage(article.tags, article.id, article.title, article.summary);
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
        {/* Hero image */}
        <div className="relative w-full aspect-[16/9] bg-muted">
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

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

        {/* Embedded article (iframe) */}
        {article.link && (
          <ArticleEmbed
            url={article.link}
            sourceName={article.source_name}
            translate={translate}
          />
        )}

        {/* Open in browser — always visible */}
        {article.link && (
          <div className="px-4 pb-8 pt-4">
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

function ArticleEmbed({
  url,
  sourceName,
  translate,
}: {
  url: string;
  sourceName: string;
  translate: (key: string, fallback: string) => string;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "blocked">("loading");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setStatus("loading");
    timerRef.current = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "blocked" : s));
    }, IFRAME_TIMEOUT_MS);
    return () => clearTimeout(timerRef.current);
  }, [url]);

  const handleLoad = () => {
    clearTimeout(timerRef.current);
    setStatus("loaded");
  };

  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return sourceName;
    }
  })();

  return (
    <div className="mt-2">
      {/* Divider + label */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {translate("newsCard.detail.continueReading", "Continue reading on")}{" "}
          {domain}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {status === "blocked" ? (
        <div className="mx-4 rounded-xl border border-border/60 bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {translate(
              "newsCard.detail.couldNotLoad",
              "This article can't be displayed inline"
            )}
          </p>
          <Button
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {translate("newsCard.detail.readOn", "Read on")} {sourceName}
          </Button>
        </div>
      ) : (
        <div className="relative mx-2">
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <iframe
            src={url}
            title="Article content"
            className={cn(
              "w-full rounded-xl border border-border/40",
              status === "loaded" ? "min-h-[70vh]" : "h-[70vh]"
            )}
            style={{ minHeight: "70vh" }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            onLoad={handleLoad}
          />
        </div>
      )}
    </div>
  );
}
