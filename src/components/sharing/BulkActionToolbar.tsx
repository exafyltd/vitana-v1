import { Button } from "@/components/ui/button";
import { Copy, Trash2, Download, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface BulkActionToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onSmartReschedule: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  onDelete,
  onDuplicate,
  onExport,
  onSmartReschedule,
  onSelectAll,
  onDeselectAll,
  onClose,
}: BulkActionToolbarProps) {
  return (
    <div className={cn(
      "sticky top-20 z-40 mb-6",
      "animate-in slide-in-from-top-2 fade-in duration-300"
    )}>
      <div className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-2xl",
        "bg-card/75 backdrop-blur-md border-2",
        "border-transparent bg-gradient-to-r from-category-1/10 to-category-4/10",
        "shadow-xl shadow-category-1/5"
      )}>
        {/* Left Side - Selection Info */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{t('screens.sharing.selectedcountCampaignValue1Selected', { selectedCount, value1: selectedCount !== 1 ? "s" : "" })}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={onSelectAll}
                className="text-xs text-category-1 hover:text-category-1 font-medium"
              >
                {t('screens.sharing.selectAll')}
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                onClick={onDeselectAll}
                className="text-xs text-muted-foreground hover:text-muted-foreground font-medium"
              >
                {t('screens.sharing.deselectAll')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 hover:bg-category-2/15"
            onClick={onDuplicate}
            disabled={selectedCount === 0}
          >
            <Copy className="w-4 h-4" />
            {t('screens.sharing.duplicate')}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 hover:bg-category-1/15"
            onClick={onSmartReschedule}
            disabled={selectedCount === 0}
          >
            <Sparkles className="w-4 h-4" />
            {t('screens.sharing.smartreschedule')}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 hover:bg-category-3/15"
            onClick={onExport}
            disabled={selectedCount === 0}
          >
            <Download className="w-4 h-4" />
            {t('screens.sharing.exportCsv')}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 hover:bg-status-error-subtle text-status-error"
            onClick={onDelete}
            disabled={selectedCount === 0}
          >
            <Trash2 className="w-4 h-4" />
            {t('screens.sharing.delete')}
          </Button>

          <div className="w-px h-6 bg-muted mx-2" />

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
