import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, Circle, Flag, Repeat, Sparkles, Trophy } from "lucide-react";
import { fmtDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import {
  useGoalPlan,
  useGenerateGoalPlan,
  useCompleteGoalStep,
  type GoalPlanStep,
} from "@/hooks/useGoalPlan";

function StepRow({
  step,
  onToggle,
  highlight,
}: {
  step: GoalPlanStep;
  onToggle: (s: GoalPlanStep) => void;
  highlight?: boolean;
}) {
  const done = step.status === "done";
  const Icon = step.kind === "milestone" ? Trophy : step.kind === "checkpoint" ? Flag : Repeat;
  return (
    <button
      type="button"
      onClick={() => onToggle(step)}
      className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border/60 hover:bg-muted/30"
      }`}
    >
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
            {step.title}
          </span>
        </div>
        {step.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{step.description}</p>
        )}
      </div>
    </button>
  );
}

/**
 * Day-by-day detail of the Vitana-prescribed plan, opened from the North Star
 * circle. Shows where the user is now, the dated milestones/checkpoints in
 * chronological order, and the recurring daily habits. Generates the plan on
 * demand when a deadline exists but no plan has been built yet.
 */
export function GoalPlanSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useGoalPlan();
  const generate = useGenerateGoalPlan();
  const complete = useCompleteGoalStep();
  const plan = data?.plan ?? null;

  const todayIso = new Date().toISOString().slice(0, 10);

  const onToggle = (s: GoalPlanStep) => {
    complete.mutate({ stepId: s.id, done: s.status !== "done" });
  };

  const dated = plan ? [...plan.milestones, ...plan.checkpoints].sort((a, b) =>
    (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""),
  ) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 text-left">
          <SheetTitle className="text-base">{t("screens.autopilotdashboard.planSheetTitle")}</SheetTitle>
          {plan && (
            <p className="text-sm text-muted-foreground leading-snug">{plan.goal_text}</p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 pb-8">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div>
          ) : !plan ? (
            <div className="flex flex-col items-center text-center gap-3 py-10">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400/30 to-indigo-500/30 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("screens.autopilotdashboard.planSheetEmpty")}
              </p>
              <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                {generate.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("screens.autopilotdashboard.planBuilding")}
                  </>
                ) : (
                  t("screens.autopilotdashboard.planGenerate")
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Where you are now */}
              <div className="rounded-2xl bg-muted/30 p-4 text-center">
                <div className="text-3xl font-bold leading-none">{plan.days_left}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                  {t("screens.autopilotdashboard.daysLeftLabel")}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {t("screens.autopilotdashboard.planDayOfTotal", { day: plan.day, total: plan.total_days })}
                </p>
                {plan.plan_summary && (
                  <p className="text-sm mt-3 leading-snug">{plan.plan_summary}</p>
                )}
              </div>

              {/* Daily habits */}
              {plan.habits.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("screens.autopilotdashboard.planEveryDay")}
                  </p>
                  {plan.habits.map((h) => (
                    <StepRow key={h.id} step={h} onToggle={onToggle} />
                  ))}
                </div>
              )}

              {/* Day-by-day milestones & checkpoints */}
              {dated.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("screens.autopilotdashboard.planByDay")}
                  </p>
                  {dated.map((s) => (
                    <div key={s.id} className="space-y-1">
                      {s.scheduled_date && (
                        <p className="text-[11px] text-muted-foreground pl-1">
                          {fmtDate(new Date(s.scheduled_date), { day: "numeric", month: "short" })}
                          {s.scheduled_date === todayIso ? ` · ${t("screens.autopilotdashboard.planToday")}` : ""}
                        </p>
                      )}
                      <StepRow step={s} onToggle={onToggle} highlight={s.scheduled_date === todayIso} />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => generate.mutate()}
                  disabled={generate.isPending}
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      {t("screens.autopilotdashboard.planBuilding")}
                    </>
                  ) : (
                    t("screens.autopilotdashboard.planRegenerate")
                  )}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default GoalPlanSheet;
