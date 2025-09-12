import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RailItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtext: string;
  pill?: {
    label: string;
    variant?: "default" | "destructive" | "secondary" | "outline";
  };
  cta?: {
    label: string;
    onClick: () => void;
  };
  href?: string;
  onClick?: () => void;
}

interface HorizontalCardRailProps {
  title?: string;
  items: RailItem[];
  className?: string;
  onItemClick?: (item: RailItem) => void;
}

export function HorizontalCardRail({
  title,
  items,
  className,
  onItemClick,
}: HorizontalCardRailProps) {
  const handleItemClick = (item: RailItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else if (item.onClick) {
      item.onClick();
    } else if (item.cta?.onClick) {
      item.cta.onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, item: RailItem) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleItemClick(item);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      )}
      
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-1 pb-1">
        {items.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <div
              key={item.id}
              className="min-w-[320px] md:min-w-[360px] max-w-[420px] snap-start rounded-xl ring-1 ring-black/5 bg-white shadow-sm p-4 cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:outline-none group"
              tabIndex={0}
              role="button"
              onClick={() => handleItemClick(item)}
              onKeyDown={(e) => handleKeyDown(e, item)}
              aria-label={`${item.title}: ${item.subtext}`}
            >
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                {/* Left icon bucket */}
                <div className="h-10 w-10 rounded-full bg-slate-50 ring-1 ring-black/5 grid place-items-center">
                  <IconComponent className="w-5 h-5 text-slate-600" />
                </div>
                
                {/* Middle content */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate text-foreground">
                      {item.title}
                    </h4>
                    {item.pill && (
                      <Badge 
                        variant={item.pill.variant || "default"} 
                        className="text-xs flex-shrink-0"
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
                <div className="flex-shrink-0">
                  {item.cta ? (
                    <div className="block md:hidden">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                  {item.cta && (
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