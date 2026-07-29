/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE (Chunk 6) — report a listing to admins.
 */

import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { reportCommunityListing, type ListingReportReason } from "@/hooks/useCommunityMarketplace";
import { notify, notifyError, t } from "@/lib/i18n-toast";

const REASON_LABEL_KEYS: Record<ListingReportReason, string> = {
  prohibited_item: "screens.communityMarketplace.reportReasonProhibited",
  counterfeit: "screens.communityMarketplace.reportReasonCounterfeit",
  misleading: "screens.communityMarketplace.reportReasonMisleading",
  scam: "screens.communityMarketplace.reportReasonScam",
  spam: "screens.communityMarketplace.reportReasonSpam",
  offensive: "screens.communityMarketplace.reportReasonOffensive",
  other: "screens.communityMarketplace.reportReasonOther",
};

const REASON_ORDER: ListingReportReason[] = [
  "prohibited_item",
  "counterfeit",
  "misleading",
  "scam",
  "spam",
  "offensive",
  "other",
];

interface ReportListingDialogProps {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportListingDialog({ listingId, open, onOpenChange }: ReportListingDialogProps) {
  const [reason, setReason] = useState<ListingReportReason>("other");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await reportCommunityListing(listingId, {
        report_reason: reason,
        report_note: note.trim() || undefined,
      });
      notify("toasts.communityMarketplace.reportSubmitted");
      onOpenChange(false);
      setReason("other");
      setNote("");
    } catch (err) {
      const code = (err as (Error & { code?: string }) | undefined)?.code;
      notifyError(
        code === "already_reported"
          ? "toasts.communityMarketplace.reportAlreadySubmitted"
          : "toasts.communityMarketplace.reportFailed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("screens.communityMarketplace.reportDialogTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("screens.communityMarketplace.reportDialogDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4">
          <RadioGroup
            value={reason}
            onValueChange={(v) => setReason(v as ListingReportReason)}
            className="space-y-2"
          >
            {REASON_ORDER.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <RadioGroupItem value={key} id={`report-reason-${key}`} />
                <Label htmlFor={`report-reason-${key}`} className="text-sm font-normal cursor-pointer">
                  {t(REASON_LABEL_KEYS[key])}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="report-note" className="text-sm">
              {t("screens.communityMarketplace.reportNoteLabel")}
            </Label>
            <Textarea
              id="report-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder={t("screens.communityMarketplace.reportNotePlaceholder")}
              rows={3}
            />
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("screens.communityMarketplace.reportCancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {t("screens.communityMarketplace.reportSubmit")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
