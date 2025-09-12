import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StackedCardItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtext: string;
  pill?: {
    label: string;
    variant?: "default" | "destructive" | "secondary" | "outline" | "success";
  };
  cta?: {
    label: string;
    onClick: () => void;
  };
  href?: string;
  onClick?: () => void;
}

interface StackedCardListProps {
  title?: string;
  items: StackedCardItem[];
  className?: string;
  onItemClick?: (item: StackedCardItem) => void;
}

export function StackedCardList({
  title,
  items,
  className,
  onItemClick,
}: StackedCardListProps) {
  const handleItemClick = (item: StackedCardItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else if (item.onClick) {
      item.onClick();
    } else if (item.cta?.onClick) {
      item.cta.onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, item: StackedCardItem) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleItemClick(item);
    }
  };

  const getPriorityStyles = (variant?: string) => {
    switch (variant) {
      case "destructive":
        return {
          iconColor: "text-red-600",
          accentBorder: "border-l-[3px] border-l-red-500"
        };
      case "success":
        return {
          iconColor: "text-green-600", 
          accentBorder: "border-l-[3px] border-l-green-500"
        };
      case "secondary":
        return {
          iconColor: "text-slate-600",
          accentBorder: "border-l-[3px] border-l-slate-400"
        };
      default:
        return {
          iconColor: "text-slate-600",
          accentBorder: "border-l-[3px] border-l-slate-300"
        };
    }
  };

  return (
    <div className={className}>
      {title && (
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      )}
      
      <div className="space-y-2 md:space-y-3">
        {items.map((item) => {
          const IconComponent = item.icon;
          const priorityStyles = getPriorityStyles(item.pill?.variant);
          
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-xl ring-1 ring-black/5 bg-white shadow-sm px-4 py-3 cursor-pointer group hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 transition-all duration-200 active:scale-[0.98]",
                priorityStyles.accentBorder
              )}
              tabIndex={0}
              role="button"
              onClick={() => handleItemClick(item)}
              onKeyDown={(e) => handleKeyDown(e, item)}
              aria-label={`${item.title} — ${item.cta?.label || 'View details'}`}
            >
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                {/* Left icon bucket */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-50 to-slate-100/80 ring-1 ring-black/5 shadow-inner grid place-items-center">
                  <IconComponent className={cn("w-5 h-5", priorityStyles.iconColor)} />
                </div>
                
                {/* Middle content */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate text-foreground">
                      {item.title}
                    </h4>
                    {item.pill && (
                      <Badge 
                        variant={item.pill.variant || "default"} 
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      >
                        {item.pill.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.subtext}
                  </p>
                </div>
                
                {/* Right CTA */}
                <div className="w-[112px] flex justify-end">
                  {item.cta ? (
                    <>
                      <div className="block md:hidden">
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <div className="hidden md:block">
                        <Button 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            item.cta!.onClick();
                          }}
                          className="text-xs"
                        >
                          {item.cta.label}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}