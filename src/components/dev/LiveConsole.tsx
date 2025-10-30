import { useEffect, useRef } from "react";
import { useCommandHub } from "@/state/commandHubStore";
import { fetchEvents } from "@/lib/commandHubApi";
import { useSSE } from "@/lib/useSSE";
import { Event } from "@/types/command-hub";
import { Badge } from "@/components/ui/badge";

const BASE_EVENTS = import.meta.env.VITE_EVENTS_BASE_URL || "/api/v1";

export default function LiveConsole() {
  const { 
    events, 
    prependHistory, 
    addEvents, 
    setActiveVTID, 
    nextCursor, 
    paused, 
    setPaused, 
    setStreaming,
    streaming 
  } = useCommandHub();
  
  const listRef = useRef<HTMLDivElement>(null);

  // Initial history load
  useEffect(() => {
    fetchEvents({ limit: 50 })
      .then(({ items, next_cursor }) => prependHistory(items, next_cursor))
      .catch(err => console.error("Failed to load history:", err));
  }, []);

  // Streaming (SSE)
  useSSE({
    url: `${BASE_EVENTS}/events/stream`,
    onStatus: (ok) => setStreaming(ok),
    onEvent: (ev: Event) => {
      if (!paused) addEvents([ev]);
    }
  });

  // Infinite scroll: fetch older when scrolled to top 10%
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    
    const onScroll = async () => {
      if (el.scrollTop < el.clientHeight * 0.1 && nextCursor) {
        try {
          const { items, next_cursor } = await fetchEvents({ 
            cursor: nextCursor, 
            limit: 50 
          });
          prependHistory(items, next_cursor);
        } catch (err) {
          console.error("Failed to load more events:", err);
        }
      }
    };
    
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [nextCursor]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Live Console</span>
          <Badge variant={streaming ? "default" : "secondary"}>
            {streaming ? "LIVE" : "RECONNECTING"}
          </Badge>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input 
            type="checkbox" 
            checked={paused} 
            onChange={e => setPaused(e.target.checked)}
            className="cursor-pointer"
          />
          Pause
        </label>
      </div>
      
      <div 
        ref={listRef} 
        className="flex-1 overflow-auto px-2" 
        aria-live="polite" 
        aria-busy={false}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p>No events in last 72h</p>
              <p className="text-sm">Events will appear here in real-time</p>
            </div>
          </div>
        ) : (
          events.map(ev => (
            <button 
              key={ev.id} 
              className="w-full text-left py-2 px-2 border-b hover:bg-accent/50 transition-colors rounded"
              onClick={() => ev.vtid && setActiveVTID(ev.vtid)}
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant={getBadgeVariant(ev.status)}>
                  {ev.status.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {ev.layer}{ev.module ? ` • ${ev.module}` : ""}
                </span>
                {ev.vtid && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-secondary">
                    {ev.vtid}
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(ev.ts).toLocaleString()}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">{labelForKind(ev.kind)}</span>
                {" — "}
                {ev.title}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function labelForKind(kind: string): string {
  const map: Record<string, string> = {
    "chat.message.in": "CHAT IN",
    "chat.message.out": "CHAT OUT",
    "task.created": "TASK CREATED",
    "pipeline.completed": "PIPELINE",
    "telemetry.smoke": "SMOKE",
    "deploy.success": "DEPLOY",
    "deploy.rollback": "ROLLBACK",
  };
  return map[kind] ?? kind.toUpperCase();
}

function getBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success":
      return "default";
    case "error":
      return "destructive";
    case "warn":
      return "outline";
    default:
      return "secondary";
  }
}
