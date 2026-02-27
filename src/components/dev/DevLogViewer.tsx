import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { SoftWarningBanner } from "./SoftWarningBanner";
import { GatewayError } from "@/lib/devGatewayClient";

interface LogEntry {
  timestamp: string;
  level?: "info" | "warn" | "error" | "debug";
  message: string;
  source?: string;
  [key: string]: unknown;
}

const levelColors: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-400",
};

interface DevLogViewerProps {
  title: string;
  description?: string;
  logs: LogEntry[];
  isLoading: boolean;
  error: GatewayError | null;
  available: boolean;
  onRefresh?: () => void;
  maxHeight?: string;
}

export function DevLogViewer({
  title,
  description,
  logs,
  isLoading,
  error,
  available,
  onRefresh,
  maxHeight = "max-h-[500px]",
}: DevLogViewerProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {logs.length} entries
            </Badge>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!available && error && (
          <SoftWarningBanner message={`Gateway not reachable — ${error.message || "read-only stub active"}`} />
        )}

        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No log entries</p>
          </div>
        ) : (
          <div
            className={`${maxHeight} overflow-y-auto bg-gray-950 rounded-lg p-3 font-mono text-xs leading-relaxed`}
          >
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 hover:bg-gray-900 px-1 py-0.5 rounded">
                <span className="text-gray-500 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {log.level && (
                  <span className={`uppercase flex-shrink-0 w-12 ${levelColors[log.level] || "text-gray-400"}`}>
                    [{log.level}]
                  </span>
                )}
                {log.source && <span className="text-cyan-400 flex-shrink-0">[{log.source}]</span>}
                <span className="text-gray-200 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
