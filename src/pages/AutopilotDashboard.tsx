import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { communityFetch } from "@/lib/community-gateway";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton, type SearchDropdownItem } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexTrajectoryCard } from "@/components/health/VitanaIndexTrajectoryCard";
import { useVitanaIndexCache } from "@/components/health/VitanaIndexProvider";
import { LIFE_COMPASS_OPEN_EVENT } from "@/context/LifeCompassPopupContext";
import { VITANA_INDEX_OPEN_EVENT } from "@/components/health/VitanaIndexSheet";
import { trend7d } from "@/lib/vitana-projection";
import { bucketFromWaveId, type HorizonBucket } from "@/lib/horizonBuckets";
import { useMyJourney } from "@/hooks/useMyJourney";
import { GoalNorthStar } from "@/components/journey/GoalNorthStar";
import { DreamNorthStar } from "@/components/journey/DreamNorthStar";
import { GuidedModeSwitch } from "@/components/journey/GuidedModeSwitch"; // VTID-03279
import { GuidedJourneyCatalog } from "@/components/journey/GuidedJourneyCatalog"; // VTID-03280
import { JourneyHowItWorks } from "@/components/journey/JourneyHowItWorks";
import { useGuidedMode } from "@/context/GuidedModeProvider"; // VTID-03280
import {
  JOURNEY_STATE_QUERY_KEY,
  markSessionListenedInJourneyState,
  useGuidedJourneyProgress,
} from "@/hooks/useGuidedJourneyProgress";
import { activateOrb } from "@/lib/orbActivate"; // VTID-03281
import { recordSessionListened } from "@/lib/journeyPractice";
import { FutureSelfTiles } from "@/components/journey/FutureSelfTiles";
import { TodaysGoalCard, type TodayAction } from "@/components/journey/TodaysGoalCard";
import { GoalSetupDialog } from "@/components/journey/GoalSetupDialog";
import { GoalPlanSheet } from "@/components/journey/GoalPlanSheet";
import { MatchesPreview } from "@/components/journey/MatchesPreview";
import { EventsPreview } from "@/components/journey/EventsPreview";
import { AutopilotCard } from "@/components/journey/AutopilotCard";
import { useGenerateGoalPlan } from "@/hooks/useGoalPlan";
import { useAIConsent } from "@/hooks/useAIConsent";
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

  const openIndexDrawer = () => window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT));

  return (
    <Card className="rounded-2xl border ring-1 ring-border/60 shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <button
          type="button"
          onClick={openIndexDrawer}
          aria-label={t("screens.autopilotdashboard.openIndexDrawerAria")}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-sm shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-transform hover:scale-[1.04]"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{total === null ? "…" : total}</div>
            <div className="text-[10px] text-muted-foreground">{t("screens.autopilotdashboard.text999")}</div>
          </div>
        </button>
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
  const queryClient = useQueryClient();
  const { isGuided } = useGuidedMode(); // VTID-03280: show guided catalog below start view
  const guidedJourneyProgress = useGuidedJourneyProgress(); // sessions/topics learned for the hero ring
  const isMobile = useIsMobile();
  const { allVisibleActions, fetchRecommendations } = useAutopilot();
  const { hasConsent } = useAIConsent();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const generatePlan = useGenerateGoalPlan();

  const { data: journeyData, isLoading: journeyLoading, isError: journeyError, refetch: refetchJourney } = useMyJourney();
  const goal = journeyData?.life_compass ?? null;
  // Onboarding plan (day_in_journey / total_days / days_left). When the goal has
  // no deadline, the North Star ring counts down this 90-day plan instead.
  const journey = journeyData?.journey ?? null;

  const { data: recData, isLoading: recLoading, refetch } = useQuery({
    // User-scoped so cached/persisted recommendations never bleed across accounts.
    queryKey: ["autopilot-onboarding", user?.id],
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

  // Search across the journey's recommendations; matches surface in the
  // utility-bar search dropdown and tapping one opens the Autopilot popup.
  const searchResults = useMemo<SearchDropdownItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return (recData?.recommendations ?? [])
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((r) => ({ id: r.id, title: r.title, subtitle: r.summary }));
  }, [recData, searchQuery]);

  // Populate the Autopilot preview card. useAutopilot() keeps instance-local
  // state, so the dashboard's copy stays empty (card shows "all caught up")
  // unless we fetch here too — the popup has its own instance that fetches on
  // open. Gate on consent to mirror the popup's fetch condition so the card
  // and popup agree on whether there's anything to show.
  useEffect(() => {
    if (user && hasConsent) fetchRecommendations();
  }, [user, hasConsent, fetchRecommendations]);

  // Match the popup's content exactly: it renders allVisibleActions (pending +
  // executing + completed) and shows its "all caught up" empty state off that
  // same set. Driving the card from the same array keeps the two in sync.
  const autopilotCount = allVisibleActions.length;

  // The card and popup hold separate useAutopilot() instances, so changes made
  // inside the popup (completing items, on-demand regeneration) don't reach the
  // card automatically. Refetch this instance when the popup closes so the card
  // shows the freshly generated next set without waiting for the 5-min poll.
  const prevAutopilotOpenRef = useRef(false);
  useEffect(() => {
    if (prevAutopilotOpenRef.current && !autopilotOpen && user && hasConsent) {
      fetchRecommendations();
    }
    prevAutopilotOpenRef.current = autopilotOpen;
  }, [autopilotOpen, user, hasConsent, fetchRecommendations]);

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

  const motivational = <MotivationalLine />;

  // VTID-03280: Guided Journey catalog — rendered BELOW the existing start view
  // in Guided Mode only (additive; Full App is unchanged).
  const guidedCatalog = isGuided ? (
    <GuidedJourneyCatalog className="pt-1" />
  ) : null;

  // First-time explainer between the next-session card and the catalog.
  const guidedHowItWorks = isGuided ? <JourneyHowItWorks /> : null;

  // Tapping the next-session card starts that session: Vitana/ORB speaks the
  // topic (same flow as tapping it in the catalog) and the listen reward is
  // credited idempotently server-side.
  const nextSession = guidedJourneyProgress.nextSession;
  const handleStartNextSession = () => {
    if (!nextSession) return;
    activateOrb(nextSession.topic.topicId);
    markSessionListenedInJourneyState(
      queryClient,
      nextSession.session,
      nextSession.topic.topicId,
      user?.id,
    );
    void recordSessionListened(nextSession.session, nextSession.topic.topicId).finally(() => {
      queryClient.invalidateQueries({ queryKey: JOURNEY_STATE_QUERY_KEY });
    });
  };
  const guidedNextSession = nextSession
    ? { session: nextSession.session, title: nextSession.topic.displayLabel }
    : null;

  // Mobile leads with the painted "dream-board" hero (vision-board feel,
  // emotional first anchor). Desktop keeps the structured GoalNorthStar
  // until we redesign the wide layout — mobile-first per the brief.
  // Guided Mode → the hero card reflects learning progress (sessions/topics
  // learned) instead of the goal-deadline countdown. Omitted in Full App.
  const guidedProgress = isGuided
    ? {
        completedSessions: guidedJourneyProgress.completedSessions,
        totalSessions: guidedJourneyProgress.totalSessions,
        completedTopics: guidedJourneyProgress.completedTopics,
        totalTopics: guidedJourneyProgress.totalTopics,
        pct: guidedJourneyProgress.pct,
        dailyGoal: guidedJourneyProgress.dailyGoal,
        completedToday: guidedJourneyProgress.completedToday,
        remainingToday: guidedJourneyProgress.remainingToday,
        dailyGoalMet: guidedJourneyProgress.dailyGoalMet,
      }
    : undefined;
  const dreamHero = (
    <DreamNorthStar
      goal={goal}
      journey={journey}
      loading={journeyLoading}
      error={journeyError}
      onSetGoal={handleSetGoal}
      onRetry={() => refetchJourney()}
      onOpenPlan={() => setPlanSheetOpen(true)}
      guided={isGuided}
      guidedProgress={guidedProgress}
      guidedNextSession={guidedNextSession}
      onStartSession={handleStartNextSession}
    />
  );
  const northStar = (
    <GoalNorthStar
      goal={goal}
      journey={journey}
      loading={journeyLoading}
      error={journeyError}
      onSetGoal={handleSetGoal}
      onRetry={() => refetchJourney()}
      onOpenPlan={() => setPlanSheetOpen(true)}
      guided={isGuided}
      guidedProgress={guidedProgress}
      guidedNextSession={guidedNextSession}
      onStartSession={handleStartNextSession}
    />
  );
  const futureSelf = <FutureSelfTiles goal={goal} />;

  const todaysGoal = (
    <TodaysGoalCard actions={todayActions} loading={recLoading} onOpenAutopilot={handleOpenAutopilot} />
  );

  const matchesPreview = <MatchesPreview />;
  const eventsPreview = <EventsPreview />;

  // Autopilot preview — top 3 pending actions; tap opens the full popup
  const yourPlanCard = (
    <AutopilotCard
      pendingCount={autopilotCount}
      previewActions={allVisibleActions.slice(0, 3)}
      onOpen={handleOpenAutopilot}
    />
  );

  // How you're doing — Vitana Index as secondary proof
  const howYoureDoing = (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {t("screens.autopilotdashboard.howYoureDoing")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
        <IndexNowCard />
        <VitanaIndexTrajectoryCard />
      </div>
    </div>
  );

  const keepCheckingIn = (
    <div className="text-center text-sm text-muted-foreground pb-4">
      <Sparkles className="w-4 h-4 inline-block mr-1 align-text-top" />
      {t("screens.autopilotdashboard.keepCheckingIn")}
    </div>
  );

  // Mobile: dream-board hero leads, motivational line is folded INTO the
  // hero's bottom tagline strip so the screen isn't redundant. Future-self
  // tiles sit right under the hero — they extend the "imagining tomorrow"
  // beat before the screen drops into utility (Today / Matches / etc).
  const content = (
    <div className="space-y-4">
      <GuidedModeSwitch className="px-1" />{/* VTID-03279: Guided/Full switch above Journey card — more prominent for first-time users */}
      {dreamHero}
      {/* VTID-03284: the switch swaps the screen. Guided = catalog-led onboarding
          (Full App feed hidden); Full App = the existing feed (no catalog). The
          start view (Journey card + switch) is shared by both. */}
      {isGuided ? (
        <>
          {guidedHowItWorks}
          {guidedCatalog}
        </>
      ) : (
        <>
          {futureSelf}
          {todaysGoal}
          {matchesPreview}
          {eventsPreview}
          {yourPlanCard}
          {howYoureDoing}
          {keepCheckingIn}
        </>
      )}
    </div>
  );

  const utilityBar = (
    <UtilityActionButton
      compact
      className="min-w-0"
      afterGiftVoucherChildren={
        <>
          <VitanaIndexChip />
          <AutopilotChip pendingCount={autopilotCount} onClick={handleOpenAutopilot} />
        </>
      }
    >
      <div className="flex items-center gap-2 min-w-max">
        <ExpandableSearchButton
          placeholder={t("screens.autopilotdashboard.searchTasks")}
          onSearch={setSearchQuery}
          dropdownItems={searchResults}
          onItemClick={() => {
            setSearchQuery("");
            setAutopilotOpen(true);
          }}
        />
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
        <div className="max-w-7xl mx-auto">
          <StandardHeader title={t("screens.autopilotdashboard.myJourney")} description={t("screens.autopilotdashboard.northStarTagline")} emoji="🧭" />
          <div className="mb-4">{utilityBar}</div>
          {motivational}
          {/* VTID-03284: Guided swaps the screen to the catalog; Full keeps the feed grid. */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <GuidedModeSwitch className="px-1" />{/* VTID-03279: Guided/Full switch above Journey card — more prominent for first-time users */}
              {northStar}
              {!isGuided && (
                <>
                  {todaysGoal}
                  {matchesPreview}
                  {eventsPreview}
                </>
              )}
            </div>
            {!isGuided && (
              <div className="space-y-4">
                {yourPlanCard}
                {howYoureDoing}
              </div>
            )}
          </div>
          {!isGuided && keepCheckingIn}
          {isGuided && <div className="mt-4">{guidedHowItWorks}</div>}
          {guidedCatalog}
        </div>
      </div>
      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
      <GoalSetupDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} onSaved={handleGoalSaved} />
      <GoalPlanSheet open={planSheetOpen} onOpenChange={setPlanSheetOpen} />
    </AppLayout>
  );
}
