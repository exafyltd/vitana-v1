/**
 * BUSINESS HUB AUTOPILOT BANNER
 * 
 * Premium glassy insight card for business suggestions.
 * Mirrors AutopilotSuggestionsBanner styling for visual consistency.
 */

import { useState, useEffect } from "react";
import { Plane, X, ChevronRight, Users, Calendar, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutopilot } from "@/hooks/use-autopilot";
import { t } from '@/lib/i18n-toast';

interface Suggestion {
  id: string;
  type: "retention" | "growth" | "opportunity";
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  payload: Record<string, any>;
}

export function BusinessHubAutopilotBanner() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const { pendingCount, getLatestActions } = useAutopilot();

  // Generate dynamic suggestions based on business data
  useEffect(() => {
    const suggestions: Suggestion[] = [];

    // Suggestion: Client retention
    suggestions.push({
      id: "client-retention",
      type: "retention",
      title: "Boost client retention this week",
      description: "Follow up with 3 clients who haven't booked in 30+ days.",
      icon: <Users className="h-4 w-4" />,
      actionLabel: "View Clients",
      payload: { action: "view_inactive_clients", context: "retention" }
    });

    // Suggestion: Create a service package
    suggestions.push({
      id: "service-package",
      type: "growth",
      title: "Bundle your services",
      description: "Create a service package to increase average order value.",
      icon: <Briefcase className="h-4 w-4" />,
      actionLabel: "Create Package",
      payload: { action: "create_package", context: "growth" }
    });

    // Suggestion: Schedule optimization
    suggestions.push({
      id: "schedule-optimization",
      type: "opportunity",
      title: "Optimize your schedule",
      description: "You have open slots this week that could be filled.",
      icon: <Calendar className="h-4 w-4" />,
      actionLabel: "View Calendar",
      payload: { action: "view_calendar", context: "optimization" }
    });

    // If there are pending autopilot actions, prioritize showing that
    if (pendingCount > 0) {
      const latestActions = getLatestActions(1);
      if (latestActions.length > 0) {
        const action = latestActions[0];
        suggestions.unshift({
          id: `autopilot-${action.id}`,
          type: "opportunity",
          title: action.title,
          description: action.reason || "Review this suggestion from Autopilot.",
          icon: <Plane className="h-4 w-4" />,
          actionLabel: "Review",
          payload: { action: "review_autopilot", actionId: action.id }
        });
      }
    }

    // Filter out dismissed suggestions and pick the first
    const available = suggestions.filter(s => !dismissed.includes(s.id));
    setActiveSuggestion(available[0] || null);
  }, [dismissed, pendingCount, getLatestActions]);

  const handleApplySuggestion = () => {
    if (!activeSuggestion) return;
    
    console.log("Business Hub suggestion applied:", activeSuggestion.payload);
    setDismissed(prev => [...prev, activeSuggestion.id]);
  };

  const handleDismiss = () => {
    if (activeSuggestion) {
      setDismissed(prev => [...prev, activeSuggestion.id]);
    }
  };

  if (!activeSuggestion) return null;

  const accentColorMap = {
    retention: "text-blue-600 dark:text-blue-400",
    growth: "text-primary", 
    opportunity: "text-emerald-600 dark:text-emerald-400"
  };

  const iconBgMap = {
    retention: "bg-blue-100/80 dark:bg-blue-900/30",
    growth: "bg-primary/10", 
    opportunity: "bg-emerald-100/80 dark:bg-emerald-900/30"
  };

  return (
    <div className="relative bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5">
      {/* Dismiss button */}
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground/60" />
      </button>

      <div className="flex items-start gap-4">
        {/* Icon in soft pill - slightly reduced */}
        <div className={`p-2.5 rounded-xl ${iconBgMap[activeSuggestion.type]} shadow-sm flex-shrink-0`}>
          <Plane className={`h-4 w-4 ${accentColorMap[activeSuggestion.type]}`} />
        </div>

        <div className="flex-1 min-w-0 pr-8">
          {/* Label - updated text */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">
            {t('screens.business.autopilotRecommendation')}
          </span>
          
          {/* Title with icon - emphasized */}
          <div className="flex items-center gap-2 mb-1">
            <span className={accentColorMap[activeSuggestion.type]}>
              {activeSuggestion.icon}
            </span>
            <h4 className="font-semibold text-foreground">{activeSuggestion.title}</h4>
          </div>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground">{activeSuggestion.description}</p>
        </div>

        {/* CTA Button - emphasized */}
        <Button 
          size="sm" 
          className="flex-shrink-0 gap-1.5 rounded-full shadow-sm font-medium"
          onClick={handleApplySuggestion}
        >
          {activeSuggestion.actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
