import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface StatItem {
  label: string;
  value: string | number;
  unit?: string;
  progress?: number;
  trend?: "up" | "down" | "stable";
  delta?: string;
}

interface StatCardProps {
  title: string;
  stats: StatItem[];
  icon?: LucideIcon;
  variant?: "compact" | "detailed" | "minimal";
  showTrends?: boolean;
  className?: string;
  onClick?: () => void;
}

const StatCardBase = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ 
    title, 
    stats, 
    icon: Icon, 
    variant = "compact",
    showTrends = true,
    className,
    onClick,
    ...props 
  }, ref) => {
    const getTrendIcon = (trend?: string) => {
      switch (trend) {
        case "up": return TrendingUp;
        case "down": return TrendingDown;
        case "stable": return Minus;
        default: return null;
      }
    };

    const getTrendColor = (trend?: string) => {
      switch (trend) {
        case "up": return "text-calendar-success";
        case "down": return "text-destructive";
        case "stable": return "text-muted-foreground";
        default: return "text-muted-foreground";
      }
    };

    if (variant === "minimal") {
      return (
        <div 
          ref={ref}
          className={cn(
            "p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-all",
            onClick && "cursor-pointer hover:shadow-md",
            className
          )}
          onClick={onClick}
          {...props}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
            {Icon && <Icon className="w-4 h-4 text-calendar-primary" />}
          </div>
          <div className="space-y-2">
            {stats.slice(0, 1).map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {stat.value}{stat.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.unit}</span>}
                </span>
                {showTrends && stat.trend && (
                  <div className={cn("flex items-center gap-1", getTrendColor(stat.trend))}>
                    {(() => {
                      const TrendIcon = getTrendIcon(stat.trend);
                      return TrendIcon ? <TrendIcon className="w-4 h-4" /> : null;
                    })()}
                    {stat.delta && <span className="text-xs font-medium">{stat.delta}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <Card 
        ref={ref}
        className={cn(
          "bg-gradient-to-br from-calendar-accent/5 to-calendar-primary/5 border-calendar-accent/20 transition-all hover:shadow-md",
          onClick && "cursor-pointer hover:scale-[1.02]",
          className
        )}
        onClick={onClick}
        {...props}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-calendar-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-calendar-primary" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {stats.map((stat, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                {showTrends && stat.trend && (
                  <div className={cn("flex items-center gap-1", getTrendColor(stat.trend))}>
                    {(() => {
                      const TrendIcon = getTrendIcon(stat.trend);
                      return TrendIcon ? <TrendIcon className="w-3 h-3" /> : null;
                    })()}
                    {stat.delta && <span className="text-xs font-medium">{stat.delta}</span>}
                  </div>
                )}
              </div>
              
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-foreground">
                  {stat.value}
                  {stat.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.unit}</span>}
                </span>
              </div>
              
              {stat.progress !== undefined && variant === "detailed" && (
                <Progress value={stat.progress} className="h-2" />
              )}
            </div>
          ))}
          
          {stats.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">{t('screens.templates.noDataAvailable')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

StatCardBase.displayName = "StatCard";

const StatCard = withCardId(StatCardBase, "CT-CAL-001");

export { StatCard, StatCardBase };
export type { StatCardProps, StatItem };