import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Mail, Smartphone, Bell, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { t } from '@/lib/i18n-toast';

interface NotificationLog {
  id: string;
  user_id: string;
  action: string;
  reason: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export default function NotificationMonitor() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          id,
          user_id,
          action,
          reason,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (action: string) => {
    if (action === 'sent') return 'bg-green-500';
    if (action === 'failed') return 'bg-red-500';
    if (action === 'skipped') return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = (action: string) => {
    if (action === 'sent') return <Mail className="w-3 h-3" />;
    if (action === 'failed') return <AlertCircle className="w-3 h-3" />;
    return <Bell className="w-3 h-3" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {t('screens.admin.realtimeNotificationMonitor')}
          <Badge variant="outline" className="ml-auto">
            {t('screens.admin.live')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading notification logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('screens.admin.noRecentNotifications')}
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(log.action)}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        User: {log.user_id.substring(0, 8)}...
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                    
                    {log.reason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.reason}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {getStatusIcon(log.action)}
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
