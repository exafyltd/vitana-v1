import { Link2 } from "lucide-react";
import { PillarSynergy } from "@/services/autopilotContext";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { t } from '@/lib/i18n-toast';

interface CrossPlanRelationshipWidgetProps {
  relationships: PillarSynergy[];
  lastSynced: string;
}

export function CrossPlanRelationshipWidget({ 
  relationships, 
  lastSynced 
}: CrossPlanRelationshipWidgetProps) {
  if (relationships.length === 0) return null;
  
  const getPillarName = (pillarKey: string) => {
    const names: Record<string, string> = {
      nutrition: "Nutrition",
      exercise: "Exercise",
      hydration: "Hydration",
      sleep: "Sleep",
      mental: "Mental",
      supplement: "Supplement"
    };
    return names[pillarKey] || pillarKey;
  };
  
  return (
    <TooltipProvider>
      <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 
                      dark:from-slate-900/50 dark:to-indigo-900/20 
                      border border-slate-200/60 dark:border-slate-800/60 
                      backdrop-blur-md p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-foreground">
            {t('screens.health.howYourPlansInteract')}
          </h3>
        </div>
        
        <div className="space-y-3">
          {relationships.map((rel, idx) => (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-help",
                    rel.type === "positive" 
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" 
                      : rel.type === "negative"
                      ? "bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      : "bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/30"
                  )}
                >
                  {/* Visual Icon Pills */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                      rel.type === "positive" 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : rel.type === "negative"
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : "bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300"
                    )}>
                      <span>{rel.icons.from}</span>
                      <span className="text-[10px]">{getPillarName(rel.from)}</span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-600 text-sm">→</span>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                      rel.type === "positive" 
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : rel.type === "negative"
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : "bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300"
                    )}>
                      <span>{rel.icons.to}</span>
                      <span className="text-[10px]">{getPillarName(rel.to)}</span>
                    </div>
                  </div>
                  
                  <p className={cn(
                    "text-sm font-medium flex-1",
                    rel.type === "positive" 
                      ? "text-emerald-700 dark:text-emerald-300"
                      : rel.type === "negative"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-slate-700 dark:text-slate-300"
                  )}>
                    {rel.impact}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">
                  {rel.type === "positive" 
                    ? `Your consistent ${getPillarName(rel.from)} routine has positively influenced your ${getPillarName(rel.to)} outcomes. This correlation was detected by Autopilot analysis.`
                    : rel.type === "negative"
                    ? `Autopilot detected that improvements in ${getPillarName(rel.from)} could help optimize your ${getPillarName(rel.to)} results.`
                    : `${getPillarName(rel.from)} and ${getPillarName(rel.to)} are being monitored for correlations.`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Last synced: {lastSynced}
        </p>
      </div>
    </TooltipProvider>
  );
}
