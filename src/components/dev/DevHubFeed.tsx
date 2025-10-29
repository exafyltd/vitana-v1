import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActiveVTID } from "@/context/ActiveVTIDContext";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedEvent {
  ts: string;
  vtid: string;
  layer: string;
  module: string;
  source: "oasis.events" | "github.actions" | "gcp.deploy" | "agent.ping";
  kind: "workflow_run" | "event" | "deploy" | "ping" | "task.init";
  status: "queued" | "in_progress" | "success" | "failure" | "info";
  title: string;
  ref?: string;
  link?: string;
}

type ConnectionState = "CONNECTING" | "LIVE" | "MOCK MODE";
type ScopeFilter = "ALL" | string;

interface DevHubFeedProps {
  onVTIDClick?: () => void;
  isFocused?: boolean;
  hasUnread?: boolean;
}

const getStatusColor = (status: FeedEvent["status"]) => {
  switch (status) {
    case "success": return "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400";
    case "failure": return "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400";
    case "in_progress": return "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "queued": return "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    default: return "border-border bg-muted text-muted-foreground";
  }
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour12: false });
  } catch {
    return iso;
  }
};

export function DevHubFeed({ onVTIDClick, isFocused = true, hasUnread = false }: DevHubFeedProps) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("CONNECTING");
  const [scope, setScope] = useState<ScopeFilter>("ALL");
  const [filterQuery, setFilterQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(200);
  const [highlightedVTID, setHighlightedVTID] = useState<string | null>(null);
  const { setActiveVTID } = useActiveVTID();
  const { toast } = useToast();
  
  const currentVTID = "DEV-CICDL-0031";
  const scrollRef = useRef<HTMLDivElement>(null);

  // SSE connection with fallback
  useEffect(() => {
    setConnectionState("CONNECTING");
    const sseBaseUrl = "https://vitana-gateway-86804897789.us-central1.run.app";
    const vtidParam = scope === "ALL" ? "ALL" : currentVTID;
    const url = `${sseBaseUrl}/api/v1/devhub/feed?vtid=${vtidParam}`;
    
    const es = new EventSource(url);
    let connected = false;

    const onMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        
        // Skip heartbeat messages
        if (data.type === "heartbeat") {
          return;
        }
        
        // Process actual feed events
        const event = data as FeedEvent;
        connected = true;
        setConnectionState("LIVE");
        
        if (!paused) {
          setEvents(prev => [event, ...prev].slice(0, 500));
        }
      } catch (err) {
        console.error("Failed to parse feed event:", err);
      }
    };

    const onError = () => {
      if (connected) {
        setConnectionState("CONNECTING");
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
          setConnectionState("MOCK MODE");
          toast({
            title: "Connection Failed",
            description: "Using mock data. Live feed unavailable.",
            variant: "destructive",
          });
        } catch (err) {
          console.error("Failed to load mock data:", err);
          setConnectionState("MOCK MODE");
        }
      }
    }, 1000);

    return () => {
      clearTimeout(fallbackTimer);
      es.close();
    };
  }, [scope, paused, currentVTID]);

  const filteredEvents = useMemo(() => {
    // Filter out invalid events
    const validEvents = events.filter(e => e.title && e.ts && e.vtid);
    
    const needle = filterQuery.trim().toLowerCase();
    if (!needle) return validEvents;
    
    return validEvents.filter(e =>
      (e.title || "").toLowerCase().includes(needle) ||
      (e.ref || "").toLowerCase().includes(needle) ||
      (e.source || "").toLowerCase().includes(needle) ||
      (e.vtid || "").toLowerCase().includes(needle) ||
      `${e.layer}-${e.module}`.toLowerCase().includes(needle)
    );
  }, [events, filterQuery]);

  const shownEvents = filteredEvents.slice(0, visibleCount);

  const handleVTIDClick = (event: FeedEvent) => {
    setActiveVTID({
      id: event.vtid,
      label: event.vtid,
      tenant: 'system',
    });
    
    // Highlight all events with same VTID
    setHighlightedVTID(event.vtid);
    setTimeout(() => setHighlightedVTID(null), 3000);
    
    // Dispatch global event for Chat to listen
    window.dispatchEvent(new CustomEvent("vitana:openChat", {
      detail: { vtid: event.vtid, source: "devhub-feed", event }
    }));
    
    onVTIDClick?.();
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + 200, filteredEvents.length));
  };

  return (
    <div className={cn(
      "h-full flex flex-col border-r transition-all",
      isFocused ? "border-primary/50" : "border-border opacity-70"
    )}>
      {/* Header Controls */}
      <div className="flex flex-col gap-2 px-3 py-2 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm tracking-wide">Live Console</h3>
            {hasUnread && !isFocused && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
                •
              </Badge>
            )}
            {connectionState === "LIVE" && (
              <Badge variant="default" className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                LIVE
              </Badge>
            )}
            {connectionState === "CONNECTING" && (
              <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                CONNECTING...
              </Badge>
            )}
            {connectionState === "MOCK MODE" && (
              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-border">
                MOCK MODE
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPaused(!paused)}
            className="h-6 gap-1 px-2"
          >
            {paused ? (
              <>
                <Play className="h-3 w-3" />
                <span className="text-xs">Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" />
                <span className="text-xs">Pause</span>
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
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
            >
              ALL
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

          {/* Text Filter */}
          <Input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter events..."
            className="h-6 text-xs flex-1"
          />
        </div>
      </div>

      {/* Vertical Feed */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        {shownEvents.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-xs text-muted-foreground">No events yet...</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {shownEvents.map((event, i) => (
              <div
                key={`${event.vtid}-${event.ts}-${i}`}
                className={cn(
                  "px-3 py-1 hover:bg-accent/50 transition-all",
                  highlightedVTID === event.vtid && "bg-primary/10 border-l-2 border-l-primary"
                )}
              >
                <div className="grid grid-cols-[60px_1fr] items-start gap-3">
                  {/* Timestamp */}
                  <div className="text-[10px] text-muted-foreground font-mono pt-0.5">
                    {formatTime(event.ts)}
                  </div>

                  {/* Event Details */}
                  <div className="min-w-0 space-y-0.5">
                    {/* Title + Status */}
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[12px] leading-tight">{event.title}</span>
                      {event.link ? (
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold transition-all hover:scale-105 whitespace-nowrap",
                            getStatusColor(event.status)
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {event.status}
                        </a>
                      ) : (
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold whitespace-nowrap",
                            getStatusColor(event.status)
                          )}
                        >
                          {event.status}
                        </span>
                      )}
                    </div>
                    
                    {/* Layer, Module, VTID */}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="uppercase">{event.layer}</span>
                      <span>•</span>
                      <span className="uppercase">{event.module}</span>
                      <span>•</span>
                      <button
                        onClick={() => handleVTIDClick(event)}
                        className="font-semibold text-foreground hover:text-primary underline underline-offset-2 transition-colors"
                      >
                        {event.vtid}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {visibleCount < filteredEvents.length && (
          <div className="p-4 text-center border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              className="text-xs"
            >
              Load more ({filteredEvents.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Footer Info */}
      <div className="px-3 py-1.5 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground">
          {filteredEvents.length > 0 ? `${filteredEvents.length} events` : 'No events'}
          {filterQuery && ` • Filtered`}
          {paused && ` • Paused`}
          {' • '}Click VTID to open details
        </p>
      </div>
    </div>
  );
}
