/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — the native My
 * Journey screen (`AUTOPILOT.MY_JOURNEY /autopilot`), a 1:1 port of the
 * mobile-web branch of `src/pages/AutopilotDashboard.tsx` (`isMobile`,
 * :539-556; the Spotlight branch is desktop-only, :478-537). The N3 shell
 * supplies the AppLayout chrome; the screen renders, top to bottom:
 *
 *   StandardHeader (🧭, "My Journey", tagline) · utility bar (search + Autopilot chip)
 *   GuidedModeSwitch · DreamNorthStar hero (the dashboard's Spotlight card) · card strip
 *   Guided:   JourneyHowItWorks · GuidedJourneyCatalog
 *   Full App: FutureSelfTiles · TodaysGoalCard · MatchesPreview · EventsPreview ·
 *             AutopilotCard · How you're doing (Index + trajectory) · "keep checking in"
 *   + AutopilotPopup, GoalSetupDialog, GoalPlanSheet
 *
 * Data (all native re-implementations of class-B web hooks, see data/ and
 * hooks/): `/my-journey`, the onboarding recommendations (today's actions +
 * search), the native `useAutopilot` (preview card, chip count; refetched on
 * consent and when the popup closes), the guided progress (hero ring, next
 * session). "Set goal" with no goal emits `vitana:open-life-compass` on the
 * overlay bus (web LIFE_COMPASS_OPEN_EVENT, :275-281); otherwise it opens the
 * goal dialog, whose save asks Vitana for the plan and opens the plan sheet.
 *
 * Owned by the `autopilot-audiobook` lane, not drawn here (plan decision 3):
 * the `AudiobookReminderControl` in the guided view (:435) and the
 * `?audiobook=play` / `/autopilot/audiobook` player start (:178-189). The
 * player plugs in through `JourneyAudiobookContext` (seams.ts).
 * React 19: typed with `ReactElement`.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Text, useUITheme } from '../../ports/ui';
import { bucketFromWaveId, HORIZON_BUCKETS, JourneyIcon, type HorizonBucket } from '../../ports/journey';
import { useAuth } from '../../auth/AuthProvider';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { GuidedModeProvider, useGuidedMode } from './providers/GuidedModeProvider';
import { useAutopilot } from './hooks/useAutopilot';
import { useAIConsent } from './hooks/useAIConsent';
import { JOURNEY_STATE_QUERY_KEY, markSessionListenedInJourneyState, useGuidedJourneyProgress } from './hooks/useGuidedJourneyProgress';
import { recordSessionListened, useGenerateGoalPlan, useMyJourney, useOnboardingRecommendations, type Recommendation } from './data/journey';
import { useActivateOrb, useJourneyAudiobook } from './seams';
import { GuidedModeSwitch } from './GuidedModeSwitch';
import { DreamNorthStar } from './DreamNorthStar';
import { EnrichmentStrip } from './EnrichmentStrip';
import { JourneyHowItWorks } from './JourneyHowItWorks';
import { GuidedJourneyCatalog } from './GuidedJourneyCatalog';
import { AutopilotCard, EventsPreview, FutureSelfTiles, MatchesPreview, TodaysGoalCard, type TodayAction } from './tiles';
import { HowYoureDoing } from './HowYoureDoing';
import { AutopilotPopup } from './AutopilotPopup';
import { GoalPlanSheet, GoalSetupDialog } from './GoalSheets';
import { UtilityBar, type SearchItem } from './UtilityBar';

export const LIFE_COMPASS_OPEN_EVENT = 'vitana:open-life-compass';

/** web bucketFromRec (AutopilotDashboard.tsx:77-81). */
export function bucketFromRec(rec: Recommendation): HorizonBucket {
  if (rec.horizon && HORIZON_BUCKETS.includes(rec.horizon)) return rec.horizon;
  if (rec.wave_id === undefined || rec.wave_id === null) return 'future';
  return bucketFromWaveId(rec.wave_id);
}

function JourneyDashboard(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isGuided } = useGuidedMode();
  const audiobook = useJourneyAudiobook();
  const activateOrb = useActivateOrb();
  const guidedJourneyProgress = useGuidedJourneyProgress();
  const { allVisibleActions, fetchRecommendations } = useAutopilot();
  const { hasConsent } = useAIConsent();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const generatePlan = useGenerateGoalPlan();
  const scrollRef = useRef<ScrollView>(null);
  const catalogY = useRef(0);

  const { data: journeyData, isLoading: journeyLoading, isError: journeyError, refetch: refetchJourney } = useMyJourney();
  const goal = journeyData?.life_compass ?? null;
  const journey = journeyData?.journey ?? null;
  const { data: recData, isLoading: recLoading } = useOnboardingRecommendations();

  const todayActions = useMemo<TodayAction[]>(
    () => (recData?.recommendations ?? []).filter((r) => bucketFromRec(r) === 'today').map((r) => ({ id: r.id, title: r.title, status: r.status })),
    [recData],
  );
  const searchResults = useMemo<SearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return (recData?.recommendations ?? [])
      .filter((r) => r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q))
      .slice(0, 8)
      .map((r) => ({ id: r.id, title: r.title, subtitle: r.summary }));
  }, [recData, searchQuery]);

  useEffect(() => {
    if (user && hasConsent) void fetchRecommendations();
  }, [user, hasConsent, fetchRecommendations]);
  const autopilotCount = allVisibleActions.length;
  const prevOpen = useRef(false);
  useEffect(() => {
    if (prevOpen.current && !autopilotOpen && user && hasConsent) void fetchRecommendations();
    prevOpen.current = autopilotOpen;
  }, [autopilotOpen, user, hasConsent, fetchRecommendations]);

  const openAutopilot = () => setAutopilotOpen(true);
  const handleSetGoal = () => {
    if (!goal) overlayBus.emit(LIFE_COMPASS_OPEN_EVENT);
    else setGoalDialogOpen(true);
  };
  const handleGoalSaved = () => {
    generatePlan.mutate(undefined);
    setPlanSheetOpen(true);
  };

  const nextSession = guidedJourneyProgress.nextSession;
  const handleStartNextSession = () => {
    if (!nextSession) return;
    if (audiobook) {
      void audiobook.start({ episode: nextSession.session });
      return;
    }
    activateOrb(nextSession.topic.topicId);
    markSessionListenedInJourneyState(queryClient, nextSession.session, nextSession.topic.topicId, user?.id);
    void recordSessionListened(nextSession.session, nextSession.topic.topicId).finally(() => {
      void queryClient.invalidateQueries({ queryKey: JOURNEY_STATE_QUERY_KEY });
    });
  };
  // The web route sits behind AuthGuard, so its queries never run signed out; here the member
  // can still be resolving on the first frame (enabled-but-idle queries report isLoading false).
  const heroLoading = !user || journeyLoading || (isGuided && guidedJourneyProgress.loading);
  const guidedProgress = isGuided
    ? {
        completedSessions: guidedJourneyProgress.completedSessions,
        completedInOrder: guidedJourneyProgress.completedInOrder,
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

  return (
    <>
      <ScrollView ref={scrollRef} testID="screen-my-journey" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            🧭
          </Text>
          <View style={styles.flex}>
            <Text variant="title" accessibilityRole="header">
              {t('screens.autopilotdashboard.myJourney')}
            </Text>
            <Text muted>{t('screens.autopilotdashboard.northStarTagline')}</Text>
          </View>
        </View>
        <UtilityBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={searchResults}
          onResultPress={() => {
            setSearchQuery('');
            setAutopilotOpen(true);
          }}
          pendingCount={autopilotCount}
          onOpenAutopilot={openAutopilot}
        />
        <View style={styles.content}>
          <GuidedModeSwitch />
          <DreamNorthStar
            goal={goal}
            journey={journey}
            loading={heroLoading}
            error={journeyError}
            onSetGoal={handleSetGoal}
            onRetry={() => void refetchJourney()}
            onOpenPlan={() => setPlanSheetOpen(true)}
            guided={isGuided}
            guidedProgress={guidedProgress}
            guidedNextSession={nextSession ? { session: nextSession.session, title: nextSession.topic.displayLabel } : null}
            onStartSession={handleStartNextSession}
          />
          <EnrichmentStrip />
          {isGuided ? (
            <>
              <JourneyHowItWorks onScrollToSessions={() => scrollRef.current?.scrollTo({ y: catalogY.current, animated: true })} />
              <View onLayout={(e) => (catalogY.current = e.nativeEvent.layout.y)} testID="guided-session-list">
                <GuidedJourneyCatalog />
              </View>
            </>
          ) : (
            <>
              <FutureSelfTiles goal={goal} />
              <TodaysGoalCard actions={todayActions} loading={recLoading} onOpenAutopilot={openAutopilot} />
              <MatchesPreview />
              <EventsPreview />
              <AutopilotCard pendingCount={autopilotCount} previewActions={allVisibleActions.slice(0, 3)} onOpen={openAutopilot} />
              <HowYoureDoing />
              <View style={styles.keep} testID="journey-keep-checking-in">
                <JourneyIcon name="Sparkles" size={16} color={colors.mutedForeground} />
                <Text size="sm" muted style={styles.keepText}>
                  {t('screens.autopilotdashboard.keepCheckingIn')}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
      <GoalSetupDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} onSaved={handleGoalSaved} />
      <GoalPlanSheet open={planSheetOpen} onOpenChange={setPlanSheetOpen} />
    </>
  );
}

export function JourneyScreen(): ReactElement {
  return (
    <GuidedModeProvider>
      <JourneyDashboard />
    </GuidedModeProvider>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 128, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emoji: { fontSize: 28, lineHeight: 34 },
  flex: { flex: 1 },
  content: { gap: 16, paddingTop: 4 },
  keep: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 16 },
  keepText: { textAlign: 'center' },
});
