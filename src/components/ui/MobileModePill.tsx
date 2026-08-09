import React, { useState } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from '@/lib/i18n-toast';

export interface ModeOption {
  value: string;
  label: string;
  icon?: string;
  badge?: number;
  children?: ModeOption[];
}

interface MobileModePillProps {
  modes: ModeOption[];
  activeMode: string;
  onModeChange: (value: string) => void;
  className?: string;
}

/** Find the deepest matching label for dot-notation values like "services.events" */
function findActiveLabel(modes: ModeOption[], activeMode: string): { label: string; icon?: string } | null {
  for (const mode of modes) {
    if (mode.value === activeMode) return { label: mode.label, icon: mode.icon };
    if (mode.children) {
      const child = mode.children.find(c => c.value === activeMode);
      if (child) return { label: child.label, icon: child.icon };
    }
  }
  return null;
}

export function MobileModePill({ modes, activeMode, onModeChange, className }: MobileModePillProps) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand the group that contains the active mode
    const set = new Set<string>();
    for (const mode of modes) {
      if (mode.children?.some(c => c.value === activeMode)) {
        set.add(mode.value);
      }
    }
    return set;
  });

  const active = findActiveLabel(modes, activeMode);

  const toggleGroup = (value: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const isActive = (value: string) => value === activeMode;
  const isParentActive = (mode: ModeOption) =>
    mode.children?.some(c => c.value === activeMode) ?? false;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1 h-9 px-2.5 rounded-full bg-muted/60 hover:bg-muted shrink-0 transition-colors",
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
            <SheetTitle className="text-base">{t('screens.ui.selectMode')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1">
            {modes.map((mode) => {
              const hasChildren = mode.children && mode.children.length > 0;
              const isExpanded = expandedGroups.has(mode.value);
              const parentActive = isParentActive(mode);

              if (!hasChildren) {
                // Simple flat mode (e.g. Snapshot)
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      onModeChange(mode.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                      isActive(mode.value)
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
                    {isActive(mode.value) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                );
              }

              // Mode with children — expandable group
              return (
                <div key={mode.value}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(mode.value)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors w-full",
                      parentActive
                        ? "text-primary font-semibold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {mode.icon && <span className="text-base">{mode.icon}</span>}
                    <span className="flex-1 text-sm">{mode.label}</span>
                    {parentActive && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Children */}
                  {isExpanded && (
                    <div className="ml-4 flex flex-col gap-0.5">
                      {mode.children!.map((child) => (
                        <button
                          key={child.value}
                          type="button"
                          onClick={() => {
                            onModeChange(child.value);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors",
                            isActive(child.value)
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          {child.icon && <span className="text-sm">{child.icon}</span>}
                          <span className="flex-1 text-sm">{child.label}</span>
                          {child.badge != null && child.badge > 0 && (
                            <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">
                              {child.badge}
                            </span>
                          )}
                          {isActive(child.value) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
