import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

interface SplitDetailPanelProps {
  children: React.ReactNode;
  detailContent: React.ReactNode | null;
  onClose: () => void;
  detailTitle?: string;
}

export function SplitDetailPanel({
  children,
  detailContent,
  onClose,
  detailTitle,
}: SplitDetailPanelProps) {
  const isOpen = detailContent !== null;

  return (
    <div className="flex h-full w-full gap-0 overflow-hidden">
      {/* Main content area */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-auto ${
          isOpen ? "w-[60%]" : "w-full"
        }`}
      >
        {children}
      </div>

      {/* Detail panel */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden border-l bg-card ${
          isOpen ? "w-[40%] opacity-100" : "w-0 opacity-0 border-l-0"
        }`}
      >
        {isOpen && (
          <div className="flex h-full flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                {detailTitle || "Details"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{t('screens.admin.closeDetailPanel')}</span>
              </Button>
            </div>

            {/* Panel content - scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              {detailContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
