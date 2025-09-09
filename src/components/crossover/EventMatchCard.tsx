import { CrossoverCard } from "./CrossoverCard";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Badge } from "@/components/ui/badge";

interface EventMatchCardProps {
  events?: Array<{
    id: string;
    name: string;
    date: string;
    location: string;
    attendees: number;
    category: string;
  }>;
  className?: string;
}

function EventMatchCardBase({ 
  events = [
    { id: "1", name: "Wellness Workshop", date: "Tomorrow 2PM", location: "Community Center", attendees: 25, category: "Health" },
    { id: "2", name: "Networking Mixer", date: "Friday 6PM", location: "Downtown Hub", attendees: 40, category: "Business" },
    { id: "3", name: "Mindful Walking", date: "Sunday 9AM", location: "City Park", attendees: 12, category: "Wellness" }
  ],
  className 
}: EventMatchCardProps) {
  const navigate = useNavigate();

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "health": return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400";
      case "business": return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400";
      case "wellness": return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400";
      default: return "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400";
    }
  };

  const content = (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="p-2 bg-secondary/20 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm leading-tight">{event.name}</h4>
            <Badge className={`text-xs ${getCategoryColor(event.category)}`} variant="secondary">
              {event.category}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{event.attendees} attending</span>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-4 p-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Curated for your interests</span>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Calendar}
      category="mental"
      title="Relevant Events 📅"
      subtitle="Discover events matched to your interests"
      content={content}
      buttonText="RSVP"
      onButtonClick={() => navigate('/community/events')}
      secondaryButtonText="Add to Cal"
      onSecondaryButtonClick={() => navigate('/calendar/events')}
      className={className}
    />
  );
}

export const EventMatchCard = withCardId(EventMatchCardBase, "CT-CX-018", "C-018");