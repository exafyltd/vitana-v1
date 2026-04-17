import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Share2,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Link2,
  ExternalLink,
  EyeOff,
  ThumbsDown,
  VolumeX,
} from "lucide-react";
import {
  KebabMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu-kebab";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useNewsFeedPreferencesStore } from "@/stores/newsFeedPreferencesStore";

export interface NewsArticleCardMenuProps {
  articleId: string;
  title: string;
  link?: string | null;
  tags?: string[];
  sourceName?: string;
  className?: string;
}

/**
 * Kebab menu for a news-feed card. Two grouped sections separated by a
 * divider: article actions (share, save, summarize, copy link, open in
 * browser) and feed-personalization controls (hide, show less, mute source).
 *
 * Feed-control state is persisted via `useNewsFeedPreferencesStore`; Home.tsx
 * filters `hiddenArticleIds` and `mutedSources` out before rendering.
 */
export const NewsArticleCardMenu: React.FC<NewsArticleCardMenuProps> = ({
  articleId,
  title,
  link,
  tags,
  sourceName,
  className,
}) => {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const prefs = useNewsFeedPreferencesStore();
  const saved = prefs.isSaved(articleId);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: translate("newsCard.menu.linkCopied", "Link copied"),
        duration: 2000,
      });
    } catch {
      /* noop */
    }
  };

  const handleShare = async () => {
    const url = link || "";
    if (typeof navigator !== "undefined" && (navigator as any).share && url) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    await copyLink();
  };

  const handleSaveToggle = () => {
    prefs.toggleSaved(articleId);
    toast({
      title: saved
        ? translate("newsCard.menu.unsavedToast", "Removed from saved")
        : translate("newsCard.menu.savedToast", "Saved for later"),
      duration: 2000,
    });
  };

  const handleSummarize = () => {
    navigate("/ai/companion", {
      state: { summarizeArticle: { id: articleId, title, link } },
    });
    toast({
      title: translate("newsCard.menu.summarizeToast", "Queued for Vitana"),
      duration: 2000,
    });
  };

  const handleOpenInBrowser = () => {
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleHide = () => {
    prefs.hideArticle(articleId);
    toast({
      title: translate("newsCard.menu.hiddenToast", "Article hidden"),
      duration: 5000,
      action: (
        <ToastAction
          altText={translate("newsCard.menu.undo", "Undo")}
          onClick={() => prefs.unhideArticle(articleId)}
        >
          {translate("newsCard.menu.undo", "Undo")}
        </ToastAction>
      ),
    });
  };

  const handleShowLess = () => {
    if (tags && tags.length) prefs.showLessLike(tags);
    toast({
      title: translate(
        "newsCard.menu.showLessToast",
        "We'll show fewer like this"
      ),
      duration: 2500,
    });
  };

  const handleMuteSource = () => {
    if (!sourceName) return;
    prefs.muteSource(sourceName);
    toast({
      title: translate("newsCard.menu.mutedToast", "Source muted"),
      description: sourceName,
      duration: 5000,
      action: (
        <ToastAction
          altText={translate("newsCard.menu.unmute", "Unmute")}
          onClick={() => prefs.unmuteSource(sourceName)}
        >
          {translate("newsCard.menu.unmute", "Unmute")}
        </ToastAction>
      ),
    });
  };

  const stop = (fn: () => void | Promise<void>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    void fn();
  };

  return (
    <KebabMenu className={className}>
      {/* Group A — article actions */}
      <DropdownMenuItem onClick={stop(handleShare)}>
        <Share2 className="h-4 w-4 mr-2" />
        {translate("newsCard.menu.share", "Share")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={stop(handleSaveToggle)}>
        {saved ? (
          <BookmarkCheck className="h-4 w-4 mr-2" />
        ) : (
          <Bookmark className="h-4 w-4 mr-2" />
        )}
        {saved
          ? translate("newsCard.menu.saved", "Saved")
          : translate("newsCard.menu.save", "Save")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={stop(handleSummarize)}>
        <Sparkles className="h-4 w-4 mr-2" />
        {translate("newsCard.menu.summarize", "Summarize with Vitana")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={stop(copyLink)} disabled={!link}>
        <Link2 className="h-4 w-4 mr-2" />
        {translate("newsCard.menu.copyLink", "Copy link")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={stop(handleOpenInBrowser)} disabled={!link}>
        <ExternalLink className="h-4 w-4 mr-2" />
        {translate("newsCard.menu.openInBrowser", "Open in browser")}
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {/* Group B — feed controls */}
      <DropdownMenuItem onClick={stop(handleHide)}>
        <EyeOff className="h-4 w-4 mr-2" />
        {translate("newsCard.menu.hide", "Hide this article")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={stop(handleShowLess)}>
        <ThumbsDown className="h-4 w-4 mr-2" />
        {translate("newsCard.menu.showLess", "Show less like this")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={stop(handleMuteSource)}
        disabled={!sourceName}
      >
        <VolumeX className="h-4 w-4 mr-2" />
        {translate("newsCard.menu.muteSource", "Mute this source")}
      </DropdownMenuItem>
    </KebabMenu>
  );
};

export default NewsArticleCardMenu;
