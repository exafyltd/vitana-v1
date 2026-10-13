/**
 * VTID-05108 — the cards of the desktop News focus feed (Spotlight on).
 *
 * Every stage item renders through VCard (contract SR-09):
 *   - the lead item is the one `spotlight` card of the screen (SR-06/07);
 *   - every further item is a `standard` card (4:3 media) laid out as a
 *     horizontal row — media at the inline start, text beside it — so the
 *     column stays dense (no big empty areas) and never outweighs the lead.
 *
 * Posts keep their interactions: like inline, the comment count opens the
 * full existing post card (comments thread, replies, likers) in a side sheet
 * from the inline-end side, and the moderation menu stays on the card.
 */
import { useState, type ReactNode } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { VCard } from '@/components/ui/vcard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ClickableAvatar } from '@/components/ui/clickable-avatar';
import { FeedMedia } from '@/components/media/FeedMedia';
import { renderMentions } from '@/components/feed/MentionText';
import { CommunityPostCard } from '@/components/home/CommunityPostCard';
import { NewsPostModerationMenu } from '@/components/home/NewsPostModerationMenu';
import { useFeedPostInteractions } from '@/hooks/useFeedPostInteractions';
import { useAuth } from '@/context/AuthProvider';
import { t, notify } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import { reasonKeyFor, type FeedItem, type PostFeedItem } from '@/lib/news-feed-ranker';
import {
  INTERACTIVE_CARD_CLASS as INTERACTIVE_CLASS,
  STANDARD_ROW_CLASS,
  activateProps,
  inlineEndSide,
  timeAgo,
  type StageCardState,
} from './focusCardUtils';

/** An image that swaps to its fallback once if it fails (same behaviour as the legacy news card). */
function FallbackImage({ src, fallback, priority }: { src: string | null; fallback: string | null; priority: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = failed ? fallback : src || fallback;
  if (!url) return <div className="h-full w-full bg-muted" aria-hidden="true" />;
  return (
    <img
      src={url}
      alt=""
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        if (!failed && fallback && url !== fallback) setFailed(true);
      }}
      className="h-full w-full object-cover"
    />
  );
}

export interface FocusArticleCardProps extends StageCardState {
  focusKey: string;
  eyebrow: string;
  title: string;
  meta?: string;
  summary?: string | null;
  image: string | null;
  fallbackImage: string | null;
  onOpen: () => void;
}

/** A news article (feed v2 article or a Longevity/Community tab item). */
export function FocusArticleCard({
  focusKey,
  eyebrow,
  title,
  meta,
  summary,
  image,
  fallbackImage,
  onOpen,
  size,
  focused,
  dimmed,
}: FocusArticleCardProps) {
  return (
    <VCard
      size={size}
      data-focus-item=""
      data-focus-key={focusKey}
      data-stage-kind="article"
      mediaSlot={<FallbackImage src={image} fallback={fallbackImage} priority={size === 'spotlight'} />}
      eyebrow={eyebrow}
      title={title}
      meta={meta}
      body={summary ? <p className="line-clamp-3">{summary}</p> : undefined}
      focused={focused}
      dimmed={dimmed}
      className={cn(INTERACTIVE_CLASS, size === 'standard' && STANDARD_ROW_CLASS)}
      {...activateProps(onOpen)}
    />
  );
}

export interface FocusPostCardProps extends StageCardState {
  item: PostFeedItem;
  onOpen?: (item: FeedItem) => void;
  onOpenProfile: (userId: string) => void;
  /** Open the comments sheet when this flips to true (the /home/comments deep link). */
  autoOpenComments?: boolean;
}

const firstLineAndRest = (text: string): { first: string; rest: string } => {
  const lines = (text ?? '').split('\n');
  const i = lines.findIndex((l) => l.trim().length > 0);
  if (i < 0) return { first: '', rest: '' };
  return { first: lines[i].trim(), rest: lines.slice(i + 1).join('\n').trim() };
};

/** A member post. */
export function FocusPostCard({ item, onOpen, onOpenProfile, autoOpenComments, size, focused, dimmed }: FocusPostCardProps) {
  const { user } = useAuth();
  const { isLiked, toggleLike } = useFeedPostInteractions(item.source, item.post_id);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [wasAutoOpen, setWasAutoOpen] = useState(false);
  // Optimistic like count, reconciled whenever the feed row brings a new count
  // (same pattern as CommunityPostCard, VTID-03503).
  const [likeDelta, setLikeDelta] = useState(0);
  const [syncedLikes, setSyncedLikes] = useState(item.likes_count);
  if (syncedLikes !== item.likes_count) {
    setSyncedLikes(item.likes_count);
    setLikeDelta(0);
  }
  if (!!autoOpenComments !== wasAutoOpen) {
    setWasAutoOpen(!!autoOpenComments);
    if (autoOpenComments) setCommentsOpen(true);
  }
  const likeCount = Math.max(0, item.likes_count + likeDelta);

  const { first, rest } = firstLineAndRest(item.content);
  const hasVisual = !!item.image_url || !!item.video_url;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      notify('screens.home.signInToInteract');
      return;
    }
    const delta = isLiked ? -1 : 1;
    setLikeDelta((d) => d + delta);
    toggleLike(undefined, { onError: () => setLikeDelta((d) => d - delta) });
  };

  const openComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentsOpen(true);
  };

  const actions: ReactNode = (
    <div className="flex w-full items-center gap-4" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleLike}
        aria-label={t('screens.profile.likePost')}
        aria-pressed={isLiked}
        className={cn(
          'flex items-center gap-1.5 text-sm font-semibold transition-colors',
          isLiked ? 'text-primary' : 'text-muted-foreground hover:text-primary',
        )}
      >
        <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} aria-hidden="true" />
        {likeCount}
      </button>
      <button
        type="button"
        onClick={openComments}
        aria-label={t('spotlightFeed.post.openComments')}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {item.comments_count}
      </button>
      <div className="ms-auto">
        <NewsPostModerationMenu
          postId={item.post_id}
          authorId={item.user_id}
          authorName={item.author_name}
          postContent={item.content}
          source={item.source}
        />
      </div>
    </div>
  );

  const meta = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <ClickableAvatar
        userId={item.user_id}
        src={item.author_avatar ?? undefined}
        fallback={(item.author_name || '?').charAt(0).toUpperCase()}
        alt={item.author_name}
        loading="lazy"
        className="h-5 w-5 shrink-0 text-xs"
        onClick={() => {
          onOpen?.(item);
          onOpenProfile(item.user_id);
        }}
      />
      <span className="truncate">{[item.author_name, timeAgo(item.published_at)].filter(Boolean).join(' · ')}</span>
    </span>
  );

  return (
    <>
      <VCard
        size={size}
        data-focus-item=""
        data-focus-key={item.id}
        data-stage-kind="post"
        mediaSlot={hasVisual ? <FeedMedia videoUrl={item.video_url} imageUrl={item.image_url} className="h-full" /> : undefined}
        eyebrow={t(reasonKeyFor(item))}
        title={first || item.author_name}
        meta={meta}
        body={rest ? <p className="line-clamp-4 whitespace-pre-wrap break-words">{renderMentions(rest, item.mentions)}</p> : undefined}
        actions={actions}
        focused={focused}
        dimmed={dimmed}
        className={cn(INTERACTIVE_CLASS, size === 'standard' && STANDARD_ROW_CLASS)}
        {...activateProps(() => {
          onOpen?.(item);
          onOpenProfile(item.user_id);
        })}
      />
      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side={inlineEndSide()} className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('spotlightFeed.post.commentsTitle')}</SheetTitle>
          </SheetHeader>
          {commentsOpen && (
            <div className="mt-4">
              <CommunityPostCard item={item} onOpen={onOpen} autoOpenComments />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
