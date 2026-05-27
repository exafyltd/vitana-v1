import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Circle, Flag, Repeat, Sparkles, Trophy } from "lucide-react";
import { fmtDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import { GoalProgressRing } from "@/components/journey/GoalProgressRing";
import { GoalTrendBadge } from "@/components/journey/GoalTrendBadge";
import { buildPhases } from "@/lib/goalPhases";
import { computeGoalTrend } from "@/lib/goalTrend";
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
  const tint =
    step.kind === "milestone"
      ? "text-amber-600"
      : step.kind === "checkpoint"
      ? "text-blue-600"
      : "text-emerald-600";
  return (
    <button
      type="button"
      onClick={() => onToggle(step)}
      className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left shadow-sm transition-colors ${
        done
          ? "border-emerald-500/30 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5"
          : highlight
          ? "border-indigo-400/40 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5"
          : "border-border/60 hover:bg-muted/30"
      }`}
    >
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${tint}`} />
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
 * Right-side drawer (matching the Vitana Index sheet) showing the Vitana-
 * prescribed day-by-day plan: where you are now, recurring daily habits, and
 * the dated milestones/checkpoints in chronological order. Generates the plan
 * on demand when a deadline exists but no plan has been built yet.
 */
export function GoalPlanSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useGoalPlan();
  const generate = useGenerateGoalPlan();
  const complete = useCompleteGoalStep();
  const plan = data?.plan ?? null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const onToggle = (s: GoalPlanStep) => complete.mutate({ stepId: s.id, done: s.status !== "done" });

  const genError =
    generate.isError
      ? (generate.error as Error)?.message ?? "error"
      : generate.data && generate.data.ok === false
        ? generate.data.error ?? "generation_failed"
        : null;

  // Vitana asked clarifying questions for a broad goal — collect answers before
  // building the plan. Questions are LLM-generated (localized server-side).
  const questions = generate.data?.needs_clarification ? generate.data.questions ?? [] : [];
  const clarifyMode = !plan && questions.length > 0;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submitAnswers = () =>
    generate.mutate({ answers: questions.map((q) => ({ question: q, answer: answers[q] ?? "" })) });

  // Auto-build the plan when the drawer opens and there's no real plan yet,
  // so opening the circle is enough — no need to find the regenerate button.
  // Guarded to fire at most once per open, and not after a failure (so the
  // user sees the error instead of a silent retry loop).
  const autoTriedRef = useRef(false);
  const stepless =
    !plan || (plan.milestones.length === 0 && plan.checkpoints.length === 0 && plan.habits.length === 0);
  useEffect(() => {
    if (!open) {
      autoTriedRef.current = false;
      setAnswers({});
      return;
    }
    if (isLoading || generate.isPending || genError || clarifyMode) return;
    if (stepless && !autoTriedRef.current) {
      autoTriedRef.current = true;
      generate.mutate();
    }
  }, [open, isLoading, stepless, genError, clarifyMode, generate]);

  const dated = plan
    ? [...plan.milestones, ...plan.checkpoints].sort((a, b) =>
        (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""),
      )
    : [];

  // 1-based day (never Day 0) + time-based progress for the shared ring.
  const planDay = plan ? Math.min(plan.day + 1, plan.total_days) : 0;
  const planPct = plan ? Math.min(100, Math.round((plan.day / Math.max(1, plan.total_days)) * 100)) : 0;
  const planPhases = plan
    ? buildPhases(plan.milestones.map((m) => m.day_offset ?? 0).filter((d) => d > 0), plan.total_days)
    : [];
  const trend = computeGoalTrend(plan, todayIso);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">{t("screens.autopilotdashboard.planSheetTitle")}</SheetTitle>
          {plan && (
            <SheetDescription className="text-sm text-muted-foreground">{plan.goal_text}</SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div>
          ) : clarifyMode ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-base font-semibold">{t("screens.autopilotdashboard.planClarifyTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {t("screens.autopilotdashboard.planClarifyIntro")}
                </p>
              </div>
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i} className="space-y-1.5">
                    <label className="text-sm font-medium leading-snug block">{q}</label>
                    <Textarea
                      rows={2}
                      value={answers[q] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                      placeholder={t("screens.autopilotdashboard.planClarifyPlaceholder")}
                      className="resize-none"
                    />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={submitAnswers} disabled={generate.isPending}>
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
          ) : !plan ? (
            <div className="flex flex-col items-center text-center gap-3 py-10">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("screens.autopilotdashboard.planSheetEmpty")}
              </p>
              {genError && !generate.isPending && (
                <p className="text-xs text-red-500 max-w-xs">
                  {t("screens.autopilotdashboard.planError", { error: genError })}
                </p>
              )}
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
            <>
              {/* Section 1: Where you are now — same progress ring as My Journey */}
              <section className="space-y-4">
                <div className="flex items-center justify-center">
                  <GoalProgressRing
                    pct={planPct}
                    day={planDay}
                    daysLeft={plan.days_left}
                    phases={planPhases}
                    currentDay={plan.day}
                    totalDays={plan.total_days}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="secondary" className="shrink-0 whitespace-nowrap text-sm">
                    {t("screens.autopilotdashboard.planDayOfTotal", { day: planDay, total: plan.total_days })}
                  </Badge>
                  {trend && <GoalTrendBadge trend={trend} />}
                </div>
                {plan.plan_summary && (
                  <p className="text-sm text-center text-muted-foreground leading-snug">{plan.plan_summary}</p>
                )}
              </section>

              {/* Section 2: Daily habits */}
              {plan.habits.length > 0 && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("screens.autopilotdashboard.planEveryDay")}
                    </h3>
                    {plan.habits.map((h) => (
                      <StepRow key={h.id} step={h} onToggle={onToggle} />
                    ))}
                  </section>
                </>
              )}

              {/* Section 3: Day-by-day path */}
              {dated.length > 0 && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("screens.autopilotdashboard.planByDay")}
                    </h3>
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
                  </section>
                </>
              )}

              <Separator />
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
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default GoalPlanSheet;
