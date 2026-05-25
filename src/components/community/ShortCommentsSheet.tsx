import { useEffect, useMemo, useState } from 'react';
import { Heart, Loader2, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useShortComments, ShortComment } from '@/hooks/useShortComments';
import { useAuth } from '@/context/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { notifyError } from '@/lib/i18n-toast';
import { formatDistanceToNow } from '@/lib/locale-format';
import { cn } from '@/lib/utils';

interface ShortCommentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId?: string;
  videoTitle?: string;
}

interface ReplyTarget {
  parentId: string;
  name: string;
}

export function ShortCommentsSheet({ open, onOpenChange, videoId, videoTitle }: ShortCommentsSheetProps) {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const { comments, commentsLoading, addComment, isAddingComment, deleteComment, toggleCommentLike } =
    useShortComments(videoId);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onOpenChange]);

  // Reset reply target when the sheet closes
  useEffect(() => {
    if (!open) setReplyTo(null);
  }, [open]);

  // Group into top-level comments and their (one level of) replies
  const { topLevel, repliesByParent } = useMemo(() => {
    const top: ShortComment[] = [];
    const byParent = new Map<string, ShortComment[]>();
    for (const c of comments) {
      if (c.parent_id) {
        const list = byParent.get(c.parent_id) || [];
        list.push(c);
        byParent.set(c.parent_id, list);
      } else {
        top.push(c);
      }
    }
    return { topLevel: top, repliesByParent: byParent };
  }, [comments]);

  if (!open || !videoId) return null;

  const handleSubmit = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    try {
      await addComment({ content: trimmed, parentId: replyTo?.parentId ?? null });
      setCommentText('');
      setReplyTo(null);
    } catch {
      notifyError('mediaHub.toast.commentError', 'mediaHub.toast.commentErrorDesc');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  const authorName = (c: ShortComment) =>
    c.display_name || translate('mediaHub.comments.member', 'Community Member');

  const renderComment = (comment: ShortComment, isReply: boolean) => {
    const name = authorName(comment);
    // One-level threading: replying to a reply still attaches to its top-level parent.
    const parentId = comment.parent_id ?? comment.id;
    return (
      <div key={comment.id} className={cn('flex items-start gap-2', isReply && 'ml-10')}>
        <Avatar className={cn(isReply ? 'h-7 w-7' : 'h-8 w-8')}>
          <AvatarImage src={comment.avatar_url || undefined} />
          <AvatarFallback className="text-[10px]">{name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/60 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold text-foreground">{name}</span>
            <p className="text-sm text-foreground/90 break-words">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 px-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{formatDate(comment.created_at)}</span>
            <button
              onClick={() => {
                if (!user) return;
                toggleCommentLike({ commentId: comment.id, liked: comment.liked_by_me });
              }}
              disabled={!user}
              aria-label={translate('mediaHub.comments.like', 'Like comment')}
              className={cn(
                'flex items-center gap-1 text-[10px] transition-colors',
                comment.liked_by_me ? 'text-pink-500' : 'text-muted-foreground hover:text-pink-500',
                !user && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', comment.liked_by_me && 'fill-current')} />
              {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
            </button>
            {user && (
              <button
                onClick={() => setReplyTo({ parentId, name })}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {translate('mediaHub.comments.reply', 'Reply')}
              </button>
            )}
            {user?.id === comment.user_id && (
              <button
                onClick={() => deleteComment(comment.id)}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                {translate('common.delete', 'Delete')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      {/* Panel: bottom sheet on mobile, right drawer on desktop */}
      <div
        className={cn(
          'absolute z-[91] flex flex-col bg-background shadow-2xl',
          'inset-x-0 bottom-0 max-h-[75vh] rounded-t-2xl',
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:w-[420px] sm:max-h-none sm:rounded-none sm:border-l',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {translate('mediaHub.comments.title', 'Comments')}
              {comments.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">{comments.length}</span>
              )}
            </h2>
            {videoTitle && <p className="text-xs text-muted-foreground truncate max-w-[300px]">{videoTitle}</p>}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label={translate('mediaHub.comments.title', 'Comments')}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {commentsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : topLevel.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                {translate('mediaHub.comments.empty', 'No comments yet')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {translate('mediaHub.comments.beFirst', 'Be the first to comment')}
              </p>
            </div>
          ) : (
            topLevel.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {renderComment(comment, false)}
                {(repliesByParent.get(comment.id) || []).map((reply) => renderComment(reply, true))}
              </div>
            ))
          )}
        </div>

        {/* Reply banner */}
        {replyTo && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-t text-xs text-muted-foreground">
            <span className="truncate">
              {translate('mediaHub.comments.replyingTo', 'Replying to {name}').replace('{name}', replyTo.name)}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              aria-label={translate('mediaHub.comments.cancelReply', 'Cancel reply')}
              className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t px-4 py-3 safe-area-inset-bottom">
          {user ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                placeholder={translate('mediaHub.comments.placeholder', 'Write a comment...')}
                className="flex-1 text-sm bg-muted/60 rounded-full px-4 py-2.5 border-0 outline-none focus:ring-1 focus:ring-primary/30"
                disabled={isAddingComment}
              />
              <button
                onClick={handleSubmit}
                disabled={!commentText.trim() || isAddingComment}
                aria-label={translate('mediaHub.comments.send', 'Send comment')}
                className="h-10 w-10 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary disabled:opacity-40 transition-colors"
              >
                {isAddingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <p className="text-sm text-center text-muted-foreground py-1">
              {translate('mediaHub.comments.signIn', 'Sign in to comment')}
            </p>
          )}
        </div>
      </div>

      <style>{`
        .safe-area-inset-bottom {
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
