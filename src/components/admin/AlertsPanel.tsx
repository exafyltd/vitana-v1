import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import { useApiTestNotifications, useRecentTestFailures } from "@/hooks/useApiTestNotifications";
import { formatDistanceToNow } from "date-fns";

export default function AlertsPanel() {
  const { data: notifications, isLoading: notificationsLoading } = useApiTestNotifications();
  const { data: failures, isLoading: failuresLoading } = useRecentTestFailures();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="grid gap-6">
      {/* Recent Failures Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Failures</CardTitle>
          <CardDescription>Failed tests in the last hour</CardDescription>
        </CardHeader>
        <CardContent>
          {failuresLoading ? (
            <p className="text-sm text-muted-foreground">Loading failures...</p>
          ) : !failures || failures.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>No recent failures</span>
            </div>
          ) : (
            <div className="space-y-3">
              {failures.map((failure: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{failure.integration_name}</p>
                      <Badge variant="destructive" className="text-xs">
                        {failure.error_count} {failure.error_count === 1 ? 'failure' : 'failures'}
                      </Badge>
                    </div>
                    {failure.latest_error && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {failure.latest_error}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Latest: {formatDistanceToNow(new Date(failure.latest_timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Log</CardTitle>
          <CardDescription>All test notifications and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {notificationsLoading ? (
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          ) : !notifications || notifications.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>No notifications</span>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {notifications.map((notification: any) => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getSeverityIcon(notification.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {notification.api_integrations && (
                          <p className="font-medium text-sm">
                            {notification.api_integrations.name}
                          </p>
                        )}
                        <Badge variant={getSeverityColor(notification.severity) as any} className="text-xs">
                          {notification.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
