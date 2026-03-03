import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageSquare, Trash2, Send, X } from "lucide-react";
import { useGroupPosts, useGroupPostComments, GroupPost } from "@/hooks/useGroupPosts";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface GroupFeedProps {
  groupId: string;
  isMember: boolean;
}

export function GroupFeed({ groupId, isMember }: GroupFeedProps) {
  const { user } = useAuth();
  const { posts, isLoading, createPost, deletePost, toggleLike } = useGroupPosts(groupId);
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsSubmitting(true);
    try {
      await createPost.mutateAsync({ content: newPostContent.trim() });
      setNewPostContent("");
      toast({ title: "Post published" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create post", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    try {
      await deletePost.mutateAsync(postId);
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compose Area */}
      {isMember && user && (
        <Card>
          <CardContent className="pt-4">
            <Textarea
              placeholder="Share something with the group..."
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-1"
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || isSubmitting}
              >
                <Send className="h-4 w-4 mr-1" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-medium mb-1">No posts yet</h3>
            <p className="text-sm text-muted-foreground">
              {isMember ? "Be the first to post in this group!" : "Join the group to start posting."}
            </p>
          </CardContent>
        </Card>
      ) : (
        posts.map(post => (
          <GroupPostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            onDelete={handleDelete}
            onToggleLike={() => toggleLike.mutate(post.id)}
            formatDate={formatDate}
          />
        ))
      )}
    </div>
  );
}

// ─── Single Post Card ───
function GroupPostCard({
  post,
  currentUserId,
  onDelete,
  onToggleLike,
  formatDate,
}: {
  post: GroupPost;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onToggleLike: () => void;
  formatDate: (d: string) => string;
}) {
  const [showComments, setShowComments] = useState(false);

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        {/* Author header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author_avatar} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {(post.author_name || "?")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{post.author_name}</p>
              <p className="text-[11px] text-muted-foreground">{formatDate(post.created_at)}</p>
            </div>
          </div>
          {currentUserId === post.user_id && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(post.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>

        {post.image_url && (
          <img src={post.image_url} alt="" className="rounded-lg w-full max-h-80 object-cover" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-1 border-t border-border/50">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors py-1"
            onClick={onToggleLike}
          >
            <Heart className="h-4 w-4" />
            {post.likes_count > 0 && <span>{post.likes_count}</span>}
          </button>
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors py-1"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="h-4 w-4" />
            {post.comments_count > 0 && <span>{post.comments_count}</span>}
          </button>
        </div>

        {/* Comments Section */}
        {showComments && <CommentsSection postId={post.id} />}
      </CardContent>
    </Card>
  );
}

// ─── Comments Section ───
function CommentsSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const { comments, isLoading, addComment, deleteComment } = useGroupPostComments(postId);
  const [newComment, setNewComment] = useState("");

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment.mutateAsync(newComment.trim());
      setNewComment("");
    } catch {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border/30">
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        comments.map(c => (
          <div key={c.id} className="flex items-start gap-2 py-1">
            <Avatar className="h-6 w-6 mt-0.5">
              <AvatarImage src={c.author_avatar} />
              <AvatarFallback className="text-[10px] bg-muted">
                {(c.author_name || "?")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs">
                <span className="font-medium">{c.author_name}</span>{" "}
                <span className="text-muted-foreground">{c.content}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
              </p>
            </div>
            {user?.id === c.user_id && (
              <button
                className="text-destructive hover:text-destructive/80 p-0.5"
                onClick={() => deleteComment.mutate(c.id)}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))
      )}
      
      {user && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 text-sm bg-muted/50 rounded-full px-3 py-1.5 border-0 focus:outline-none focus:ring-1 focus:ring-primary"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSubmit} disabled={!newComment.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
