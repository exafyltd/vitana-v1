import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { HEALTH_CATEGORY_COLORS, type HealthCategoryColor } from "@/lib/colors";

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
    
    const categoryColors = HEALTH_CATEGORY_COLORS[category];
    
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
          "bg-card border-border/50 hover:border-border transition-all duration-300 group flex flex-col relative overflow-hidden",
          sizeVariants[size],
          urgent && "ring-2 ring-health-warning/50 shadow-lg shadow-health-warning/10",
          "hover:shadow-xl hover:shadow-primary/5",
          className
        )}
        {...props}
      >
        <CardHeader className="pb-3 space-y-3">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
            categoryColors.bg,
            "ring-1",
            categoryColors.ring
          )}>
            <Icon className={cn("w-7 h-7 transition-colors duration-300", categoryColors.icon)} />
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