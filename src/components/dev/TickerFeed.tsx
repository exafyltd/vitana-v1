import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDevEvents } from "@/hooks/dev/useDevEvents";
import { SoftWarningBanner } from "./SoftWarningBanner";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useActiveVTID } from "@/context/ActiveVTIDContext";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface TickerFeedProps {
  onVTIDClick?: () => void;
  isFocused?: boolean;
  hasUnread?: boolean;
}

export function TickerFeed({ onVTIDClick, isFocused = true, hasUnread = false }: TickerFeedProps) {
  const { events, error, available, isLoading } = useDevEvents({ tenant: 'system', status: 'all' });
  const { setActiveVTID } = useActiveVTID();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleVTIDClick = (vtidData: any) => {
    setActiveVTID({
      id: vtidData.id,
      label: vtidData.label,
      tenant: vtidData.tenant,
    });
    onVTIDClick?.();
  };

  return (
    <div className={cn(
      "h-full flex flex-col border-r transition-all",
      isFocused ? "border-primary/50" : "border-border opacity-70"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('screens.dev.liveTicker')}</CardTitle>
          {hasUnread && !isFocused && (
            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
              •
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t('screens.dev.recentEventsAutorefresh10s')}</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {!available && error && (
          <SoftWarningBanner
            message={`Gateway offline — ${error.message || 'stub data active'}`}
          />
        )}

        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t('screens.dev.noEventsAvailable')}</p>
            <p className="text-xs mt-2">{t('screens.dev.eventsWillAppearHereOnceGateway')}</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors text-sm"
              >
                <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${getStatusColor(event.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-xs">{event.service}</span>
                    {event.vtid && (
                      <Badge
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-secondary/80"
                        onClick={() => handleVTIDClick(event.vtid)}
                      >
                        {event.vtid.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.event}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </div>
  );
}
