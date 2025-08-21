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
      sm: "min-h-56",
      md: "min-h-72", 
      lg: "min-h-80",
      xl: "min-h-96"
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
          <div 
            className={cn(
              "w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
              `icon-${category}`
            )}
            style={(() => {
              const colorMap: Record<string, string> = {
                mental: '330 80% 55%',
                exercise: '210 20% 45%',
                nutrition: '150 60% 45%',
                hydration: '210 90% 55%',
                sleep: '50 95% 55%',
                vitana: '173 70% 45%',
                autopilot: '8 85% 56%',
                ai: '14 88% 54%',
                calendar: '215 16% 60%',
                settings: '215 16% 60%',
                profile: '173 70% 45%',
                discover: '265 85% 60%',
                health: '42 35% 78%',
                tracker: '42 30% 75%',
                messages: '330 75% 45%',
                community: '330 90% 60%',
                data: '215 16% 60%'
              };
              const color = colorMap[category];
              return color ? {
                backgroundColor: `hsl(${color} / 0.1)`,
                border: `1px solid hsl(${color} / 0.2)`
              } : {};
            })()}
          >
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