import React, { useState, useMemo } from "react";
import { format, isSameDay, addDays, endOfWeek, isAfter, isBefore, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, getDay } from "date-fns";
import { de as deLocale } from "date-fns/locale/de";
import { Calendar, Plus, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogClose,
} from "@/components/ui/responsive-dialog";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { MobileEventForm } from "./MobileEventForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface CalendarHookData {
  events: CalendarEvent[];
  loading: boolean;
  addEvent: (eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>, options?: { showToast?: boolean }) => Promise<any>;
  fetchEvents: () => Promise<void>;
}

interface MobileCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, reuses the parent's hook data instead of creating a duplicate subscription */
  calendarHook?: CalendarHookData;
}

// Category styling utilities
const getCategoryBadgeStyle = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'community': return 'bg-domain-community-tint text-domain-community-accent';
    case 'workout': return 'bg-pill-exercise-tint text-pill-exercise-accent';
    case 'health': return 'bg-pill-mental-tint text-pill-mental-accent';
    case 'nutrition': return 'bg-pill-nutrition-tint text-pill-nutrition-accent';
    case 'professional': return 'bg-pill-exercise-tint text-pill-exercise-accent';
    case 'autopilot': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'journey_milestone': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'wellness_nudge': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    default: return 'bg-sys-vitana-tint text-sys-vitana-accent';
  }
};

const getStatusPillStyle = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function MobileCalendarModal({ open, onOpenChange, calendarHook }: MobileCalendarModalProps) {
  const { translate, isGerman } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  // Reuse parent's hook to avoid duplicate Supabase subscriptions and state divergence
  const ownHook = useCalendarEvents();
  const { events, loading, addEvent, fetchEvents } = calendarHook ?? ownHook;
  
  const [activeTab, setActiveTab] = useState<'agenda' | 'month'>('agenda');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // All user calendar events (manual, invite, imported, booked)
  const bookedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events]);

  // Group events by timeframe
  const groupedEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = addDays(now, 1);
    const weekEnd = endOfWeek(now);

    return {
      today: bookedEvents.filter(e => isSameDay(new Date(e.start_time), now)),
      tomorrow: bookedEvents.filter(e => isSameDay(new Date(e.start_time), tomorrow)),
      thisWeek: bookedEvents.filter(e => {
        const date = new Date(e.start_time);
        return isAfter(date, tomorrow) && isBefore(date, weekEnd) && !isSameDay(date, tomorrow);
      }),
      later: bookedEvents.filter(e => isAfter(new Date(e.start_time), weekEnd)),
      past: bookedEvents.filter(e => {
        const date = new Date(e.start_time);
        return isBefore(date, today) && !isSameDay(date, now);
      }),
    };
  }, [bookedEvents]);

  // Today's section data
  const todayDate = new Date();
  const todayBookings = groupedEvents.today.slice(0, 3);
  const nextUpcoming = bookedEvents.find(e => new Date(e.start_time) > todayDate && !isSameDay(new Date(e.start_time), todayDate));

  // Month view data
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const daysWithEvents = useMemo(() => {
    const days = new Set<string>();
    bookedEvents.forEach(event => {
      const date = new Date(event.start_time);
      if (isSameMonth(date, currentMonth)) {
        days.add(format(date, 'yyyy-MM-dd'));
      }
    });
    return days;
  }, [bookedEvents, currentMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return bookedEvents.filter(e => isSameDay(new Date(e.start_time), selectedDay));
  }, [selectedDay, bookedEvents]);

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
        description: translate('calendar.toasts.eventCreatedDesc', 'Your event has been added'),
      });
    } catch (error) {
      toast({
        title: translate('common.error', 'Error'),
        description: translate('calendar.error.failedToCreate', 'Failed to create event'),
        variant: "destructive"
      });
    }
  };

  const handleBrowseActivities = () => {
    onOpenChange(false);
    navigate('/comm/events-meetups');
  };

  const handleEventClick = (event: CalendarEvent) => {
    // Navigate to event detail if available
    const meetupId = (event.metadata as Record<string, unknown>)?.meetup_id as string;
    if (meetupId) {
      onOpenChange(false);
      navigate(`/comm/events-meetups?event=${meetupId}`);
    }
  };

  const formatEventTime = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    if (end) {
      return `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`;
    }
    return format(start, 'HH:mm');
  };

  const getCategoryLabel = (type: CalendarEvent['event_type']) => {
    const labels: Record<string, string> = {
      community: translate('calendar.categories.community', 'Community'),
      workout: translate('calendar.categories.fitness', 'Fitness'),
      health: translate('calendar.categories.health', 'Health'),
      nutrition: translate('calendar.categories.nutrition', 'Nutrition'),
      professional: translate('calendar.categories.professional', 'Work'),
      personal: translate('calendar.categories.personal', 'Personal'),
      autopilot: translate('calendar.categories.autopilot', 'Autopilot'),
      journey_milestone: translate('calendar.categories.milestone', 'Milestone'),
      wellness_nudge: translate('calendar.categories.wellness', 'Wellness'),
    };
    return labels[type] || type;
  };

  const getBookingStatus = (event: CalendarEvent) => {
    if ((event.metadata as Record<string, unknown>)?.ticket_id) return translate('calendar.bookingStatus.ticket', 'Ticket');
    if ((event.metadata as Record<string, unknown>)?.meetup_id) return translate('calendar.bookingStatus.rsvp', 'RSVP');
    return translate('calendar.bookingStatus.booked', 'Booked');
  };

  // Event row component
  const EventRow = ({ event, showDate = false }: { event: CalendarEvent; showDate?: boolean }) => (
    <div 
      className="flex items-center gap-3 py-3 px-1 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg transition-colors"
      onClick={() => handleEventClick(event)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            {showDate && format(new Date(event.start_time), 'EEE, MMM d')} {formatEventTime(event.start_time, event.end_time)}
          </span>
        </div>
        <h4 className="text-sm font-medium truncate">{event.title}</h4>
        {event.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", getCategoryBadgeStyle(event.event_type))}>
          {getCategoryLabel(event.event_type)}
        </Badge>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", getStatusPillStyle(event.status))}>
          {getBookingStatus(event)}
        </Badge>
      </div>
    </div>
  );

  // Agenda group section
  const AgendaGroup = ({ title, events: groupEvents }: { title: string; events: CalendarEvent[] }) => {
    if (groupEvents.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">{title}</h3>
        <div className="bg-card rounded-xl border p-2">
          {groupEvents.map(event => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent 
        className="h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0"
        hideCloseButton
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-util-calendar-tint flex items-center justify-center border border-util-calendar-accent/20">
                <Calendar className="w-4 h-4 text-util-calendar-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{translate('calendar.myCalendar', 'My Calendar')}</h2>
                <p className="text-xs text-muted-foreground">{translate('calendar.yourEvents', 'Your events & activities')}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="gap-1.5 h-9"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">{translate('calendar.addEvent', 'Add Event')}</span>
            </Button>
          </div>
          
          {/* Event creation form */}
          {showQuickAdd && (
            <div className="pt-3 mt-3 border-t">
              <MobileEventForm
                onSubmit={handleEventCreate}
                onCancel={() => setShowQuickAdd(false)}
                initialDate={selectedDay ?? undefined}
              />
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 py-4">
          {/* Today Section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">{format(todayDate, 'EEEE, MMM d', { locale: isGerman ? deLocale : undefined })}</p>
                <p className="text-xs text-muted-foreground">{translate('calendar.timeGroups.today', 'Today')}</p>
              </div>
            </div>
            
            {todayBookings.length > 0 ? (
              <div className="bg-card rounded-xl border p-2 mb-3">
                {todayBookings.map(event => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="bg-muted/30 rounded-xl p-4 mb-3 text-center">
                <p className="text-sm text-muted-foreground">{translate('calendar.noBookingsToday', 'No bookings today')}</p>
              </div>
            )}

            {/* Next Upcoming */}
            {nextUpcoming && (
              <div 
                className="bg-util-calendar-tint/50 border border-util-calendar-accent/20 rounded-xl p-3 cursor-pointer hover:bg-util-calendar-tint transition-colors"
                onClick={() => handleEventClick(nextUpcoming)}
              >
                <p className="text-xs text-util-calendar-accent font-medium mb-1.5">{translate('calendar.nextUpcoming', 'Next upcoming')}</p>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-util-calendar-accent/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-util-calendar-accent">{format(new Date(nextUpcoming.start_time), 'd')}</span>
                    <span className="text-[10px] text-util-calendar-accent uppercase">{format(new Date(nextUpcoming.start_time), 'MMM')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{nextUpcoming.title}</h4>
                    <p className="text-xs text-muted-foreground">{format(new Date(nextUpcoming.start_time), 'EEE')} • {formatEventTime(nextUpcoming.start_time, nextUpcoming.end_time)}</p>
                    {nextUpcoming.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{nextUpcoming.location}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] shrink-0", getCategoryBadgeStyle(nextUpcoming.event_type))}>
                    {getCategoryLabel(nextUpcoming.event_type)}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'agenda' | 'month')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/50 rounded-lg mb-4">
              <TabsTrigger value="agenda">{translate('calendar.agenda', 'Agenda')}</TabsTrigger>
              <TabsTrigger value="month">{translate('calendar.month', 'Month')}</TabsTrigger>
            </TabsList>

            {/* Agenda Tab */}
            <TabsContent value="agenda" className="mt-0">
              {bookedEvents.length > 0 ? (
                <>
                  <AgendaGroup title={translate('calendar.timeGroups.today', 'Today')} events={groupedEvents.today} />
                  <AgendaGroup title={translate('calendar.timeGroups.tomorrow', 'Tomorrow')} events={groupedEvents.tomorrow} />
                  <AgendaGroup title={translate('calendar.timeGroups.thisWeek', 'This Week')} events={groupedEvents.thisWeek} />
                  <AgendaGroup title={translate('calendar.timeGroups.later', 'Later')} events={groupedEvents.later} />
                  <AgendaGroup title={translate('calendar.timeGroups.past', 'Past')} events={groupedEvents.past} />
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-1">{translate('calendar.noBookingsYet', 'No bookings yet')}</p>
                  <p className="text-xs text-muted-foreground mb-4">{translate('calendar.exploreActivities', 'Explore activities to add to your calendar')}</p>
                  <Button variant="secondary" size="sm" onClick={handleBrowseActivities}>
                    {translate('calendar.browseActivities', 'Browse Activities')}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Month Tab */}
            <TabsContent value="month" className="mt-0">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h3 className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs text-muted-foreground font-medium py-2">{day}</div>
                ))}
                
                {/* Empty cells for start of month */}
                {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {monthDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const hasEvents = daysWithEvents.has(dateKey);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && isToday && "bg-util-calendar-tint text-util-calendar-accent font-semibold",
                        !isSelected && !isToday && "hover:bg-muted"
                      )}
                    >
                      {format(day, 'd')}
                      {hasEvents && !isSelected && (
                        <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-util-calendar-accent" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Events */}
              {selectedDay && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {format(selectedDay, 'EEEE, MMM d', { locale: isGerman ? deLocale : undefined })}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setShowQuickAdd(true)}
                    >
                      <Plus className="w-3 h-3" />
                      {translate('calendar.addEvent', 'Add Event')}
                    </Button>
                  </div>
                  {selectedDayEvents.length > 0 ? (
                    <div className="bg-card rounded-xl border p-2">
                      {selectedDayEvents.map(event => (
                        <EventRow key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {translate('calendar.noEventsOnDate', 'No events on this date')}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 bg-background px-4 py-3 border-t flex gap-2 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <ResponsiveDialogClose asChild>
            <Button variant="outline" className="flex-1">
              {translate('calendar.close', 'Close')}
            </Button>
          </ResponsiveDialogClose>
          <Button variant="secondary" className="flex-1" onClick={handleBrowseActivities}>
            {translate('calendar.browseActivities', 'Browse Activities')}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
