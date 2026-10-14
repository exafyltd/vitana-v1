/**
 * VTID-05172 — "What Vitana may learn from": one switch per life area, the
 * five pillars first, app usage last. Every switch is saved
 * (PUT /api/v1/timeline/learning-prefs); nothing here is decorative.
 */
import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { VCard, VCardSkeleton } from "@/components/ui/vcard";
import { useLearningPrefs, useSetLearningPref } from "@/hooks/useMemoryLearning";
import { pillarLabel } from "@/hooks/useVitanaIndex";
import { notifyError, t } from "@/lib/i18n-toast";
import { LIFE_CATEGORIES, PILLAR_CATEGORIES, type LearnableCategory } from "@/lib/memory-learning-api";
import { PILLAR_STYLE } from "@/components/timeline/timeline-meta";

function label(c: LearnableCategory): string {
  return (PILLAR_CATEGORIES as readonly string[]).includes(c) ? pillarLabel(c as never) : t(`timeline.category.${c}`);
}

export function LearningSwitches() {
  const { data, isLoading, isError } = useLearningPrefs();
  const set = useSetLearningPref();
  if (isLoading) return <VCardSkeleton size="standard" />;
  const learn = new Map((data?.prefs ?? []).map((p) => [p.category, p.learn]));
  const disabled = isError || !data?.available;

  const row = (c: LearnableCategory, hint?: string) => {
    const on = learn.get(c) ?? true;
    const Icon = (PILLAR_CATEGORIES as readonly string[]).includes(c) ? PILLAR_STYLE[c as keyof typeof PILLAR_STYLE].icon : null;
    return (
      <li key={c} className="flex items-start justify-between gap-4 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {Icon && <Icon className={`h-4 w-4 ${PILLAR_STYLE[c as keyof typeof PILLAR_STYLE].accent}`} aria-hidden />}
            {label(c)}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Switch
          checked={on}
          disabled={disabled}
          aria-label={label(c)}
          data-testid={`learn-switch-${c}`}
          onCheckedChange={(v) => set.mutate({ category: c, learn: v }, { onError: () => notifyError("memoryLearning.toast.saveFailed") })}
        />
      </li>
    );
  };

  return (
    <VCard
      size="standard"
      data-testid="memory-learning-switches"
      title={t("memoryLearning.switches.title")}
      body={
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("memoryLearning.switches.description")}</p>
          {disabled && <p className="text-sm text-muted-foreground" data-testid="memory-learning-unavailable">{t("memoryLearning.switches.unavailable")}</p>}
          <section aria-labelledby="learn-pillars">
            <h3 id="learn-pillars" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("memoryLearning.switches.pillarsTitle")}</h3>
            <ul className="divide-y">{PILLAR_CATEGORIES.map((c) => row(c))}</ul>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("memoryLearning.switches.healthNote")}
            </p>
          </section>
          <section aria-labelledby="learn-life">
            <h3 id="learn-life" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("memoryLearning.switches.lifeTitle")}</h3>
            <ul className="divide-y">{LIFE_CATEGORIES.map((c) => row(c))}</ul>
          </section>
          <section aria-labelledby="learn-usage">
            <h3 id="learn-usage" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("memoryLearning.switches.appUsageTitle")}</h3>
            <ul>{row("app_usage", `${t("memoryLearning.switches.appUsageDescription")} ${t("memoryLearning.switches.appUsageOff")}`)}</ul>
          </section>
        </div>
      }
    />
  );
}
