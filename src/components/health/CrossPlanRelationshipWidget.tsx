import { Link2 } from "lucide-react";
import { PillarSynergy } from "@/services/autopilotContext";
import { cn } from "@/lib/utils";

interface CrossPlanRelationshipWidgetProps {
  relationships: PillarSynergy[];
  lastSynced: string;
}

export function CrossPlanRelationshipWidget({ 
  relationships, 
  lastSynced 
}: CrossPlanRelationshipWidgetProps) {
  if (relationships.length === 0) return null;
  
  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 
                    dark:from-slate-900/50 dark:to-indigo-900/20 
                    border border-slate-200/60 dark:border-slate-800/60 
                    backdrop-blur-md p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-lg font-semibold text-foreground">
          How Your Plans Interact
        </h3>
      </div>
      
      <div className="space-y-3">
        {relationships.map((rel, idx) => (
          <div 
            key={idx}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              rel.type === "positive" 
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" 
                : rel.type === "negative"
                ? "bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                : "bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/30"
            )}
          >
            <div className="flex items-center gap-2 text-xl">
              <span>{rel.icons.from}</span>
              <span className="text-slate-400 dark:text-slate-600">→</span>
              <span>{rel.icons.to}</span>
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
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        Last synced: {lastSynced}
      </p>
    </div>
  );
}
