/**
 * "Liked by" list for a News Feed post/video — opened by tapping the like
 * count in CommunityPostCard. Fetches lazily (only while open) and lets the
 * viewer jump to any liker's profile.
 */
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { t } from "@/lib/i18n-toast";
import { usePostLikers } from "@/hooks/usePostLikers";
import type { FeedPostSource } from "@/hooks/useFeedPostInteractions";

export function PostLikersDialog({
  source,
  postId,
  open,
  onOpenChange,
}: {
  source: FeedPostSource;
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: likers, isLoading } = usePostLikers(source, postId, open);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent onClick={(e) => e.stopPropagation()}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("screens.home.likesTitle")}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !likers || likers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("screens.home.noLikesYet")}
            </p>
          ) : (
            <div className="space-y-1">
              {likers.map((liker) => (
                <button
                  key={liker.user_id}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/u/${liker.user_id}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {liker.avatar_url && <AvatarImage src={liker.avatar_url} alt="" />}
                    <AvatarFallback className="text-xs">
                      {(liker.display_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium text-foreground">
                    {liker.display_name || t("screens.home.communityMember")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
