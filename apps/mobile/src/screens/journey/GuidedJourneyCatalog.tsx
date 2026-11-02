/**
 * VTID-05461 — twin of `src/components/journey/GuidedJourneyCatalog.tsx`
 * (VTID-03280/03281/03282): rendered below the start view in Guided Mode. The
 * published curriculum with chapter (season) filter pills, each session as a
 * titled checklist (done chip, season caption) of tappable topic cards, and
 * the topic drawer: the congratulation view (+2 VITANA INDEX, the four
 * explanation cards, Replay / Start practice / Back to journey) and the
 * practice view (Try this → open the feature, Mark done, Skip).
 *
 * Same calls as the web: a topic / session tap opens Vitana (ORB), opens the
 * drawer and credits the listen (`POST /journey/session-listened`, optimistic
 * journey-state update); Mark done / opening the feature
 * `POST /journey/practice-complete` and refresh the journey state. With an
 * Audiobook player present a session header plays its episode instead (the
 * `autopilot-audiobook` lane provides the player, see seams.ts).
 *
 * Not carried: the window `vitana:guided-topic-teaching-complete` listener
 * (:200-237) — the native ORB emits no teaching-end event yet (its protocol
 * only ends the session on `end_guided_topic_teaching`), so nothing would fire.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Text, useUITheme } from '../../ports/ui';
import {
  alpha,
  AUDIOBOOK_SEASONS,
  ButtonIcon,
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  JourneyIcon,
  notify,
  seasonNumber,
  useToneColor,
} from '../../ports/journey';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { completePractice, practiceTargetAction, recordSessionListened, useJourneyChecklist, type PublicTopic } from './data/journey';
import { JOURNEY_STATE_QUERY_KEY, markSessionListenedInJourneyState, useGuidedJourneyProgress } from './hooks/useGuidedJourneyProgress';
import { useActivateOrb, useJourneyAudiobook } from './seams';

const SESSION_INDEX_REWARD = 2;
const MY_JOURNEY_PATH = '/autopilot';

type Section = 'what' | 'benefit' | 'when' | 'try';
const SECTION_ICON: Record<Section, string> = { what: 'Info', benefit: 'Gift', when: 'Clock', try: 'Rocket' };

function useSectionTint(section: Section): string {
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  return section === 'what' ? colors.statusInfo : section === 'benefit' ? colors.statusSuccess : section === 'when' ? colors.statusWarning : violet;
}

function ExplanationCard({ section, label, value, onPress }: { section: Section; label: string; value: string | null; onPress?: () => void }) {
  const tint = useSectionTint(section);
  const { colors } = useUITheme();
  if (!value) return null;
  const content = (
    <>
      <View style={styles.explHeader}>
        <View style={[styles.explChip, { backgroundColor: alpha(tint, 0.15) }]}>
          <JourneyIcon name={SECTION_ICON[section]} size={14} color={tint} />
        </View>
        <Text size="xs" weight="600" color={tint} style={styles.flex}>
          {label.toUpperCase()}
        </Text>
        {onPress ? <JourneyIcon name="ArrowRight" size={16} color={tint} /> : null}
      </View>
      <Text size="sm" color={alpha(colors.foreground, 0.9)}>
        {value}
      </Text>
    </>
  );
  const box = [styles.expl, { backgroundColor: alpha(tint, 0.1), borderColor: alpha(tint, 0.2) }];
  if (onPress) {
    return (
      <Pressable testID={`guided-explanation-${section}`} accessibilityRole="button" onPress={onPress} style={box}>
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={`guided-explanation-${section}`} style={box}>
      {content}
    </View>
  );
}

function ChapterPill({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID: string }) {
  const { colors } = useUITheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chapter, { backgroundColor: active ? colors.primary : colors.muted }]}
    >
      <Text size="xs" weight="500" color={active ? colors.primaryForeground : colors.mutedForeground}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GuidedJourneyCatalog(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const violet = useToneColor('category-2');
  const audiobook = useJourneyAudiobook();
  const activateOrb = useActivateOrb();
  const { sessions, chapters, loading, error } = useJourneyChecklist();
  const { completedSet, listenedSessionSet } = useGuidedJourneyProgress();
  const [activeChapter, setActiveChapter] = useState<string>('all');
  const [openTopic, setOpenTopic] = useState<PublicTopic | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);

  const chapterLabel = (id: string) => {
    const key = `screens.guidedCatalog.chapter_${id}`;
    const label = t(key);
    return label === key ? id : label;
  };
  const seasonLabel = (id: string) => {
    const n = seasonNumber(id);
    return n < 0 ? chapterLabel(id) : t('screens.guidedCatalog.seasonLabel', { n, name: chapterLabel(id) });
  };

  const closeDrawer = () => {
    setOpenTopic(null);
    setPracticeMode(false);
  };
  const refreshState = () => void queryClient.invalidateQueries({ queryKey: JOURNEY_STATE_QUERY_KEY });

  const openPracticeFeature = (topic: PublicTopic) => {
    void completePractice(topic.topicId).then((ok) => ok && refreshState());
    closeDrawer();
    const action = practiceTargetAction(topic.guidedPracticeTarget);
    if (action?.kind === 'route' && action.route !== MY_JOURNEY_PATH) navigateToWebPath(action.route);
    else if (action?.kind === 'overlay') overlayBus.emit(action.event);
    else activateOrb(topic.topicId);
    notify('screens.guidedCatalog.doneToast');
  };

  const markPracticeDone = async (topic: PublicTopic) => {
    const ok = await completePractice(topic.topicId);
    if (ok) refreshState();
    notify(ok ? 'screens.guidedCatalog.doneToast' : 'screens.guidedCatalog.doneError');
    closeDrawer();
  };

  if (loading) {
    return (
      <Text size="sm" muted style={styles.notice} testID="guided-catalog-loading">
        {t('screens.guidedCatalog.loading')}
      </Text>
    );
  }
  if (error || sessions.length === 0) {
    return (
      <Text size="sm" muted style={styles.notice} testID="guided-catalog-empty">
        {t('screens.guidedCatalog.empty')}
      </Text>
    );
  }

  const orderedChapters = AUDIOBOOK_SEASONS.filter((c) => chapters.includes(c));
  const visibleSessions = activeChapter === 'all' ? sessions : sessions.filter((s) => s.chapterId === activeChapter);

  const recordListenedSession = (session: number, topicId?: string) => {
    markSessionListenedInJourneyState(queryClient, session, topicId, user?.id);
    void recordSessionListened(session, topicId).finally(refreshState);
  };
  const handleTopicPress = (topic: PublicTopic) => {
    activateOrb(topic.topicId);
    setOpenTopic(topic);
    recordListenedSession(topic.session, topic.topicId);
  };
  const handleSessionPress = (s: { session: number; topics: PublicTopic[] }) => {
    const first = s.topics[0];
    if (!first) return;
    if (audiobook) {
      void audiobook.start({ episode: s.session });
      return;
    }
    activateOrb(first.topicId);
    setOpenTopic(first);
    recordListenedSession(s.session, first.topicId);
  };

  return (
    <View style={styles.wrap} testID="guided-catalog">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chapters}>
        <ChapterPill testID="guided-chapter-all" label={t('screens.guidedCatalog.allChapters')} active={activeChapter === 'all'} onPress={() => setActiveChapter('all')} />
        {orderedChapters.map((c) => (
          <ChapterPill key={c} testID={`guided-chapter-${c}`} label={chapterLabel(c)} active={activeChapter === c} onPress={() => setActiveChapter(c)} />
        ))}
      </ScrollView>

      <View style={styles.sessions}>
        {visibleSessions.map((s) => {
          const doneCount = s.topics.reduce((n, tp) => (completedSet.has(tp.topicId) ? n + 1 : n), 0);
          const totalCount = s.topics.length;
          const sessionComplete = listenedSessionSet.has(s.session) || (totalCount > 0 && doneCount === totalCount);
          return (
            <View key={s.session} style={styles.session} testID={`guided-session-${s.session}`}>
              <Pressable testID={`guided-session-${s.session}-header`} accessibilityRole="button" onPress={() => handleSessionPress(s)} style={styles.sessionHeader}>
                {sessionComplete ? (
                  <View accessibilityLabel={t('screens.guidedCatalog.sessionComplete')}>
                    <JourneyIcon name="CheckCircle2" size={16} color={colors.statusSuccess} />
                  </View>
                ) : (
                  <View style={[styles.openDot, { borderColor: alpha(colors.foreground, 0.25) }]} />
                )}
                <Text size="xs" weight="700" color={alpha(colors.foreground, 0.8)}>
                  {t('screens.guidedCatalog.sessionN', { n: s.session })}
                </Text>
                <View style={[styles.chip, { backgroundColor: sessionComplete ? colors.statusSuccessSubtle : colors.muted }]} testID={`guided-session-${s.session}-status`}>
                  {sessionComplete ? <JourneyIcon name="CheckCircle2" size={12} color={colors.statusSuccess} /> : null}
                  <Text size="xs" weight="600" color={sessionComplete ? colors.statusSuccess : colors.mutedForeground}>
                    {sessionComplete
                      ? t('screens.guidedCatalog.statusDone')
                      : t('screens.guidedCatalog.sessionProgress', { done: doneCount, total: totalCount })}
                  </Text>
                </View>
                <View style={styles.season}>
                  <Text size="xs" muted numberOfLines={1}>
                    {seasonLabel(s.chapterId).toUpperCase()}
                  </Text>
                </View>
                {audiobook ? (
                  <View accessibilityRole="image" accessibilityLabel={t('screens.audiobook.playEpisode', { n: s.session })} style={[styles.play, { backgroundColor: violet }]}>
                    <JourneyIcon name="Play" size={16} color={colors.primaryForeground} />
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.topics}>
                {s.topics.map((topic) => {
                  const done = completedSet.has(topic.topicId);
                  return (
                    <Pressable
                      key={topic.topicId}
                      testID={`guided-topic-${topic.topicId}`}
                      accessibilityRole="button"
                      onPress={() => handleTopicPress(topic)}
                      style={[
                        styles.topic,
                        { backgroundColor: done ? alpha(colors.statusSuccessSubtle, 0.5) : colors.card, borderColor: done ? alpha(colors.statusSuccess, 0.25) : colors.border },
                      ]}
                    >
                      <JourneyIcon name={done ? 'CheckCircle2' : 'Circle'} size={24} color={done ? colors.statusSuccess : alpha(colors.mutedForeground, 0.35)} />
                      <View style={styles.flex}>
                        <Text size="xs" weight="600" muted>
                          {topic.topicId}
                        </Text>
                        <Text size="sm" weight="500" color={done ? alpha(colors.foreground, 0.7) : undefined}>
                          {topic.displayLabel}
                        </Text>
                        {topic.shortDescription ? (
                          <Text size="xs" muted numberOfLines={1}>
                            {topic.shortDescription}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.chip, { backgroundColor: done ? colors.statusSuccessSubtle : alpha(colors.primary, 0.1) }]}>
                        {done ? <JourneyIcon name="CheckCircle2" size={12} color={colors.statusSuccess} /> : null}
                        <Text size="xs" weight={done ? '600' : '500'} color={done ? colors.statusSuccess : colors.primary}>
                          {done ? t('screens.guidedCatalog.statusDone') : t('screens.guidedCatalog.statusReady')}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      <Drawer open={!!openTopic} onOpenChange={(o) => (o ? undefined : closeDrawer())}>
        <DrawerContent testID="guided-topic-drawer" showCloseButton>
          {openTopic && !practiceMode ? (
            <>
              <ScrollView style={styles.drawerBody} contentContainerStyle={styles.drawerContent}>
                <DrawerHeader style={styles.congrats}>
                  <View style={[styles.congratsIcon, { backgroundColor: colors.primary }]}>
                    <JourneyIcon name="Sparkles" size={28} color={colors.primaryForeground} />
                  </View>
                  <DrawerTitle>{t('screens.guidedCatalog.congratsTitle')}</DrawerTitle>
                  <Text size="sm" muted style={styles.center}>
                    {t('screens.guidedCatalog.congratsSubtitle')}
                  </Text>
                  <View style={[styles.reward, { backgroundColor: alpha(colors.statusSuccess, 0.1), borderColor: alpha(colors.statusSuccess, 0.25) }]} testID="guided-reward">
                    <JourneyIcon name="TrendingUp" size={16} color={colors.statusSuccess} />
                    <Text size="sm" weight="700" color={colors.statusSuccess}>
                      {t('screens.guidedCatalog.reward', { points: SESSION_INDEX_REWARD })}
                    </Text>
                  </View>
                  <Text size="xs" muted>
                    {t('screens.guidedCatalog.rewardCaption').toUpperCase()}
                  </Text>
                </DrawerHeader>
                <Text size="xs" weight="600" color={alpha(colors.primary, 0.7)} style={styles.center}>
                  {openTopic.displayLabel.toUpperCase()}
                </Text>
                <View style={styles.expls}>
                  <ExplanationCard section="what" label={t('screens.guidedCatalog.whatItIs')} value={openTopic.explanation.whatItIs} />
                  <ExplanationCard section="benefit" label={t('screens.guidedCatalog.userBenefit')} value={openTopic.explanation.userBenefit} />
                  <ExplanationCard section="when" label={t('screens.guidedCatalog.whenToUse')} value={openTopic.explanation.whenToUse} />
                  <ExplanationCard section="try" label={t('screens.guidedCatalog.tryThis')} value={openTopic.explanation.tryThis} />
                </View>
              </ScrollView>
              <DrawerFooter>
                <View style={styles.row}>
                  <Button variant="outline" style={styles.flex} onPress={() => activateOrb(openTopic.topicId)} testID="guided-replay">
                    <ButtonIcon name="RotateCcw" />
                    {t('screens.guidedCatalog.replay')}
                  </Button>
                  <Button style={styles.flex} onPress={() => setPracticeMode(true)} testID="guided-start-practice">
                    <ButtonIcon name="Rocket" />
                    {t('screens.guidedCatalog.startPractice')}
                  </Button>
                </View>
                <Button variant="ghost" onPress={closeDrawer} testID="guided-back">
                  {t('screens.guidedCatalog.backToJourney')}
                </Button>
              </DrawerFooter>
            </>
          ) : null}
          {openTopic && practiceMode ? (
            <>
              <ScrollView style={styles.drawerBody} contentContainerStyle={styles.drawerContent}>
                <DrawerHeader>
                  <DrawerTitle>{t('screens.guidedCatalog.practiceHeader')}</DrawerTitle>
                </DrawerHeader>
                <View style={styles.expls}>
                  <ExplanationCard section="try" label={t('screens.guidedCatalog.tryThis')} value={openTopic.explanation.tryThis} onPress={() => openPracticeFeature(openTopic)} />
                </View>
              </ScrollView>
              <DrawerFooter>
                <Button variant="outline" onPress={() => openPracticeFeature(openTopic)} testID="guided-open-feature">
                  {t('screens.guidedCatalog.openFeature')}
                </Button>
                <Button onPress={() => void markPracticeDone(openTopic)} testID="guided-mark-done">
                  {t('screens.guidedCatalog.markDone')}
                </Button>
                <Button variant="ghost" onPress={closeDrawer} testID="guided-skip">
                  {t('screens.guidedCatalog.skip')}
                </Button>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 4 },
  notice: { textAlign: 'center', paddingVertical: 24 },
  chapters: { gap: 8, paddingBottom: 4, paddingHorizontal: 4 },
  chapter: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  sessions: { gap: 20 },
  session: { gap: 10 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  openDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  season: { flex: 1, alignItems: 'flex-end' },
  play: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  topics: { gap: 8, paddingStart: 4 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  center: { textAlign: 'center' },
  drawerBody: { flexGrow: 0 },
  drawerContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  congrats: { alignItems: 'center', gap: 8, paddingTop: 16 },
  congratsIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  expls: { gap: 10 },
  expl: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 6 },
  explHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  explChip: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
