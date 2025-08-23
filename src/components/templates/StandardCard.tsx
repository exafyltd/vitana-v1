import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";

interface StandardCardProps {
  title: string;
  subtitle?: string;
  content?: React.ReactNode;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "ghost";
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const StandardCardBase = React.forwardRef<HTMLDivElement, StandardCardProps>(
  ({ title, subtitle, content, icon: Icon, variant = "default", className, onClick, children, ...props }, ref) => {
    return (
      <Card 
        ref={ref}
        className={cn(
          "transition-all duration-300 hover:shadow-md",
          onClick && "cursor-pointer hover:scale-[1.02]",
          variant === "outline" && "border-2",
          variant === "ghost" && "border-0 shadow-none bg-transparent",
          className
        )}
        onClick={onClick}
        {...props}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </CardHeader>
        
        {(content || children) && (
          <CardContent className="pt-0">
            {content}
            {children}
          </CardContent>
        )}
      </Card>
    );
  }
);

StandardCardBase.displayName = "StandardCard";

const StandardCard = withCardId(StandardCardBase, "CT-UI-001");

export { StandardCard, StandardCardBase };
export type { StandardCardProps };