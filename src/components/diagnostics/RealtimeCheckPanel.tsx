import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, Wifi, WifiOff, AlertTriangle, Clock, Users, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  type: 'send' | 'ack' | 'delivered' | 'read' | 'typing_start' | 'typing_stop' | 'unread_change' | 'error' | 'duplicate';
  threadId?: string;
  userId?: string;
  content?: string;
  error?: string;
  latency?: number;
  isDuplicate?: boolean;
}

export interface ChannelStatus {
  name: string;
  status: 'connected' | 'reconnecting' | 'failed';
  lastActivity: string;
  subscriptionCount: number;
  eventCount: number;
}

interface RealtimeCheckPanelProps {
  isVisible: boolean;
  onClose: () => void;
  selectedThreadId?: string | null;
  context: 'global' | 'tenant';
}

export function RealtimeCheckPanel({ 
  isVisible, 
  onClose, 
  selectedThreadId, 
  context 
}: RealtimeCheckPanelProps) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChannelStatus[]>([]);
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [isSimulatingSecondUser, setIsSimulatingSecondUser] = useState(false);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const eventIdRef = useRef(0);
  const messageIdTracker = useRef(new Set<string>());

  // Add diagnostic event
  const addEvent = useCallback((event: Omit<DiagnosticEvent, 'id' | 'timestamp'>) => {
    const newEvent: DiagnosticEvent = {
      ...event,
      id: `event-${++eventIdRef.current}`,
      timestamp: new Date().toISOString(),
    };

    // Check for duplicates
    if (event.type === 'ack' && event.content) {
      const messageId = event.content.substring(0, 20); // Use first 20 chars as identifier
      if (messageIdTracker.current.has(messageId)) {
        newEvent.isDuplicate = true;
        toast({
          title: "Duplicate Message Detected",
          description: `Duplicate message: ${event.content?.substring(0, 50)}...`,
          variant: "destructive"
        });
      } else {
        messageIdTracker.current.add(messageId);
      }
    }

    setEvents(prev => [...prev.slice(-19), newEvent]);

    // Show error toast for failures
    if (event.type === 'error') {
      toast({
        title: "Real-time Error",
        description: event.error || 'Unknown error occurred',
        variant: "destructive"
      });
    }
  }, [toast]);

  // Update channel status
  const updateChannelStatus = useCallback((
    channelName: string, 
    status: ChannelStatus['status'],
    subscriptionCount?: number
  ) => {
    setChannels(prev => {
      const existing = prev.find(c => c.name === channelName);
      if (existing) {
        return prev.map(c => 
          c.name === channelName 
            ? { 
                ...c, 
                status, 
                lastActivity: new Date().toISOString(),
                subscriptionCount: subscriptionCount ?? c.subscriptionCount,
                eventCount: c.eventCount + 1
              }
            : c
        );
      } else {
        return [...prev, {
          name: channelName,
          status,
          lastActivity: new Date().toISOString(),
          subscriptionCount: subscriptionCount || 1,
          eventCount: 1
        }];
      }
    });
  }, []);

  // Expose methods to parent components via global object
  React.useEffect(() => {
    if (isVisible) {
      (window as any).realtimeDiagnostics = {
        addEvent,
        updateChannelStatus,
        trackSubscription: (subscription: string) => {
          setSubscriptions(prev => [...new Set([...prev, subscription])]);
        },
        removeSubscription: (subscription: string) => {
          setSubscriptions(prev => prev.filter(s => s !== subscription));
        }
      };
    } else {
      delete (window as any).realtimeDiagnostics;
    }

    return () => {
      delete (window as any).realtimeDiagnostics;
    };
  }, [isVisible, addEvent, updateChannelStatus]);

  // Monitor Supabase connection health
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      // Check if Supabase is connected by trying to get connection state
      const channels = supabase.getChannels();
      
      channels.forEach(channel => {
        const state = channel.state;
        updateChannelStatus(
          channel.topic, 
          state === 'joined' ? 'connected' : 
          state === 'joining' ? 'reconnecting' : 'failed',
          1
        );
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, updateChannelStatus]);

  // Simulation controls
  const handleSimulateSecondUser = useCallback(() => {
    setIsSimulatingSecondUser(!isSimulatingSecondUser);
    
    if (!isSimulatingSecondUser) {
      // Start simulation
      addEvent({
        type: 'ack',
        content: 'Second user simulation started',
        threadId: selectedThreadId || undefined
      });
      
      // Simulate typing after 2 seconds
      setTimeout(() => {
        addEvent({
          type: 'typing_start',
          userId: 'sim-user-123',
          threadId: selectedThreadId || undefined
        });
      }, 2000);
      
      // Stop typing after 4 seconds
      setTimeout(() => {
        addEvent({
          type: 'typing_stop',
          userId: 'sim-user-123',
          threadId: selectedThreadId || undefined
        });
      }, 4000);
    } else {
      addEvent({
        type: 'ack',
        content: 'Second user simulation stopped'
      });
    }
  }, [isSimulatingSecondUser, selectedThreadId, addEvent]);

  const getStatusIcon = (status: ChannelStatus['status']) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'reconnecting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getEventIcon = (type: DiagnosticEvent['type']) => {
    switch (type) {
      case 'send':
      case 'ack':
      case 'delivered':
        return <MessageSquare className="w-3 h-3" />;
      case 'typing_start':
      case 'typing_stop':
        return <Users className="w-3 h-3" />;
      case 'error':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 w-96 h-[600px] z-50 bg-card border border-border rounded-lg shadow-2xl">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Real-time Diagnostics</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Context: {context} | Thread: {selectedThreadId || 'None'}
          </p>
        </CardHeader>
        
        <CardContent className="h-[calc(100%-80px)] space-y-4">
          {/* WebSocket Status */}
          <div>
            <h4 className="text-xs font-medium mb-2">WebSocket Status</h4>
            <div className="space-y-1">
              {channels.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active channels</p>
              ) : (
                channels.map(channel => (
                  <div key={channel.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(channel.status)}
                      <span className="truncate max-w-32">{channel.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs px-1">
                        {channel.subscriptionCount}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1">
                        {channel.eventCount}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Active Subscriptions */}
          <div>
            <h4 className="text-xs font-medium mb-2">Active Subscriptions</h4>
            <div className="space-y-1">
              {subscriptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No subscriptions</p>
              ) : (
                subscriptions.map(sub => (
                  <div key={sub} className="text-xs text-muted-foreground truncate">
                    {sub}
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Event Log */}
          <div className="flex-1 min-h-0">
            <h4 className="text-xs font-medium mb-2">Event Log (Last 20)</h4>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No events logged</p>
                ) : (
                  events.slice().reverse().map(event => (
                    <div 
                      key={event.id} 
                      className={`flex items-start gap-2 text-xs p-1 rounded ${
                        event.isDuplicate ? 'bg-red-100 text-red-900' : 
                        event.type === 'error' ? 'bg-orange-100 text-orange-900' : 
                        'bg-muted/50'
                      }`}
                    >
                      {getEventIcon(event.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge variant="outline" className="text-xs px-1">
                            {event.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                          {event.latency && (
                            <Badge variant="outline" className="text-xs px-1">
                              {event.latency}ms
                            </Badge>
                          )}
                        </div>
                        {event.content && (
                          <p className="truncate text-xs">
                            {event.content.substring(0, 50)}
                            {event.content.length > 50 ? '...' : ''}
                          </p>
                        )}
                        {event.error && (
                          <p className="text-red-600 text-xs">{event.error}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Simulation Controls */}
          <div>
            <h4 className="text-xs font-medium mb-2">Simulation Controls</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs">Simulate Second User</span>
              <Switch
                checked={isSimulatingSecondUser}
                onCheckedChange={handleSimulateSecondUser}
              />
            </div>
            {isSimulatingSecondUser && (
              <p className="text-xs text-muted-foreground mt-1">
                Simulating typing indicators and message delivery
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}