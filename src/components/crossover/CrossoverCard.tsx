import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface CrossoverCardProps {
  icon: LucideIcon;
  iconVariant?: "primary" | "success" | "warning" | "danger" | "info";
  title: string;
  subtitle: string;
  content?: React.ReactNode;
  buttonText: string;
  onButtonClick: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  className?: string;
  urgent?: boolean;
}

const CrossoverCard = React.forwardRef<HTMLDivElement, CrossoverCardProps>(
  ({ 
    icon: Icon, 
    iconVariant = "primary",
    title, 
    subtitle, 
    content,
    buttonText, 
    onButtonClick,
    secondaryButtonText,
    onSecondaryButtonClick,
    className,
    urgent = false,
    ...props 
  }, ref) => {
    
    const iconVariants = {
      primary: {
        bg: "bg-gradient-to-br from-primary/10 to-primary/20",
        icon: "text-primary",
        ring: "ring-primary/20"
      },
      success: {
        bg: "bg-gradient-to-br from-health-success/10 to-health-success/20",
        icon: "text-health-success",
        ring: "ring-health-success/20"
      },
      warning: {
        bg: "bg-gradient-to-br from-health-warning/10 to-health-warning/20",
        icon: "text-health-warning",
        ring: "ring-health-warning/20"
      },
      danger: {
        bg: "bg-gradient-to-br from-health-danger/10 to-health-danger/20",
        icon: "text-health-danger",
        ring: "ring-health-danger/20"
      },
      info: {
        bg: "bg-gradient-to-br from-health-primary/10 to-health-primary/20",
        icon: "text-health-primary",
        ring: "ring-health-primary/20"
      }
    };

    const variant = iconVariants[iconVariant];

    return (
      <Card 
        ref={ref}
        className={cn(
          "bg-card border-border/50 hover:border-border transition-all duration-300 group flex flex-col h-72 relative overflow-hidden",
          urgent && "ring-2 ring-health-warning/50 shadow-lg shadow-health-warning/10",
          "hover:shadow-xl hover:shadow-primary/5",
          className
        )}
        {...props}
      >
        <CardHeader className="pb-3 space-y-3">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
            variant.bg,
            "ring-1",
            variant.ring
          )}>
            <Icon className={cn("w-7 h-7 transition-colors duration-300", variant.icon)} />
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