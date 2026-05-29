import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, Flag } from "lucide-react";
import { celebrate, EMPTY_COPY } from "@/lib/celebrate";
import { t } from "@/lib/i18n-toast";

export interface TodayAction {
  id: string;
  title: string;
  status: string;
}

/**
 * The daily "10,000 steps" counter for My Journey. Lists today's planned
 * actions and, when the user completes the last one, fires the
 * "Congratulations! Today's goal achieved" celebration (deduped to once per
 * local day inside celebrate()).
 */
export function TodaysGoalCard({
  actions,
  loading,
  onOpenAutopilot,
}: {
  actions: TodayAction[];
  loading: boolean;
  onOpenAutopilot: () => void;
}) {
  const total = actions.length;
  const done = actions.filter((a) => a.status === "completed").length;
  const allDone = total > 0 && done === total;

  useEffect(() => {
    if (allDone) celebrate({ kind: "daily-goal", source: "my-journey" });
  }, [allDone]);

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card className="rounded-2xl border border-amber-200/60 shadow-sm bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-rose-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-semibold">{t("screens.autopilotdashboard.todaysGoal")}</p>
          </div>
          {total > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              {t("screens.autopilotdashboard.todayDoneOfTotal", { done, total })}
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-2 rounded-full bg-amber-100/60 animate-pulse" />
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">{EMPTY_COPY.myJourneyOnePillar}</p>
        ) : (
          <>
            <Progress value={pct} className="h-2 bg-amber-100/70 dark:bg-amber-950/40" />
            {allDone ? (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t("screens.autopilotdashboard.todayAllDone")}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {actions.slice(0, 4).map((a) => {
                  const completed = a.status === "completed";
                  return (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={completed ? "line-through text-muted-foreground" : ""}>
                        {a.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={onOpenAutopilot}>
              {t("screens.autopilotdashboard.seeTodaysPlan")}
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TodaysGoalCard;
