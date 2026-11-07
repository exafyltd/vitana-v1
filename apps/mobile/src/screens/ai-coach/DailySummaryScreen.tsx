/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — `/ai/daily-summary`
 * (AI.DAILY_SUMMARY), twin of the web `src/pages/ai/DailySummary.tsx` phone
 * branch: the AI sub-navigation, the header card, the Index card with the
 * member's latest score of the last 7 days (`useVitanaIndexHistory(7)`, "–"
 * without one), and "What Vitana learned" — the `daily_learning` notes from
 * `GET /memory/daily-learning?limit=14` (newest first), each under its long
 * date with the start border. Loading shows the web's loading line; no notes
 * (or a failed read, which the web leaves undefined) shows the empty line.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { CoachIcon, useCoachPalette } from '../../ports/ai-coach';
import { CoachScaffold } from './components';
import { useCoachText } from './text';
import { useDailyLearnings, useVitanaIndexHistory } from './data/hooks';

export function DailySummaryScreen(): ReactElement {
  const { t, fmtNumber, learningDate } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const { history } = useVitanaIndexHistory(7);
  const latest = history.length ? history[history.length - 1].score : null;
  const { data: learnings, isLoading } = useDailyLearnings();

  return (
    <CoachScaffold
      active="daily-summary"
      header="card"
      title={t('screens.ai.dailySummary')}
      description={t('screens.ai.yourComprehensiveDailyWellnessRecapTomorrow')}
      indexValue={latest === null ? '–' : fmtNumber(latest)}
      testID="screen-ai-daily-summary"
    >
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]} testID="daily-learnings">
        <View style={styles.title}>
          <CoachIcon name="Sparkles" size={20} color={colors.primary} />
          <Text size="xl" weight="600" accessibilityRole="header">
            {t('screens.ai.dailyLearningsTitle')}
          </Text>
        </View>
        {isLoading ? (
          <Text muted testID="daily-learnings-loading">
            {t('screens.ai.dailyLearningsLoading')}
          </Text>
        ) : !learnings || learnings.length === 0 ? (
          <Text muted testID="daily-learnings-empty">
            {t('screens.ai.dailyLearningsEmpty')}
          </Text>
        ) : (
          <View style={styles.list}>
            {learnings.map((l) => (
              <View key={l.id} style={[styles.item, { borderStartColor: p.alpha(colors.primary, 0.4) }]} testID="daily-learning">
                <Text size="sm" weight="500" muted>
                  {learningDate(l.date)}
                </Text>
                <Text style={styles.content}>{l.content}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </CoachScaffold>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 16 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { gap: 16 },
  item: { borderStartWidth: 2, paddingStart: 16 },
  content: { marginTop: 4 },
});
