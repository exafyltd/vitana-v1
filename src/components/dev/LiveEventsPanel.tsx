import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDevEvents } from "@/hooks/dev/useDevEvents";
import { SoftWarningBanner } from "./SoftWarningBanner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { t } from '@/lib/i18n-toast';

interface LiveEventsPanelProps {
  tenant?: string;
  status?: 'all' | 'green' | 'blue' | 'yellow' | 'red';
}

export function LiveEventsPanel({ tenant = 'system', status = 'all' }: LiveEventsPanelProps) {
  const { events, error, available, isLoading, refetch } = useDevEvents({ tenant, status });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('screens.dev.liveEventsFeedOasis')}</CardTitle>
            <CardDescription>{t('screens.dev.last25EventsAutorefresh10s')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('screens.dev.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!available && error && (
          <SoftWarningBanner
            message={`Gateway not reachable — ${error.message || 'read-only stub active'}`}
          />
        )}

        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('screens.dev.noEventsAvailable')}</p>
            <p className="text-sm mt-2">{t('screens.dev.eventsWillAppearHereOnceGateway')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${getStatusColor(event.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{event.service}</span>
                    <Badge variant="outline" className="text-xs">{event.tenant}</Badge>
                    {event.vtid && (
                      <Badge variant="secondary" className="text-xs">
                        {event.vtid.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{event.event}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">RID: {event.rid.slice(0, 8)}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
