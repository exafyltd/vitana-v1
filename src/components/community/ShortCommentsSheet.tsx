import { useEffect, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useShortComments } from '@/hooks/useShortComments';
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

export function ShortCommentsSheet({ open, onOpenChange, videoId, videoTitle }: ShortCommentsSheetProps) {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const { comments, commentsLoading, addComment, isAddingComment, deleteComment } = useShortComments(videoId);
  const [commentText, setCommentText] = useState('');

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

  if (!open || !videoId) return null;

  const handleAddComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    try {
      await addComment(trimmed);
      setCommentText('');
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

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

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
            {videoTitle && (
              <p className="text-xs text-muted-foreground truncate max-w-[300px]">{videoTitle}</p>
            )}
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
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                {translate('mediaHub.comments.empty', 'No comments yet')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {translate('mediaHub.comments.beFirst', 'Be the first to comment')}
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(comment.display_name || '?')[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-muted/60 rounded-xl px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">
                      {comment.display_name || translate('mediaHub.comments.member', 'Community Member')}
                    </span>
                    <p className="text-sm text-foreground/90 break-words">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-2 px-1 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{formatDate(comment.created_at)}</span>
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
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3 safe-area-inset-bottom">
          {user ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                placeholder={translate('mediaHub.comments.placeholder', 'Write a comment...')}
                className="flex-1 text-sm bg-muted/60 rounded-full px-4 py-2.5 border-0 outline-none focus:ring-1 focus:ring-primary/30"
                disabled={isAddingComment}
              />
              <button
                onClick={handleAddComment}
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
