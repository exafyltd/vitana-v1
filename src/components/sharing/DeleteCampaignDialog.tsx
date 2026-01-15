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
        "bg-white/85 backdrop-blur-xl",
        "shadow-xl shadow-red-100/50",
        "max-w-md"
      )}>
        <ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogTitle className="text-xl font-bold text-gray-900">
            Delete Campaign?
          </ResponsiveConfirmDialogTitle>
          <ResponsiveConfirmDialogDescription className="text-sm text-gray-600 leading-relaxed">
            Deleting <span className="font-semibold text-gray-900">"{campaignName}"</span> will 
            permanently remove all related drafts and analytics. This action can't be undone.
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
              className="text-xs text-gray-600 cursor-pointer"
            >
              Don't ask me again for draft campaigns
            </Label>
          </div>
        )}

        <ResponsiveConfirmDialogFooter className="gap-3 sm:gap-3">
          <ResponsiveConfirmDialogCancel className={cn(
            "rounded-lg px-4",
            "bg-gray-100 hover:bg-gray-200",
            "text-gray-700 border-gray-300"
          )}>
            Cancel
          </ResponsiveConfirmDialogCancel>
          <ResponsiveConfirmDialogAction
            onClick={handleConfirm}
            className={cn(
              "rounded-lg px-4",
              "bg-red-600 hover:bg-red-700",
              "text-white shadow-lg shadow-red-200/50",
              "hover:shadow-xl hover:shadow-red-300/50",
              "transition-all duration-200"
            )}
          >
            Delete Permanently
          </ResponsiveConfirmDialogAction>
        </ResponsiveConfirmDialogFooter>
      </ResponsiveConfirmDialogContent>
    </ResponsiveConfirmDialog>
  );
}
