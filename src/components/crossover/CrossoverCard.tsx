import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
// Remove the import and update the interface

export type HealthCategoryColor = "mental" | "exercise" | "nutrition" | "hydration" | "sleep" | "vitana" | "autopilot" | "ai" | "calendar" | "settings" | "profile" | "discover" | "health" | "tracker" | "messages" | "community" | "data";

interface CrossoverCardProps {
  icon: LucideIcon;
  category: HealthCategoryColor;
  title: string;
  subtitle: string;
  content?: React.ReactNode;
  buttonText: string;
  onButtonClick: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  className?: string;
  urgent?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const CrossoverCard = React.forwardRef<HTMLDivElement, CrossoverCardProps>(
  ({ 
    icon: Icon, 
    category,
    title, 
    subtitle, 
    content,
    buttonText, 
    onButtonClick,
    secondaryButtonText,
    onSecondaryButtonClick,
    className,
    urgent = false,
    size = "md",
    ...props 
  }, ref) => {
    
    const sizeVariants = {
      sm: "h-56",
      md: "h-72", 
      lg: "h-80",
      xl: "h-96"
    };

    return (
      <Card 
        ref={ref}
        className={cn(
          "border-border/50 hover:border-border transition-all duration-300 group flex flex-col relative overflow-hidden",
          sizeVariants[size],
          urgent && "ring-2 ring-destructive/50 shadow-lg shadow-destructive/10",
          "hover:shadow-xl hover:shadow-primary/5",
          `card-${category}`,
          className
        )}
        {...props}
      >
        <CardHeader className="pb-3 space-y-3">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
            "bg-white/50 ring-1 ring-white/20"
          )}>
            <Icon className="w-5 h-5 transition-colors duration-300" />
          </div>
          
          <div className="space-y-1 text-left">
            <h3 className="text-base font-bold text-foreground leading-tight tracking-tight">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col justify-between pt-0">
          {content && (
            <div className="mb-4 flex-1">
              {content}
            </div>
          )}
          
          <div className="space-y-2">
            <Button 
              onClick={onButtonClick}
              className="w-full font-semibold text-sm h-9"
              size="sm"
            >
              {buttonText}
            </Button>
            
            {secondaryButtonText && onSecondaryButtonClick && (
              <Button 
                onClick={onSecondaryButtonClick}
                variant="outline"
                className="w-full text-xs h-8"
                size="sm"
              >
                {secondaryButtonText}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

CrossoverCard.displayName = "CrossoverCard";

export { CrossoverCard };
export type { CrossoverCardProps };