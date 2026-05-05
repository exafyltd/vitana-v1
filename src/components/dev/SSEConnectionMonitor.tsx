import { useState, useEffect } from "react";
import { sseManager } from "@/lib/sseConnectionManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, XCircle, Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { t } from '@/lib/i18n-toast';

export function SSEConnectionMonitor() {
  const [activeCount, setActiveCount] = useState(0);
  const [connections, setConnections] = useState<Array<{ id: string; url: string; readyState: number }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCount(sseManager.getActiveCount());
      setConnections(sseManager.getConnectionInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleForceCloseAll = () => {
    sseManager.closeAll();
    setActiveCount(0);
    setConnections([]);
  };

  const getReadyStateLabel = (state: number) => {
    switch (state) {
      case EventSource.CONNECTING: return "CONNECTING";
      case EventSource.OPEN: return "OPEN";
      case EventSource.CLOSED: return "CLOSED";
      default: return "UNKNOWN";
    }
  };

  const getReadyStateColor = (state: number) => {
    switch (state) {
      case EventSource.OPEN: return "default";
      case EventSource.CONNECTING: return "secondary";
      case EventSource.CLOSED: return "destructive";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('screens.dev.sseConnectionMonitor')}
            </CardTitle>
            <CardDescription>
              {t('screens.dev.activeServersentEventsConnections')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={activeCount > 0 ? "default" : "secondary"}>
              {activeCount} Active
            </Badge>
            {activeCount > 5 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('screens.dev.highLoad')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeCount > 0 ? (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {activeCount} connection{activeCount !== 1 ? 's' : ''} detected
              </p>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={handleForceCloseAll}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t('screens.dev.forceCloseAll')}
              </Button>
            </div>
            
            <div className="space-y-2">
              {connections.map((conn, idx) => (
                <div 
                  key={conn.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-muted-foreground truncate">
                      {conn.id}
                    </div>
                    <div className="text-xs mt-1 truncate">
                      {conn.url}
                    </div>
                  </div>
                  <Badge variant={getReadyStateColor(conn.readyState)}>
                    {getReadyStateLabel(conn.readyState)}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('screens.dev.noActiveSseConnections')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
