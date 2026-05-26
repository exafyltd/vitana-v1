import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { communityFetch } from "@/lib/community-gateway";
import {
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexTrajectoryCard } from "@/components/health/VitanaIndexTrajectoryCard";
import { useVitanaIndexCache } from "@/components/health/VitanaIndexProvider";
import { LIFE_COMPASS_OPEN_EVENT } from "@/context/LifeCompassPopupContext";
import { trend7d } from "@/lib/vitana-projection";
import { bucketFromWaveId, type HorizonBucket } from "@/lib/horizonBuckets";
import { useMyJourney } from "@/hooks/useMyJourney";
import { GoalNorthStar } from "@/components/journey/GoalNorthStar";
import { TodaysGoalCard, type TodayAction } from "@/components/journey/TodaysGoalCard";
import { GoalSetupDialog } from "@/components/journey/GoalSetupDialog";
import { GoalPlanSheet } from "@/components/journey/GoalPlanSheet";
import { useGenerateGoalPlan } from "@/hooks/useGoalPlan";
import { t } from "@/lib/i18n-toast";

interface Recommendation {
  id: string;
  title: string;
  summary: string;
  status: string;
  source_ref: string;
  impact_score: number;
  wave_id?: string | number;
  wave_order?: number;
  horizon?: HorizonBucket;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
}

const HORIZON_VALUES: HorizonBucket[] = ["today", "next3", "thisWeek", "month", "future"];

function bucketFromRec(rec: Recommendation): HorizonBucket {
  if (rec.horizon && HORIZON_VALUES.includes(rec.horizon)) return rec.horizon;
  if (rec.wave_id === undefined || rec.wave_id === null) return "future";
  return bucketFromWaveId(rec.wave_id);
}

// ── Motivational line (one localized, day-rotated sentence) ───────────────

// Literal keys (not a dynamic `motivation${idx}`) so the i18n inventory
// scanner resolves each one as used.
const MOTIVATION_KEYS = [
  "screens.autopilotdashboard.motivation0",
  "screens.autopilotdashboard.motivation1",
  "screens.autopilotdashboard.motivation2",
  "screens.autopilotdashboard.motivation3",
  "screens.autopilotdashboard.motivation4",
  "screens.autopilotdashboard.motivation5",
] as const;

function MotivationalLine() {
  const idx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % MOTIVATION_KEYS.length;
  return (
    <Card className="rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50 via-green-50 to-lime-50 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-lime-950/20">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-white/60 dark:bg-white/10 rounded-full shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-sm font-medium leading-snug">{t(MOTIVATION_KEYS[idx])}</p>
      </CardContent>
    </Card>
  );
}

// ── Secondary "how you're doing" (Vitana Index, demoted) ──────────────────

function IndexNowCard() {
  const { index } = useVitanaIndexCache();
  const total = index?.total ?? null;
  const tier = index?.tier ?? null;
  const trend = index?.history ? trend7d(index.history) : null;

  const trendLabel = (() => {
    if (trend === null) return null;
    if (trend > 0)
      return { icon: TrendingUp, text: t("screens.autopilotdashboard.trendUpThisWeek", { delta: trend }), cls: "text-green-600" };
    if (trend < 0)
      return { icon: TrendingDown, text: t("screens.autopilotdashboard.trendDownThisWeek", { delta: trend }), cls: "text-red-600" };
    return { icon: TrendingUp, text: t("screens.autopilotdashboard.trendSteadyThisWeek"), cls: "text-muted-foreground" };
  })();

  return (
    <Card className="rounded-2xl border ring-1 ring-border/60 shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-sm shrink-0">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{total === null ? "…" : total}</div>
            <div className="text-[10px] text-muted-foreground">{t("screens.autopilotdashboard.text999")}</div>
          </div>
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("screens.autopilotdashboard.yourIndex")}</p>
          {tier && <p className="text-base font-semibold">{t(tier.labelKey)}</p>}
          {trendLabel && (
            <p className={`text-xs flex items-center gap-1 ${trendLabel.cls}`}>
              <trendLabel.icon className="w-3 h-3" />
              {trendLabel.text}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AutopilotDashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const generatePlan = useGenerateGoalPlan();

  const { data: journeyData, isLoading: journeyLoading, isError: journeyError, refetch: refetchJourney } = useMyJourney();
  const goal = journeyData?.life_compass ?? null;

  const { data: recData, isLoading: recLoading, refetch } = useQuery({
    queryKey: ["autopilot-onboarding"],
    queryFn: async () => {
      const res = await communityFetch(
        "/api/v1/autopilot/recommendations?status=new,activated,completed&limit=100",
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<RecommendationsResponse>;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  const todayActions = useMemo<TodayAction[]>(
    () =>
      (recData?.recommendations ?? [])
        .filter((r) => bucketFromRec(r) === "today")
        .map((r) => ({ id: r.id, title: r.title, status: r.status })),
    [recData],
  );

  const handleOpenAutopilot = () => setAutopilotOpen(true);

  // No goal at all → open the existing Life Compass popup. Goal but adjusting
  // → open the lightweight target/deadline dialog.
  const handleSetGoal = () => {
    if (!goal) {
      window.dispatchEvent(new CustomEvent(LIFE_COMPASS_OPEN_EVENT));
    } else {
      setGoalDialogOpen(true);
    }
  };

  // After a deadline is saved, Vitana builds the plan and we open the day-by-day sheet.
  const handleGoalSaved = () => {
    generatePlan.mutate();
    setPlanSheetOpen(true);
  };

  const content = (
    <div className="space-y-4">
      <GoalNorthStar
        goal={goal}
        loading={journeyLoading}
        error={journeyError}
        onSetGoal={handleSetGoal}
        onRetry={() => refetchJourney()}
        onOpenPlan={() => setPlanSheetOpen(true)}
      />

      <MotivationalLine />

      <TodaysGoalCard actions={todayActions} loading={recLoading} onOpenAutopilot={handleOpenAutopilot} />

      {/* Your plan — entry point to the full set of Autopilot steps */}
      <Card className="rounded-2xl border ring-1 ring-border/60 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("screens.autopilotdashboard.yourPlan")}</p>
              <p className="text-xs text-muted-foreground truncate">
                {pendingCount > 0
                  ? t("screens.autopilotdashboard.planStepsWaiting", { count: pendingCount })
                  : t("screens.autopilotdashboard.planAllClear")}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenAutopilot} className="shrink-0">
            {t("screens.autopilotdashboard.openPlan")}
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </Button>
        </CardContent>
      </Card>

      {/* How you're doing — Vitana Index as secondary proof */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("screens.autopilotdashboard.howYoureDoing")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <IndexNowCard />
          <VitanaIndexTrajectoryCard />
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground pb-4">
        <Sparkles className="w-4 h-4 inline-block mr-1 align-text-top" />
        {t("screens.autopilotdashboard.keepCheckingIn")}
      </div>
    </div>
  );

  const utilityBar = (
    <UtilityActionButton
      compact
      className="min-w-0"
      afterGiftVoucherChildren={
        <>
          <VitanaIndexChip />
          <AutopilotChip pendingCount={pendingCount} onClick={handleOpenAutopilot} />
        </>
      }
    >
      <div className="flex items-center gap-2 min-w-max">
        <UniversalCalendarButton />
      </div>
    </UtilityActionButton>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <AppLayout>
        <SEO title={t("screens.autopilotdashboard.myJourney")} description="Your goal, your journey" canonical={window.location.href} />
        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50 pb-32">
          <div className="px-4 pt-2">
            <StandardHeader title={t("screens.autopilotdashboard.myJourney")} description={t("screens.autopilotdashboard.northStarTagline")} emoji="🧭" />
          </div>
          <div className="px-4">{utilityBar}</div>
          <div className="flex-1 overflow-y-auto px-4 pt-3">{content}</div>
        </div>
        <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
        <GoalSetupDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} onSaved={handleGoalSaved} />
        <GoalPlanSheet open={planSheetOpen} onOpenChange={setPlanSheetOpen} />
      </AppLayout>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────
  return (
    <AppLayout>
      <SEO title={t("screens.autopilotdashboard.myJourney")} description="Your goal, your journey" canonical={window.location.href} />
      <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="max-w-3xl mx-auto">
          <StandardHeader title={t("screens.autopilotdashboard.myJourney")} description={t("screens.autopilotdashboard.northStarTagline")} emoji="🧭" />
          <div className="mb-4">{utilityBar}</div>
          {content}
        </div>
      </div>
      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
      <GoalSetupDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} onSaved={handleGoalSaved} />
        <GoalPlanSheet open={planSheetOpen} onOpenChange={setPlanSheetOpen} />
    </AppLayout>
  );
}
