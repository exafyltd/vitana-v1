import { CrossoverCard } from "./CrossoverCard";
import { Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';
import { useCalendarEvents, type CalendarEvent as UserCalendarEvent } from "@/hooks/useCalendarEvents";
import { formatDate } from "@/lib/locale-format";

interface CalendarEvent {
  title: string;
  time: string;
  type: "work" | "health" | "social" | "ai-suggestion";
}

interface SmartCalendarCardProps {
  events?: CalendarEvent[];
  className?: string;
}

function SmartCalendarCardBase({ 
  events,
  className 
}: SmartCalendarCardProps) {
  const navigate = useNavigate();

  const { getUpcomingEvents } = useCalendarEvents();

  const toCardType = (type: UserCalendarEvent["event_type"]): CalendarEvent["type"] => {
    switch (type) {
      case "health":
      case "workout":
      case "nutrition":
        return "health";
      case "community":
        return "social";
      case "autopilot":
      case "wellness_nudge":
        return "ai-suggestion";
      default:
        return "work";
    }
  };

  // Real upcoming events for the signed-in user (no placeholder data).
  const eventList: CalendarEvent[] = events ?? getUpcomingEvents(3).map((event) => ({
    title: event.title,
    time: formatDate(new Date(event.start_time), "EEE HH:mm"),
    type: toCardType(event.event_type),
  }));

  const getEventColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "work": return "text-blue-600";
      case "health": return "text-green-600";
      case "social": return "text-purple-600";
      case "ai-suggestion": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  const content = eventList.length === 0 ? (
    <p className="text-xs text-muted-foreground">{t('screens.crossover.noUpcomingEvents')}</p>
  ) : (
    <div className="space-y-2">
      {eventList.slice(0, 3).map((event, index) => (
        <div key={index} className="flex items-center justify-between text-xs">
          <span className="font-medium truncate">{event.title}</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className={getEventColor(event.type)}>{event.time}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <CrossoverCard
      icon={Calendar}
      category="calendar"
      title={t('screens.crossover.smartCalendar')}
      subtitle={t('screens.ai.subtitle_smartSchedule')}
      content={content}
      buttonText={t('screens.ai.actionLabel_openCalendar')}
      onButtonClick={() => navigate('/calendar')}
      className={className}
    />
  );
}

export const SmartCalendarCard = withCardId(SmartCalendarCardBase, "CT-CX-009", "C-008");