import { CrossoverCard } from "./CrossoverCard";
import { Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

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

  const defaultEvents: CalendarEvent[] = [
    { title: "Team Meeting", time: "2:00 PM", type: "work" },
    { title: "Yoga Class", time: "6:00 PM", type: "health" },
    { title: "AI: Take a 10min walk", time: "Now", type: "ai-suggestion" }
  ];

  const eventList = events || defaultEvents;

  const getEventColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "work": return "text-blue-600";
      case "health": return "text-green-600";
      case "social": return "text-purple-600";
      case "ai-suggestion": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  const content = (
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
      subtitle="AI-optimized schedule with health and wellness integration"
      content={content}
      buttonText="Open Calendar"
      onButtonClick={() => navigate('/calendar')}
      className={className}
    />
  );
}

export const SmartCalendarCard = withCardId(SmartCalendarCardBase, "CT-CX-009", "C-008");