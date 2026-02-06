import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface MobileShowcaseHeaderProps {
  onManage?: () => void;
  className?: string;
}

export function MobileShowcaseHeader({
  onManage,
  className
}: MobileShowcaseHeaderProps) {
  const { translate } = useTranslation();
  
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2",
      className
    )}>
      <h3 className="text-sm font-semibold text-foreground">
        {translate('editProfile.showcaseTitle')}
      </h3>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onManage}
        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
      >
        <Settings2 className="h-3.5 w-3.5" />
        {translate('editProfile.manage')}
      </Button>
    </div>
  );
}
