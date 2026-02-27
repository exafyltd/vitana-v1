import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { SoftWarningBanner } from "./SoftWarningBanner";
import { GatewayError } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

interface EventItem {
  id: string;
  type?: string;
  service?: string;
  status?: string;
  message?: string;
  vtid?: string;
  created_at: string;
  [key: string]: unknown;
}

const statusColors: Record<string, string> = {
  green: "bg-green-500",
  success: "bg-green-500",
  blue: "bg-blue-500",
  info: "bg-blue-500",
  yellow: "bg-yellow-500",
  warning: "bg-yellow-500",
  red: "bg-red-500",
  error: "bg-red-500",
};

interface DevEventStreamProps {
  title: string;
  description?: string;
  events: EventItem[];
  isLoading: boolean;
  error: GatewayError | null;
  available: boolean;
  onRefresh?: () => void;
  maxHeight?: string;
  emptyMessage?: string;
  renderEvent?: (event: EventItem) => React.ReactNode;
}

export function DevEventStream({
  title,
  description,
  events,
  isLoading,
  error,
  available,
  onRefresh,
  maxHeight = "max-h-[500px]",
  emptyMessage = "No events yet",
  renderEvent,
}: DevEventStreamProps) {
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
              {events.length} events
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

        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <div className={`${maxHeight} overflow-y-auto space-y-2`}>
            {events.map((event) =>
              renderEvent ? (
                <div key={event.id}>{renderEvent(event)}</div>
              ) : (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div
                    className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                      statusColors[event.status || ""] || "bg-gray-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.service && <span className="font-medium text-sm">{event.service}</span>}
                      {event.type && (
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      )}
                      {event.vtid && (
                        <Badge variant="secondary" className="text-xs">
                          {event.vtid}
                        </Badge>
                      )}
                    </div>
                    {event.message && <p className="text-sm text-muted-foreground mt-1">{event.message}</p>}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
