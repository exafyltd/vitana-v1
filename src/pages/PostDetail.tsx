/**
 * Single community post / video detail — the deep-link target for like &
 * comment notifications (notification data.url = `/post/<source>/<id>`).
 *
 * Fetches the one post (profile_posts) or video (media_uploads) by id and
 * renders the exact same interactive CommunityPostCard the News feed uses, so
 * the recipient lands on — and can like/comment on — the specific post that was
 * liked or commented, instead of a generic profile or feed.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CommunityPostCard } from "@/components/home/CommunityPostCard";
import { t } from "@/lib/i18n-toast";
import type { PostFeedItem } from "@/lib/news-feed-ranker";

async function fetchAuthor(userId: string): Promise<{ name: string; avatar: string | null }> {
  const { data } = await supabase
    .from("global_community_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    name: (data as { display_name?: string | null } | null)?.display_name || t("screens.home.communityMember"),
    avatar: (data as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  };
}

// Builds the same PostFeedItem shape useAllNewsFeed produces, for one item.
async function fetchPost(source: "post" | "media", id: string): Promise<PostFeedItem | null> {
  if (source === "media") {
    const { data, error } = await supabase
      .from("media_uploads")
      .select("id, user_id, title, description, file_url, thumbnail_url, likes_count, comments_count, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Record<string, any>;
    const author = await fetchAuthor(row.user_id);
    return {
      id: `media-${row.id}`, kind: "post", source: "media", post_id: row.id, user_id: row.user_id,
      author_name: author.name, author_avatar: author.avatar,
      content: row.title || row.description || "", image_url: row.thumbnail_url ?? null,
      video_url: row.file_url ?? null, likes_count: Number(row.likes_count) || 0,
      comments_count: Number(row.comments_count) || 0, followed: false, tags: [],
      published_at: row.created_at,
    };
  }
  // Member post: select * so a not-yet-migrated optional column (e.g. video_url) never errors.
  const { data, error } = await supabase
    .from("profile_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, any>;
  const author = await fetchAuthor(row.user_id);
  return {
    id: `post-${row.id}`, kind: "post", source: "post", post_id: row.id, user_id: row.user_id,
    author_name: author.name, author_avatar: author.avatar,
    content: row.content ?? "", image_url: row.image_url ?? null, video_url: row.video_url ?? null,
    likes_count: Number(row.likes_count) || 0, comments_count: Number(row.comments_count) || 0,
    followed: false, tags: [], published_at: row.created_at,
  };
}

export default function PostDetail() {
  const { source, id } = useParams<{ source: string; id: string }>();
  const navigate = useNavigate();
  const src: "post" | "media" = source === "media" ? "media" : "post";

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["post-detail", src, id],
    enabled: !!id,
    queryFn: () => fetchPost(src, id!),
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/home")}
          aria-label={t("screens.postDetail.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{t("screens.postDetail.title")}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !item ? (
        <p className="py-20 text-center text-muted-foreground">{t("screens.postDetail.notFound")}</p>
      ) : (
        <CommunityPostCard item={item} />
      )}
    </div>
  );
}
