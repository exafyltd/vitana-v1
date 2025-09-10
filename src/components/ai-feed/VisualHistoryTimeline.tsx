import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RotateCcw, Star, TrendingUp, Calendar, Award, Zap } from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "completion" | "milestone" | "streak" | "first-time";
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  category: string;
  details?: {
    streakCount?: number;
    improvement?: string;
    achievement?: string;
  };
}

interface VisualHistoryTimelineProps {
  events?: TimelineEvent[];
}

const defaultEvents: TimelineEvent[] = [
  {
    id: "streak-milestone",
    type: "milestone",
    title: "7-Day Morning Flow Streak! 🔥",
    description: "Achieved perfect week of morning routines",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    icon: "☀️",
    category: "wellness",
    details: {
      streakCount: 7,
      achievement: "Consistency Champion"
    }
  },
  {
    id: "hydration-complete",
    type: "completion",
    title: "Daily hydration goal met",
    description: "8 glasses of water completed ahead of schedule",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    icon: "💧",
    category: "health",
    details: {
      improvement: "15% faster than usual"
    }
  },
  {
    id: "first-meditation",
    type: "first-time",
    title: "First AI-suggested meditation session",
    description: "Completed 10-minute mindfulness practice",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    icon: "🧘",
    category: "wellness",
    details: {
      achievement: "Mindfulness Pioneer"
    }
  },
  {
    id: "social-connection",
    type: "completion",
    title: "Weekly friend check-in completed",
    description: "Connected with 3 friends as suggested by AI",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    icon: "👫",
    category: "social",
    details: {
      improvement: "Social wellness +25%"
    }
  },
  {
    id: "routine-streak",
    type: "streak",
    title: "5-day Hydration Streak",
    description: "Consistent water intake tracking for 5 days",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    icon: "💧",
    category: "health",
    details: {
      streakCount: 5
    }
  }
];

const getEventIcon = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "completion": return <CheckCircle className="w-5 h-5 text-green-600" />;
    case "milestone": return <Award className="w-5 h-5 text-yellow-600" />;
    case "streak": return <Zap className="w-5 h-5 text-orange-600" />;
    case "first-time": return <Star className="w-5 h-5 text-purple-600" />;
  }
};

const getEventColor = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "completion": return "border-green-200 bg-green-50";
    case "milestone": return "border-yellow-200 bg-yellow-50";
    case "streak": return "border-orange-200 bg-orange-50";
    case "first-time": return "border-purple-200 bg-purple-50";
  }
};

const getBadgeVariant = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "completion": return "default" as const;
    case "milestone": return "secondary" as const;
    case "streak": return "outline" as const;
    case "first-time": return "destructive" as const;
  }
};

export function VisualHistoryTimeline({ events = defaultEvents }: VisualHistoryTimelineProps) {
  const sortedEvents = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />
      
      <div className="space-y-6">
        {sortedEvents.map((event, index) => (
          <div key={event.id} className="relative flex items-start gap-6">
            {/* Timeline node */}
            <div className={`
              relative z-10 flex items-center justify-center w-16 h-16 rounded-full 
              border-4 ${getEventColor(event.type)} shadow-lg
            `}>
              {getEventIcon(event.type)}
              {/* Pulse animation for recent events */}
              {index < 2 && (
                <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
              )}
            </div>

            {/* Event card */}
            <Card className={`
              flex-1 bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-lg 
              transition-all duration-300 group ${index < 2 ? 'ring-2 ring-primary/20' : ''}
            `}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{event.icon}</span>
                    <Badge variant={getBadgeVariant(event.type)} className="text-xs">
                      {event.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {event.category}
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {event.timestamp.toLocaleDateString()}
                  </div>
                </div>

                <h4 className="font-semibold text-sm mb-1 text-foreground">
                  {event.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {event.description}
                </p>

                {/* Event details */}
                {event.details && (
                  <div className="flex items-center gap-4 text-xs">
                    {event.details.streakCount && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <Zap className="w-3 h-3" />
                        <span>{event.details.streakCount} day streak</span>
                      </div>
                    )}
                    {event.details.improvement && (
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        <span>{event.details.improvement}</span>
                      </div>
                    )}
                    {event.details.achievement && (
                      <div className="flex items-center gap-1 text-purple-600">
                        <Award className="w-3 h-3" />
                        <span>{event.details.achievement}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Load more placeholder */}
      <div className="mt-8 text-center">
        <Card className="bg-white/60 border-dashed border-muted-foreground/30 hover:bg-white/80 transition-colors duration-300">
          <CardContent className="p-6">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Load more history</p>
            <p className="text-xs text-muted-foreground mt-1">
              {events.length} recent events shown
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}