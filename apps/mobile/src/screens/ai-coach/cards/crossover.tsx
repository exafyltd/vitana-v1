/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the four CrossoverCard
 * variants the `/ai` pages stack: twins of the web
 * `src/components/crossover/{ProgressStreaksCard,SmartCalendarCard,LifestylePlanCard,MotivationCard}.tsx`.
 * Same content, copy keys, numbers and destinations; the calendar card reads
 * the member's real upcoming events (`useUpcomingEvents`, web useCalendarEvents).
 */
import { StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../../ports/ui';
import { CoachIcon, useCoachPalette, type CoachCategory } from '../../../ports/ai-coach';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useCoachText } from '../text';
import { useUpcomingEvents } from '../data/hooks';
import { CrossoverCard } from './CrossoverCard';

/** The web handlers that only log analytics (no native analytics client yet). */
const noop = () => undefined;

// ── ProgressStreaksCard ─────────────────────────────────────────────────

export type Streak = { type: string; count: number; emoji: string };

export function ProgressStreaksCard({ streaks, testID = 'card-progress-streaks' }: { streaks?: Streak[]; testID?: string }) {
  const { t } = useCoachText();
  const p = useCoachPalette();
  const list: Streak[] = streaks ?? [
    { type: t('screens.health.pillar_hydration_title'), count: 5, emoji: '💧' },
    { type: t('screens.health.pillar_exercise_title'), count: 3, emoji: '🏃' },
    { type: t('screens.health.pillar_sleep_title'), count: 7, emoji: '😴' },
  ];
  const top = list.reduce((max, s) => (s.count > max.count ? s : max));
  return (
    <CrossoverCard
      icon="TrendingUp"
      category="vitana"
      title={t('screens.crossover.progressTracking')}
      subtitle={t('screens.ai.subtitle_progressTracking')}
      buttonText={t('screens.ai.actionLabel_seeProgress')}
      onButtonClick={() => navigateToWebPath('/health/my-health-tracker')}
      testID={testID}
      content={
        <View style={styles.centered}>
          <View style={styles.row}>
            <CoachIcon name="Flame" size={20} color={p.statusWarning} />
            <Text size="lg" weight="700" color={p.statusWarning} testID={`${testID}-top-count`}>
              {String(top.count)}
            </Text>
            <Text size="sm" muted>
              {t('screens.crossover.dayStreak')}
            </Text>
          </View>
          <Text size="sm">
            <Text size="sm" weight="500">
              {top.type}
            </Text>{' '}
            {top.emoji}
          </Text>
          <Text size="xs" muted>
            {list.length > 1 ? t('screens.ai.otherStreaks', { n: String(list.length - 1) }) : t('screens.ai.keepItUp')}
          </Text>
        </View>
      }
    />
  );
}

// ── SmartCalendarCard ───────────────────────────────────────────────────

type CardEventType = 'work' | 'health' | 'social' | 'ai-suggestion';

function toCardType(type: string): CardEventType {
  switch (type) {
    case 'health':
    case 'workout':
    case 'nutrition':
      return 'health';
    case 'community':
      return 'social';
    case 'autopilot':
    case 'wellness_nudge':
      return 'ai-suggestion';
    default:
      return 'work';
  }
}

export function SmartCalendarCard({ testID = 'card-smart-calendar' }: { testID?: string }) {
  const { t, fmtWeekdayTime } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const events = useUpcomingEvents(3);
  // Web getEventColor: blue / green / purple / orange-600 → the calendar tokens.
  const tone: Record<CardEventType, string> = { work: p.statusInfo, health: p.calendarSuccess, social: p.calendarPrimary, 'ai-suggestion': p.category.ai };
  return (
    <CrossoverCard
      icon="Calendar"
      category="calendar"
      title={t('screens.crossover.smartCalendar')}
      subtitle={t('screens.ai.subtitle_smartSchedule')}
      buttonText={t('screens.ai.actionLabel_openCalendar')}
      onButtonClick={() => navigateToWebPath('/calendar')}
      testID={testID}
      content={
        events.length === 0 ? (
          <Text size="xs" muted testID={`${testID}-empty`}>
            {t('screens.crossover.noUpcomingEvents')}
          </Text>
        ) : (
          <View style={styles.list}>
            {events.map((e) => (
              <View key={e.id} style={styles.between} testID={`${testID}-event`}>
                <Text size="xs" weight="500" numberOfLines={1} style={styles.shrink}>
                  {e.title}
                </Text>
                <View style={styles.row}>
                  <CoachIcon name="Clock" size={12} color={colors.mutedForeground} />
                  <Text size="xs" color={tone[toCardType(e.event_type)]}>
                    {fmtWeekdayTime(e.start_time)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )
      }
    />
  );
}

// ── LifestylePlanCard ───────────────────────────────────────────────────

export type LifestylePlanType = 'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental';

const PLAN: Record<LifestylePlanType, { icon: string; subtitleKey: string; progress: number; total: number; unit: string }> = {
  nutrition: { icon: 'Apple', subtitleKey: 'screens.ai.lifestylePlan_nutrition_subtitle', progress: 3, total: 5, unit: 'servings' },
  hydration: { icon: 'Droplets', subtitleKey: 'screens.ai.lifestylePlan_hydration_subtitle', progress: 6, total: 8, unit: 'glasses' },
  exercise: { icon: 'Dumbbell', subtitleKey: 'screens.ai.lifestylePlan_exercise_subtitle', progress: 15, total: 30, unit: 'minutes' },
  sleep: { icon: 'Moon', subtitleKey: 'screens.ai.lifestylePlan_sleep_subtitle', progress: 7.5, total: 8, unit: 'hours' },
  mental: { icon: 'Brain', subtitleKey: 'screens.ai.subtitle_mentalHealth', progress: 2, total: 3, unit: 'moments' },
};

export function LifestylePlanCard({ type, testID = `card-lifestyle-${type}` }: { type: LifestylePlanType; testID?: string }) {
  const { t, fmtNumber } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const c = PLAN[type];
  const pct = Math.round((c.progress / c.total) * 100);
  const onTrack = pct >= 75;
  const tone = onTrack ? p.healthSuccess : p.healthWarning;
  return (
    <CrossoverCard
      icon={c.icon}
      category={type as CoachCategory}
      title={t(`screens.ai.lifestylePlan_${type}_title`)}
      subtitle={t(c.subtitleKey)}
      buttonText={t('screens.ai.actionLabel_logProgress')}
      onButtonClick={noop}
      secondaryButtonText={t('screens.ai.actionLabel_viewDetails')}
      onSecondaryButtonClick={() => navigateToWebPath('/health/my-health-tracker')}
      testID={testID}
      content={
        <View style={styles.list}>
          <View style={styles.between}>
            <Text size="xs" muted>
              {t('screens.crossover.progress')}
            </Text>
            <Text size="xs" weight="500" color={tone} testID={`${testID}-progress`}>
              {`${fmtNumber(c.progress)}/${fmtNumber(c.total)} ${t(`screens.ai.unit_${c.unit}`)}`}
            </Text>
          </View>
          {/* web: a plain `bg-muted/30 h-2 rounded-full` track with a health-success / -warning fill (not the kit Progress) */}
          <View style={[styles.track, { backgroundColor: p.alpha(colors.muted, 0.3) }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}>
            <View style={[styles.fill, { width: `${Math.min(pct, 100)}%`, backgroundColor: tone }]} testID={`${testID}-bar`} />
          </View>
          <Text size="xs">
            <Text size="xs" muted>
              {t('screens.crossover.next')}{' '}
            </Text>
            <Text size="xs" weight="500">
              {t(`screens.ai.lifestylePlan_${type}_nextAction`)}
            </Text>
          </Text>
        </View>
      }
    />
  );
}

// ── MotivationCard ──────────────────────────────────────────────────────

export function MotivationCard({ quote, author, hasVideo = false, testID = 'card-motivation' }: { quote?: string; author?: string; hasVideo?: boolean; testID?: string }) {
  const { t } = useCoachText();
  const p = useCoachPalette();
  return (
    <CrossoverCard
      icon="Heart"
      category="mental"
      title={t('screens.crossover.dailyMotivation')}
      subtitle={t('screens.ai.subtitle_inspiration')}
      buttonText={t('screens.ai.actionLabel_tryNow')}
      onButtonClick={noop}
      secondaryButtonText={t('screens.ai.actionLabel_moreInspiration')}
      onSecondaryButtonClick={() => navigateToWebPath('/community/media-hub')}
      testID={testID}
      content={
        <View style={styles.centered}>
          <Text size="sm" style={styles.quote} testID={`${testID}-quote`}>
            {`"${quote ?? t('aiCoachNative.motivation.defaultQuote')}"`}
          </Text>
          <Text size="xs" muted>
            {`— ${author ?? t('aiCoachNative.motivation.defaultAuthor')}`}
          </Text>
          {hasVideo ? (
            <View style={styles.row}>
              <CoachIcon name="Play" size={12} color={p.statusInfo} />
              <Text size="xs" color={p.statusInfo}>
                {t('screens.crossover.videoAvailable')}
              </Text>
            </View>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { gap: 12, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  list: { gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  shrink: { flexShrink: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  quote: { fontStyle: 'italic', textAlign: 'center' },
});
