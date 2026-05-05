import * as React from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { t } from '@/lib/i18n-toast';

interface KebabMenuProps {
  children?: React.ReactNode;
  className?: string;
}

const KebabMenu = React.forwardRef<
  React.ElementRef<typeof DropdownMenuTrigger>,
  KebabMenuProps
>(({ children, className, ...props }, ref) => {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 hover:bg-sidebar-accent/50 ${className}`}
          aria-label={t('screens.ui.moreOptionsMenu')}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-48 z-[100] bg-popover/95 backdrop-blur-md border border-border shadow-xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

KebabMenu.displayName = "KebabMenu";

export { KebabMenu, DropdownMenuItem, DropdownMenuSeparator };