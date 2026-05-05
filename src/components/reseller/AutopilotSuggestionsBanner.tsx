/**
 * AUTOPILOT SUGGESTIONS BANNER
 * 
 * Premium glassy insight card for reseller suggestions.
 */

import { useState, useEffect } from "react";
import { Plane, X, ChevronRight, Calendar, TrendingUp, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useResellerEventStats } from "@/hooks/useResellerEvents";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";
import { t } from '@/lib/i18n-toast';

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
          title: `Event starting in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
          description: "Launch a quick campaign to maximize last-minute ticket sales.",
          icon: <Calendar className="h-4 w-4" />,
          actionLabel: "Create Campaign",
          payload: { action: "create_campaign", context: "upcoming_event" }
        });
      }
    }

    // Suggestion: Low ticket sales - softer messaging
    if (stats.totalEvents > 0 && stats.ticketsSold30Days < 5) {
      suggestions.push({
        id: "low-sales",
        type: "sales",
        title: "Boost ticket momentum",
        description: "Launch a targeted promotion or share to social in 1 click.",
        icon: <Rocket className="h-4 w-4" />,
        actionLabel: "Create Promotion",
        payload: { action: "boost_visibility", context: "low_sales" }
      });
    }

    // Suggestion: Growth opportunity
    if (stats.upcomingEventsCount >= 2) {
      suggestions.push({
        id: "multi-event",
        type: "opportunity",
        title: "Multiple events ready to promote",
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

  const accentColorMap = {
    timing: "text-blue-600 dark:text-blue-400",
    sales: "text-primary", 
    opportunity: "text-emerald-600 dark:text-emerald-400"
  };

  const iconBgMap = {
    timing: "bg-blue-100/80 dark:bg-blue-900/30",
    sales: "bg-primary/10", 
    opportunity: "bg-emerald-100/80 dark:bg-emerald-900/30"
  };

  return (
    <div className="relative bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5">
      {/* Dismiss button */}
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground/60" />
      </button>

      <div className="flex items-start gap-4">
        {/* Icon in soft pill */}
        <div className={`p-3 rounded-xl ${iconBgMap[activeSuggestion.type]} shadow-sm flex-shrink-0`}>
          <Plane className={`h-5 w-5 ${accentColorMap[activeSuggestion.type]}`} />
        </div>

        <div className="flex-1 min-w-0 pr-8">
          {/* Label */}
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1 block">
            {t('screens.reseller.autopilotSuggestion')}
          </span>
          
          {/* Title with icon */}
          <div className="flex items-center gap-2 mb-1">
            <span className={accentColorMap[activeSuggestion.type]}>
              {activeSuggestion.icon}
            </span>
            <h4 className="font-medium text-foreground">{activeSuggestion.title}</h4>
          </div>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground">{activeSuggestion.description}</p>
        </div>

        {/* CTA Button */}
        <Button 
          size="sm" 
          className="flex-shrink-0 gap-1.5 rounded-xl shadow-sm"
          onClick={handleApplySuggestion}
        >
          {activeSuggestion.actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
