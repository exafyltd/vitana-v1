import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useActiveVTID } from "@/context/ActiveVTIDContext";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface TickerEvent {
  ts: string;
  vtid: string;
  layer: string;
  module: string;
  source: "oasis.events" | "github.actions" | "gcp.deploy" | "agent.ping";
  kind: "workflow_run" | "event" | "deploy" | "ping";
  status: "queued" | "in_progress" | "success" | "failure" | "info";
  title: string;
  ref?: string;
  link?: string;
}

type ConnectionState = "LIVE" | "OFFLINE";
type ScopeFilter = "ALL" | string;

interface TickerStreamProps {
  onVTIDClick?: () => void;
  isFocused?: boolean;
  hasUnread?: boolean;
}

const getStatusColor = (status: TickerEvent["status"]) => {
  switch (status) {
    case "success": return "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400";
    case "failure": return "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400";
    case "in_progress": return "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "queued": return "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    default: return "border-border bg-muted text-muted-foreground";
  }
};

export function TickerStream({ onVTIDClick, isFocused = true, hasUnread = false }: TickerStreamProps) {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("OFFLINE");
  const [scope, setScope] = useState<ScopeFilter>("ALL");
  const { setActiveVTID } = useActiveVTID();
  
  const currentVTID = "DEV-CICDL-0031"; // Can be made dynamic later
  const railRef = useRef<HTMLDivElement>(null);

  // Autoscroll animation
  useEffect(() => {
    const el = railRef.current;
    if (!el || events.length === 0) return;

    let x = 0;
    const tick = () => {
      x = (x + 0.5) % (el.scrollWidth + 1);
      el.scrollLeft = x;
      req = requestAnimationFrame(tick);
    };
    let req = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(req);
  }, [events.length]);

  // SSE connection with fallback
  useEffect(() => {
    const sseBaseUrl = (import.meta.env.VITE_DEVHUB_SSE_BASE || window.location.origin).trim();
    const vtidParam = scope === "ALL" ? "ALL" : currentVTID;
    const url = `${sseBaseUrl}/api/v1/devhub/feed?vtid=${vtidParam}`.trim();
    
    const es = new EventSource(url);
    let connected = false;

    const onMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        
        // Skip heartbeat messages
        if (data.type === "heartbeat") {
          return;
        }
        
        // Process actual ticker events
        const event = data as TickerEvent;
        connected = true;
        setConnectionState("LIVE");
        setEvents(prev => [event, ...prev].slice(0, 200));
      } catch (err) {
        console.error("Failed to parse ticker event:", err);
      }
    };

    const onError = () => {
      if (connected) {
        setConnectionState("OFFLINE");
      }
    };

    es.addEventListener("message", onMessage);
    es.addEventListener("error", onError);

    // Fallback to mock data after 1s
    const fallbackTimer = setTimeout(async () => {
      if (!connected) {
        try {
          const response = await fetch("/mock/devhub-feed.json");
          const mockData = await response.json();
          setEvents(mockData.events || []);
          setConnectionState("OFFLINE");
        } catch (err) {
          console.error("Failed to load mock data:", err);
          setConnectionState("OFFLINE");
        }
      }
    }, 1000);

    return () => {
      clearTimeout(fallbackTimer);
      es.close();
    };
  }, [scope, currentVTID]);

  const handleVTIDClick = (e: React.MouseEvent, event: TickerEvent) => {
    // Only handle VTID click if not clicking the link itself
    if ((e.target as HTMLElement).tagName !== 'A') {
      e.preventDefault();
      setActiveVTID({
        id: event.vtid,
        label: event.vtid,
        tenant: 'system',
      });
      onVTIDClick?.();
    }
  };

  return (
    <div className={cn(
      "h-full flex flex-col border-r transition-all",
      isFocused ? "border-primary/50" : "border-border opacity-70"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm tracking-wide">{t('screens.dev.ticker')}</h3>
          {hasUnread && !isFocused && (
            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
              •
            </Badge>
          )}
          {connectionState === "LIVE" ? (
            <Badge variant="default" className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
              {t('screens.dev.live')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {t('screens.dev.offlineMock')}
            </Badge>
          )}
        </div>

        {/* Scope Filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScope("ALL")}
            className={cn(
              "text-xs px-2 py-1 rounded border transition-colors",
              scope === "ALL" 
                ? "border-primary bg-primary/10 text-primary font-medium" 
                : "border-border bg-background hover:bg-accent"
            )}
          >{t('screens.dev.all')}
          </button>
          <button
            onClick={() => setScope(currentVTID)}
            className={cn(
              "text-xs px-2 py-1 rounded border transition-colors",
              scope === currentVTID
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border bg-background hover:bg-accent"
            )}
          >
            {currentVTID}
          </button>
        </div>
      </div>

      {/* Ticker Rail */}
      <div 
        ref={railRef}
        className="flex-1 overflow-x-auto overflow-y-hidden whitespace-nowrap px-4 py-3 scrollbar-hide"
        style={{ scrollBehavior: 'auto' }}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">{t('screens.dev.noEventsYet')}</p>
          </div>
        ) : (
          <div className="inline-flex items-center gap-3">
            {events.map((event, i) => (
              <div
                key={`${event.vtid}-${event.ts}-${i}`}
                onClick={(e) => handleVTIDClick(e, event)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:scale-105",
                  getStatusColor(event.status)
                )}
              >
                <span className="text-[10px] font-bold uppercase">{event.vtid}</span>
                <span className="text-[10px] uppercase">{event.layer}-{event.module}</span>
                <span className="text-[11px] font-semibold">{event.title}</span>
                {event.ref && (
                  <span className="text-[10px] opacity-70">{event.ref}</span>
                )}
                {event.link && (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] underline hover:no-underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">{t('screens.dev.value0AutoscrollClickVtidFocus', { value0: events.length > 0 ? `${events.length} events • ` : '' })}
        </p>
      </div>
    </div>
  );
}
