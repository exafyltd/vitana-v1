import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface ModeOption {
  value: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface MobileModePillProps {
  modes: ModeOption[];
  activeMode: string;
  onModeChange: (value: string) => void;
  className?: string;
}

export function MobileModePill({ modes, activeMode, onModeChange, className }: MobileModePillProps) {
  const [open, setOpen] = useState(false);
  const active = modes.find(m => m.value === activeMode);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 h-9 px-3 rounded-full bg-muted/60 hover:bg-muted shrink-0 transition-colors",
          className
        )}
      >
        {active?.icon && <span className="text-xs">{active.icon}</span>}
        <span className="text-sm font-medium text-foreground">{active?.label ?? activeMode}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-2 pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">Select Mode</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1">
            {modes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => {
                  onModeChange(mode.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                  mode.value === activeMode
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {mode.icon && <span className="text-base">{mode.icon}</span>}
                <span className="flex-1 text-sm">{mode.label}</span>
                {mode.badge != null && mode.badge > 0 && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">
                    {mode.badge}
                  </span>
                )}
                {mode.value === activeMode && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
