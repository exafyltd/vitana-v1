import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KebabMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu-kebab";
import { CheckCircle, RotateCcw, Star, TrendingUp, Calendar, Award, Zap, Download, BarChart3, Search, ArrowUp, Eye, MessageSquare, Share2, Filter } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { t } from '@/lib/i18n-toast';

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

type FilterType = "all" | "milestones" | "completions" | "streaks" | "ai" | "hydration" | "sleep" | "exercise" | "nutrition" | "mental";
type RangeType = "today" | "week" | "month" | "all";

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Milestones", value: "milestones" },
  { label: "Completions", value: "completions" },
  { label: "Streaks", value: "streaks" },
  { label: "AI", value: "ai" },
  { label: "Hydration", value: "hydration" },
  { label: "Sleep", value: "sleep" },
  { label: "Exercise", value: "exercise" },
  { label: "Nutrition", value: "nutrition" },
  { label: "Mental", value: "mental" }
];

const RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "week" },
  { label: "Last 30 days", value: "month" },
  { label: "All time", value: "all" }
];

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
    category: "hydration",
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
    category: "mental",
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
    category: "wellness",
    details: {
      improvement: "Social wellness +25%"
    }
  },
  {
    id: "sleep-streak",
    type: "streak",
    title: "5-night Sleep Schedule",
    description: "Consistent 8-hour sleep for 5 nights",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    icon: "🌙",
    category: "sleep",
    details: {
      streakCount: 5
    }
  },
  {
    id: "exercise-complete",
    type: "completion", 
    title: "Morning workout completed",
    description: "30-minute HIIT session finished",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    icon: "🏋️",
    category: "exercise",
    details: {
      improvement: "Strength +10%"
    }
  },
  {
    id: "nutrition-goal",
    type: "completion",
    title: "Daily nutrition targets hit", 
    description: "Balanced meals with all macronutrients",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    icon: "🥗",
    category: "nutrition",
    details: {
      improvement: "Protein goal exceeded"
    }
  }
];

const getEventIcon = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "completion": return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    case "milestone": return <Award className="w-5 h-5 text-amber-600" />;
    case "streak": return <Zap className="w-5 h-5 text-orange-600" />;
    case "first-time": return <Star className="w-5 h-5 text-purple-600" />;
  }
};

const getEventColor = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "completion": return "border-emerald-200 bg-emerald-50";
    case "milestone": return "border-amber-200 bg-amber-50";
    case "streak": return "border-orange-200 bg-orange-50";
    case "first-time": return "border-purple-200 bg-purple-50";
  }
};

const getCategoryBackground = (category: string) => {
  switch (category) {
    case "hydration":
      return "bg-gradient-to-br from-cyan-50/80 to-blue-50/80 backdrop-blur-sm";
    case "sleep": 
      return "bg-gradient-to-br from-indigo-50/80 to-purple-50/80 backdrop-blur-sm";
    case "exercise":
      return "bg-gradient-to-br from-orange-50/80 to-red-50/80 backdrop-blur-sm";
    case "nutrition":
      return "bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm";
    case "mental":
      return "bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm";
    case "wellness": 
      return "bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm";
    case "ai":
      return "bg-gradient-to-br from-violet-50/80 to-purple-50/80 backdrop-blur-sm";
    default:
      return "bg-white/80 backdrop-blur-sm";
  }
};

const getCategoryWatermark = (category: string) => {
  switch (category) {
    case "hydration": return "💧";
    case "sleep": return "🌙";
    case "exercise": return "🏋️";
    case "nutrition": return "🥗";
    case "mental": return "🧠";
    case "wellness": return "🌿";
    case "ai": return "🤖";
    default: return "⭐";
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

// Filter events based on active filters
const filterEvents = (events: TimelineEvent[], activeFilters: FilterType[], range: RangeType, searchQuery: string): TimelineEvent[] => {
  let filtered = events;

  // Apply category filters
  if (!activeFilters.includes("all")) {
    filtered = filtered.filter(event => {
      return activeFilters.some(filter => {
        if (filter === "milestones") return event.type === "milestone";
        if (filter === "completions") return event.type === "completion";
        if (filter === "streaks") return event.type === "streak";
        if (filter === "ai") return event.description.toLowerCase().includes("ai");
        return event.category === filter;
      });
    });
  }

  // Apply date range filter
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  filtered = filtered.filter(event => {
    const eventDate = event.timestamp;
    switch (range) {
      case "today":
        return eventDate >= startOfDay;
      case "week":
        const weekAgo = new Date(startOfDay);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return eventDate >= weekAgo;
      case "month":
        const monthAgo = new Date(startOfDay);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return eventDate >= monthAgo;
      default:
        return true;
    }
  });

  // Apply search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      event.category.toLowerCase().includes(query)
    );
  }

  return filtered;
};

// Group events by date
const groupEventsByDate = (events: TimelineEvent[]) => {
  const groups: { [key: string]: TimelineEvent[] } = {};
  
  events.forEach(event => {
    const dateKey = event.timestamp.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  });

  return Object.entries(groups).map(([date, events]) => ({
    date: new Date(date),
    events: events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  })).sort((a, b) => b.date.getTime() - a.date.getTime());
};

export function VisualHistoryTimeline({ events = defaultEvents }: VisualHistoryTimelineProps) {
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(["all"]);
  const [selectedRange, setSelectedRange] = useState<RangeType>("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTrends, setShowTrends] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Session-level de-duplication store
  const [shownAffirmations] = useState(() => new Set<string>());

  // Filter and group events
  const filteredEvents = useMemo(() => 
    filterEvents(events, activeFilters, selectedRange, searchQuery),
    [events, activeFilters, selectedRange, searchQuery]
  );

  const groupedEvents = useMemo(() => 
    groupEventsByDate(filteredEvents),
    [filteredEvents]
  );

  // Calculate stats for weekly summary
  const stats = useMemo(() => {
    const completedCount = filteredEvents.filter(e => e.type === "completion").length;
    const streakEvents = filteredEvents.filter(e => e.type === "streak");
    const longestStreak = Math.max(...streakEvents.map(e => e.details?.streakCount ?? 0), 0);
    const completionRate = filteredEvents.length > 0 ? Math.round((completedCount / filteredEvents.length) * 100) : 0;
    const totalCredits = filteredEvents.length * 5; // Assuming 5 credits per action
    
    return {
      entries: filteredEvents.length,
      longestStreak,
      credits: totalCredits,
      completionRate
    };
  }, [filteredEvents]);

  // Handle filter toggle
  const handleFilterToggle = (filter: FilterType) => {
    if (filter === "all") {
      setActiveFilters(["all"]);
    } else {
      setActiveFilters(prev => {
        const withoutAll = prev.filter(f => f !== "all");
        const hasFilter = withoutAll.includes(filter);
        
        if (hasFilter) {
          const newFilters = withoutAll.filter(f => f !== filter);
          return newFilters.length === 0 ? ["all"] : newFilters;
        } else {
          return [...withoutAll, filter];
        }
      });
    }
  };

  // Handle tag click from cards
  const handleTagClick = (category: string) => {
    const filter = category as FilterType;
    if (FILTER_OPTIONS.find(f => f.value === filter)) {
      handleFilterToggle(filter);
    }
  };

  // Get range label
  const getRangeLabel = () => {
    switch (selectedRange) {
      case "today": return "Today:";
      case "week": return "This week:";
      case "month": return "Last 30 days:";
      default: return "All time:";
    }
  };

  // Handle scroll for back to top
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > window.innerHeight * 2);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format date for separators
  const formatDateSeparator = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Today)`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Yesterday)`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="relative">
      {/* Filters & Range Row */}
      <div className="mb-6 space-y-4">
        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={activeFilters.includes(option.value) ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterToggle(option.value)}
              className="h-8 px-3 text-sm"
              aria-pressed={activeFilters.includes(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Range & Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            <Select value={selectedRange} onValueChange={(value: RangeType) => setSelectedRange(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('screens.ai-feed.searchHistory')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Weekly Summary Strip */}
      <Card className="mb-6 bg-gradient-to-r from-muted/30 to-muted/10 border-muted/40 rounded-2xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">{getRangeLabel()}</span>
              <div className="flex items-center gap-4">
                <span><strong>Entries {stats.entries}</strong></span>
                {stats.longestStreak > 0 && <span><strong>Streak {stats.longestStreak}d</strong></span>}
                <span><strong>+{stats.credits} Credits</strong></span>
                <span><strong>Completion {stats.completionRate}%</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTrends(!showTrends)}
                className="h-8 px-3 text-xs"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {showTrends ? "Hide" : "Show"} trends
              </Button>
              <Button variant="secondary" size="sm" className="h-8 px-3 text-xs">
                <Download className="w-3 h-3 mr-1" />
                Export History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Content */}
      <div className="space-y-8">
        {groupedEvents.length === 0 ? (
          <Card className="bg-white/60 border-dashed border-muted-foreground/30">
            <CardContent className="p-8 text-center">
              <Filter className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('screens.ai-feed.noEventsFound')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your filters or search query
              </p>
            </CardContent>
          </Card>
        ) : (
          groupedEvents.map((group, groupIndex) => (
            <div key={group.date.toISOString()}>
              {/* Date Separator */}
              <div className="sticky top-16 z-20 mb-4">
                <div className="bg-background/95 backdrop-blur-sm border-b border-border/50 py-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {formatDateSeparator(group.date)}
                  </h3>
                </div>
              </div>

              {/* Events for this date */}
              <div className="space-y-4">
                {group.events.map((event, eventIndex) => (
                  <div key={event.id} className="relative flex items-start gap-6">
                    {/* Timeline node */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-12 h-12 rounded-full 
                      border-2 ${getEventColor(event.type)} shadow-md shrink-0
                    `}>
                      {getEventIcon(event.type)}
                    </div>

                    {/* Event card */}
                    <Card className={`
                      flex-1 ${getCategoryBackground(event.category)} border-white/20 
                      hover:shadow-lg hover:scale-[1.005] transition-all duration-200 group
                      rounded-2xl overflow-hidden relative
                    `}>
                      {/* Category watermark */}
                      <div className="absolute top-4 right-4 text-4xl opacity-5 pointer-events-none">
                        {getCategoryWatermark(event.category)}
                      </div>

                      <CardContent className="p-4 relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg">{event.icon}</span>
                            <Badge 
                              variant={getBadgeVariant(event.type)} 
                              className="text-xs cursor-pointer hover:bg-primary/20"
                              onClick={() => handleTagClick(event.type)}
                            >
                              {event.type}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-primary/10"
                              onClick={() => handleTagClick(event.category)}
                            >
                              {event.category}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {event.timestamp.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}
                            </div>
                            <KebabMenu>
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Add note
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                            </KebabMenu>
                          </div>
                        </div>

                        <h4 className="font-semibold text-sm mb-1 text-foreground pr-8">
                          {event.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3 pr-8">
                          {event.description}
                        </p>

                        {/* Event details */}
                        {event.details && (
                          <div className="flex items-center gap-3 text-xs flex-wrap">
                            {event.details.streakCount && (
                              <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                <Zap className="w-3 h-3" />
                                <span>{event.details.streakCount} day streak 🔥</span>
                              </div>
                            )}
                            {event.details.improvement && (
                              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
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

                        {/* Trends sparkline (optional) */}
                        {showTrends && (event.category === "hydration" || event.category === "sleep" || event.category === "exercise") && (
                          <div className="mt-3 pt-2 border-t border-border/20">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <BarChart3 className="w-3 h-3" />
                              <span>{t('screens.ai-feed.text7dayTrend')}</span>
                              <div className="flex-1 h-1 bg-gradient-to-r from-muted/50 via-primary/30 to-primary/60 rounded-full" />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load more section */}
      {filteredEvents.length > 0 && (
        <div className="mt-12 text-center">
          <Card className="bg-white/60 border-dashed border-muted-foreground/30 hover:bg-white/80 transition-colors duration-300">
            <CardContent className="p-6">
              <RotateCcw className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('screens.ai-feed.loadMoreHistory')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredEvents.length} events shown
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Back to top button */}
      {showBackToTop && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-6 right-6 z-50 shadow-lg rounded-full w-12 h-12 p-0"
          onClick={scrollToTop}
          aria-label={t('screens.ai-feed.backTop')}
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}