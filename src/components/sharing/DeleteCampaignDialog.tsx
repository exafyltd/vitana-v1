import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from "@/components/ui/responsive-confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { applyReplacements } from "@/lib/i18n-helpers";

interface DeleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  campaignName: string;
  isDraft: boolean;
}

export function DeleteCampaignDialog({
  open,
  onOpenChange,
  onConfirm,
  campaignName,
  isDraft,
}: DeleteCampaignDialogProps) {
  const { translate } = useTranslation();
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const handleConfirm = () => {
    if (dontAskAgain) {
      localStorage.setItem("vitana_skip_draft_delete_confirm", "true");
    }
    onConfirm();
    onOpenChange(false);
  };

  return (
    <ResponsiveConfirmDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveConfirmDialogContent className={cn(
        "rounded-2xl border-2",
        "bg-card/85 backdrop-blur-xl",
        "shadow-xl shadow-status-error/10",
        "max-w-md"
      )}>
        <ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogTitle className="text-xl font-bold text-foreground">
            {translate('campaigns.delete.title', 'Delete Campaign?')}
          </ResponsiveConfirmDialogTitle>
          <ResponsiveConfirmDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {applyReplacements(translate('campaigns.delete.description', 'Deleting "{name}" will permanently remove all related drafts and analytics. This action can\'t be undone.'), { name: campaignName })}
          </ResponsiveConfirmDialogDescription>
        </ResponsiveConfirmDialogHeader>

        {isDraft && (
          <div className="flex items-center gap-2 py-3">
            <Checkbox
              id="dont-ask"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
            />
            <Label 
              htmlFor="dont-ask" 
              className="text-xs text-muted-foreground cursor-pointer"
            >
              {translate('campaigns.delete.dontAskAgain', "Don't ask me again for draft campaigns")}
            </Label>
          </div>
        )}

        <ResponsiveConfirmDialogFooter className="gap-3 sm:gap-3">
          <ResponsiveConfirmDialogCancel className={cn(
            "rounded-lg px-4",
            "bg-muted hover:bg-muted",
            "text-muted-foreground border-border"
          )}>
            {translate('buttons.cancel', 'Cancel')}
          </ResponsiveConfirmDialogCancel>
          <ResponsiveConfirmDialogAction
            onClick={handleConfirm}
            className={cn(
              "rounded-lg px-4",
              "bg-status-error hover:bg-status-error",
              "text-primary-foreground shadow-lg shadow-status-error/15",
              "hover:shadow-xl hover:shadow-status-error/20",
              "transition-all duration-200"
            )}
          >
            {translate('campaigns.delete.deletePermanently', 'Delete Permanently')}
          </ResponsiveConfirmDialogAction>
        </ResponsiveConfirmDialogFooter>
      </ResponsiveConfirmDialogContent>
    </ResponsiveConfirmDialog>
  );
}
