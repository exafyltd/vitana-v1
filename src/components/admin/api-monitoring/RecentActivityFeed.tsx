import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertTriangle,
  Zap,
  Globe,
  Server
} from "lucide-react";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { t } from '@/lib/i18n-toast';

interface TestLog {
  id: string;
  timestamp: string;
  status: string;
  response_time_ms: number | null;
  error_log: any;
  api_integrations?: {
    name: string;
    integration_type: string;
    metadata?: any;
  };
}

interface RecentActivityFeedProps {
  testLogs: TestLog[] | undefined;
  isLoading: boolean;
}

export function RecentActivityFeed({ testLogs, isLoading }: RecentActivityFeedProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getIntegrationIcon = (type: string, metadata?: any) => {
    const deploymentType = metadata?.deployment_type;
    
    if (deploymentType === 'edge_function') {
      return <Zap className="w-4 h-4 text-primary" />;
    } else if (deploymentType === 'external_api') {
      return <Globe className="w-4 h-4 text-accent" />;
    }
    
    return <Server className="w-4 h-4 text-muted-foreground" />;
  };

  const getResponseTimeColor = (ms: number | null) => {
    if (!ms) return "text-muted-foreground";
    if (ms < 200) return "text-success";
    if (ms < 500) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>{t('screens.admin.recentActivity')}</CardTitle>
              <CardDescription>{t('screens.admin.liveTestResultsStatusUpdates')}</CardDescription>
            </div>
          </div>
          <ConnectionStatus />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">{t('screens.admin.loadingActivity')}</p>
            </div>
          </div>
        ) : testLogs && testLogs.length > 0 ? (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {testLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="group flex items-start gap-3 p-3 border rounded-lg hover:border-primary/50 hover:bg-accent/5 transition-all duration-200"
                >
                  <div className="mt-0.5">
                    {getIntegrationIcon(
                      log.api_integrations?.integration_type || '', 
                      log.api_integrations?.metadata
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {log.api_integrations?.name || 'Unknown Integration'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.timestamp && formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      {getStatusBadge(log.status)}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2">
                      {log.response_time_ms !== null && (
                        <span className={`text-xs font-mono ${getResponseTimeColor(log.response_time_ms)}`}>
                          {log.response_time_ms}ms
                        </span>
                      )}
                      {log.api_integrations?.metadata?.deployment_type && (
                        <Badge variant="outline" className="text-xs">
                          {log.api_integrations.metadata.deployment_type === 'edge_function' 
                            ? 'Edge Function' 
                            : 'External API'}
                        </Badge>
                      )}
                    </div>
                    
                    {log.error_log && log.status === 'failed' && (
                      <div className="mt-2 p-2 bg-destructive/5 border border-destructive/10 rounded text-xs text-destructive">
                        {typeof log.error_log === 'string' 
                          ? log.error_log 
                          : JSON.stringify(log.error_log).substring(0, 100)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">{t('screens.admin.noActivityYet')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run tests or discover integrations to see activity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
