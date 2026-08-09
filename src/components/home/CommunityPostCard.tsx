/**
 * VTID-03319 — interactive community-post card for the unified "All News" feed.
 *
 * Split out of NewsFeedItemCard so the like/comment hook can be called
 * unconditionally (it is only mounted for kind === "post"). The card body still
 * navigates to the author's profile; the heart and the comment affordance are
 * inline — tapping the heart toggles a like, long-pressing it opens the "who
 * liked this" list (mirrors Instagram's long-press-to-see-likers gesture),
 * tapping the comment count expands an inline list of comments plus an input
 * to post a new one. Every interactive control stops propagation so it never
 * triggers the card's navigation.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "@/lib/locale-format";
import { t, notify, notifyError } from "@/lib/i18n-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import { useFeedPostInteractions } from "@/hooks/useFeedPostInteractions";
import { NewsPostModerationMenu } from "@/components/home/NewsPostModerationMenu";
import { PostLikersDialog } from "@/components/home/PostLikersDialog";
import { FeedMedia } from "@/components/media/FeedMedia";
import { renderMentions } from "@/components/feed/MentionText";
import { getPostBackground } from "@/lib/post-backgrounds";
import { reasonKeyFor, type FeedItem, type PostFeedItem } from "@/lib/news-feed-ranker";

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

const cardShell =
  "group relative overflow-hidden rounded-2xl border border-border/40 bg-card " +
  "shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 " +
  "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]";

export function CommunityPostCard({
  item,
  onOpen,
}: {
  item: PostFeedItem;
  onOpen?: (item: FeedItem) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isLiked,
    toggleLike,
    comments,
    commentsLoading,
    addComment,
    isAddingComment,
    deleteComment,
  } = useFeedPostInteractions(item.source, item.post_id);

  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [commentText, setCommentText] = useState("");
  // Optimistic local counts — avoids re-ranking the whole feed on every action.
  // The trigger-maintained canonical counts reconcile via the feed's refetch.
  const [likeCount, setLikeCount] = useState(item.likes_count);
  const [commentCount, setCommentCount] = useState(item.comments_count);

  // ...but only if we actually adopt the reconciled values (VTID-03503). These
  // were seeded from props once and then never resynced, so once the card had
  // rendered, a newer count arriving from the feed — a background refetch, or
  // this viewer's own action being written into the feed cache — was ignored
  // for the lifetime of the mount. Adjusting state during render (rather than
  // in an effect) is React's documented pattern for prop-derived state: it
  // re-renders before paint, so no stale number is ever shown.
  const [syncedCounts, setSyncedCounts] = useState({
    likes: item.likes_count,
    comments: item.comments_count,
  });
  if (
    syncedCounts.likes !== item.likes_count ||
    syncedCounts.comments !== item.comments_count
  ) {
    setSyncedCounts({ likes: item.likes_count, comments: item.comments_count });
    setLikeCount(item.likes_count);
    setCommentCount(item.comments_count);
  }

  const openProfile = () => {
    onOpen?.(item);
    navigate(`/u/${item.user_id}`);
  };

  // Long-press-to-see-likers: a press held past LONG_PRESS_MS opens the
  // "who liked this" list instead of toggling the like on release.
  const LONG_PRESS_MS = 500;
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  useEffect(() => clearLongPressTimer, []);

  const handleLikePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    longPressTriggered.current = false;
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setShowLikers(true);
    }, LONG_PRESS_MS);
  };

  const handleLikePointerRelease = (e: React.PointerEvent) => {
    e.stopPropagation();
    clearLongPressTimer();
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (longPressTriggered.current) {
      // The long press already opened the likers list — don't also toggle.
      longPressTriggered.current = false;
      return;
    }
    if (!user) {
      notify("screens.home.signInToInteract");
      return;
    }
    const delta = isLiked ? -1 : 1;
    setLikeCount((c) => Math.max(0, c + delta));
    // Roll the optimistic count back if the write fails — otherwise a phantom
    // +1 sits there until the next feed refetch, which is the same class of
    // "the number lies" bug as VTID-03503 itself, just in the other direction.
    toggleLike(undefined, {
      onError: () => setLikeCount((c) => Math.max(0, c - delta)),
    });
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      await addComment(text);
      setCommentText("");
      setCommentCount((c) => c + 1);
    } catch {
      notifyError("screens.home.commentError");
    }
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId);
    setCommentCount((c) => Math.max(0, c - 1));
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // Coloured backgrounds only apply to text-only posts; media frames itself.
  const hasMedia = !!item.image_url || !!item.video_url;
  const background = hasMedia ? null : getPostBackground(item.background_style);

  return (
    <Card
      className={cn(cardShell, "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2")}
      role="button"
      tabIndex={0}
      onClick={openProfile}
      onKeyDown={(e) => {
        // Only the card itself navigates — keys typed in the comment input or on
        // the heart/comment buttons must not bubble up into navigation.
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          openProfile();
        }
      }}
    >
      <FeedMedia videoUrl={item.video_url} imageUrl={item.image_url} />

      <CardContent className="p-4 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="truncate">{t(reasonKeyFor(item))}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">{timeAgo(item.published_at)}</span>
        </div>
        {item.content &&
          (background ? (
            <div
              className={cn(
                "-mx-4 mb-1 flex min-h-[180px] items-center justify-center px-6 py-8 text-center",
                background.fillClass,
              )}
            >
              <p
                className={cn(
                  "line-clamp-6 whitespace-pre-wrap break-words text-lg font-semibold leading-snug",
                  background.textClass,
                )}
              >
                {renderMentions(item.content, item.mentions)}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-foreground line-clamp-3 whitespace-pre-wrap break-words">
              {renderMentions(item.content, item.mentions)}
            </p>
          ))}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              {item.author_avatar && <AvatarImage src={item.author_avatar} alt="" />}
              <AvatarFallback className="text-xs">
                {(item.author_name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-foreground/80">{item.author_name}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleLike}
              onPointerDown={handleLikePointerDown}
              onPointerUp={handleLikePointerRelease}
              onPointerLeave={handleLikePointerRelease}
              onPointerCancel={handleLikePointerRelease}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={t("screens.profile.likePost")}
              aria-pressed={isLiked}
              className={cn(
                "flex select-none items-center gap-1 text-xs transition-colors touch-manipulation",
                isLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500",
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
              {likeCount}
            </button>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setShowComments((s) => !s);
              }}
              aria-label={t("screens.profile.comment")}
              aria-expanded={showComments}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                showComments ? "text-blue-500" : "text-muted-foreground hover:text-blue-500",
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {commentCount}
            </button>
            {item.source === "post" && (
              <NewsPostModerationMenu
                postId={item.post_id}
                authorId={item.user_id}
                authorName={item.author_name}
                postContent={item.content}
              />
            )}
          </div>
        </div>

        {showComments && (
          <div className="mt-3 space-y-3 border-t border-border/40 pt-3" onClick={stop}>
            {commentsLoading ? (
              <p className="text-xs text-muted-foreground">{t("screens.home.loadingComments")}</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("screens.home.noCommentsYet")}</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      {comment.avatar_url && <AvatarImage src={comment.avatar_url} alt="" />}
                      <AvatarFallback className="text-[10px]">
                        {(comment.display_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-xl bg-muted/50 px-3 py-2">
                        <span className="text-xs font-semibold text-foreground">
                          {comment.display_name || t("screens.home.communityMember")}
                        </span>
                        <p className="text-sm text-foreground/90 break-words">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-2 px-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                        {user?.id === comment.user_id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            aria-label={t("screens.home.deleteComment")}
                            className="text-muted-foreground/60 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder={t("screens.home.writeComment")}
                  className="flex-1 text-sm bg-muted/50 rounded-full px-4 py-2 border-0 outline-none focus:ring-1 focus:ring-primary/30"
                  disabled={isAddingComment}
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isAddingComment}
                  aria-label={t("screens.home.postComment")}
                  className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary disabled:opacity-40 transition-colors shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("screens.home.signInToInteract")}</p>
            )}
          </div>
        )}
      </CardContent>

      <PostLikersDialog
        source={item.source}
        postId={item.post_id}
        open={showLikers}
        onOpenChange={setShowLikers}
      />
    </Card>
  );
}
