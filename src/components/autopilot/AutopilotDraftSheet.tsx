/**
 * VTID-04504 (Community Autopilot CA-4): the preview a member sees before a
 * drafted suggestion does anything. Vitanaland wrote the text; the member reads
 * it, edits it if they like, and then decides. Nothing is posted or sent from
 * here — Confirm hands the reviewed text back to the Autopilot run.
 */
import { useEffect, useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw } from "lucide-react";
import { t } from "@/lib/i18n-toast";

export interface DraftSheetItem {
  id: string;
  title: string;
  kind: string;
}

interface AutopilotDraftSheetProps {
  item: DraftSheetItem | null;
  loadDraft: (id: string, opts?: { regenerate?: boolean }) => Promise<{ ok: boolean; draft?: string } | null>;
  onConfirm: (id: string, text: string) => void;
  onSkip: (id: string) => void;
}

const TITLE_KEY: Record<string, string> = {
  post_to_feed: "autopilot.draft.titlePost",
  send_chat_message: "autopilot.draft.titleMessage",
  media_upload: "autopilot.draft.titleCaption",
};

const CONFIRM_KEY: Record<string, string> = {
  post_to_feed: "autopilot.draft.confirmPost",
  send_chat_message: "autopilot.draft.confirmMessage",
  media_upload: "autopilot.draft.confirmCaption",
};

export function AutopilotDraftSheet({ item, loadDraft, onConfirm, onSkip }: AutopilotDraftSheetProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = async (regenerate = false) => {
    if (!item) return;
    setLoading(true);
    setFailed(false);
    const r = await loadDraft(item.id, { regenerate });
    if (r?.ok && r.draft) setText(r.draft);
    else setFailed(true);
    setLoading(false);
  };

  useEffect(() => {
    setText("");
    if (item) void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item) return null;
  const trimmed = text.trim();

  return (
    <ResponsiveDialog open={!!item} onOpenChange={(open) => { if (!open) onSkip(item.id); }}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(TITLE_KEY[item.kind] ?? "autopilot.draft.titlePost")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-start">{item.title}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground text-start">{t("autopilot.draft.hint")}</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("autopilot.draft.loading")}
            </div>
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("autopilot.draft.placeholder")}
              rows={6}
              className="text-start"
              data-testid="autopilot-draft-text"
            />
          )}
          {failed && !loading && (
            <p className="text-xs text-muted-foreground text-start">{t("autopilot.draft.failed")}</p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void load(true)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("autopilot.draft.regenerate")}
          </Button>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onSkip(item.id)}>
            {t("autopilot.draft.skip")}
          </Button>
          <Button
            className="flex-1"
            disabled={loading || (item.kind !== "media_upload" && !trimmed)}
            onClick={() => onConfirm(item.id, trimmed)}
            data-testid="autopilot-draft-confirm"
          >
            {t(CONFIRM_KEY[item.kind] ?? "autopilot.draft.confirmPost")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
