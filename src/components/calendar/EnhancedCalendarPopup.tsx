import React, { useState, useEffect } from "react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  addMinutes,
  isSameMonth,
  isWithinInterval,
  getHours,
  getMinutes
} from "date-fns";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar,
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Plus,
  Users,
  MapPin,
  Briefcase,
  Heart,
  Dumbbell,
  Coffee,
  CheckCircle2,
  RefreshCw,
  Edit,
  Trash2,
  MessageCircle,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { EventDetailsPanel } from "./EventDetailsPanel";
import { NaturalLanguageInput } from "./NaturalLanguageInput";
import { CalendarListSkeleton } from "./CalendarSkeleton";

interface EnhancedCalendarPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date | null;
  initialView?: 'today' | 'week' | 'month';
}

// Category color mapping using design tokens
const getCategoryColor = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'professional': return 'hsl(var(--pill-exercise-accent))'; // Work = Exercise gray
    case 'health': return 'hsl(var(--pill-mental-accent))'; // Health = Mental pink
    case 'workout': return 'hsl(var(--pill-exercise-accent))'; // Workout = Exercise
    case 'nutrition': return 'hsl(var(--pill-nutrition-accent))'; // Nutrition green
    case 'community': return 'hsl(var(--domain-community-accent))'; // Community pink
    case 'personal': return 'hsl(var(--sys-vitana-accent))'; // Personal = Vitana teal
    default: return 'hsl(var(--util-calendar-accent))'; // Default calendar gray
  }
};

const getCategoryIcon = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'professional': return Briefcase;
    case 'health': return Heart;
    case 'workout': return Dumbbell;
    case 'nutrition': return Coffee;
    case 'community': return Users;
    case 'personal': return Heart;
    default: return Calendar;
  }
};

const getCategoryBadge = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'professional': return 'bg-pill-exercise-tint text-pill-exercise-accent border-pill-exercise-accent/20';
    case 'health': return 'bg-pill-mental-tint text-pill-mental-accent border-pill-mental-accent/20';
    case 'workout': return 'bg-pill-exercise-tint text-pill-exercise-accent border-pill-exercise-accent/20';
    case 'nutrition': return 'bg-pill-nutrition-tint text-pill-nutrition-accent border-pill-nutrition-accent/20';
    case 'community': return 'bg-domain-community-tint text-domain-community-accent border-domain-community-accent/20';
    case 'personal': return 'bg-sys-vitana-tint text-sys-vitana-accent border-sys-vitana-accent/20';
    default: return 'bg-util-calendar-tint text-util-calendar-accent border-util-calendar-accent/20';
  }
};

export function EnhancedCalendarPopup({ 
  open, 
  onOpenChange,
  initialDate,
  initialView = 'today'
}: EnhancedCalendarPopupProps) {
  const { toast } = useToast();
  const { events, loading, addEvent, removeEvent, getEventsForDate, fetchEvents } = useCalendarEvents();
  
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>(initialView);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'needs-sync'>('synced');
  const [detailsPanelEvent, setDetailsPanelEvent] = useState<CalendarEvent | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date>(new Date());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  const todayEvents = getEventsForDate(new Date()).sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Check if there's an ongoing event
  const now = new Date();
  const ongoingEvent = todayEvents.find(event => {
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : addMinutes(start, 60);
    return now >= start && now <= end;
  });

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
    setSyncStatus('needs-sync');
    toast({
      title: "Syncing...",
      description: "Syncing with external calendars",
    });
    setTimeout(() => {
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      toast({
        title: "Synced",
        description: "Calendar is up to date",
      });
    }, 1500);
  };

  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    const days = direction === 'next' ? 7 : -7;
    setCurrentWeek(new Date(currentWeek.getTime() + days * 24 * 60 * 60 * 1000));
  };

  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    const months = direction === 'next' ? 1 : -1;
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + months);
    setCurrentMonth(newMonth);
  };

  const formatEventTime = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : addMinutes(start, 60);
    return `${format(start, 'h:mm a')}–${format(end, 'h:mm a')}`;
  };

  const getTimeSinceSync = () => {
    const diff = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  useEffect(() => {
    if (open) {
      fetchEvents();
      if (initialDate) setSelectedDate(initialDate);
      if (initialView) setActiveTab(initialView);
    }
  }, [open, initialDate, initialView]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          setShowQuickAdd(true);
          break;
        case 't':
          e.preventDefault();
          setActiveTab('today');
          break;
        case 'w':
          e.preventDefault();
          setActiveTab('week');
          break;
        case 'm':
          e.preventDefault();
          setActiveTab('month');
          break;
        case 'arrowleft':
          if (activeTab === 'week') handleNavigateWeek('prev');
          if (activeTab === 'month') handleNavigateMonth('prev');
          break;
        case 'arrowright':
          if (activeTab === 'week') handleNavigateWeek('next');
          if (activeTab === 'month') handleNavigateMonth('next');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [open, activeTab]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[920px] max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0 rounded-[20px] shadow-2xl">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-util-calendar-tint flex items-center justify-center border border-util-calendar-accent/20">
                  <Calendar className="w-4 h-4 text-util-calendar-accent" />
                </div>
                <h2 className="text-lg font-semibold">Smart Calendar</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="gap-1.5 h-9"
                >
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncExternal}
                  className="gap-2 h-9"
                >
                  {syncStatus === 'synced' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-pill-nutrition-accent" />
                      <span className="text-xs">Synced</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 text-sys-autopilot-accent animate-spin" />
                      <span className="text-xs">Syncing</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Add Input */}
            {showQuickAdd && (
              <div className="pt-3 border-t">
                <NaturalLanguageInput
                  onEventCreate={handleEventCreate}
                  onCancel={() => setShowQuickAdd(false)}
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'today' | 'week' | 'month')} 
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="border-b px-6">
              <TabsList className="h-11 bg-transparent p-0 gap-1">
                <TabsTrigger 
                  value="today" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent font-medium px-4"
                >
                  Today
                </TabsTrigger>
                <TabsTrigger 
                  value="week"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent font-medium px-4"
                >
                  Week
                </TabsTrigger>
                <TabsTrigger 
                  value="month"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent font-medium px-4"
                >
                  Month
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Today View - Agenda */}
            <TabsContent value="today" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-[calc(80vh-280px)]">
                <div className="px-6 py-4">
                  {loading ? (
                    <CalendarListSkeleton />
                  ) : (
                    <>
                      {/* Now Indicator */}
                      {ongoingEvent && (
                        <div className="mb-4 px-4 py-2.5 bg-sys-ai-tint border border-sys-ai-accent/30 rounded-lg">
                          <p className="text-xs font-medium text-sys-ai-accent flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sys-ai-accent opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-sys-ai-accent"></span>
                            </span>
                            Now: {ongoingEvent.title}
                          </p>
                        </div>
                      )}

                      {todayEvents.length > 0 ? (
                        <div className="space-y-1">
                          {todayEvents.map((event) => {
                            const CategoryIcon = getCategoryIcon(event.event_type);
                            return (
                              <div
                                key={event.id}
                                className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-border"
                                onClick={() => setDetailsPanelEvent(event)}
                              >
                                {/* Color Dot */}
                                <div 
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: getCategoryColor(event.event_type) }}
                                />

                                {/* Time */}
                                <div className="text-sm text-muted-foreground min-w-[140px]">
                                  {formatEventTime(event.start_time, event.end_time)}
                                </div>

                                {/* Title & Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-semibold text-sm truncate">{event.title}</h4>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {event.location && (
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {event.location}
                                      </span>
                                    )}
                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", getCategoryBadge(event.event_type))}>
                                      <CategoryIcon className="h-3 w-3 mr-0.5" />
                                      {event.event_type}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {event.attendees_count && event.attendees_count > 0 && (
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                      <MessageCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailsPanelEvent(event);
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 w-7 p-0 text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEvent(event.id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                          <h3 className="text-base font-semibold mb-1">Nothing scheduled</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Try Quick Add or let Autopilot plan your day
                          </p>
                          <Button variant="outline" size="sm" onClick={() => setShowQuickAdd(true)}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add Event
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Week View */}
            <TabsContent value="week" className="flex-1 overflow-hidden m-0">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">
                    {format(weekStart, 'MMM d')}–{format(weekEnd, 'MMM d, yyyy')}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[calc(80vh-280px)]">
                  {loading ? (
                    <CalendarListSkeleton />
                  ) : (
                    <div className="grid grid-cols-7 gap-2 pb-4">
                      {weekDays.map((day) => {
                        const dayEvents = getEventsForDate(day).sort((a, b) => 
                          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                        );
                        const isTodayDate = isToday(day);

                        return (
                          <div 
                            key={format(day, 'yyyy-MM-dd')} 
                            className={cn(
                              "min-h-[120px] rounded-lg border p-2",
                              isTodayDate && "border-primary bg-primary/5"
                            )}
                          >
                            <div className="mb-2">
                              <p className={cn(
                                "text-xs font-medium",
                                isTodayDate && "text-primary"
                              )}>
                                {format(day, 'EEE')}
                              </p>
                              <p className={cn(
                                "text-lg font-semibold",
                                isTodayDate && "text-primary"
                              )}>
                                {format(day, 'd')}
                              </p>
                            </div>

                            <div className="space-y-1">
                              {dayEvents.slice(0, 4).map((event) => (
                                <div
                                  key={event.id}
                                  className="px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-muted/80 transition-colors"
                                  style={{ 
                                    borderLeft: `3px solid ${getCategoryColor(event.event_type)}`,
                                    backgroundColor: `${getCategoryColor(event.event_type)}15`
                                  }}
                                  onClick={() => setDetailsPanelEvent(event)}
                                >
                                  <p className="font-medium truncate text-[11px] leading-tight mb-0.5">
                                    {event.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {format(new Date(event.start_time), 'h:mm a')}
                                  </p>
                                </div>
                              ))}
                              {dayEvents.length > 4 && (
                                <p className="text-[10px] text-muted-foreground px-2">
                                  +{dayEvents.length - 4} more
                                </p>
                              )}
                              {dayEvents.length === 0 && (
                                <p className="text-[10px] text-muted-foreground px-2 py-1">
                                  No events
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Month View */}
            <TabsContent value="month" className="flex-1 overflow-hidden m-0">
              <div className="px-6 py-4 flex gap-6">
                {/* Calendar Grid */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleNavigateMonth('prev')}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleNavigateMonth('next')}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CalendarComponent
                    mode="single"
                    selected={selectedMonthDay}
                    onSelect={(date) => date && setSelectedMonthDay(date)}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    className="rounded-lg border pointer-events-auto"
                  />
                </div>

                {/* Selected Day Agenda */}
                <div className="w-80 border-l pl-6">
                  <h4 className="text-sm font-semibold mb-3">
                    {format(selectedMonthDay, 'EEEE, MMM d')}
                  </h4>

                  <ScrollArea className="h-[calc(80vh-320px)]">
                    {loading ? (
                      <CalendarListSkeleton />
                    ) : (() => {
                      const dayEvents = getEventsForDate(selectedMonthDay).sort((a, b) => 
                        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                      );

                      return dayEvents.length > 0 ? (
                        <div className="space-y-2 pb-4">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="group flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-border transition-all"
                              onClick={() => setDetailsPanelEvent(event)}
                            >
                              <div 
                                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                                style={{ backgroundColor: getCategoryColor(event.event_type) }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate mb-0.5">{event.title}</p>
                                <p className="text-xs text-muted-foreground mb-1">
                                  {formatEventTime(event.start_time, event.end_time)}
                                </p>
                                {event.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {event.location}
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsPanelEvent(event);
                                }}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-sm text-muted-foreground">No events on this date</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => setShowQuickAdd(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Event
                          </Button>
                        </div>
                      );
                    })()}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 z-10 bg-background border-t px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Last synced {getTimeSinceSync()}
            </p>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
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
