/**
 * VTID-03319 — moderation, safety & ownership controls on community-post cards.
 *
 * The kebab adapts to who is looking:
 *   - Author (own post)  → Edit / Delete (own content management).
 *   - Member (other's)   → Report (opens a reason sheet) + personal feed
 *                          controls: Hide post, Mute author, Block author.
 *   - Staff/Admin        → additionally Remove post / Ban author (inline
 *                          takedown via SECURITY DEFINER RPCs that re-check
 *                          admin server-side).
 *
 * Reports write to content_reports (triaged in /admin/community). Hide/mute/
 * block write to per-user tables (RLS-scoped to auth.uid()) and only affect the
 * current user's own feed. KebabMenu stops click propagation so opening the
 * menu doesn't navigate to the author profile.
 *
 * VTID-03468: the menu is source-aware. The feed merges two backing tables —
 * profile_posts and media_uploads — and every action here targets whichever one
 * the card came from (see the `source` prop). Actions with no media equivalent
 * (inline Edit, and the staff `moderate_profile_post` takedown) are hidden on
 * media cards rather than silently written against the wrong table.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, Trash2, Ban, EyeOff, VolumeX, UserX, Pencil } from "lucide-react";
import { KebabMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu-kebab";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useRole } from "@/hooks/useRole";
import { useProfilePosts } from "@/hooks/useProfilePosts";
import { notifySuccess, notifyError, t } from "@/lib/i18n-toast";

// Reason values are stored verbatim in content_reports.reason and surfaced in
// the admin review queue (ReportedContent.tsx). Kept in sync with that queue's
// badge map (harassment / spam / violence / misinformation / other known).
const REPORT_REASONS = [
  { value: "sexual", labelKey: "screens.home.reportSexual" },
  { value: "hate", labelKey: "screens.home.reportHate" },
  { value: "harassment", labelKey: "screens.home.reportHarassment" },
  { value: "spam", labelKey: "screens.home.reportSpam" },
  { value: "misinformation", labelKey: "screens.home.reportMisinfo" },
  { value: "violence", labelKey: "screens.home.reportViolence" },
  { value: "other", labelKey: "screens.home.reportOther" },
] as const;

export function NewsPostModerationMenu({
  postId,
  authorId,
  authorName,
  postContent = "",
  source = "post",
}: {
  postId: string;
  authorId: string;
  authorName: string;
  postContent?: string;
  /**
   * Which table backs this card — `profile_posts` ("post") or `media_uploads`
   * ("media"). VTID-03468: the feed merges both, but this menu was only ever
   * rendered for "post", so an author had no way to delete (or anyone to
   * report) their own uploaded community video. The two live in different
   * tables with different RLS, so every action below has to target the right
   * one rather than assuming profile_posts.
   */
  source?: "post" | "media";
}) {
  const { user } = useAuth();
  const { isExafyAdmin } = useTenant();
  const { currentRole } = useRole();
  const { updatePost, deletePost } = useProfilePosts();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(postContent);

  const canModerate = isExafyAdmin || currentRole === "admin" || currentRole === "staff";
  const isOwnPost = user?.id === authorId;

  const refreshFeed = () => queryClient.invalidateQueries({ queryKey: ["all-news-feed"] });

  const submitReport = async () => {
    if (!user?.id || !reportReason || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("content_reports").insert({
        reporter_user_id: user.id,
        // Must match the backing table so the admin review queue resolves the
        // reported item (VTID-03468).
        content_type: source === "media" ? "media_upload" : "profile_post",
        content_id: postId,
        reason: reportReason,
        description: reportDetails.trim() || null,
      });
      if (error) throw error;
      notifySuccess("screens.home.reportThanks");
      setReportOpen(false);
      setReportReason(null);
      setReportDetails("");
    } catch {
      notifyError("screens.home.reportFailed");
    } finally {
      setBusy(false);
    }
  };

  // Per-user feed controls. upsert keeps the action idempotent (re-hiding an
  // already-hidden post is a no-op rather than a PK-violation error).
  const hidePost = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("user_hidden_posts" as never)
        .upsert({ user_id: user.id, post_id: postId } as never);
      if (error) throw error;
      notifySuccess("screens.home.postHidden");
      refreshFeed();
    } catch {
      notifyError("screens.home.modFailed");
    } finally {
      setBusy(false);
    }
  };

  const muteAuthor = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("user_muted_authors" as never)
        .upsert({ user_id: user.id, author_id: authorId } as never);
      if (error) throw error;
      notifySuccess("screens.home.authorMuted", undefined, { name: authorName });
      refreshFeed();
    } catch {
      notifyError("screens.home.modFailed");
    } finally {
      setBusy(false);
    }
  };

  const blockAuthor = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("user_blocked_authors" as never)
        .upsert({ user_id: user.id, author_id: authorId } as never);
      if (error) throw error;
      notifySuccess("screens.home.authorBlocked", undefined, { name: authorName });
      refreshFeed();
    } catch {
      notifyError("screens.home.modFailed");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (busy || !editContent.trim()) return;
    setBusy(true);
    try {
      await updatePost.mutateAsync({ postId, content: editContent.trim() });
      notifySuccess("screens.home.postUpdated");
      setEditOpen(false);
    } catch {
      notifyError("screens.home.modFailed");
    } finally {
      setBusy(false);
    }
  };

  const removeOwnPost = async () => {
    if (busy) return;
    // i18n-allow-next-line: confirm message sourced from the i18n catalog
    if (!window.confirm(t("screens.home.deletePostConfirm"))) return;
    setBusy(true);
    try {
      if (source === "media") {
        // media_uploads, not profile_posts. Scoped to the owner (matching the
        // "Users can delete own media uploads" RLS policy) and read back, so a
        // zero-row delete raises instead of reporting a false success — same
        // contract as useProfilePosts.deletePost (VTID-03468).
        const { data, error } = await supabase
          .from("media_uploads")
          .delete()
          .eq("id", postId)
          .eq("user_id", authorId)
          .select("id");
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("MEDIA_NOT_DELETED");
        refreshFeed();
      } else {
        await deletePost.mutateAsync(postId);
      }
      notifySuccess("screens.home.postDeleted");
    } catch {
      notifyError("screens.home.modFailed");
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

  return (
    <>
      <KebabMenu>
        {isOwnPost ? (
          <>
            {source === "post" && (
              <DropdownMenuItem
                onClick={() => {
                  setEditContent(postContent);
                  setEditOpen(true);
                }}
                className="text-sm"
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("screens.home.editPost")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={removeOwnPost}
              className="text-sm text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("screens.home.deletePost")}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => setReportOpen(true)} className="text-sm">
              <Flag className="mr-2 h-4 w-4" />
              {t("screens.home.reportPost")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={hidePost} className="text-sm">
              <EyeOff className="mr-2 h-4 w-4" />
              {t("screens.home.hidePost")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={muteAuthor} className="text-sm">
              <VolumeX className="mr-2 h-4 w-4" />
              {t("screens.home.muteAuthor")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={blockAuthor} className="text-sm">
              <UserX className="mr-2 h-4 w-4" />
              {t("screens.home.blockAuthor")}
            </DropdownMenuItem>
          </>
        )}

        {canModerate && !isOwnPost && source === "post" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={removePost} className="text-sm text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t("screens.home.modRemove")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={banAuthor} className="text-sm text-destructive focus:text-destructive">
              <Ban className="mr-2 h-4 w-4" />
              {t("screens.home.modBan")}
            </DropdownMenuItem>
          </>
        )}
      </KebabMenu>

      {/* Report reason sheet — keeps the kebab clean and makes reporting intentional. */}
      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>{t("screens.home.reportSheetTitle")}</SheetTitle>
            <SheetDescription>{t("screens.home.reportSheetDesc")}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-1">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReportReason(r.value)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  reportReason === r.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:bg-accent"
                }`}
              >
                <Flag className="h-4 w-4 shrink-0 text-muted-foreground" />
                {t(r.labelKey)}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="report-details" className="text-sm">
              {t("screens.home.reportDetailsLabel")}
            </Label>
            <Textarea
              id="report-details"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder={t("screens.home.reportDetailsPlaceholder")}
              className="min-h-[80px]"
              maxLength={500}
            />
          </div>

          <SheetFooter className="mt-4 flex-row justify-end gap-2">
            <Button variant="ghost" onClick={() => setReportOpen(false)} disabled={busy}>
              {t("screens.home.reportCancel")}
            </Button>
            <Button onClick={submitReport} disabled={busy || !reportReason}>
              {t("screens.home.reportSubmit")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Author inline edit (text content). */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("screens.home.editPostTitle")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[120px]"
            maxLength={2000}
          />
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={busy}>
              {t("screens.home.reportCancel")}
            </Button>
            <Button onClick={saveEdit} disabled={busy || !editContent.trim()}>
              {t("screens.home.editPostSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
