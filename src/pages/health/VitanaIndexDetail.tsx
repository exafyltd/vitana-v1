import { useMemo, useState, type ReactNode } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Apple,
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Compass,
  Droplets,
  Dumbbell,
  Flame,
  Moon,
  Plus,
  RefreshCw,
  Route,
  Scale,
  Sparkles,
  Target,
  TestTube,
  TrendingDown,
  TrendingUp,
  Watch,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useVitanaIndex,
  pillarKeys,
  pillarLabel,
  type VitanaIndexState,
  type VitanaPillarKey,
} from "@/hooks/useVitanaIndex";
import VitanaPillarAgentsPanel from "@/components/health/VitanaPillarAgentsPanel";
import VitanaLogDataDialog from "@/components/health/VitanaLogDataDialog";
import MissionAlignmentCard from "@/components/health/MissionAlignmentCard";
import { HealthReportUploadSheet } from "@/components/health/mobile/HealthReportUploadSheet";
import {
  buildNextSteps,
  goalProgress,
  THRIVING_GOAL,
  ELITE_GOAL,
  type NextStep,
} from "@/lib/vitana-index-next-steps";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import { useTranslation } from "@/hooks/useTranslation";

/*
 * VTID-04773 — "Understand index" (from the profile's Vitana Index card).
 *
 * Same visual language as the profile: a soft blue gradient hero, white
 * rounded-3xl cards with a light shadow, teal accents, slate text. The page
 * reads top to bottom as: where you are → what to do next → where you're
 * heading → what each pillar contributes → how the number works.
 */

const VITANA_INDEX_MAX = 999;
const PILLAR_MAX = 200;

const CARD = "rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.06)]";
const PRIMARY_BTN =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-[15px] font-semibold text-white active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2";
const SOFT_BTN =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-slate-800 ring-1 ring-slate-200 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";

const PILLAR_ICONS: Record<VitanaPillarKey, LucideIcon> = {
  nutrition: Apple,
  hydration: Droplets,
  exercise: Dumbbell,
  sleep: Moon,
  mental: Brain,
};

const PILLAR_DESCRIPTION_KEYS: Record<VitanaPillarKey, string> = {
  nutrition: "screens.health.vitanaIndexPillar_food",
  hydration: "screens.health.vitanaIndexPillar_water",
  exercise: "screens.health.vitanaIndexPillar_exercise",
  sleep: "screens.health.vitanaIndexPillar_recovery",
  mental: "screens.health.vitanaIndexPillar_mental",
};

/** Trackers members recognise. Brand names, so not translated. */
const TRACKERS = ["Apple Health", "Samsung Health", "Health Connect", "Garmin", "Oura", "Fitbit"];

const k = (key: string) => `vitanaIndexPage.${key}`;

function heroLine(index: VitanaIndexState | null): string {
  if (!index) return t(k("hero.lineNoIndex"));
  if (index.trend === "up") return t(k("hero.lineUp"));
  if (index.trend === "down") return t(k("hero.lineDown"));
  return t(k("hero.lineSteady"));
}

function balanceKey(factor: number | null): string | null {
  if (factor === null) return null;
  if (factor >= 1.0) return k("balance.even");
  if (factor >= 0.9) return k("balance.slight");
  if (factor >= 0.8) return k("balance.uneven");
  return k("balance.veryUneven");
}

/** Has the member uploaded at least one blood panel? (RLS scopes lab_reports to them.) */
function useHasBloodPanel() {
  return useQuery({
    queryKey: ["lab-reports", "has-blood-panel"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("lab_reports")
        .select("id", { count: "exact", head: true })
        .eq("report_type" as never, "blood_panel" as never);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    staleTime: 60_000,
  });
}

function Sparkline({ history }: { history: Array<{ date: string; score: number }> }) {
  if (history.length < 2) return null;
  const scores = history.map((h) => h.score);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const range = Math.max(max - min, 1);
  const width = 120;
  const height = 36;
  const step = width / (history.length - 1);
  const points = history
    .map((h, i) => `${i * step},${height - ((h.score - min) / range) * (height - 6) - 3}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-teal-600 rtl:-scale-x-100" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────── */

function Hero({
  index,
  isLoading,
  onLog,
  onRefresh,
}: {
  index: VitanaIndexState | null;
  isLoading: boolean;
  onLog: () => void;
  onRefresh: () => void;
}) {
  const tier = index?.tier;
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/70 p-5"
      style={{
        backgroundColor: "hsl(208, 72%, 93%)",
        backgroundImage: "linear-gradient(165deg, hsl(200, 80%, 91%) 0%, hsl(212, 72%, 94%) 55%, hsl(225, 65%, 95%) 100%)",
        boxShadow: "0 6px 22px rgba(56, 132, 214, 0.12)",
        isolation: "isolate",
      }}
      data-testid="vitana-index-hero"
    >
      <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-teal-800">
        {t(k("hero.eyebrow"))}
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold leading-tight text-slate-900">{t(k("hero.title"))}</h1>

      <div className="relative mt-4 flex flex-col items-center">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, hsl(165, 80%, 70%), hsl(200, 80%, 80%) 55%, transparent 72%)" }}
        />
        {isLoading ? (
          <Skeleton className="my-2 h-20 w-36 rounded-xl" />
        ) : (
          <span
            className="text-[84px] font-extrabold leading-none tabular-nums"
            style={{
              background: "linear-gradient(170deg, hsl(152, 70%, 42%) 0%, hsl(168, 72%, 30%) 55%, hsl(180, 75%, 22%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            data-testid="vitana-index-score"
          >
            {index?.total ?? "—"}
          </span>
        )}
        <span className="mt-1 text-sm text-slate-500">{t("profile.indexHero.ofMax", { max: VITANA_INDEX_MAX })}</span>
      </div>

      {index && tier && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full px-4 py-1 text-sm font-semibold text-slate-900" style={{ backgroundColor: `${tier.color}88` }}>
            {t(tier.labelKey)}
          </span>
          {index.trend === "up" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <TrendingUp className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              {t(k("hero.trendUp"))}
            </span>
          )}
          {index.trend === "down" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
              <TrendingDown className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              {t(k("hero.trendDown"))}
            </span>
          )}
        </div>
      )}

      <p className="mx-auto mt-4 max-w-md text-center text-[15px] leading-snug text-slate-700" data-testid="vitana-index-hero-line">
        {heroLine(index)}
      </p>

      {index && index.history.length >= 2 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <Sparkline history={index.history} />
          <span className="text-xs text-slate-500">{t(k("hero.last7Days"))}</span>
        </div>
      )}

      <div className="mt-5 flex items-center justify-center gap-2">
        <button type="button" className={PRIMARY_BTN} onClick={onLog} data-testid="vitana-index-log">
          <Plus className="h-4 w-4" aria-hidden />
          {t(k("hero.logToday"))}
        </button>
        <button
          type="button"
          className={cn(SOFT_BTN, "w-11 px-0")}
          onClick={onRefresh}
          aria-label={t(k("hero.refreshAria"))}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {index?.lastUpdated && (
        <p className="mt-3 text-center text-xs text-slate-500">
          {t(k("hero.updated"), { date: fmtDate(index.lastUpdated, { day: "numeric", month: "long" }) })}
        </p>
      )}
    </section>
  );
}

/* ── Next steps ───────────────────────────────────────────────────── */

interface StepView {
  icon: LucideIcon;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  extra?: ReactNode;
}

function NextSteps({
  steps,
  views,
}: {
  steps: NextStep[];
  views: Record<NextStep["id"], StepView>;
}) {
  const [first, ...rest] = steps;
  const openCount = steps.filter((s) => !s.done).length;
  return (
    <section className={CARD} data-testid="vitana-index-next-steps">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-slate-900">{t(k("steps.title"))}</h2>
          <p className="mt-0.5 text-sm leading-snug text-slate-600">{t(k("steps.subtitle"))}</p>
        </div>
      </div>

      {/* Next up — the one thing to do now */}
      {first && !first.done && (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 p-4 ring-1 ring-teal-100" data-testid={`vitana-index-step-${first.id}`} data-next-up="true">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800 ring-1 ring-teal-100">
            <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden />
            {t(k("steps.nextUp"))}
          </span>
          <StepBody view={views[first.id]} large />
        </div>
      )}

      <ul className="mt-3 divide-y divide-slate-100">
        {(first?.done ? steps : rest).map((step) => (
          <li key={step.id} className="py-3" data-testid={`vitana-index-step-${step.id}`} data-done={step.done ? "true" : "false"}>
            {step.done ? (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-500 line-through decoration-slate-300">{views[step.id].title}</p>
                  <p className="text-sm text-emerald-700">{t(k("steps.done"))}</p>
                </div>
              </div>
            ) : (
              <StepBody view={views[step.id]} />
            )}
          </li>
        ))}
      </ul>

      {openCount === 0 && (
        <p className="mt-1 text-sm font-medium text-emerald-700">{t(k("steps.allDone"))}</p>
      )}
    </section>
  );
}

function StepBody({ view, large = false }: { view: StepView; large?: boolean }) {
  const Icon = view.icon;
  return (
    <div className={cn("flex gap-3", large && "mt-3")}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-2xl",
          large ? "h-11 w-11 bg-white text-teal-700 shadow-sm" : "h-9 w-9 bg-slate-50 text-slate-600",
        )}
      >
        <Icon className={large ? "h-5 w-5" : "h-[18px] w-[18px]"} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold leading-snug text-slate-900", large ? "text-[17px]" : "text-[15px]")}>{view.title}</p>
        <p className="mt-1 text-sm leading-snug text-slate-600">{view.body}</p>
        {view.extra}
        <button
          type="button"
          onClick={view.onCta}
          className={cn(
            large ? cn(PRIMARY_BTN, "mt-3 h-10 text-sm") : "mt-2 inline-flex items-center gap-1 rounded-md py-1 text-sm font-semibold text-teal-800 active:opacity-70",
          )}
        >
          {view.cta}
          {!large && <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

/* ── 90-day goal ──────────────────────────────────────────────────── */

function GoalCard({ index }: { index: VitanaIndexState | null }) {
  const total = index?.total ?? 0;
  const { target, remaining, ratio } = goalProgress(total);
  const elite = total >= ELITE_GOAL;
  return (
    <section className={CARD} data-testid="vitana-index-goal">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-teal-700" aria-hidden />
        <h2 className="text-lg font-bold text-slate-900">{t(k("goal.title"))}</h2>
      </div>

      <p className="mt-3 text-[15px] leading-snug text-slate-800">
        {!index
          ? t(k("goal.noIndex"))
          : elite
            ? t(k("goal.elite"))
            : target === THRIVING_GOAL
              ? t(k("goal.toThriving"), { points: remaining })
              : t(k("goal.toElite"), { points: remaining })}
      </p>

      {index && !elite && (
        <div className="mt-4">
          <div
            className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={total}
          >
            <div
              className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-600 rtl:bg-gradient-to-l"
              style={{ width: `${Math.max(ratio * 100, 3)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-slate-500">
            <span>{total}</span>
            <span className="font-semibold text-slate-700">{target}</span>
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li className="flex gap-2">
          <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full bg-teal-50 px-2 text-xs font-bold text-teal-800">{THRIVING_GOAL}+</span>
          <span>{t(k("goal.thrivingExplain"))}</span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full bg-amber-50 px-2 text-xs font-bold text-amber-800">{ELITE_GOAL}+</span>
          <span>{t(k("goal.eliteExplain"))}</span>
        </li>
      </ul>

      <div className="mt-4 flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm leading-snug text-slate-600">
        <Compass className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <span>{t(k("goal.compass"))}</span>
      </div>
    </section>
  );
}

/* ── Pillars ──────────────────────────────────────────────────────── */

function PillarsCard({ index, onLog }: { index: VitanaIndexState | null; onLog: () => void }) {
  const keys = pillarKeys();
  const values = keys.map((key) => index?.pillars[key] ?? 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  // Only call a pillar the "biggest lever" when it actually lags behind another.
  const weakest = index && maxVal > minVal ? keys[values.indexOf(minVal)] : null;
  const strongest = index && maxVal > minVal ? keys[values.indexOf(maxVal)] : null;
  const balance = balanceKey(index?.balanceFactor ?? null);

  return (
    <section className={CARD} data-testid="vitana-index-pillars">
      <h2 className="text-lg font-bold text-slate-900">{t(k("pillars.title"))}</h2>
      <p className="mt-0.5 text-sm leading-snug text-slate-600">{t(k("pillars.subtitle"))}</p>

      <ul className="mt-4 space-y-4">
        {keys.map((key) => {
          const Icon = PILLAR_ICONS[key];
          const value = index?.pillars[key] ?? 0;
          const isWeakest = key === weakest;
          return (
            <li key={key} data-testid={`vitana-index-pillar-${key}`}>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    isWeakest ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">{pillarLabel(key)}</span>
                      {isWeakest && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                          {t(k("pillars.biggestLever"))}
                        </span>
                      )}
                      {key === strongest && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {t(k("pillars.strongest"))}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-slate-500">
                      {value}/{PILLAR_MAX}
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("absolute inset-y-0 start-0 rounded-full", isWeakest ? "bg-amber-400" : "bg-teal-500")}
                      style={{ width: `${Math.min((value / PILLAR_MAX) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs leading-snug text-slate-500">{t(PILLAR_DESCRIPTION_KEYS[key])}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {balance && (
        <div className="mt-4 flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm leading-snug text-slate-600">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span>{t(balance)}</span>
        </div>
      )}

      <button type="button" className={cn(SOFT_BTN, "mt-4 w-full")} onClick={onLog}>
        <Plus className="h-4 w-4" aria-hidden />
        {t(k("pillars.logCta"))}
      </button>
    </section>
  );
}

/* ── How it works ─────────────────────────────────────────────────── */

function HowItWorks({ onJourney }: { onJourney: () => void }) {
  const [open, setOpen] = useState(false);
  const rows: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: Compass, title: t(k("how.baselineTitle")), body: t(k("how.baselineBody")) },
    { icon: Route, title: t(k("how.actionsTitle")), body: t(k("how.actionsBody")) },
    { icon: Watch, title: t(k("how.dataTitle")), body: t(k("how.dataBody")) },
    { icon: Flame, title: t(k("how.streakTitle")), body: t(k("how.streakBody")) },
    { icon: Scale, title: t(k("how.balanceTitle")), body: t(k("how.balanceBody")) },
  ];
  return (
    <section className={CARD} data-testid="vitana-index-how">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-start"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <span className="block text-lg font-bold text-slate-900">{t(k("how.title"))}</span>
          <span className="mt-0.5 block text-sm leading-snug text-slate-600">{t(k("how.subtitle"))}</span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <>
          <ul className="mt-4 space-y-3">
            {rows.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-slate-900">{title}</p>
                  <p className="text-sm leading-snug text-slate-600">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onJourney}
            className="mt-4 inline-flex items-center gap-1 rounded-md py-1 text-sm font-semibold text-teal-800 active:opacity-70"
          >
            {t(k("how.journeyCta"))}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </button>
        </>
      )}
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function VitanaIndexDetail() {
  // Subscribe to the language context: non-German catalogs load lazily, and
  // without this the page keeps the German fallback it rendered first with.
  useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { index, isLoading, isError, refetch } = useVitanaIndex();
  const { data: hasBloodPanel = false, refetch: refetchBlood } = useHasBloodPanel();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const steps = useMemo(() => buildNextSteps(index, { hasBloodPanel }), [index, hasBloodPanel]);
  const focusStep = steps.find((s) => s.id === "focus");
  const focusPillar = focusStep?.pillar;

  const views: Record<NextStep["id"], StepView> = {
    blood: {
      icon: TestTube,
      title: t(k("steps.bloodTitle")),
      body: t(k("steps.bloodBody")),
      cta: t(k("steps.bloodCta")),
      onCta: () => setUploadOpen(true),
      extra: (
        <button
          type="button"
          onClick={() => navigate("/health/my-biology")}
          className="mt-2 block text-start text-sm text-slate-600 underline decoration-slate-300 underline-offset-2"
        >
          {t(k("steps.bloodNoTest"))}
        </button>
      ),
    },
    devices: {
      icon: Watch,
      title: t(k("steps.devicesTitle")),
      body: t(k("steps.devicesBody")),
      cta: t(k("steps.devicesCta")),
      onCta: () => navigate("/connectors?tab=fitness"),
      extra: (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="vitana-index-trackers">
          {TRACKERS.map((name) => (
            <span key={name} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              {name}
            </span>
          ))}
        </div>
      ),
    },
    focus: {
      icon: focusPillar ? PILLAR_ICONS[focusPillar] : Target,
      title: t(k("steps.focusTitle"), { pillar: focusPillar ? pillarLabel(focusPillar) : "" }),
      body: t(k(focusStep?.even ? "steps.focusBodyEven" : "steps.focusBody")),
      cta: t(k("steps.focusCta")),
      onCta: () => setLogDialogOpen(true),
    },
    journey: {
      icon: Route,
      title: t(k("steps.journeyTitle")),
      body: t(k("steps.journeyBody")),
      cta: t(k("steps.journeyCta")),
      onCta: () => navigate("/autopilot"),
    },
  };

  return (
    <AppLayout>
      <SEO
        title={t("screens.health.vitanaIndex")}
        description="Your single number for longevity across the five pillars: Nutrition, Hydration, Exercise, Sleep, Mental."
        canonical={window.location.href}
      />

      <div className="min-h-screen bg-slate-50/60 px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Hero index={index} isLoading={isLoading} onLog={() => setLogDialogOpen(true)} onRefresh={() => refetch()} />

          {isError && (
            <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{t("screens.health.couldNotLoadYourIndexTry")}</p>
          )}

          <NextSteps steps={steps} views={views} />

          <GoalCard index={index} />

          <PillarsCard index={index} onLog={() => setLogDialogOpen(true)} />

          {/* The five pillar agents and the autopilot's mission alignment — working for the member in the background */}
          <VitanaPillarAgentsPanel />
          <MissionAlignmentCard />

          <HowItWorks onJourney={() => navigate("/autopilot")} />
        </div>
      </div>

      <VitanaLogDataDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} />
      <HealthReportUploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultCategory="blood_panel"
        onUploadComplete={() => {
          refetchBlood();
          queryClient.invalidateQueries({ queryKey: ["lab-reports"] });
        }}
      />
    </AppLayout>
  );
}
