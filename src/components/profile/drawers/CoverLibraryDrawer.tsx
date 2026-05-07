/**
 * VTID-02806 — Cover Library drawer.
 *
 * Two sections in one drawer:
 *
 *   A. Universal cover photo
 *      Single tile. Used by the gateway as a fallback when no
 *      activity-tagged photo matches an intent's category — and
 *      instead of an AI-generated image. Persists to
 *      profiles.universal_intent_cover_url.
 *
 *   B. Activity-specific photos
 *      Grid of category-tagged photos. Each row in
 *      user_intent_cover_library has its own image. When a user
 *      posts in a category for which they have a row, the gateway
 *      picks that photo (deterministic by intent_id seed when
 *      multiple rows match).
 *
 * Storage: every photo lives in the public `intent-covers` bucket,
 * partitioned by user-universal/{userId}/... and
 * user-library/{userId}/... prefixes.
 *
 * Auth model: browser-direct Supabase calls. RLS on
 * user_intent_cover_library restricts each user to their own rows;
 * profiles UPDATE is also gated by auth.uid() = user_id.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { notify, notifyError } from "@/lib/i18n-toast";
import {
  getIntentCategories,
  type IntentCategory,
} from "@/lib/intentApi";

interface CoverLibraryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LibraryRow {
  id: string;
  category: string;
  cover_url: string;
}

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];

function fileExtOf(file: File): string {
  return (file.name.split(".").pop() || "").toLowerCase();
}

function isHeicFile(file: File): boolean {
  const ext = fileExtOf(file);
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    ext === "heic" ||
    ext === "heif"
  );
}

async function uploadToIntentCovers(
  file: File,
  remotePath: string,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const { error } = await supabase.storage
    .from("intent-covers")
    .upload(remotePath, blob, { upsert: true, contentType: file.type });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from("intent-covers").getPublicUrl(remotePath);
  return publicUrl;
}

export function CoverLibraryDrawer({ open, onOpenChange }: CoverLibraryDrawerProps) {
  const { translate } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [universalUrl, setUniversalUrl] = useState<string | null>(null);
  const [universalUploading, setUniversalUploading] = useState(false);
  const universalInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<IntentCategory[]>([]);
  const [libraryRows, setLibraryRows] = useState<LibraryRow[]>([]);
  const [pendingCategory, setPendingCategory] = useState<string>("");
  const [libraryUploading, setLibraryUploading] = useState(false);
  const [libraryDeleting, setLibraryDeleting] = useState<string | null>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // Load profile + library + categories when the drawer opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) return;

      // Casts: universal_intent_cover_url + user_intent_cover_library
      // were added in migration VTID-02806 after the auto-generated
      // types.ts was last regenerated. Drop the casts the next time
      // `supabase gen types typescript` is run against the live schema.
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (
              col: string,
              val: string,
            ) => {
              maybeSingle: () => Promise<{ data: unknown }>;
              order: (
                col: string,
                opts: { ascending: boolean },
              ) => Promise<{ data: unknown }>;
            };
          };
        };
      };
      const [{ data: profile }, { data: rows }, cats] = await Promise.all([
        sb
          .from("profiles")
          .select("universal_intent_cover_url")
          .eq("user_id", uid)
          .maybeSingle(),
        sb
          .from("user_intent_cover_library")
          .select("id, category, cover_url")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        getIntentCategories().catch(() => [] as IntentCategory[]),
      ]);
      if (cancelled) return;
      setUniversalUrl(
        (profile as { universal_intent_cover_url?: string | null } | null)
          ?.universal_intent_cover_url ?? null,
      );
      setLibraryRows((rows ?? []) as LibraryRow[]);
      setCategories(cats);
    })().catch(() => {
      // Soft-fail — drawer still opens with empty state.
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Quick lookup of which categories already have at least one photo.
  const coveredCategories = useMemo(() => {
    return new Set(libraryRows.map((r) => r.category));
  }, [libraryRows]);

  // ── Universal section ────────────────────────────────────────────────

  const onUniversalUploadClick = () => universalInputRef.current?.click();

  const onUniversalFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (universalInputRef.current) universalInputRef.current.value = "";
    if (!file || !userId) return;
    if (isHeicFile(file)) {
      notifyError("toasts.profile.uploadFailed", "toasts.profile.heicheifFormatNotSupportedByBrowsers");
      return;
    }
    const ext = fileExtOf(file);
    if (!file.type.startsWith("image/") || !ALLOWED_EXTS.includes(ext)) {
      notifyError("toasts.profile.uploadFailed");
      return;
    }
    setUniversalUploading(true);
    try {
      const remotePath = `user-universal/${userId}/${Date.now()}.${ext}`;
      const publicUrl = await uploadToIntentCovers(file, remotePath);
      type ProfilesUpdate = {
        from: (t: string) => {
          update: (patch: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: unknown }>;
          };
        };
      };
      const { error } = await (supabase as unknown as ProfilesUpdate)
        .from("profiles")
        .update({ universal_intent_cover_url: publicUrl })
        .eq("user_id", userId);
      if (error) throw error;
      setUniversalUrl(publicUrl);
      notify("toasts.profile.universalCoverUploaded");
    } catch {
      notifyError("toasts.profile.uploadFailed");
    } finally {
      setUniversalUploading(false);
    }
  };

  const onUniversalRemove = async () => {
    if (!userId || !universalUrl) return;
    setUniversalUploading(true);
    try {
      type ProfilesUpdate = {
        from: (t: string) => {
          update: (patch: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: unknown }>;
          };
        };
      };
      const { error } = await (supabase as unknown as ProfilesUpdate)
        .from("profiles")
        .update({ universal_intent_cover_url: null })
        .eq("user_id", userId);
      if (error) throw error;
      setUniversalUrl(null);
      notify("toasts.profile.universalCoverRemoved");
    } catch {
      notifyError("toasts.profile.saveFailed");
    } finally {
      setUniversalUploading(false);
    }
  };

  // ── Library section ──────────────────────────────────────────────────

  const onLibraryAddClick = () => {
    if (!pendingCategory) {
      notifyError("toasts.profile.categoryRequired");
      return;
    }
    libraryInputRef.current?.click();
  };

  const onLibraryFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (libraryInputRef.current) libraryInputRef.current.value = "";
    if (!file || !userId || !pendingCategory) return;
    if (isHeicFile(file)) {
      notifyError("toasts.profile.uploadFailed", "toasts.profile.heicheifFormatNotSupportedByBrowsers");
      return;
    }
    const ext = fileExtOf(file);
    if (!file.type.startsWith("image/") || !ALLOWED_EXTS.includes(ext)) {
      notifyError("toasts.profile.uploadFailed");
      return;
    }
    setLibraryUploading(true);
    try {
      const photoId = crypto.randomUUID();
      const remotePath = `user-library/${userId}/${photoId}.${ext}`;
      const publicUrl = await uploadToIntentCovers(file, remotePath);
      type LibraryInsert = {
        from: (t: string) => {
          insert: (row: Record<string, unknown>) => {
            select: (cols: string) => {
              single: () => Promise<{ data: LibraryRow; error: unknown }>;
            };
          };
        };
      };
      const { data: inserted, error } = await (
        supabase as unknown as LibraryInsert
      )
        .from("user_intent_cover_library")
        .insert({
          user_id: userId,
          category: pendingCategory,
          cover_url: publicUrl,
        })
        .select("id, category, cover_url")
        .single();
      if (error) throw error;
      setLibraryRows((rows) => [inserted as LibraryRow, ...rows]);
      setPendingCategory("");
      notify("toasts.profile.libraryPhotoUploaded");
    } catch {
      notifyError("toasts.profile.uploadFailed");
    } finally {
      setLibraryUploading(false);
    }
  };

  const onLibraryRemove = async (row: LibraryRow) => {
    if (!userId) return;
    setLibraryDeleting(row.id);
    try {
      type LibraryDelete = {
        from: (t: string) => {
          delete: () => {
            eq: (
              col: string,
              val: string,
            ) => {
              eq: (
                col: string,
                val: string,
              ) => Promise<{ error: unknown }>;
            };
          };
        };
      };
      const { error } = await (supabase as unknown as LibraryDelete)
        .from("user_intent_cover_library")
        .delete()
        .eq("id", row.id)
        .eq("user_id", userId);
      if (error) throw error;
      setLibraryRows((rows) => rows.filter((r) => r.id !== row.id));
      notify("toasts.profile.libraryPhotoRemoved");
    } catch {
      notifyError("toasts.profile.saveFailed");
    } finally {
      setLibraryDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {translate("profileEditor.coverLibrary.drawerTitle")}
          </DialogTitle>
        </DialogHeader>

        <input
          ref={universalInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={onUniversalFileSelected}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={onLibraryFileSelected}
        />

        {/* Section A — Universal */}
        <section className="space-y-3 pt-2">
          <div>
            <h3 className="text-sm font-semibold">
              {translate("profileEditor.coverLibrary.universalSection")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {translate("profileEditor.coverLibrary.universalDescription")}
            </p>
          </div>

          <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-border bg-muted">
            {universalUrl ? (
              <img
                src={universalUrl}
                alt={translate("profileEditor.coverLibrary.universalSection")}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Upload className="h-6 w-6" />
                <p className="text-xs">
                  {translate("profileEditor.coverLibrary.universalEmptyHint")}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUniversalUploadClick}
              disabled={universalUploading}
            >
              {universalUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Upload className="h-4 w-4 mr-1.5" />
              )}
              {universalUrl
                ? translate("profileEditor.coverLibrary.universalReplace")
                : translate("profileEditor.coverLibrary.universalAdd")}
            </Button>
            {universalUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onUniversalRemove}
                disabled={universalUploading}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {translate("profileEditor.coverLibrary.universalRemove")}
              </Button>
            )}
          </div>
        </section>

        {/* Section B — Library */}
        <section className="space-y-3 pt-6 border-t mt-4">
          <div>
            <h3 className="text-sm font-semibold">
              {translate("profileEditor.coverLibrary.librarySection")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {translate("profileEditor.coverLibrary.libraryDescription")}
            </p>
          </div>

          {/* Add row: category dropdown + upload */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label
                htmlFor="cover-library-category"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                {translate("profileEditor.coverLibrary.libraryCategoryLabel")}
              </Label>
              <select
                id="cover-library-category"
                value={pendingCategory}
                onChange={(e) => setPendingCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="">
                  {translate(
                    "profileEditor.coverLibrary.libraryCategoryPlaceholder",
                  )}
                </option>
                {categories.map((c) => (
                  <option key={c.category_key} value={c.category_key}>
                    {coveredCategories.has(c.category_key) ? "✅ " : ""}
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onLibraryAddClick}
              disabled={libraryUploading || !pendingCategory}
            >
              {libraryUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              {translate("profileEditor.coverLibrary.libraryAddPhoto")}
            </Button>
          </div>

          {/* Grid */}
          {libraryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {translate("profileEditor.coverLibrary.libraryEmpty")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {libraryRows.map((row) => {
                const cat = categories.find(
                  (c) => c.category_key === row.category,
                );
                const label = cat?.label ?? row.category;
                return (
                  <div
                    key={row.id}
                    className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-[16/10] group"
                  >
                    <img
                      src={row.cover_url}
                      alt={label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-black/50 text-white text-[11px] truncate">
                      {label}
                    </div>
                    <button
                      type="button"
                      aria-label={translate(
                        "profileEditor.coverLibrary.libraryRemoveButton",
                      )}
                      onClick={() => onLibraryRemove(row)}
                      disabled={libraryDeleting === row.id}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      {libraryDeleting === row.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="pt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {translate("profileEditor.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
