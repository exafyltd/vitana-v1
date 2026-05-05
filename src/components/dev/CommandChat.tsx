import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Clock, Activity, ChevronDown } from "lucide-react";
import { useActiveVTID } from "@/context/ActiveVTIDContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { t } from '@/lib/i18n-toast';

interface CommandChatProps {
  isFocused?: boolean;
  hasUnread?: boolean;
}

interface FeedEvent {
  ts: string;
  vtid: string;
  layer: string;
  module: string;
  source: string;
  kind: string;
  status: "queued" | "in_progress" | "success" | "failure" | "info";
  title: string;
  ref?: string;
  link?: string;
}

export function CommandChat({ isFocused = true, hasUnread = false }: CommandChatProps) {
  const { activeVTID, setActiveVTID } = useActiveVTID();
  const [selectedEvent, setSelectedEvent] = useState<FeedEvent | null>(null);
  const [vtidTimeline, setVtidTimeline] = useState<FeedEvent[]>([]);

  // Listen for VTID selection from DevHubFeed
  useEffect(() => {
    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { vtid, event } = customEvent.detail;
      
      if (vtid) {
        setActiveVTID({
          id: vtid,
          label: vtid,
          tenant: 'system',
        });
        
        setSelectedEvent(event || null);
        
        // Fetch timeline for this VTID
        try {
          const baseUrl = import.meta.env.VITE_EVENTS_BASE_URL || import.meta.env.VITE_GATEWAY_BASE || '/api/v1';
          const response = await fetch(
            `${baseUrl}/oasis/events?vtid=${vtid}&limit=50`
          );
          if (response.ok) {
            const data = await response.json();
            setVtidTimeline(data.events || []);
          } else {
            // Fallback: show only the clicked event
            setVtidTimeline(event ? [event] : []);
          }
        } catch (err) {
          console.error("Failed to fetch VTID timeline:", err);
          setVtidTimeline(event ? [event] : []);
        }
      }
    };
    
    window.addEventListener("vitana:openChat", handler);
    return () => window.removeEventListener("vitana:openChat", handler);
  }, [setActiveVTID]);

  const getStatusColor = (status: FeedEvent["status"]) => {
    switch (status) {
      case "success": return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "failure": return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
      case "in_progress": return "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "queued": return "bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatRelativeTime = (iso: string) => {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return iso;
    }
  };

  const getSourceColor = (source: string) => {
    if (source.includes("github")) return "#007aff";
    if (source.includes("gcp")) return "#28a745";
    if (source.includes("oasis")) return "#8854d0";
    if (source.includes("agent")) return "#6c757d";
    return "#6c757d";
  };

  const getSourceLabel = (source: string) => {
    if (source.includes("github")) return "GitHub";
    if (source.includes("gcp")) return "GCP";
    if (source.includes("oasis")) return "OASIS";
    if (source.includes("agent")) return "Agent";
    return source;
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "h-full flex flex-col transition-all",
        isFocused ? "border-l border-primary/50" : "border-l border-border opacity-70"
      )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm tracking-wide">{t('screens.dev.commandChat')}</h3>
          {hasUnread && !isFocused && (
            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
              •
            </Badge>
          )}
        </div>
        {activeVTID && (
          <Badge variant="outline" className="text-xs">
            {activeVTID.label}
          </Badge>
        )}
      </div>

        {/* Chat Area */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {selectedEvent ? (
              <Card>
                <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">{selectedEvent.vtid}</CardTitle>
                  <CardDescription className="mt-1">
                    {selectedEvent.layer}-{selectedEvent.module}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(selectedEvent.status)}>
                  {selectedEvent.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event Title */}
              <div>
                <h4 className="text-sm font-semibold mb-1">{t('screens.dev.event')}</h4>
                <p className="text-sm text-muted-foreground">{selectedEvent.title}</p>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{formatTime(selectedEvent.ts)}</span>
              </div>

              {/* Reference */}
              {selectedEvent.ref && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Reference</h4>
                  <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
                    {selectedEvent.ref}
                  </code>
                </div>
              )}

              {/* Source Info */}
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {selectedEvent.source} • {selectedEvent.kind}
                </span>
              </div>

                {/* Timeline View */}
                {vtidTimeline.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">{t('screens.dev.eventTimelineLengthEvents', { length: vtidTimeline.length })}</h4>
                    <div className="space-y-2">
                      {vtidTimeline.map((evt, idx) => (
                        <div key={idx} className="relative">
                          {/* Timeline connector */}
                          {idx < vtidTimeline.length - 1 && (
                            <div className="absolute left-[9px] top-8 w-0.5 h-full bg-border" />
                          )}
                          
                          <div className="flex items-start gap-3">
                            {/* Source Icon */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-background z-10"
                                  style={{ backgroundColor: getSourceColor(evt.source) }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Source: {getSourceLabel(evt.source)}</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Event Card */}
                            <Collapsible className="flex-1">
                              <div className="text-xs p-2 bg-muted/50 rounded border border-border">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="font-semibold">{evt.title}</span>
                                    <Badge className={getStatusColor(evt.status)} variant="outline">
                                      {evt.status}
                                    </Badge>
                                  </div>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-muted-foreground">
                                      {formatRelativeTime(evt.ts)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{formatTime(evt.ts)}</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                {/* Expandable JSON */}
                                <CollapsibleContent className="mt-2">
                                  <pre className="text-[10px] bg-background p-2 rounded overflow-x-auto">
                                    {JSON.stringify(evt, null, 2)}
                                  </pre>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Action Links */}
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">{t('screens.dev.actions')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="text-xs"
                    >
                      <a
                        href={selectedEvent.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('screens.dev.viewWorkflow')} <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-xs">
                    {t('screens.dev.viewLogs')} <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    {t('screens.dev.viewDeployment')} <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Raw Event Data */}
              <details className="pt-4 border-t">
                <summary className="text-sm font-semibold cursor-pointer hover:text-primary">
                  {t('screens.dev.rawEventData')}
                </summary>
                <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </details>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <p className="text-sm text-muted-foreground mb-4">
                  {activeVTID 
                    ? `Select an event from the Live Console to view details`
                    : "Click a VTID in the Live Console to open its details"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('screens.dev.cardViewWillShowEventTimeline')}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground">
          {t('screens.dev.commandChatReadyAipoweredWorkflowAssistance')}
        </p>
      </div>
    </div>
  </TooltipProvider>
  );
}
