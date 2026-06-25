import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayAvatarUrl } from "@/lib/autoAvatar";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, MessageSquare, Share, Edit3, MapPin, ExternalLink, Trash2, PenSquare, Send, X } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { useProfilePosts, ProfilePost } from "@/hooks/useProfilePosts";
import { usePostInteractions, PostComment } from "@/hooks/usePostInteractions";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/context/AuthProvider";
import { I18nEmptyState } from "@/components/ui/i18n-empty-state";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
interface ProfilePostsTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditAbout?: () => void;
  onCreatePost?: () => void;
}

export function ProfilePostsTab({ profile, scope, editMode, onEditAbout, onCreatePost }: ProfilePostsTabProps) {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const { posts, isLoading, deletePost } = useProfilePosts(profile.user_id || profile.id);
  const isOwner = user?.id === (profile.user_id || profile.id);

  const handleDelete = async (postId: string) => {
    if (!confirm(translate('profilePosts.deleteConfirm', 'Delete this post?'))) return;
    try {
      await deletePost.mutateAsync(postId);
      toast({ title: translate('profilePosts.deleted', 'Post deleted') });
    } catch {
      toast({ title: translate('profilePosts.error', 'Something went wrong'), variant: 'destructive' });
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
    <div className="w-full space-y-8">
      {/* About Section */}
      {profile.bio && (
        <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] transition-all px-5 py-4 md:px-6 md:py-5">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold">{translate('editProfile.about', 'About')}</h3>
            {editMode && onEditAbout && (
              <Button variant="soft" size="xs" onClick={onEditAbout}>
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                {translate('editProfile.about', 'Edit About')}
              </Button>
            )}
          </div>
          <p className="text-gray-800 dark:text-gray-100 mb-4 leading-[1.75] tracking-wide">{profile.bio}</p>
          {profile.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              {profile.location}
            </div>
          )}
          {profile.links && profile.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.links.map((link, index) => (
                <Button key={index} variant="link" size="sm" className="h-auto p-0">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {link.label}
                </Button>
              ))}
            </div>
          )}
          {profile.languages && profile.languages.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {profile.languages.map((language, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {language}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Create Post CTA */}
      {isOwner && onCreatePost && (
        <button
          onClick={onCreatePost}
          className="w-full p-4 rounded-2xl border border-primary/40 bg-primary/10 hover:bg-primary/15 shadow-[0_2px_10px_rgba(124,58,237,0.10)] hover:shadow-[0_6px_18px_rgba(124,58,237,0.18)] transition-all flex items-center gap-3 text-left"
        >
          <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <PenSquare className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground/90">
            {translate('profilePosts.shareCta', 'Share something with the community')}
          </span>
          <span className="ml-auto shrink-0 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold shadow-sm">
            {translate('profilePosts.post', 'Post')}
          </span>
        </button>
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">{t('screens.profile.loading')}</div>
      ) : posts.length === 0 ? (
        <I18nEmptyState
          Icon={MessageSquare}
          titleKey="profilePosts.emptyTitle"
          descriptionKey="profilePosts.emptyDescription"
          actionKey={isOwner && onCreatePost ? "profilePosts.createPost" : undefined}
          onAction={onCreatePost}
        />
      ) : (
        <TooltipProvider>
          {posts.map((post: ProfilePost, index: number) => (
            <PostCardWithInteractions
              key={post.id}
              post={post}
              profile={profile}
              index={index}
              isOwner={isOwner}
              onDelete={handleDelete}
              formatDate={formatDate}
              translate={translate}
            />
          ))}
        </TooltipProvider>
      )}
    </div>
  );
}

// Separate component so each post has its own interaction state
function PostCardWithInteractions({
  post,
  profile,
  index,
  isOwner,
  onDelete,
  formatDate,
  translate,
}: {
  post: ProfilePost;
  profile: UserProfile;
  index: number;
  isOwner: boolean;
  onDelete: (id: string) => void;
  formatDate: (d: string) => string;
  translate: (key: string, fallback?: string) => string;
}) {
  const { user } = useAuth();
  const { isLiked, toggleLike, comments, addComment, isAddingComment, deleteComment } = usePostInteractions(post.id);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment(commentText.trim());
      setCommentText("");
    } catch {
      toast({ title: translate('profilePosts.error', 'Something went wrong'), variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: translate('common.copied', 'Link copied!') });
    } catch {
      // fallback
    }
  };

  return (
    <Card
      className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] hover:translate-y-[-2px] transition-all duration-300 ease-out animate-fade-in-up overflow-hidden motion-reduce:hover:translate-y-0"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-200/10 via-violet-300/20 to-transparent" />
      <div className="space-y-4 relative px-5 py-4 md:px-6 md:py-5">
        <div className="flex items-start gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-11 w-11 ring-1 ring-violet-200/50 dark:ring-violet-400/20 transition-all duration-300 cursor-pointer">
                <AvatarImage src={profile.avatarUrl} alt={profile.name} style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{profile.name}</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base tracking-wide text-gray-800 dark:text-gray-100">{profile.name}</span>
              <span className="text-muted-foreground/70 text-sm">@{profile.handle} • {formatDate(post.created_at)}</span>
              {isOwner && (
                <button
                  onClick={() => onDelete(post.id)}
                  className="ml-auto text-muted-foreground/50 hover:text-destructive transition-colors"
                  aria-label={t('screens.profile.deletePost')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2.5 text-gray-800 dark:text-gray-100 leading-[1.75] tracking-wide">
              {post.content}
            </p>
            {post.image_url && (
              <div className="mt-4 rounded-xl overflow-hidden shadow-md bg-muted flex items-center justify-center">
                <img
                  src={post.image_url}
                  alt={t('screens.profile.postImage')}
                  className="w-full h-auto max-h-80 object-contain"
                />
              </div>
            )}
            {post.video_url && (
              <div className="mt-4 rounded-xl overflow-hidden shadow-md bg-black">
                <video
                  src={post.video_url}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={t('screens.profile.postVideo')}
                  className="w-full max-h-80 object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/20 my-3" />

        <div className="flex items-center gap-6 px-3 py-2 rounded-full bg-gradient-to-r from-violet-50/70 to-sky-50/70 dark:from-white/5 dark:to-white/10">
          <button
            onClick={() => toggleLike()}
            className={cn(
              "flex items-center gap-2 transition-all duration-200 group",
              isLiked ? "text-pink-500" : "text-muted-foreground hover:text-pink-500"
            )}
            aria-label={t('screens.profile.likePost')}
          >
            <Heart className={cn("h-4 w-4 group-hover:scale-[1.05] transition-all", isLiked && "fill-current")} />
            <span className="text-sm font-medium">{post.likes_count}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-2 transition-all duration-200 group",
              showComments ? "text-blue-500" : "text-muted-foreground hover:text-blue-500"
            )}
            aria-label={t('screens.profile.comment')}
          >
            <MessageSquare className={cn("h-4 w-4 group-hover:scale-[1.05] transition-all", showComments && "fill-current")} />
            <span className="text-sm font-medium">{post.comments_count}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-muted-foreground hover:text-violet-500 transition-all duration-200 group"
            aria-label={t('screens.profile.share')}
          >
            <Share className="h-4 w-4 group-hover:scale-[1.05] transition-all" />
            <span className="text-sm font-medium">{post.shares_count}</span>
          </button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="space-y-3 pt-2">
            {comments.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2 px-1">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={getDisplayAvatarUrl(comment)} />
                      <AvatarFallback className="text-[10px]">
                        {(comment.display_name || '?')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-muted/50 rounded-xl px-3 py-2">
                        <span className="text-xs font-semibold text-foreground">{comment.display_name}</span>
                        <p className="text-sm text-foreground/90">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-2 px-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formatDate(comment.created_at)}</span>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-[10px] text-muted-foreground hover:text-destructive"
                          >
                            {translate('common.delete', 'Delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            {user && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                  placeholder={translate('profilePosts.commentPlaceholder', 'Write a comment...')}
                  className="flex-1 text-sm bg-muted/50 rounded-full px-4 py-2 border-0 outline-none focus:ring-1 focus:ring-primary/30"
                  disabled={isAddingComment}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isAddingComment}
                  className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary disabled:opacity-40 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
