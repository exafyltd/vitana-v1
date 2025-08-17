import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  emoji: string;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction?: string;
  onPrimaryClick: () => void;
  onSecondaryClick?: () => void;
  variant?: "default" | "compact";
  className?: string;
}

export default function PlanCard({
  emoji,
  title,
  description,
  primaryAction,
  secondaryAction,
  onPrimaryClick,
  onSecondaryClick,
  variant = "default",
  className
}: PlanCardProps) {
  return (
    <Card className={cn(
      "bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300",
      className
    )}>
      <CardHeader className={variant === "compact" ? "pb-3" : "pb-4"}>
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-2xl">{emoji}</span>
          <CardTitle className={variant === "compact" ? "text-base" : "text-lg"}>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className={variant === "compact" ? "pt-0" : ""}>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={onPrimaryClick}
          >
            {primaryAction}
          </Button>
          {secondaryAction && onSecondaryClick && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={onSecondaryClick}
            >
              {secondaryAction}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}