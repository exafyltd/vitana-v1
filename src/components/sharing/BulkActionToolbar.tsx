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
        "bg-white/75 backdrop-blur-md border-2",
        "border-transparent bg-gradient-to-r from-teal-100/50 to-pink-100/50",
        "shadow-xl shadow-teal-100/30"
      )}>
        {/* Left Side - Selection Info */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">{t('screens.sharing.selectedcountCampaignValue1Selected', { selectedCount, value1: selectedCount !== 1 ? "s" : "" })}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={onSelectAll}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                {t('screens.sharing.selectAll')}
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={onDeselectAll}
                className="text-xs text-gray-600 hover:text-gray-700 font-medium"
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
            className="gap-2 hover:bg-purple-100"
            onClick={onDuplicate}
            disabled={selectedCount === 0}
          >
            <Copy className="w-4 h-4" />
            {t('screens.sharing.duplicate')}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 hover:bg-teal-100"
            onClick={onSmartReschedule}
            disabled={selectedCount === 0}
          >
            <Sparkles className="w-4 h-4" />
            {t('screens.sharing.smartreschedule')}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 hover:bg-blue-100"
            onClick={onExport}
            disabled={selectedCount === 0}
          >
            <Download className="w-4 h-4" />
            {t('screens.sharing.exportCsv')}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 hover:bg-red-100 text-red-600"
            onClick={onDelete}
            disabled={selectedCount === 0}
          >
            <Trash2 className="w-4 h-4" />
            {t('screens.sharing.delete')}
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-gray-200"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
