import { useEffect, useRef, useState } from "react";
import { useCommandHub } from "@/state/commandHubStore";
import { fetchEvents, postChat } from "@/lib/commandHubApi";
import { useSSE } from "@/lib/useSSE";
import { Event, Layer, Status } from "@/types/command-hub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { SoftWarningBanner } from "./SoftWarningBanner";
import { EventDetailDrawer } from "./EventDetailDrawer";
import { StatusHeaderBar } from "./status/StatusHeaderBar";
import { StatusDetailsDrawer } from "./status/StatusDetailsDrawer";
import { EmptyStatePanel } from "./status/EmptyStatePanel";
import { MiniFooterStatus } from "./status/MiniFooterStatus";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Activity } from "lucide-react";
import { SSEConnectionMonitor } from "./SSEConnectionMonitor";
import { notify, notifyError, t } from '@/lib/i18n-toast';

const BASE_EVENTS = (import.meta.env.VITE_EVENTS_BASE_URL || "/api/v1").trim();

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
    streaming,
    filters,
    setFilters
  } = useCommandHub();
  
  const listRef = useRef<HTMLDivElement>(null);
  const [bufferedEvents, setBufferedEvents] = useState<Event[]>([]);
  const [sseFailCount, setSseFailCount] = useState(0);
  const [showFallbackPrompt, setShowFallbackPrompt] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [statusDetailsOpen, setStatusDetailsOpen] = useState(false);
  const [eventRate, setEventRate] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [forceReconnectKey, setForceReconnectKey] = useState(0);
  const fallbackInterval = useRef<NodeJS.Timeout>();
  const eventCountRef = useRef(0);
  const rateIntervalRef = useRef<NodeJS.Timeout>();
  const lastStatusRef = useRef<boolean | null>(null);
  const statusTransitionCountRef = useRef(0);
  const lastToastTimeRef = useRef(0);

  const backendStatus = useBackendStatus();

  // Session storage persistence
  useEffect(() => {
    const stored = sessionStorage.getItem("commandHubState");
    if (stored) {
      try {
        const { filters: savedFilters, activeVTID } = JSON.parse(stored);
        if (savedFilters) setFilters(savedFilters);
        if (activeVTID) setActiveVTID(activeVTID);
      } catch (e) {
        console.error("Failed to restore session:", e);
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("commandHubState", JSON.stringify({ 
      filters, 
      activeVTID: useCommandHub.getState().activeVTID 
    }));
  }, [filters]);

  // Initial history load
  useEffect(() => {
    fetchEvents({ limit: 50, filters })
      .then(({ items, next_cursor }) => {
        prependHistory(items, next_cursor);
        setTotalLoaded(items.length);
      })
      .catch(err => {
        console.error("Failed to load history:", err);
        if (err.message?.includes("401")) {
          notify('toasts.dev.sessionExpired', 'toasts.dev.pleaseSign');
        }
      });
  }, [filters]);

  // Streaming (SSE) with failure tracking and circuit breaker
  // forceReconnectKey forces useSSE to remount when changed
  useSSE({
    url: `${BASE_EVENTS}/events/stream?key=${forceReconnectKey}`,
    includeCredentials: true,
    onStatus: (ok) => {
      const now = Date.now();
      const timeSinceLastStatus = lastStatusRef.current !== null ? now - lastToastTimeRef.current : Infinity;
      const statusChanged = lastStatusRef.current !== ok;
      
      // Track rapid status changes (connection flapping)
      if (statusChanged) {
        statusTransitionCountRef.current++;
        console.log(`[SSE Status] ${ok ? 'CONNECTED' : 'DISCONNECTED'} (transition #${statusTransitionCountRef.current}, last: ${lastStatusRef.current})`);
        
        // Detect flapping: 5+ transitions in 10 seconds
        if (statusTransitionCountRef.current >= 5 && timeSinceLastStatus < 10000) {
          console.error('🚨 [SSE FLAPPING DETECTED] Connection unstable - toggling rapidly');
          console.error(`   Transitions: ${statusTransitionCountRef.current} in ${timeSinceLastStatus}ms`);
          console.error('   BACKEND ISSUE: Stream likely sending malformed data or closing prematurely');
        }
      }
      
      lastStatusRef.current = ok;
      setStreaming(ok);
      backendStatus.updateSSEStatus(ok);
      
      if (!ok) {
        setSseFailCount(prev => prev + 1);
        if (sseFailCount >= 2 && !useFallback) {
          setShowFallbackPrompt(true);
        }
        
        // Only show disconnect toast if we were stable for >3s and not already in fallback
        if (timeSinceLastStatus > 3000 && !useFallback) {
          lastToastTimeRef.current = now;
          notifyError('toasts.dev.connectionLost', 'toasts.dev.attemptingReconnect');
        }
      } else {
        setSseFailCount(0);
        setShowFallbackPrompt(false);
        setUseFallback(false);
        
        // Only show reconnect toast if:
        // 1. We were previously disconnected (statusChanged)
        // 2. At least 3 seconds since last toast (debounce)
        // 3. Not a fresh page load (lastStatusRef was set before)
        if (statusChanged && timeSinceLastStatus > 3000 && lastStatusRef.current !== null) {
          lastToastTimeRef.current = now;
          notify('toasts.dev.reconnected', 'toasts.dev.liveEventStreamRestored');
        }
      }
    },
    onMaxRetriesExceeded: () => {
      console.error('🔴 Max SSE retries exceeded, activating polling fallback');
      setUseFallback(true);
      setShowFallbackPrompt(false);
      notifyError('toasts.dev.connectionFailed2', 'toasts.dev.switchedPollingMode5sRefresh');
    },
    onEvent: (ev: Event) => {
      eventCountRef.current++;
      if (paused) {
        setBufferedEvents(prev => [...prev, ev]);
      } else {
        addEvents([ev]);
        if (ev.kind === "telemetry.smoke") {
          notify('toasts.dev.smokeTestReceived', 'toasts.dev.eventArrivedSuccessfully');
        }
      }
    }
  });

  // Calculate event rate
  useEffect(() => {
    rateIntervalRef.current = setInterval(() => {
      setEventRate(eventCountRef.current);
      eventCountRef.current = 0;
    }, 1000);

    return () => {
      if (rateIntervalRef.current) clearInterval(rateIntervalRef.current);
    };
  }, []);

  // Fallback polling
  useEffect(() => {
    if (!useFallback) {
      if (fallbackInterval.current) clearInterval(fallbackInterval.current);
      return;
    }
    
    fallbackInterval.current = setInterval(async () => {
      try {
        const { items } = await fetchEvents({ limit: 10, filters });
        addEvents(items);
      } catch (err) {
        console.error("Fallback poll failed:", err);
      }
    }, 5000);

    return () => {
      if (fallbackInterval.current) clearInterval(fallbackInterval.current);
    };
  }, [useFallback, filters]);

  // Infinite scroll: fetch older when scrolled to top 10%
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    
    const onScroll = async () => {
      if (el.scrollTop < el.clientHeight * 0.1 && nextCursor) {
        try {
          const { items, next_cursor } = await fetchEvents({ 
            cursor: nextCursor, 
            limit: 50,
            filters 
          });
          prependHistory(items, next_cursor);
          setTotalLoaded(prev => prev + items.length);
        } catch (err) {
          console.error("Failed to load more events:", err);
          if (err.message?.includes("401")) {
            notify('toasts.dev.sessionExpired', 'toasts.dev.pleaseSign');
          }
        }
      }
    };
    
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [nextCursor, filters]);

  const handleUnpause = () => {
    setPaused(false);
    if (bufferedEvents.length > 0) {
      addEvents(bufferedEvents);
      setBufferedEvents([]);
    }
  };

  const handleForceReconnect = () => {
    console.log('🔄 Force reconnecting SSE...');
    
    // Close all existing connections first
    const sseManager = (window as any).sseManager;
    if (sseManager) {
      sseManager.closeAll();
    }
    
    // Reset all failure tracking and diagnostics
    setSseFailCount(0);
    setUseFallback(false);
    setShowFallbackPrompt(false);
    lastStatusRef.current = null;
    statusTransitionCountRef.current = 0;
    lastToastTimeRef.current = 0;
    
    // Force useSSE to remount by changing the URL key
    setForceReconnectKey(prev => prev + 1);
    
    // Retry backend health check
    backendStatus.retryAll();
    
    notify('toasts.dev.reconnecting', 'toasts.dev.attemptingRestoreLiveConnection');
  };

  const handleRunSmoke = async () => {
    try {
      const BASE_OPERATOR = (import.meta.env.VITE_OPERATOR_BASE_URL || "https://oasis-operator-86804897789.us-central1.run.app/api/v1").trim();
      await fetch(`${BASE_OPERATOR}/events/smoke`, { 
        method: "POST",
        mode: "cors",
        credentials: "include"
      });
      notify('toasts.dev.smokeTestSent', 'toasts.dev.waitingForEvent');
    } catch (err) {
      notifyError('toasts.dev.failedSendSmokeTest');
    }
  };

  const handleEventClick = (ev: Event) => {
    if (ev.vtid) {
      setActiveVTID(ev.vtid);
      // Trigger chat thread load in OperatorChat via store
    }
    setSelectedEvent(ev);
  };

  const filteredEvents = events.filter(ev => {
    if (filters.layer && filters.layer !== "ALL" && ev.layer !== filters.layer) return false;
    if (filters.status && filters.status !== "ALL" && ev.status !== filters.status) return false;
    if (filters.module && filters.module !== "ALL" && ev.module !== filters.module) return false;
    if (filters.vtid && ev.vtid !== filters.vtid) return false;
    return true;
  });

  const lastEvent = events[0];
  const isOffline = backendStatus.backendStatus === "OFFLINE";
  const isDegraded = !streaming && useFallback;
  const streamStatusLabel = streaming ? "SSE Live" : useFallback ? "Polling" : "Disconnected";

  return (
    <div className="h-full flex flex-col">
      {/* SSE Connection Monitor */}
      <div className="p-3 border-b">
        <SSEConnectionMonitor />
      </div>

      {/* Status Header Bar */}
      <StatusHeaderBar
        backendStatus={backendStatus.backendStatus}
        streamStatus={streamStatusLabel}
        latency={backendStatus.latency}
        lastEventTime={lastEvent?.ts}
        activeVTID={useCommandHub.getState().activeVTID}
        onOpenDetails={() => setStatusDetailsOpen(true)}
      />
      {/* SSE Failure Banner */}
      {showFallbackPrompt && (
        <SoftWarningBanner 
          message="Real-time connection unstable. Enable 5s refresh fallback?"
          dismissible={false}
        >
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => { setUseFallback(true); setShowFallbackPrompt(false); }}>
              Enable Polling
            </Button>
            <Button size="sm" variant="outline" onClick={handleForceReconnect}>
              Force Reconnect
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowFallbackPrompt(false)}>
              Dismiss
            </Button>
          </div>
        </SoftWarningBanner>
      )}
      
      {useFallback && (
        <SoftWarningBanner 
          message="⚠️ Polling mode active (5s refresh). SSE unavailable."
          dismissible={true}
        >
          <Button size="sm" onClick={handleForceReconnect} className="mt-2">
            Try Reconnecting to Live Stream
          </Button>
        </SoftWarningBanner>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{t('screens.dev.liveConsole')}</span>
          <Badge variant={streaming ? "success" : "secondary"}>
            {streaming ? "LIVE" : "RECONNECTING"}
          </Badge>
          {useFallback && <Badge variant="outline">POLLING</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant={streaming ? "outline" : "default"}
                  onClick={handleForceReconnect}
                  disabled={streaming && !useFallback}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {streaming ? "Connected" : "Reconnect"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {streaming ? "Force reconnect SSE stream" : "Reconnect to live stream"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleRunSmoke}
                    disabled={isOffline}
                  >
                    Run Smoke
                  </Button>
                </span>
              </TooltipTrigger>
              {isOffline && (
                <TooltipContent>
                  Cannot send smoke test: Backend is offline
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={paused} 
              onChange={e => paused ? handleUnpause() : setPaused(true)}
              className="cursor-pointer"
            />
            Pause
            {paused && bufferedEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {bufferedEvents.length} new
              </Badge>
            )}
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-2 border-b bg-muted/50">
        <Select value={filters.layer || "ALL"} onValueChange={(v) => setFilters({ layer: v as Layer | "ALL" })}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder={t('screens.dev.layer')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('screens.dev.allLayers')}</SelectItem>
            <SelectItem value="CICDL">CICDL</SelectItem>
            <SelectItem value="AICOR">AICOR</SelectItem>
            <SelectItem value="AGENT">AGENT</SelectItem>
            <SelectItem value="GATEWAY">GATEWAY</SelectItem>
            <SelectItem value="OASIS">OASIS</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status || "ALL"} onValueChange={(v) => setFilters({ status: v as Status | "ALL" })}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder={t('screens.dev.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('screens.dev.allStatus')}</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Event List */}
      <div 
        ref={listRef} 
        className="flex-1 overflow-auto" 
        aria-live="polite" 
        aria-busy={false}
        role="feed"
      >
        {/* Feed Instrumentation Watermark */}
        {filteredEvents.length > 0 && (
          <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b px-3 py-1 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span className="font-semibold">
                  {streaming ? "LIVE" : useFallback ? "POLLING" : "DISCONNECTED"}
                </span>
              </div>
              {streaming && eventRate > 0 && (
                <span className="text-muted-foreground">
                  {eventRate}/s rate
                </span>
              )}
              {useFallback && (
                <span className="text-muted-foreground">{t('screens.dev.text5sRefresh')}</span>
              )}
            </div>
            <div className="text-muted-foreground">
              Showing {filteredEvents.length} • Loaded {totalLoaded} more
            </div>
          </div>
        )}

        {filteredEvents.length === 0 ? (
          isOffline ? (
            <EmptyStatePanel
              type="offline"
              onRetry={() => backendStatus.retryAll()}
              onOpenDetails={() => setStatusDetailsOpen(true)}
            />
          ) : isDegraded ? (
            <EmptyStatePanel
            type="degraded"
              onForceReconnect={handleForceReconnect}
              onViewLogs={() => setStatusDetailsOpen(true)}
            />
          ) : (
            <EmptyStatePanel
              type="quiet"
              onClearFilters={() => setFilters({ layer: "ALL", status: "ALL" })}
            />
          )
        ) : (
          <div className="px-2">
            {filteredEvents.map(ev => (
            <button 
              key={ev.id} 
              className="w-full text-left py-2 px-2 border-b hover:bg-accent/50 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => handleEventClick(ev)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleEventClick(ev);
                }
              }}
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
            ))}
          </div>
        )}
      </div>

      {/* Mini Footer Status */}
      <MiniFooterStatus
        backendStatus={backendStatus.backendStatus}
        streamStatus={streamStatusLabel}
        lastEventTime={lastEvent?.ts}
        latency={backendStatus.latency}
        onOpenDetails={() => setStatusDetailsOpen(true)}
      />

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <EventDetailDrawer 
          event={selectedEvent} 
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Status Details Drawer */}
      <StatusDetailsDrawer
        open={statusDetailsOpen}
        onClose={() => setStatusDetailsOpen(false)}
        services={backendStatus.services}
        connectionEvents={backendStatus.connectionEvents}
        diagnosticInfo={backendStatus.diagnosticInfo}
        onRetryAll={() => backendStatus.retryAll()}
      />
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
