import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
interface ActivityEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  user_email: string;
}

const eventTypeColors: Record<string, string> = {
  user_role_switch: "bg-blue-500",
  admin_role_switch: "bg-purple-500",
  tenant_switch: "bg-green-500",
  admin_bootstrap_success: "bg-orange-500",
  medical_data_access: "bg-red-500",
  default: "bg-gray-500",
};

const eventTypeLabels: Record<string, string> = {
  user_role_switch: "Role Switch",
  admin_role_switch: "Admin Role Switch",
  tenant_switch: "Workspace Switch",
  admin_bootstrap_success: "Admin Created",
  medical_data_access: "Medical Data Accessed",
};

export function AdminActivityFeed() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase.rpc("get_recent_admin_activity", {
        limit_count: 15,
      });

      if (error) throw error;
      setActivities(data || []);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching activities:", error);
      setError(error.message || "Unable to load recent activity");
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (eventType: string) => {
    return eventTypeColors[eventType] || eventTypeColors.default;
  };

  const getEventLabel = (eventType: string) => {
    return eventTypeLabels[eventType] || eventType;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t('screens.admin.recentActivity')}
          <Badge variant="outline" className="font-normal">
            {t('screens.admin.live')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t('screens.admin.noRecentActivity')}
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full ${getEventColor(
                      activity.event_type
                    )}`}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {getEventLabel(activity.event_type)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {activity.event_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.user_email} •{" "}
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {activity.event_data && (
                      <div className="mt-1 rounded-sm bg-muted p-2 text-xs font-mono">
                        {JSON.stringify(activity.event_data, null, 2).slice(
                          0,
                          100
                        )}
                        {JSON.stringify(activity.event_data).length > 100 &&
                          "..."}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
