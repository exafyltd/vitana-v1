import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

export interface StatusItem {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  detail?: string;
  latency_ms?: number;
}

const statusConfig = {
  healthy: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Healthy" },
  degraded: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Degraded" },
  down: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Down" },
  unknown: { icon: Loader2, color: "text-gray-400", bg: "bg-gray-500/10", label: "Unknown" },
};

interface DevStatusGridProps {
  title: string;
  description?: string;
  items: StatusItem[];
  isLoading?: boolean;
}

export function DevStatusGrid({ title, description, items, isLoading }: DevStatusGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No services registered</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const cfg = statusConfig[item.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={item.name}
                  className={cn("flex items-center gap-3 p-3 rounded-lg border", cfg.bg)}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", cfg.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                      {cfg.label}
                    </Badge>
                    {item.latency_ms != null && (
                      <span className="text-xs text-muted-foreground">{item.latency_ms}ms</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
