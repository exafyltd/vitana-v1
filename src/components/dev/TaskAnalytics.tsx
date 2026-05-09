/**
 * Task Analytics Ribbon - Live Statistics
 */

import { useTaskStore } from "@/state/taskStore";
import { Card } from "@/components/ui/card";
import { BarChart3, Clock, TrendingUp, Zap } from "lucide-react";
import { useMemo } from "react";
import { t } from '@/lib/i18n-toast';

export function TaskAnalytics() {
  const tasks = useTaskStore((state) => state.tasks);
  
  const analytics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const completed = tasks.filter((t) => t.status === "cancelled" || t.outcome).length;
    const aiCreated = tasks.filter((t) => t.confidence !== undefined).length;
    
    const inProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;
    const aiRatio = total > 0 ? Math.round((aiCreated / total) * 100) : 0;
    
    // Calculate average completion time (for completed tasks)
    const completedWithTime = tasks.filter((t) => t.outcome);
    const avgCompletionHours = completedWithTime.length > 0
      ? Math.round(
          completedWithTime.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const updated = new Date(t.updated_at).getTime();
            return acc + (updated - created) / (1000 * 60 * 60);
          }, 0) / completedWithTime.length
        )
      : 0;
    
    return {
      total,
      inProgressPercent,
      avgCompletionHours,
      aiRatio,
      completed,
    };
  }, [tasks]);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sys-vitana-tint">
            <BarChart3 className="h-5 w-5 text-sys-vitana-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('screens.dev.totalTasks')}</p>
            <p className="text-2xl font-bold">{analytics.total}</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sys-autopilot-tint">
            <TrendingUp className="h-5 w-5 text-sys-autopilot-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('screens.dev.progress2')}</p>
            <p className="text-2xl font-bold">{analytics.inProgressPercent}%</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pill-hydration-tint">
            <Clock className="h-5 w-5 text-pill-hydration-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('screens.dev.avgCompletion')}</p>
            <p className="text-2xl font-bold">{analytics.avgCompletionHours}h</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sys-ai-tint">
            <Zap className="h-5 w-5 text-sys-ai-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('screens.dev.aiCreated')}</p>
            <p className="text-2xl font-bold">{analytics.aiRatio}%</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
