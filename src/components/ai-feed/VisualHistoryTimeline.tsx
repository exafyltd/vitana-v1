import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw, Star, TrendingUp, Calendar, Award, Zap, Download, BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";

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

const getCategoryBackground = (category: string) => {
  switch (category) {
    case "health":
      return "bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm";
    case "wellness": 
      return "bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm";
    case "social":
      return "bg-gradient-to-br from-pink-50/80 to-rose-50/80 backdrop-blur-sm";
    case "exercise":
      return "bg-gradient-to-br from-orange-50/80 to-amber-50/80 backdrop-blur-sm";
    case "sleep":
      return "bg-gradient-to-br from-indigo-50/80 to-purple-50/80 backdrop-blur-sm";
    default:
      return "bg-white/80 backdrop-blur-sm";
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

// Separate copy pools - unique messages to avoid duplication with main banner
const TAGLINE_POOL = [
  "Your journey shapes who you become",
  "Building momentum one day at a time",
  "Transformation happens in the quiet moments"
];

const QUOTE_POOL = [
  "Consistency is your superpower",
  "Tiny actions compound into transformation",
  "You're one healthy choice away from momentum",
  "Show up for yourself—future you will thank you",
  "Keep the streak alive; your routine loves it"
];

// Text normalization for de-duplication
const normalize = (text: string): string => 
  text.toLowerCase().replace(/[\p{P}\p{S}]/gu, '').trim();

// Pick unused text from pool
const pickUnused = (pool: string[], shown: Set<string>): string | null =>
  pool.find(text => !shown.has(normalize(text))) ?? null;

const MotivationalBanner = ({ message, subtext }: { message: string; subtext: string }) => (
  <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50" />
    <CardContent className="p-6 relative z-10 text-center">
      <h3 className="text-lg font-bold text-primary mb-2">{message}</h3>
      <p className="text-sm text-muted-foreground">{subtext}</p>
    </CardContent>
  </Card>
);

const MotivationalDivider = ({ message }: { message: string }) => (
  <div className="my-8 flex items-center justify-center">
    <Card className="bg-gradient-to-r from-secondary/10 to-accent/10 border-secondary/20 px-4 py-2 opacity-80">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-secondary-foreground/80">{message}</span>
      </div>
    </Card>
  </div>
);

const StatsStrip = ({ events }: { events: TimelineEvent[] }) => {
  const completedCount = events.filter(e => e.type === "completion").length;
  const streakEvents = events.filter(e => e.type === "streak");
  const longestStreak = Math.max(...streakEvents.map(e => e.details?.streakCount ?? 0), 0);
  const completionRate = Math.round((completedCount / events.length) * 100);
  
  return (
    <div className="my-8 flex items-center justify-center">
      <Card className="bg-gradient-to-r from-muted/50 to-muted/30 border-muted/40 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="w-3 h-3" />
          <span>This week: {events.length} entries • {longestStreak}-day streak • +35 Credits • {completionRate}% completion</span>
        </div>
      </Card>
    </div>
  );
};

export function VisualHistoryTimeline({ events = defaultEvents }: VisualHistoryTimelineProps) {
  const sortedEvents = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  // Session-level de-duplication store
  const [shownAffirmations] = useState(() => new Set<string>());
  
  // Select banner message from tagline pool
  const bannerMessage = useMemo(() => {
    const selected = TAGLINE_POOL[0]; // Use first tagline for banner
    shownAffirmations.add(normalize(selected));
    return selected;
  }, [shownAffirmations]);

  // Track positions of dividers to enforce spacing
  const [lastDividerIndex, setLastDividerIndex] = useState(-1);

  const shouldShowDivider = (index: number): boolean => {
    // Max 1 divider every 4-6 cards
    if (index - lastDividerIndex < 4) return false;
    // Don't show divider in first 3 items (banner visible)
    if (index < 3) return false;
    // Show every 5th item starting from index 5
    return index % 5 === 0;
  };

  const getDividerContent = (index: number): JSX.Element | null => {
    if (!shouldShowDivider(index)) return null;
    
    // Try to get unused quote
    const unusedQuote = pickUnused(QUOTE_POOL, shownAffirmations);
    
    if (unusedQuote) {
      shownAffirmations.add(normalize(unusedQuote));
      setLastDividerIndex(index);
      return <MotivationalDivider message={unusedQuote} />;
    } else {
      // Fallback to stats strip when quotes exhausted
      setLastDividerIndex(index);
      return <StatsStrip events={sortedEvents} />;
    }
  };

  return (
    <div className="relative">
      {/* Motivational Banner at Top */}
      <MotivationalBanner 
        message={bannerMessage}
        subtext="Celebrate micro-wins on your journey."
      />

      {/* Export History Button - Fixed Position */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button variant="secondary" className="shadow-lg">
          <Download className="w-4 h-4 mr-2" />
          Export History
        </Button>
      </div>

      {/* Timeline line */}
      <div className="absolute left-8 top-24 bottom-8 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />
      
      <div className="space-y-6">
        {sortedEvents.map((event, index) => (
          <div key={event.id}>
            {/* Insert motivational content with controlled spacing */}
            {getDividerContent(index)}
            
            <div className="relative flex items-start gap-6">
              {/* Timeline node with enhanced animations */}
              <div className={`
                relative z-10 flex items-center justify-center w-16 h-16 rounded-full 
                border-4 ${getEventColor(event.type)} shadow-lg
                ${index < 2 ? 'animate-pulse' : ''}
              `}>
                {getEventIcon(event.type)}
                {/* Enhanced pulse animation for recent events */}
                {index < 2 && (
                  <>
                    <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-yellow-400/40 animate-ping animation-delay-75" />
                  </>
                )}
                {/* Confetti effect for milestones */}
                {event.type === "milestone" && index < 2 && (
                  <div className="absolute -top-2 -right-2 text-xs animate-bounce">✨</div>
                )}
              </div>

              {/* Event card with enhanced hover effects and category background */}
              <Card className={`
                flex-1 ${getCategoryBackground(event.category)} border-white/20 hover:shadow-xl hover:scale-[1.01]
                transition-all duration-300 group ${index < 2 ? 'ring-2 ring-primary/20 shadow-lg' : ''}
                rounded-2xl overflow-hidden
              `}>
                {/* Background enrichment based on category */}
                <div className="absolute inset-0 opacity-10">
                  {event.category === "health" && (
                    <div className="bg-gradient-to-br from-blue-200 to-cyan-200 h-full w-full" />
                  )}
                  {event.category === "wellness" && (
                    <div className="bg-gradient-to-br from-green-200 to-emerald-200 h-full w-full" />
                  )}
                  {event.category === "social" && (
                    <div className="bg-gradient-to-br from-pink-200 to-rose-200 h-full w-full" />
                  )}
                </div>

                <CardContent className="p-4 relative z-10">
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

                  {/* Event details with badges and icons */}
                  {event.details && (
                    <div className="flex items-center gap-4 text-xs">
                      {event.details.streakCount && (
                        <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                          <Zap className="w-3 h-3" />
                          <span>{event.details.streakCount} day streak 🔥</span>
                        </div>
                      )}
                      {event.details.improvement && (
                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          <TrendingUp className="w-3 h-3" />
                          <span>{event.details.improvement}</span>
                        </div>
                      )}
                      {event.details.achievement && (
                        <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                          <Award className="w-3 h-3" />
                          <span>{event.details.achievement}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>

      {/* Load more section */}
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