import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { useGroupPosts } from "@/hooks/useGroupPosts";
import { useAuth } from "@/context/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

import { formatDistanceToNow } from '@/lib/locale-format';
interface GroupFeedProps {
  groupId: string;
  isMember: boolean;
}

export function GroupFeed({ groupId, isMember }: GroupFeedProps) {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const { posts, isLoading, createPost, deletePost } = useGroupPosts(groupId);
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsSubmitting(true);
    try {
      await createPost.mutateAsync({ content: newPostContent.trim() });
      setNewPostContent("");
      toast({ title: translate('groupFeed.messageSent', 'Message sent') });
    } catch (err: any) {
      toast({ title: translate('groupFeed.error', 'Error'), description: err.message || translate('groupFeed.errorSend', 'Failed to send message'), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm(translate('groupFeed.deleteConfirm', 'Delete this message?'))) return;
    try {
      await deletePost.mutateAsync(messageId);
      toast({ title: translate('groupFeed.messageDeleted', 'Message deleted') });
    } catch {
      toast({ title: translate('groupFeed.error', 'Error'), description: translate('groupFeed.errorDelete', 'Failed to delete message'), variant: "destructive" });
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
              placeholder={translate('groupFeed.placeholder', 'Share something with the group...')}
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
                {translate('groupFeed.post', 'Post')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages List */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-medium mb-1">{translate('groupFeed.noMessages', 'No messages yet')}</h3>
            <p className="text-sm text-muted-foreground">
              {isMember ? translate('groupFeed.beFirst', 'Be the first to post in this group!') : translate('groupFeed.joinToPost', 'Join the group to start posting.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        posts.map(post => (
          <Card key={post.id}>
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
                {user?.id === post.sender_id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>

              {/* Content */}
              <p className="text-sm text-foreground whitespace-pre-wrap">{post.body}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
