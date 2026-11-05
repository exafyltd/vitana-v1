/**
 * VTID-05461 — the static feature cards the My Journey strip shows
 * (`CARD_SCREENS.autopilot.features`), on the native card shell the home lane
 * uses (start-edge accent bar, title row with the X, body, action button):
 *  - F1 `LongevityJourneyCard` (components/home/LongevityJourneyCard.tsx): hidden
 *    while the guided progress loads or with no sessions; headline = next step
 *    or all done; subtext = episode / done / today's goal; the action plays
 *    today's episode when the Audiobook player is there, else opens /autopilot;
 *  - F2 `VitanaIndexCard` (components/home/VitanaIndexCard.tsx): hidden while
 *    loading or without an Index; trend arrow + headline by the 7-day trend
 *    (`deriveTrend`, useVitanaIndex.ts:76-83: ±5 points), "Index N · message",
 *    opens the Index sheet (`vitana:open-index`);
 *  - F3 / F9 `VitanaActionCard` (components/feature/DailyDiaryCard.tsx,
 *    CalendarCard.tsx): catalog copy `screens.vitanaCards.F3|F9.*`, the action
 *    and the body go to the card's deep link (/daily-diary, /calendar).
 * Each card also hides itself on X (the web card's own `dismissed` state).
 */
import { useState, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useUITheme } from '../../ports/ui';
import { radius } from '../../ports/tokens';
import { CARD_DEEP_LINKS, type VitanaCardType } from '../../ports/feed';
import { ButtonIcon, JourneyIcon } from '../../ports/journey';
import { navigateToWebPath } from '../../navigation/navigate';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { useJourneyText } from './text';
import { useGuidedJourneyProgress } from './hooks/useGuidedJourneyProgress';
import { useVitanaIndex } from './data/supabase';
import { useJourneyAudiobook } from './seams';

export interface FeatureCardProps {
  onDismiss: () => void;
}

function FeatureShell({
  type,
  eyebrow,
  onOpen,
  onDismiss,
  action,
  children,
}: {
  type: VitanaCardType;
  eyebrow: string;
  onOpen: () => void;
  onDismiss: () => void;
  action: { icon: string; label: string; onPress: () => void };
  children: ReactNode;
}): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  return (
    <Pressable
      testID={`journey-feature-card-${type}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text size="xs" weight="600" muted style={styles.eyebrow}>
            {eyebrow.toUpperCase()}
          </Text>
          <IconButton name="X" size={16} onPress={onDismiss} accessibilityLabel={t('screens.vitanaIdentity.dismissCard')} testID={`journey-feature-card-${type}-dismiss`} />
        </View>
        <View style={styles.content}>
          <View style={styles.text}>{children}</View>
          <Button size="sm" onPress={action.onPress} testID={`journey-feature-card-${type}-action`}>
            <ButtonIcon name={action.icon} size={14} />
            {action.label}
          </Button>
        </View>
      </View>
    </Pressable>
  );
}

function useHide(onDismiss: () => void): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(false);
  return [
    dismissed,
    () => {
      onDismiss();
      setDismissed(true);
    },
  ];
}

const goToJourney = () => navigateToWebPath('/autopilot');
const openIndex = () => overlayBus.emit('vitana:open-index');

function LongevityJourneyCard({ onDismiss }: FeatureCardProps): ReactElement | null {
  const { t } = useI18n();
  const { totalSessions, completedInOrder, nextSession, completedToday, dailyGoal, loading } = useGuidedJourneyProgress();
  const audiobook = useJourneyAudiobook();
  const [dismissed, hide] = useHide(onDismiss);
  if (loading || totalSessions === 0 || dismissed) return null;
  const action =
    nextSession && audiobook
      ? { icon: 'Play', label: t('screens.home.playTodaysEpisode', { session: nextSession.session }), onPress: () => void audiobook.start({ episode: nextSession.session }) }
      : { icon: 'Zap', label: t('screens.vitanaIdentity.viewJourney'), onPress: goToJourney };
  return (
    <FeatureShell type="F1" eyebrow={t('screens.home.longevityJourneyEyebrow')} onOpen={goToJourney} onDismiss={hide} action={action}>
      <Text size="sm" weight="700" numberOfLines={2}>
        {nextSession ? t('screens.home.longevityJourneyNextStepHeadline') : t('screens.home.longevityJourneyAllDone')}
      </Text>
      {nextSession ? (
        <Text size="xs" muted numberOfLines={2}>
          {t('screens.home.longevityJourneyProgressSubtext', { session: nextSession.session, done: completedInOrder, today: completedToday, goal: dailyGoal })}
        </Text>
      ) : null}
    </FeatureShell>
  );
}

const TREND = {
  up: { icon: 'TrendingUp', tone: 'statusSuccess', headlineKey: 'screens.home.vitanaIndexUpHeadline', subtextKey: 'screens.home.vitanaIndexUpSubtext' },
  down: { icon: 'TrendingDown', tone: 'statusWarning', headlineKey: 'screens.home.vitanaIndexDownHeadline', subtextKey: 'screens.home.vitanaIndexDownSubtext' },
  stable: { icon: 'Minus', tone: 'foreground', headlineKey: 'screens.home.vitanaIndexStableHeadline', subtextKey: 'screens.home.vitanaIndexStableSubtext' },
} as const;

/** useVitanaIndex.ts:76-83 */
function deriveTrend(history: Array<{ score: number }>): keyof typeof TREND {
  if (history.length < 2) return 'stable';
  const first = history[0].score;
  const last = history[history.length - 1].score;
  if (last > first + 5) return 'up';
  if (last < first - 5) return 'down';
  return 'stable';
}

/** VitanaIndexCard.tsx:46-51 — weekly change as a share of the 0–999 scale. */
function weeklyChangePct(history: Array<{ score: number }>): number {
  if (history.length < 2) return 0;
  return Math.round(((history[history.length - 1].score - history[0].score) / 999) * 100);
}

function VitanaIndexCard({ onDismiss }: FeatureCardProps): ReactElement | null {
  const { t, fmtNumber } = useJourneyText();
  const { colors } = useUITheme();
  const { index, isLoading } = useVitanaIndex();
  const [dismissed, hide] = useHide(onDismiss);
  if (isLoading || !index || dismissed) return null;
  const style = TREND[deriveTrend(index.history)];
  const pct = Math.abs(weeklyChangePct(index.history));
  return (
    <FeatureShell type="F2" eyebrow={t('screens.home.vitanaIndexEyebrow')} onOpen={openIndex} onDismiss={hide} action={{ icon: 'HeartPulse', label: t('screens.vitanaIdentity.viewIndex'), onPress: openIndex }}>
      <View style={styles.headline}>
        <JourneyIcon name={style.icon} size={14} color={colors[style.tone]} />
        <Text size="sm" weight="700" numberOfLines={2} style={styles.flex}>
          {t(style.headlineKey, { pct })}
        </Text>
      </View>
      <Text size="xs" muted numberOfLines={2}>
        {t('screens.home.vitanaIndexScoreSubtext', { score: fmtNumber(index.total), message: t(style.subtextKey) })}
      </Text>
    </FeatureShell>
  );
}

function actionCard(type: 'F3' | 'F9', icon: string): ComponentType<FeatureCardProps> {
  function ActionCard({ onDismiss }: FeatureCardProps): ReactElement | null {
    const { t } = useI18n();
    const [dismissed, hide] = useHide(onDismiss);
    if (dismissed) return null;
    const go = () => {
      const to = CARD_DEEP_LINKS[type];
      if (to) navigateToWebPath(to);
    };
    return (
      <FeatureShell type={type} eyebrow={t(`screens.vitanaCards.${type}.eyebrow`)} onOpen={go} onDismiss={hide} action={{ icon, label: t(`screens.vitanaCards.${type}.action`), onPress: go }}>
        <Text size="sm" weight="700" numberOfLines={2}>
          {t(`screens.vitanaCards.${type}.title`)}
        </Text>
        <Text size="xs" muted numberOfLines={2}>
          {t(`screens.vitanaCards.${type}.description`)}
        </Text>
      </FeatureShell>
    );
  }
  ActionCard.displayName = `ActionCard${type}`;
  return ActionCard;
}

/** The registry the strip draws from (card-registry.ts, the autopilot screen's features only). */
export const FEATURE_CARDS: Partial<Record<VitanaCardType, ComponentType<FeatureCardProps>>> = {
  F1: LongevityJourneyCard,
  F2: VitanaIndexCard,
  F3: actionCard('F3', 'Mic'),
  F9: actionCard('F9', 'CalendarDays'),
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  accentBar: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  eyebrow: { letterSpacing: 0.6, flex: 1 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 2 },
  headline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
});
