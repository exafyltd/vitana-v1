import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DevMetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  trendLabel?: string;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variantStyles = {
  default: "text-foreground",
  success: "text-green-600",
  warning: "text-yellow-600",
  danger: "text-red-600",
};

const trendColors = {
  up: "text-green-600",
  down: "text-red-600",
  neutral: "text-muted-foreground",
};

const TrendIcon = { up: TrendingUp, down: TrendingDown, neutral: Minus };

export function DevMetricsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  trendLabel,
  variant = "default",
  className,
}: DevMetricsCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", variantStyles[variant])}>
              {value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {Icon && (
            <div className="p-2 rounded-md bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {(() => {
              const TIcon = TrendIcon[trend];
              return <TIcon className={cn("h-3 w-3", trendColors[trend])} />;
            })()}
            <span className={cn("text-xs font-medium", trendColors[trend])}>
              {trendValue}
            </span>
            {trendLabel && (
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DevMetricsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

const gridCols = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function DevMetricsGrid({ children, columns = 4 }: DevMetricsGridProps) {
  return <div className={cn("grid gap-4", gridCols[columns])}>{children}</div>;
}
