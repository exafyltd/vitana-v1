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

interface KebabMenuProps {
  children?: React.ReactNode;
  className?: string;
}

const KebabMenu = React.forwardRef<
  React.ElementRef<typeof DropdownMenuTrigger>,
  KebabMenuProps
>(({ children, className, ...props }, ref) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 hover:bg-sidebar-accent/50 ${className}`}
          aria-label="More options menu"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 z-50 bg-popover border border-border shadow-md"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

KebabMenu.displayName = "KebabMenu";

export { KebabMenu, DropdownMenuItem, DropdownMenuSeparator };