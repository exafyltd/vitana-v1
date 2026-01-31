import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckSquare, Download, Trash2, Archive, X } from "lucide-react";
import { useI18nNotify } from "@/hooks/useI18nNotify";
import { useTranslation } from "@/hooks/useTranslation";

interface BulkActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnableBulkMode: () => void;
}

export function BulkActionsDialog({ open, onOpenChange, onEnableBulkMode }: BulkActionsDialogProps) {
  const { notify } = useI18nNotify();
  const { translate } = useTranslation();

  const handleEnableBulkMode = () => {
    onEnableBulkMode();
    onOpenChange(false);
    notify.success('toasts.success.bulkEnabled', 'toasts.success.bulkEnabledDesc');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="w-6 h-6" />
            {translate('common.actions', 'Bulk Actions')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm">
              {translate('empty.noDataDesc', 'Bulk actions allow you to select multiple items from your timeline and perform actions on them all at once.')}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">{translate('common.actions', 'Available Actions')}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Download className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">{translate('buttons.export', 'Export Selected')}</div>
                  <div className="text-xs text-muted-foreground">
                    {translate('buttons.download', 'Download selected items as CSV or JSON')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Archive className="w-5 h-5 text-accent" />
                <div className="flex-1">
                  <div className="font-medium">{translate('subNav.archived', 'Archive Selected')}</div>
                  <div className="text-xs text-muted-foreground">
                    {translate('subNav.archived', 'Move selected items to archive')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Trash2 className="w-5 h-5 text-destructive" />
                <div className="flex-1">
                  <div className="font-medium">{translate('buttons.delete', 'Delete Selected')}</div>
                  <div className="text-xs text-muted-foreground">
                    {translate('confirm.deleteDesc', 'Permanently remove selected items')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              {translate('buttons.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleEnableBulkMode}>
              <CheckSquare className="w-4 h-4 mr-2" />
              {translate('buttons.enable', 'Enable Bulk Selection')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
