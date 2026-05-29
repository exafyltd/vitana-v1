import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
interface MiniFooterStatusProps {
  backendStatus: "ONLINE" | "OFFLINE" | "PARTIAL";
  streamStatus: "SSE Live" | "Polling" | "Disconnected";
  lastEventTime?: string;
  latency?: number;
  onOpenDetails: () => void;
}

export function MiniFooterStatus({
  backendStatus,
  streamStatus,
  lastEventTime,
  latency,
  onOpenDetails
}: MiniFooterStatusProps) {
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

  const statusColor = 
    backendStatus === "ONLINE" ? "text-green-600" : 
    backendStatus === "PARTIAL" ? "text-yellow-600" : 
    "text-destructive";

  return (
    <Button
      variant="ghost"
      className="w-full h-8 hover:bg-accent/30 justify-start px-3 rounded-none border-t text-xs font-mono"
      onClick={onOpenDetails}
    >
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-muted-foreground">{t('screens.dev.status2')}</span>
        <span className={statusColor}>{backendStatus}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{t('screens.dev.stream')}</span>
        <span>{streamStatus}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{t('screens.dev.lastEvent')}</span>
        <span>{lastEventRelative}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{t('screens.dev.latency')}</span>
        <span>{latency !== undefined ? `${latency}ms` : "—"}</span>
      </div>
    </Button>
  );
}
