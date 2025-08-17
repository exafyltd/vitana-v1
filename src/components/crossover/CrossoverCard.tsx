import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface CrossoverCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle: string;
  content?: React.ReactNode;
  buttonText: string;
  onButtonClick: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const CrossoverCard = React.forwardRef<HTMLDivElement, CrossoverCardProps>(
  ({ 
    icon: Icon, 
    iconColor = "text-primary",
    title, 
    subtitle, 
    content,
    buttonText, 
    onButtonClick,
    secondaryButtonText,
    onSecondaryButtonClick,
    className,
    size = "md",
    ...props 
  }, ref) => {
    
    const sizeClasses = {
      sm: "h-64",
      md: "h-80", 
      lg: "h-96"
    };

    const iconSizes = {
      sm: "w-8 h-8",
      md: "w-12 h-12",
      lg: "w-16 h-16"
    };

    return (
      <Card 
        ref={ref}
        className={cn(
          "bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Icon className={cn("transition-colors duration-300", iconSizes[size], iconColor)} />
          </div>
          <h3 className="text-lg font-semibold text-foreground leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col justify-between">
          {content && (
            <div className="mb-4 flex-1">
              {content}
            </div>
          )}
          
          <div className="space-y-2">
            <Button 
              onClick={onButtonClick}
              className="w-full font-medium"
              size="sm"
            >
              {buttonText}
            </Button>
            
            {secondaryButtonText && onSecondaryButtonClick && (
              <Button 
                onClick={onSecondaryButtonClick}
                variant="outline"
                className="w-full"
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