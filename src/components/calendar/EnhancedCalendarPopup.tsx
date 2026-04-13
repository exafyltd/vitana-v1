import React, { useState, useEffect } from "react";
import { de as deLocale } from "date-fns/locale/de";
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
  getMinutes,
  setHours
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
import { CalendarFilters } from "./CalendarFilters";
import { WeekGridView } from "./WeekGridView";
import { AutopilotCalendarSuggestions, AutopilotSuggestion } from "./AutopilotCalendarSuggestions";
import { BookedVitanaEventsSection } from "./BookedVitanaEventsSection";
import { MobileCalendarModal } from "./MobileCalendarModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useIsMobile } from "@/hooks/use-mobile";

interface EnhancedCalendarPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date | null;
  initialView?: 'today' | 'week' | 'month';
  /** When provided, reuses the parent's hook data instead of creating a duplicate subscription */
  calendarHook?: ReturnType<typeof import('@/hooks/useCalendarEvents').useCalendarEvents>;
}

// Category color mapping using design tokens
const getCategoryColor = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'professional': return 'hsl(var(--pill-exercise-accent))';
    case 'health': return 'hsl(var(--pill-mental-accent))';
    case 'workout': return 'hsl(var(--pill-exercise-accent))';
    case 'nutrition': return 'hsl(var(--pill-nutrition-accent))';
    case 'community': return 'hsl(var(--domain-community-accent))';
    case 'personal': return 'hsl(var(--sys-vitana-accent))';
    default: return 'hsl(var(--util-calendar-accent))';
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
  initialView = 'today',
  calendarHook,
}: EnhancedCalendarPopupProps) {
  const { toast } = useToast();
  const { translate, isGerman } = useTranslation();
  const isMobile = useIsMobile();
  const ownHook = useCalendarEvents();
  const { events, loading, addEvent, removeEvent, getEventsForDate, fetchEvents } = calendarHook ?? ownHook;
  
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>(initialView);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'needs-sync'>('synced');
  const [detailsPanelEvent, setDetailsPanelEvent] = useState<CalendarEvent | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date>(new Date());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [activeFilters, setActiveFilters] = useState<CalendarEvent['event_type'][]>([]);
  const [autopilotSuggestions, setAutopilotSuggestions] = useState<AutopilotSuggestion[]>([
    {
      id: '1',
      type: 'focus-block',
      title: translate('calendar.autopilot.recommendFocus', 'Recommend focus block'),
      description: translate('calendar.autopilot.focusBlockDesc', 'You have a 90-minute window available. Perfect for deep work.'),
      suggestedTime: 'Tomorrow 9:00 AM - 10:30 AM',
    }
  ]);
  
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
        title: event.title || translate('calendar.untitledEvent', 'Untitled Event'),
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
      }, { showToast: false });

      setShowQuickAdd(false);
      toast({
        title: translate('calendar.toasts.eventCreated', 'Event created'),
        description: translate('calendar.toasts.eventCreatedDesc', 'Your event has been added to the calendar'),
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: translate('common.error', 'Error'),
        description: translate('calendar.error.failedToCreate', 'Failed to create event'),
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await removeEvent(eventId);
      toast({
        title: translate('calendar.toasts.eventDeleted', 'Event deleted'),
        description: translate('calendar.toasts.eventDeletedDesc', 'The event has been removed from your calendar'),
      });
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleSyncExternal = () => {
    setSyncStatus('needs-sync');
    toast({
      title: translate('calendar.toasts.syncingTitle', 'Syncing...'),
      description: translate('calendar.toasts.syncingDesc', 'Syncing with external calendars'),
    });
    setTimeout(() => {
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      toast({
        title: translate('calendar.toasts.syncedTitle', 'Synced'),
        description: translate('calendar.toasts.syncedDesc', 'Calendar is up to date'),
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

  const handleToggleFilter = (filter: CalendarEvent['event_type']) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleCreateEventAtTime = (date: Date, hour: number) => {
    const eventDate = setHours(date, hour);
    handleEventCreate({
      title: translate('calendar.newEvent', 'New Event'),
      start_time: eventDate.toISOString(),
      end_time: addMinutes(eventDate, 60).toISOString(),
      event_type: 'personal',
    });
  };

  const handleAcceptSuggestion = (id: string) => {
    setAutopilotSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, accepted: true } : s)
    );
    toast({
      title: translate('calendar.autopilot.suggestionAccepted', 'Suggestion accepted'),
      description: translate('calendar.autopilot.calendarUpdated', 'Autopilot has updated your calendar'),
    });
  };

  const handleDismissSuggestion = (id: string) => {
    setAutopilotSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const handleUndoSuggestion = (id: string) => {
    setAutopilotSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, accepted: false } : s)
    );
    toast({
      title: translate('calendar.autopilot.suggestionUndone', 'Suggestion undone'),
      description: translate('calendar.autopilot.changesReverted', 'Changes have been reverted'),
    });
  };

  const handleSnoozeSuggestion = (id: string, until: 'later-today' | 'tomorrow') => {
    setAutopilotSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, snoozed: true, snoozeUntil: until } : s)
    );
    toast({
      title: translate('calendar.autopilot.suggestionSnoozed', 'Suggestion snoozed'),
      description: until === 'later-today' 
        ? translate('calendar.autopilot.reminderLaterToday', 'Reminder set for later today')
        : translate('calendar.autopilot.reminderTomorrow', 'Reminder set for tomorrow'),
    });
  };

  const filteredEvents = activeFilters.length === 0 
    ? events 
    : events.filter(event => activeFilters.includes(event.event_type));

  const formatEventTime = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : addMinutes(start, 60);
    return `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`;
  };

  const getTimeSinceSync = () => {
    const diff = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000);
    if (diff < 60) return translate('calendar.justNow', 'just now');
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

  // Render mobile-optimized modal on mobile devices — pass hook data
  // to avoid duplicate useCalendarEvents instances and Supabase subscriptions
  if (isMobile) {
    return (
      <MobileCalendarModal
        open={open}
        onOpenChange={onOpenChange}
        calendarHook={{ events, loading, addEvent, fetchEvents }}
      />
    );
  }

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
                <h2 className="text-lg font-semibold">{translate('calendar.smartCalendar', 'Smart Calendar')}</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="gap-1.5 h-9"
                >
                  <Plus className="h-4 w-4" />
                  {translate('calendar.addEvent', 'Add Event')}
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
                      <span className="text-xs">{translate('calendar.synced', 'Synced')}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 text-sys-autopilot-accent animate-spin" />
                      <span className="text-xs">{translate('calendar.syncing', 'Syncing')}</span>
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
                  className="data-[state=active]:border-b-[3px] data-[state=active]:border-foreground rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent font-medium px-4"
                >
                  {translate('calendar.today', 'Today')}
                </TabsTrigger>
                <TabsTrigger 
                  value="week"
                  className="data-[state=active]:border-b-[3px] data-[state=active]:border-foreground rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent font-medium px-4"
                >
                  {translate('calendar.week', 'Week')}
                </TabsTrigger>
                <TabsTrigger 
                  value="month"
                  className="data-[state=active]:border-b-[3px] data-[state=active]:border-foreground rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent font-medium px-4"
                >
                  {translate('calendar.month', 'Month')}
                </TabsTrigger>
              </TabsList>

              {/* Filters below tabs */}
              <div className="py-3">
                <CalendarFilters 
                  activeFilters={activeFilters}
                  onToggleFilter={handleToggleFilter}
                />
              </div>
            </div>

            {/* Today View - Agenda */}
            <TabsContent value="today" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-[calc(80vh-340px)]">
                <div className="px-6 py-4">
                  {loading ? (
                    <CalendarListSkeleton />
                  ) : (
                    <>
                      {/* Booked Vitana Events Section */}
                      <BookedVitanaEventsSection
                        events={events}
                        onEventClick={setDetailsPanelEvent}
                      />

                      {/* Autopilot Suggestions */}
                      <AutopilotCalendarSuggestions
                        suggestions={autopilotSuggestions}
                        onAccept={handleAcceptSuggestion}
                        onDismiss={handleDismissSuggestion}
                        onUndo={handleUndoSuggestion}
                        onSnooze={handleSnoozeSuggestion}
                      />

                      {/* Now Indicator */}
                      {ongoingEvent && (
                        <div className="mb-4 px-4 py-2.5 bg-sys-ai-tint border border-sys-ai-accent/30 rounded-lg">
                          <p className="text-xs font-medium text-sys-ai-accent flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sys-ai-accent opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-sys-ai-accent"></span>
                            </span>
                            {translate('calendar.now', 'Now')}: {ongoingEvent.title}
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
                          <h3 className="text-base font-semibold mb-1">{translate('calendar.nothingScheduled', 'Nothing scheduled')}</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {translate('calendar.tryQuickAdd', 'Try Quick Add or let Autopilot plan your day')}
                          </p>
                          <Button variant="outline" size="sm" onClick={() => setShowQuickAdd(true)}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            {translate('calendar.addEvent', 'Add Event')}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Week View - Enhanced Grid */}
            <TabsContent value="week" className="flex-1 overflow-hidden m-0">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {format(weekStart, 'MMM d')}–{format(weekEnd, 'MMM d, yyyy')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {translate('calendar.clickSlotHint', 'Click any slot to create an event • Drag to reschedule')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleNavigateWeek('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-px mb-2 ml-14">
                  {weekDays.map((day) => {
                    const isTodayDate = isToday(day);
                    return (
                      <div key={format(day, 'yyyy-MM-dd')} className="text-center">
                        <p className={cn(
                          "text-xs font-medium mb-0.5",
                          isTodayDate && "text-primary"
                        )}>
                          {format(day, 'EEE')}
                        </p>
                        <p className={cn(
                          "text-xl font-bold",
                          isTodayDate && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {loading ? (
                  <CalendarListSkeleton />
                ) : (
                  <WeekGridView
                    weekDays={weekDays}
                    events={filteredEvents}
                    onEventClick={setDetailsPanelEvent}
                    onCreateEvent={handleCreateEventAtTime}
                    getCategoryColor={getCategoryColor}
                    activeFilters={activeFilters}
                  />
                )}
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

                  <ScrollArea className="h-[calc(80vh-280px)]">
                    <div className="relative pb-4">
                      <CalendarComponent
                        mode="single"
                        selected={selectedMonthDay}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedMonthDay(date);
                            const now = Date.now();
                            const lastClick = (window as any).__calendarLastClick || 0;
                            if (now - lastClick < 300) {
                              setShowQuickAdd(true);
                            }
                            (window as any).__calendarLastClick = now;
                          }
                        }}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        className="rounded-lg border pointer-events-auto"
                        modifiers={{
                          hasEvents: (date) => getEventsForDate(date).length > 0
                        }}
                        modifiersClassNames={{
                          hasEvents: 'has-events'
                        }}
                      />
                      <style>{`
                        .has-events {
                          position: relative;
                        }
                        .has-events::after {
                          content: '';
                          position: absolute;
                          bottom: 2px;
                          left: 50%;
                          transform: translateX(-50%);
                          width: 4px;
                          height: 4px;
                          border-radius: 50%;
                          background-color: hsl(var(--primary));
                        }
                      `}</style>
                    </div>
                  </ScrollArea>
                </div>

                {/* Selected Day Agenda */}
                <div className="w-80 border-l pl-6">
                  <h4 className="text-sm font-semibold mb-3">
                    {format(selectedMonthDay, 'EEEE, MMM d', { locale: isGerman ? deLocale : undefined })}
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
                          <p className="text-sm text-muted-foreground">{translate('calendar.noEventsOnDate', 'No events on this date')}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => setShowQuickAdd(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {translate('calendar.addEvent', 'Add Event')}
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
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground" title={`${translate('calendar.lastSynced', 'Last synced')} ${format(lastSyncTime, 'PPpp')}`}>
                {translate('calendar.lastSynced', 'Last synced')} {getTimeSinceSync()}
              </p>
            </div>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {translate('calendar.close', 'Close')}
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
        onJoin={(event) => {
          toast({
            title: translate('calendar.toasts.joiningEvent', 'Joining event'),
            description: translate('calendar.toasts.openingVideoCall', 'Opening video call...'),
          });
        }}
        onMessage={(event) => {
          toast({
            title: translate('calendar.toasts.messageAttendees', 'Message attendees'),
            description: translate('calendar.toasts.featureComingSoon', 'Feature coming soon'),
          });
        }}
        onInvite={(event) => {
          toast({
            title: translate('calendar.toasts.inviteFollowers', 'Invite followers'),
            description: translate('calendar.toasts.featureComingSoon', 'Feature coming soon'),
          });
        }}
        onReschedule={(event) => {
          toast({
            title: translate('calendar.toasts.rescheduleEvent', 'Reschedule event'),
            description: translate('calendar.toasts.featureComingSoon', 'Feature coming soon'),
          });
        }}
        onShare={(event) => {
          toast({
            title: translate('calendar.toasts.shareToGroup', 'Share to group'),
            description: translate('calendar.toasts.featureComingSoon', 'Feature coming soon'),
          });
        }}
      />
    </>
  );
}
