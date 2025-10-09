import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  loading?: boolean;
  variant?: "default" | "success" | "warning" | "error";
}

const variantStyles = {
  default: "text-foreground",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
};

export function AdminStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading = false,
  variant = "default",
}: AdminStatsCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className={cn("text-2xl font-bold", variantStyles[variant])}>
              {value}
            </div>
            {(subtitle || trend) && (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {trend && (
                  <span
                    className={cn(
                      "font-medium",
                      trend.isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                  </span>
                )}
                {subtitle || trend?.label}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
