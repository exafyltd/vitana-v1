import { CalendarEvent } from "@/hooks/useCalendarEvents";

// ============================================================================
// All-day / milestone detection
// ============================================================================

export function isAllDayEvent(event: CalendarEvent): boolean {
  if (event.event_type === 'journey_milestone') return true;

  if (!event.end_time) return false;

  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  // Near-24h event starting near midnight
  if (durationHours >= 22 && start.getHours() <= 2) return true;

  return false;
}

// ============================================================================
// Category badge styling (moved from MobileCalendarModal)
// ============================================================================

export function getCategoryBadgeStyle(type: CalendarEvent['event_type']): string {
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
}

// ============================================================================
// Smart badge — single badge per event
// ============================================================================

type TranslateFn = (key: string, fallback: string) => string;

export function getSmartBadge(event: CalendarEvent, translate: TranslateFn): { label: string; className: string } {
  switch (event.event_type) {
    case 'autopilot':
      return { label: translate('calendar.badge.guidedStep', 'Guided step'), className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'community':
      return { label: translate('calendar.categories.community', 'Community'), className: 'bg-domain-community-tint text-domain-community-accent' };
    case 'journey_milestone':
      return { label: translate('calendar.badge.milestone', 'Milestone'), className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'wellness_nudge':
      return { label: translate('calendar.badge.wellness', 'Wellness'), className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'health':
      return { label: translate('calendar.categories.health', 'Health'), className: 'bg-pill-mental-tint text-pill-mental-accent' };
    case 'workout':
      return { label: translate('calendar.categories.fitness', 'Fitness'), className: 'bg-pill-exercise-tint text-pill-exercise-accent' };
    case 'nutrition':
      return { label: translate('calendar.categories.nutrition', 'Nutrition'), className: 'bg-pill-nutrition-tint text-pill-nutrition-accent' };
    case 'professional':
      return { label: translate('calendar.categories.professional', 'Work'), className: 'bg-pill-exercise-tint text-pill-exercise-accent' };
    default:
      return { label: translate('calendar.categories.personal', 'Personal'), className: 'bg-sys-vitana-tint text-sys-vitana-accent' };
  }
}

// ============================================================================
// Event action — primary action per card
// ============================================================================

export type EventActionType = 'start' | 'continue' | 'join' | 'details' | 'view-plan' | 'open' | 'done';

export function getEventAction(event: CalendarEvent, translate: TranslateFn): {
  label: string;
  variant: 'default' | 'secondary' | 'ghost' | 'outline';
  action: EventActionType;
} {
  const meta = event.metadata as Record<string, unknown> | null;
  const completionStatus = event.completion_status as string | undefined;
  const activatedAt = event.activated_at as string | undefined;

  if (completionStatus === 'completed') {
    return { label: translate('calendar.action.done', 'Done'), variant: 'ghost', action: 'done' };
  }

  switch (event.event_type) {
    case 'autopilot':
      return activatedAt
        ? { label: translate('calendar.action.continue', 'Continue'), variant: 'default', action: 'continue' }
        : { label: translate('calendar.action.start', 'Start'), variant: 'default', action: 'start' };

    case 'community':
      return meta?.meetup_id
        ? { label: translate('calendar.action.join', 'Join'), variant: 'default', action: 'join' }
        : { label: translate('calendar.action.details', 'Details'), variant: 'secondary', action: 'details' };

    case 'journey_milestone':
      return { label: translate('calendar.action.viewPlan', 'View plan'), variant: 'secondary', action: 'view-plan' };

    default:
      return { label: translate('calendar.action.open', 'Open'), variant: 'outline', action: 'open' };
  }
}

// ============================================================================
// Today's Focus — determine the most important item for the focus strip
// ============================================================================

export interface FocusItem {
  type: 'event' | 'empty';
  label: string;
  sublabel?: string;
  event?: CalendarEvent;
}

export function determineFocusItem(todayEvents: CalendarEvent[], translate: TranslateFn): FocusItem {
  const now = new Date();

  // Priority 1: Incomplete autopilot tasks today
  const incompleteTasks = todayEvents.filter(e =>
    e.event_type === 'autopilot' &&
    e.status !== 'cancelled' &&
    (e as any).completion_status !== 'completed'
  );
  if (incompleteTasks.length > 0) {
    return {
      type: 'event',
      label: incompleteTasks[0].title,
      sublabel: incompleteTasks.length > 1
        ? `+${incompleteTasks.length - 1} ${translate('calendar.focus.moreSteps', 'more steps')}`
        : undefined,
      event: incompleteTasks[0],
    };
  }

  // Priority 2: Journey milestones today
  const milestones = todayEvents.filter(e => e.event_type === 'journey_milestone' && e.status !== 'cancelled');
  if (milestones.length > 0) {
    return { type: 'event', label: milestones[0].title, event: milestones[0] };
  }

  // Priority 3: Next upcoming timed event today
  const upcoming = todayEvents
    .filter(e => new Date(e.start_time) > now && e.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  if (upcoming.length > 0) {
    return { type: 'event', label: upcoming[0].title, event: upcoming[0] };
  }

  // Priority 4: Any remaining events today
  const active = todayEvents.filter(e => e.status !== 'cancelled');
  if (active.length > 0) {
    return { type: 'event', label: active[0].title, event: active[0] };
  }

  // Fallback: Empty day
  return { type: 'empty', label: translate('calendar.focus.lightDay', 'Light day — explore activities or catch up on your diary') };
}

// ============================================================================
// Autopilot task grouping
// ============================================================================

export interface AutopilotGroup {
  id: string;
  label: string;
  events: CalendarEvent[];
  remainingCount: number;
  estimatedMinutes: number;
}

function humanizeGroupKey(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function groupAutopilotEvents(events: CalendarEvent[]): {
  groups: AutopilotGroup[];
  regularEvents: CalendarEvent[];
} {
  const autopilotEvents: CalendarEvent[] = [];
  const regularEvents: CalendarEvent[] = [];

  for (const event of events) {
    if (event.event_type === 'autopilot') {
      autopilotEvents.push(event);
    } else {
      regularEvents.push(event);
    }
  }

  if (autopilotEvents.length === 0) {
    return { groups: [], regularEvents };
  }

  const groupMap = new Map<string, CalendarEvent[]>();
  for (const event of autopilotEvents) {
    const meta = event.metadata as Record<string, unknown> | null;
    const groupKey = (meta?.wave_name as string) ||
                     (meta?.wave_template as string)?.split('_')[0] ||
                     'getting-started';
    if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
    groupMap.get(groupKey)!.push(event);
  }

  const groups: AutopilotGroup[] = Array.from(groupMap.entries()).map(([key, evts]) => {
    const completed = evts.filter(e =>
      (e as any).completion_status === 'completed' || e.status === 'cancelled'
    ).length;
    const remaining = evts.length - completed;
    return {
      id: `autopilot-${key}`,
      label: humanizeGroupKey(key),
      events: evts,
      remainingCount: remaining,
      estimatedMinutes: remaining * 5,
    };
  });

  return { groups, regularEvents };
}
