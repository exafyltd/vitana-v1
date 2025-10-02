import React, { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar,
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Plus,
  AlertTriangle,
  Users,
  MapPin,
  Zap,
  CheckCircle,
  Bell,
  Heart,
  Dumbbell,
  Coffee,
  Loader2,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { EventDetailsPanel } from "./EventDetailsPanel";
import { NaturalLanguageInput } from "./NaturalLanguageInput";
import { CalendarSkeleton, CalendarListSkeleton } from "./CalendarSkeleton";

interface EnhancedCalendarPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date | null;
  initialView?: 'today' | 'week' | 'month';
}

const getTypeColor = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'personal': return 'bg-blue-500/20 text-blue-600 border-blue-200';
    case 'community': return 'bg-purple-500/20 text-purple-600 border-purple-200';
    case 'professional': return 'bg-green-500/20 text-green-600 border-green-200';
    case 'health': return 'bg-red-500/20 text-red-600 border-red-200';
    case 'workout': return 'bg-orange-500/20 text-orange-600 border-orange-200';
    case 'nutrition': return 'bg-emerald-500/20 text-emerald-600 border-emerald-200';
    default: return 'bg-gray-500/20 text-gray-600 border-gray-200';
  }
};

const getTypeIcon = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'personal': return <Heart className="h-3 w-3" />;
    case 'community': return <Users className="h-3 w-3" />;
    case 'professional': return <Users className="h-3 w-3" />;
    case 'health': return <Heart className="h-3 w-3" />;
    case 'workout': return <Dumbbell className="h-3 w-3" />;
    case 'nutrition': return <Coffee className="h-3 w-3" />;
    default: return <Calendar className="h-3 w-3" />;
  }
};

const getStatusIcon = (status: CalendarEvent['status']) => {
  switch (status) {
    case 'conflict': return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    case 'pending': return <Clock className="h-3 w-3 text-blue-500" />;
    case 'confirmed': return <CheckCircle className="h-3 w-3 text-green-500" />;
    default: return null;
  }
};

const getPriorityColor = (priority: CalendarEvent['priority']) => {
  switch (priority) {
    case 'high': return 'border-l-red-500';
    case 'medium': return 'border-l-yellow-500';
    case 'low': return 'border-l-gray-400';
    default: return 'border-l-gray-300';
  }
};

export function EnhancedCalendarPopup({ 
  open, 
  onOpenChange,
  initialDate,
  initialView = 'today'
}: EnhancedCalendarPopupProps) {
  const { toast } = useToast();
  const { events, loading, addEvent, removeEvent, getEventsForDate, getUpcomingEvents, fetchEvents } = useCalendarEvents();
  
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>(initialView);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'needs-sync'>('synced');
  const [detailsPanelEvent, setDetailsPanelEvent] = useState<CalendarEvent | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  
  const upcomingEvents = getUpcomingEvents(6);
  const todayEvents = getEventsForDate(new Date());
  const conflictCount = events.filter(e => e.status === 'conflict').length;
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForWeekDay = (date: Date) => {
    return getEventsForDate(date);
  };

  const handleEventCreate = async (event: Partial<CalendarEvent>) => {
    try {
      await addEvent({
        title: event.title || 'Untitled Event',
        description: event.description || '',
        start_time: event.start_time || new Date().toISOString(),
        end_time: event.end_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        location: event.location,
        event_type: event.event_type || 'personal',
        status: 'confirmed',
        priority: event.priority || 'medium',
        is_recurring: false,
        attendees_count: 0,
        has_rewards: false,
        source_type: 'manual',
        user_id: ''
      });

      setShowQuickAdd(false);
      toast({
        title: "Event created",
        description: "Your event has been added to the calendar",
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await removeEvent(eventId);
      toast({
        title: "Event deleted",
        description: "The event has been removed from your calendar",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleSyncExternal = () => {
    toast({
      title: "External Sync",
      description: "Syncing with external calendars...",
    });
    // Simulate sync
    setSyncStatus('synced');
  };

  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    const days = direction === 'next' ? 7 : -7;
    setCurrentWeek(new Date(currentWeek.getTime() + days * 24 * 60 * 60 * 1000));
  };

  const toggleDayExpanded = (dayKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  const formatEventTime = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  React.useEffect(() => {
    if (open) {
      fetchEvents();
      if (initialDate) setSelectedDate(initialDate);
      if (initialView) setActiveTab(initialView);
    }
  }, [open, fetchEvents, initialDate, initialView]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          {/* Header with Actions */}
          <DialogHeader className="px-6 pt-6 pb-3 space-y-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span>Smart Calendar</span>
              </DialogTitle>
              
              <div className="flex items-center gap-2">
                {/* Add Event Button */}
                <Button
                  size="sm"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Event
                </Button>

                {/* Sync Status */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncExternal}
                  className="gap-2"
                >
                  {syncStatus === 'synced' ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span className="hidden sm:inline">Synced</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 text-amber-600" />
                      <span className="hidden sm:inline">Sync</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {conflictCount > 0 && (
              <Badge variant="destructive" className="w-fit bg-amber-500 hover:bg-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {conflictCount} Conflicts
              </Badge>
            )}
          </DialogHeader>

          {/* Quick Add Section */}
          {showQuickAdd && (
            <div className="px-6 py-3 border-b bg-muted/30">
              <NaturalLanguageInput
                onEventCreate={handleEventCreate}
                onCancel={() => setShowQuickAdd(false)}
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'today' | 'week' | 'month')} 
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mx-6 mt-3 grid w-auto grid-cols-3">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>

            {/* Today View */}
            <TabsContent value="today" className="flex-1 overflow-hidden mt-3">
              <ScrollArea className="h-[450px] px-6">
                <div className="space-y-3 pb-4">
                  {loading ? (
                    <CalendarSkeleton />
                  ) : todayEvents.length > 0 ? (
                    todayEvents.map((event) => (
                      <Card 
                        key={event.id} 
                        className={cn(
                          "p-3 border-l-4 cursor-pointer hover:shadow-md transition-shadow",
                          getPriorityColor(event.priority)
                        )}
                        onClick={() => setDetailsPanelEvent(event)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-xs px-2 py-0.5 gap-1", getTypeColor(event.event_type))}>
                                {getTypeIcon(event.event_type)}
                                <span className="capitalize">{event.event_type}</span>
                              </Badge>
                              {event.has_rewards && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-yellow-300 text-yellow-600">
                                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                                  +10
                                </Badge>
                              )}
                              {getStatusIcon(event.status)}
                            </div>
                            <h4 className="font-medium truncate">{event.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatEventTime(event.start_time, event.end_time)}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </span>
                              )}
                              {event.attendees_count && event.attendees_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {event.attendees_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium mb-1">No events today</p>
                      <p className="text-sm mb-4">Try Quick Add or let Autopilot plan your day</p>
                      <Button variant="outline" size="sm" onClick={() => setShowQuickAdd(true)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Event
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Week View */}
            <TabsContent value="week" className="flex-1 overflow-hidden mt-3">
              <div className="space-y-3 px-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('prev')}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('next')}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pb-4">
                    {weekDays.map((day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const dayEvents = getEventsForWeekDay(day);
                      const isExpanded = expandedDays.has(dayKey);
                      const isTodayDate = isToday(day);

                      return (
                        <Card key={dayKey} className={cn("overflow-hidden", isTodayDate && "border-primary")}>
                          <button
                            onClick={() => toggleDayExpanded(dayKey)}
                            className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={cn("font-medium", isTodayDate && "text-primary")}>
                                  {format(day, 'EEEE, MMM d')}
                                </p>
                                {dayEvents.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                              <ChevronRight 
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  isExpanded && "rotate-90"
                                )} 
                              />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-2 border-t">
                              {dayEvents.length > 0 ? (
                                dayEvents.map((event) => (
                                  <div
                                    key={event.id}
                                    onClick={() => setDetailsPanelEvent(event)}
                                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                                  >
                                    <div className={cn(
                                      "w-2 h-2 rounded-full shrink-0",
                                      getTypeColor(event.event_type).split(' ')[0]
                                    )} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{event.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatEventTime(event.start_time, event.end_time)}
                                      </p>
                                    </div>
                                    {getStatusIcon(event.status)}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground py-2">No events</p>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Month View */}
            <TabsContent value="month" className="flex-1 overflow-hidden mt-3">
              <div className="px-6 space-y-3">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border pointer-events-auto"
                />

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    Events on {format(selectedDate, 'MMMM d, yyyy')}
                  </h4>
                  <ScrollArea className="h-[200px]">
                    {loading ? (
                      <CalendarListSkeleton />
                    ) : (() => {
                      const selectedDateEvents = getEventsForDate(selectedDate);
                      return selectedDateEvents.length > 0 ? (
                        <div className="space-y-2 pb-4">
                          {selectedDateEvents.map((event) => (
                            <div
                              key={event.id}
                              onClick={() => setDetailsPanelEvent(event)}
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            >
                              <div className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                getTypeColor(event.event_type).split(' ')[0]
                              )} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatEventTime(event.start_time, event.end_time)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-4">No events on this date</p>
                      );
                    })()}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="px-6 py-3 border-t flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Details Side Panel */}
      <EventDetailsPanel
        open={!!detailsPanelEvent}
        onOpenChange={(open) => !open && setDetailsPanelEvent(null)}
        event={detailsPanelEvent}
        onDelete={handleDeleteEvent}
        onInvite={(event) => {
          toast({
            title: "Invite followers",
            description: "Feature coming soon",
          });
        }}
        onShare={(event) => {
          toast({
            title: "Share to group",
            description: "Feature coming soon",
          });
        }}
      />
    </>
  );
}
