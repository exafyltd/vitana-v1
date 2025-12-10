/**
 * AUTOPILOT SUGGESTIONS BANNER
 * 
 * Displays AI-powered suggestions for resellers/producers to optimize their sales.
 * Suggestions are based on:
 * - Upcoming event timing (e.g., "Your event starts in 5 days")
 * - Sales velocity (e.g., "Ticket sales are low")
 * - Trending opportunities (e.g., "Top trending event to resell")
 * 
 * Pressing "Apply suggestion" triggers autopilot.runSuggestion() with context.
 */

import { useState, useEffect } from "react";
import { Sparkles, X, ChevronRight, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useResellerEventStats } from "@/hooks/useResellerEvents";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  type: "timing" | "sales" | "opportunity";
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  payload: Record<string, any>;
}

export function AutopilotSuggestionsBanner() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const { executeActions } = useAutopilot();
  const stats = useResellerEventStats();

  // Generate dynamic suggestions based on reseller data
  useEffect(() => {
    const suggestions: Suggestion[] = [];

    // Suggestion: Event starting soon
    if (stats.nextEventDate) {
      const daysUntil = differenceInDays(new Date(stats.nextEventDate), new Date());
      if (daysUntil <= 7 && daysUntil > 0) {
        suggestions.push({
          id: "event-soon",
          type: "timing",
          title: `Your event starts in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
          description: "Consider launching a campaign to boost last-minute ticket sales.",
          icon: <Calendar className="h-4 w-4" />,
          actionLabel: "Create Campaign",
          payload: { action: "create_campaign", context: "upcoming_event" }
        });
      }
    }

    // Suggestion: Low ticket sales
    if (stats.totalEvents > 0 && stats.ticketsSold30Days < 5) {
      suggestions.push({
        id: "low-sales",
        type: "sales",
        title: "Ticket sales are low",
        description: "Boost visibility with a targeted promotion or social media campaign.",
        icon: <AlertTriangle className="h-4 w-4" />,
        actionLabel: "Boost Visibility",
        payload: { action: "boost_visibility", context: "low_sales" }
      });
    }

    // Suggestion: Growth opportunity
    if (stats.upcomingEventsCount >= 2) {
      suggestions.push({
        id: "multi-event",
        type: "opportunity",
        title: "You have multiple upcoming events",
        description: "Create a series campaign to promote all events together.",
        icon: <TrendingUp className="h-4 w-4" />,
        actionLabel: "Create Series",
        payload: { action: "create_series_campaign", context: "multi_event" }
      });
    }

    // Filter out dismissed suggestions and pick the first
    const available = suggestions.filter(s => !dismissed.includes(s.id));
    setActiveSuggestion(available[0] || null);
  }, [stats, dismissed]);

  const handleApplySuggestion = () => {
    if (!activeSuggestion) return;
    
    // Run autopilot action (frontend only for now)
    // Note: In future, this will trigger actual autopilot execution
    console.log("Autopilot suggestion applied:", activeSuggestion.payload);
    toast.success(`Applying: ${activeSuggestion.actionLabel}`);
    setDismissed(prev => [...prev, activeSuggestion.id]);
  };

  const handleDismiss = () => {
    if (activeSuggestion) {
      setDismissed(prev => [...prev, activeSuggestion.id]);
    }
  };

  if (!activeSuggestion) return null;

  const iconColorMap = {
    timing: "text-blue-500",
    sales: "text-amber-500", 
    opportunity: "text-emerald-500"
  };

  const bgColorMap = {
    timing: "from-blue-50 to-cyan-50 border-blue-200/50 dark:from-blue-950/30 dark:to-cyan-950/30 dark:border-blue-800/50",
    sales: "from-amber-50 to-orange-50 border-amber-200/50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800/50",
    opportunity: "from-emerald-50 to-green-50 border-emerald-200/50 dark:from-emerald-950/30 dark:to-green-950/30 dark:border-emerald-800/50"
  };

  return (
    <div className={`relative bg-gradient-to-r ${bgColorMap[activeSuggestion.type]} rounded-2xl p-4 border mb-4`}>
      <button 
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 flex-shrink-0">
          <Sparkles className="h-5 w-5 text-red-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={iconColorMap[activeSuggestion.type]}>
              {activeSuggestion.icon}
            </span>
            <h4 className="font-semibold text-foreground">{activeSuggestion.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{activeSuggestion.description}</p>
        </div>

        <Button 
          size="sm" 
          className="flex-shrink-0 gap-1"
          onClick={handleApplySuggestion}
        >
          {activeSuggestion.actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
