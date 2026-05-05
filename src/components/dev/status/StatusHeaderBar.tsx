import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Wifi, Clock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { t } from '@/lib/i18n-toast';

interface StatusHeaderBarProps {
  backendStatus: "ONLINE" | "OFFLINE" | "PARTIAL";
  streamStatus: "SSE Live" | "Polling" | "Disconnected";
  latency?: number;
  lastEventTime?: string;
  activeVTID?: string;
  onOpenDetails: () => void;
  onVTIDClick?: () => void;
}

export function StatusHeaderBar({
  backendStatus,
  streamStatus,
  latency,
  lastEventTime,
  activeVTID,
  onOpenDetails,
  onVTIDClick
}: StatusHeaderBarProps) {
  const [lastEventRelative, setLastEventRelative] = useState<string>("—");

  useEffect(() => {
    if (!lastEventTime) {
      setLastEventRelative("—");
      return;
    }

    const updateRelativeTime = () => {
      try {
        const date = new Date(lastEventTime);
        if (isNaN(date.getTime())) {
          setLastEventRelative("—");
          return;
        }
        
        const distance = formatDistanceToNow(date, { addSuffix: true });
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        
        if (seconds < 5) {
          setLastEventRelative("Just now");
        } else if (seconds < 60) {
          setLastEventRelative(`${seconds}s ago`);
        } else {
          setLastEventRelative(distance);
        }
      } catch {
        setLastEventRelative("—");
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 1000);
    return () => clearInterval(interval);
  }, [lastEventTime]);

  const backendVariant = 
    backendStatus === "ONLINE" ? "success" : 
    backendStatus === "PARTIAL" ? "outline" : 
    "destructive";

  const streamVariant = 
    streamStatus === "SSE Live" ? "success" : 
    streamStatus === "Polling" ? "outline" : 
    "destructive";

  return (
    <Button
      variant="ghost"
      className="w-full h-auto px-4 py-2 hover:bg-accent/50 justify-start border-b rounded-none"
      onClick={onOpenDetails}
    >
      <div className="flex items-center gap-3 flex-wrap text-xs w-full">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          <span className="text-muted-foreground">{t('screens.dev.backend')}</span>
          <Badge variant={backendVariant} className="text-[10px] px-1.5 py-0">
            {backendStatus}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3" />
          <span className="text-muted-foreground">{t('screens.dev.stream')}</span>
          <Badge variant={streamVariant} className="text-[10px] px-1.5 py-0">
            {streamStatus}
          </Badge>
        </div>

        {latency !== undefined && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span className="text-muted-foreground">{t('screens.dev.latency')}</span>
            <span className="font-mono">{t('screens.dev.latencyMs', { latency })}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span className="text-muted-foreground">{t('screens.dev.lastEvent')}</span>
          <span className="font-mono">{lastEventRelative}</span>
        </div>

        {activeVTID && (
          <div className="flex items-center gap-1.5 ml-auto">
            <User className="w-3 h-3" />
            <span className="text-muted-foreground">{t('screens.dev.vtid')}</span>
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0 font-mono cursor-pointer hover:bg-secondary/80"
              onClick={(e) => {
                e.stopPropagation();
                onVTIDClick?.();
              }}
            >
              {activeVTID}
            </Badge>
          </div>
        )}
      </div>
    </Button>
  );
}
