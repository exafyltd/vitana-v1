/**
 * VTID-03319 Phase 1 — moderation controls on community-post feed cards.
 *
 * Every member can REPORT a post (writes to content_reports). Staff/admins
 * additionally get inline takedown actions: remove the post or ban the author
 * (both via SECURITY DEFINER RPCs that re-check admin server-side). Lives inside
 * the clickable post card; KebabMenu stops click propagation so opening the menu
 * doesn't navigate to the author profile.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, Trash2, Ban } from "lucide-react";
import { KebabMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu-kebab";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useRole } from "@/hooks/useRole";
import { notifySuccess, notifyError, t } from "@/lib/i18n-toast";

type ReportReason = "sexual" | "hate" | "spam" | "other";

export function NewsPostModerationMenu({
  postId,
  authorId,
  authorName,
}: {
  postId: string;
  authorId: string;
  authorName: string;
}) {
  const { user } = useAuth();
  const { isExafyAdmin } = useTenant();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const canModerate = isExafyAdmin || currentRole === "admin" || currentRole === "staff";

  const refreshFeed = () => queryClient.invalidateQueries({ queryKey: ["all-news-feed"] });

  const report = async (reason: ReportReason) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("content_reports").insert({
        reporter_user_id: user.id,
        content_type: "profile_post",
        content_id: postId,
        reason,
      });
      if (error) throw error;
      notifySuccess("screens.home.reportThanks");
    } catch {
      notifyError("screens.home.reportFailed");
    } finally {
      setBusy(false);
    }
  };

  const removePost = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("moderate_profile_post", {
        p_post_id: postId,
        p_status: "removed",
      });
      if (error) throw error;
      notifySuccess("screens.home.modRemoved");
      refreshFeed();
    } catch {
      notifyError("screens.home.modFailed");
    } finally {
      setBusy(false);
    }
  };

  const banAuthor = async () => {
    if (busy) return;
    // i18n-allow-next-line: confirm message sourced from the i18n catalog
    if (!window.confirm(t("screens.home.modBanConfirm", { name: authorName }))) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("set_user_suspension", {
        p_user_id: authorId,
        p_reason: "feed_moderation",
      });
      if (error) throw error;
      notifySuccess("screens.home.modBanned");
      refreshFeed();
    } catch {
      notifyError("screens.home.modFailed");
    } finally {
      setBusy(false);
    }
  };

  // Reporting your own post is pointless; still allow moderators to act.
  const isOwnPost = user?.id === authorId;

  return (
    <KebabMenu>
      {!isOwnPost && (
        <>
          <DropdownMenuItem onClick={() => report("sexual")} className="text-sm">
            <Flag className="mr-2 h-4 w-4" />
            {t("screens.home.reportSexual")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => report("hate")} className="text-sm">
            <Flag className="mr-2 h-4 w-4" />
            {t("screens.home.reportHate")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => report("spam")} className="text-sm">
            <Flag className="mr-2 h-4 w-4" />
            {t("screens.home.reportSpam")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => report("other")} className="text-sm">
            <Flag className="mr-2 h-4 w-4" />
            {t("screens.home.reportOther")}
          </DropdownMenuItem>
        </>
      )}

      {canModerate && (
        <>
          {!isOwnPost && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={removePost} className="text-sm text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            {t("screens.home.modRemove")}
          </DropdownMenuItem>
          {!isOwnPost && (
            <DropdownMenuItem onClick={banAuthor} className="text-sm text-destructive focus:text-destructive">
              <Ban className="mr-2 h-4 w-4" />
              {t("screens.home.modBan")}
            </DropdownMenuItem>
          )}
        </>
      )}
    </KebabMenu>
  );
}
