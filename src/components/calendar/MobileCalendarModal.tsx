import React, { useState, useMemo } from "react";
import { isSameDay, addDays, endOfWeek, isAfter, isBefore, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, getDay } from 'date-fns';
import { de as deLocale } from "date-fns/locale/de";
import { Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/responsive-dialog";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { MobileEventForm } from "./MobileEventForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { groupAutopilotEvents, EventActionType } from "./calendarSmartUtils";
import { TodayFocusStrip } from "./TodayFocusStrip";
import { SmartEventCard } from "./SmartEventCard";
import { AutopilotTaskGroup } from "./AutopilotTaskGroup";
import { JourneyProgressStrip } from "./JourneyProgressStrip";
import { OnboardingPlanCard } from "./OnboardingPlanCard";
import { useJourneyProgress, bundleOnboardingPlan } from "@/hooks/useJourneyProgress";

import { formatDate } from '@/lib/locale-format';
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

export function MobileCalendarModal({ open, onOpenChange, calendarHook }: MobileCalendarModalProps) {
  const { translate, isGerman } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const ownHook = useCalendarEvents();
  const { events, loading, addEvent, fetchEvents } = calendarHook ?? ownHook;

  const [activeTab, setActiveTab] = useState<'agenda' | 'month'>('agenda');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showFullAgenda, setShowFullAgenda] = useState(false);

  const journeyProgress = useJourneyProgress(events);

  // Separate milestone events for the progress strip
  const milestoneEvents = useMemo(() => {
    return events.filter(e => e.event_type === 'journey_milestone');
  }, [events]);

  // All user calendar events sorted chronologically (milestones shown via progress strip, not event list)
  const bookedEvents = useMemo(() => {
    return [...events]
      .filter(e => e.event_type !== 'journey_milestone')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
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

  const todayDate = new Date();

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
        days.add(formatDate(date, 'yyyy-MM-dd'));
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
    const meetupId = (event.metadata as Record<string, unknown>)?.meetup_id as string;
    if (meetupId) {
      onOpenChange(false);
      navigate(`/comm/events-meetups?event=${meetupId}`);
    }
  };

  const handleEventAction = (event: CalendarEvent, action: EventActionType) => {
    // For now, all actions route through event click
    // Future: specific handling for start/continue/join/view-plan
    handleEventClick(event);
  };

  // Today's onboarding plan bundle
  const onboardingPlan = useMemo(() => {
    return bundleOnboardingPlan(groupedEvents.today);
  }, [groupedEvents.today]);

  // Render a group of events with autopilot collapsing
  const renderEventGroup = (title: string, groupEvents: CalendarEvent[], isToday = false) => {
    if (groupEvents.length === 0) return null;

    const { groups, regularEvents } = groupAutopilotEvents(groupEvents);

    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">{title}</h3>
        <div className="bg-card rounded-xl border p-2">
          {isToday && onboardingPlan && onboardingPlan.tasks.length > 0 ? (
            <OnboardingPlanCard
              tasks={onboardingPlan.tasks}
              totalMinutes={onboardingPlan.totalMinutes}
              completedCount={onboardingPlan.completedCount}
              totalCount={onboardingPlan.totalCount}
              onStartPlan={() => onboardingPlan.tasks[0] && handleEventAction(onboardingPlan.tasks[0], 'start')}
              onEventClick={handleEventClick}
              onAction={handleEventAction}
            />
          ) : (
            groups.map(group => (
              <AutopilotTaskGroup
                key={group.id}
                group={group}
                onEventClick={handleEventClick}
                onAction={handleEventAction}
              />
            ))
          )}
          {regularEvents.map(event => (
            <SmartEventCard
              key={event.id}
              event={event}
              onEventClick={handleEventClick}
              onAction={handleEventAction}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background px-4 pr-14 pt-4 pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-util-calendar-tint flex items-center justify-center border border-util-calendar-accent/20">
              <Calendar className="w-4 h-4 text-util-calendar-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{translate('calendar.myCalendar', 'My Calendar')}</h2>
              <p className="text-xs text-muted-foreground">{translate('calendar.yourEvents', 'Your events & activities')}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Body + FAB container */}
        <div className="flex-1 relative overflow-hidden">
          <div className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 py-4 pb-20">

            {/* Event creation form — takes over the content area (CSS show/hide to avoid flicker) */}
            <div className={showQuickAdd ? '' : 'hidden'}>
              <MobileEventForm
                onSubmit={handleEventCreate}
                onCancel={() => setShowQuickAdd(false)}
                initialDate={selectedDay ?? undefined}
              />
            </div>

            <div className={showQuickAdd ? 'hidden' : ''}>
            {/* Date + Today's Focus */}
            <div className="mb-2">
              <p className="text-sm font-semibold">{formatDate(todayDate, 'EEEE, MMM d', { locale: isGerman ? deLocale : undefined })}</p>
              <p className="text-xs text-muted-foreground mb-3">{translate('calendar.timeGroups.today', 'Today')}</p>
            </div>

            <TodayFocusStrip
              todayEvents={groupedEvents.today}
              onEventClick={handleEventClick}
            />

            {/* Journey Progress */}
            {journeyProgress && (
              <JourneyProgressStrip
                progress={journeyProgress}
                milestoneEvents={milestoneEvents}
              />
            )}

            {/* Agenda / Month toggle */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {activeTab === 'agenda'
                  ? translate('calendar.agenda', 'Agenda')
                  : translate('calendar.month', 'Month')}
              </h3>
              <Button
                variant={activeTab === 'month' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setActiveTab(activeTab === 'month' ? 'agenda' : 'month')}
                aria-label={translate('calendar.month', 'Month')}
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </div>

            {/* Agenda View */}
            {activeTab === 'agenda' && (
              <>
                {bookedEvents.length > 0 ? (
                  <>
                    {renderEventGroup(translate('calendar.timeGroups.today', 'Today'), groupedEvents.today, true)}
                    {renderEventGroup(translate('calendar.timeGroups.tomorrow', 'Tomorrow'), groupedEvents.tomorrow)}
                    {renderEventGroup(translate('calendar.timeGroups.thisWeek', 'This Week'), groupedEvents.thisWeek)}
                    {showFullAgenda || !journeyProgress ? (
                      renderEventGroup(translate('calendar.timeGroups.later', 'Later'), groupedEvents.later)
                    ) : groupedEvents.later.length > 0 ? (
                      <button
                        onClick={() => setShowFullAgenda(true)}
                        className="text-xs text-primary font-medium px-1 mb-4 hover:underline"
                      >
                        {translate('calendar.journey.showFullAgenda', 'Show full agenda')} ({groupedEvents.later.length} {translate('calendar.journey.moreEvents', 'more events')})
                      </button>
                    ) : null}
                    {renderEventGroup(translate('calendar.timeGroups.past', 'Past'), groupedEvents.past)}
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
              </>
            )}

            {/* Month View */}
            {activeTab === 'month' && (
              <>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h3 className="text-sm font-semibold">{formatDate(currentMonth, 'MMMM yyyy')}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-xs text-muted-foreground font-medium py-2">{day}</div>
                  ))}

                  {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {monthDays.map(day => {
                    const dateKey = formatDate(day, 'yyyy-MM-dd');
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
                        {formatDate(day, 'd')}
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
                        {formatDate(selectedDay, 'EEEE, MMM d', { locale: isGerman ? deLocale : undefined })}
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
                          <SmartEventCard
                            key={event.id}
                            event={event}
                            onEventClick={handleEventClick}
                            onAction={handleEventAction}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {translate('calendar.noEventsOnDate', 'No events on this date')}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            </div>
          </div>

          {/* FAB - Add Event */}
          {!showQuickAdd && (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="absolute bottom-4 right-4 z-10 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-all"
              aria-label={translate('calendar.addEvent', 'Add Event')}
            >
              <Plus className="h-6 w-6" />
            </button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
