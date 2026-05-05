import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ChevronDown } from "lucide-react";
import { useActiveVTID } from "@/context/ActiveVTIDContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

interface ActiveVTIDChipProps {
  showClear?: boolean;
  className?: string;
}

export function ActiveVTIDChip({ showClear = true, className = "" }: ActiveVTIDChipProps) {
  const { activeVTID, setActiveVTID, clearVTID } = useActiveVTID();
  const { toast } = useToast();

  const handleCreateNew = () => {
    notify('toasts.dev.createVtid', 'toasts.dev.vtidCreationWillAvailablePhase2');
  };

  const handleSelect = () => {
    notify('toasts.dev.selectVtid', 'toasts.dev.vtidSelectionWillAvailablePhase2');
  };

  if (!activeVTID) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <span className="text-muted-foreground">{t('screens.dev.noVtidSelected')}</span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCreateNew}>
            {t('screens.dev.createNewVtid')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSelect}>
            {t('screens.dev.selectExistingVtid')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="secondary" className="gap-2">
        <span className="font-mono text-xs">{activeVTID.label}</span>
        {showClear && (
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              clearVTID();
            }}
          />
        )}
      </Badge>
    </div>
  );
}
