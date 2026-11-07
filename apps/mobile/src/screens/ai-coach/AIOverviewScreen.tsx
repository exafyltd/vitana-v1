/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — `/ai` (AI.OVERVIEW), twin
 * of the web `src/pages/AI.tsx` phone branch (Spotlight Tier B is desktop
 * only): the AI sub-navigation, the mobile StandardHeader (title only) and
 * the seven cards in the web order — Today's priority actions (C-001, the
 * first three `todayActions` with their minutes badge), Autopilot status
 * (C-002), Memory highlights (C-003), Smart calendar (C-006), Progress
 * tracking (C-007), the mental Lifestyle plan (C-004) and the Inspiration
 * card (C-005, `inspiration` + video). The page's `AutopilotPopup` is never
 * opened on the web (`setAutopilotOpen(true)` is not called, AI.tsx:31), so
 * it is not rendered.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Text, useUITheme } from '../../ports/ui';
import { inspiration, memoryHighlights, todayActions, useCoachPalette } from '../../ports/ai-coach';
import { CardStack, CoachScaffold } from './components';
import { useCoachText } from './text';
import { CrossoverCard } from './cards/CrossoverCard';
import { SmartSuggestions } from './cards/templates';
import { LifestylePlanCard, MotivationCard, ProgressStreaksCard, SmartCalendarCard } from './cards/crossover';

/** The web handlers only log analytics. */
const noop = () => undefined;

function Row({ title, meta, body, badge }: { title: string; meta?: string; body: string; badge?: ReactElement }) {
  const { colors } = useUITheme();
  const p = useCoachPalette();
  return (
    <View style={[styles.row, { backgroundColor: p.alpha(colors.background, 0.5), borderColor: colors.border }]}>
      <View style={styles.rowHead}>
        <Text size="xs" weight="500" style={styles.shrink}>
          {title}
        </Text>
        {badge ?? (
          <Text size="xs" muted>
            {meta}
          </Text>
        )}
      </View>
      <Text size="xs" muted>
        {body}
      </Text>
    </View>
  );
}

export function AIOverviewScreen(): ReactElement {
  const { t } = useCoachText();
  return (
    <CoachScaffold active="overview" header="title" title={t('screens.ai.aiIntelligenceOverview')} testID="screen-ai-overview">
      <CardStack inset testID="ai-overview-cards">
        <CrossoverCard
          icon="CheckCircle"
          category="ai"
          title={t('screens.ai.todaySPriorityActions')}
          subtitle={t('screens.ai.subtitle_priorityActions')}
          buttonText={t('screens.ai.button_viewAllTasks')}
          onButtonClick={noop}
          testID="card-priority-actions"
          content={
            <View style={styles.list}>
              {todayActions.slice(0, 3).map((a) => (
                <Row key={a.id} title={a.label} body={a.reason} badge={<Badge variant={a.priority === 'high' ? 'destructive' : 'default'}>{`${a.etaMins}m`}</Badge>} />
              ))}
            </View>
          }
        />
        <CrossoverCard
          icon="Zap"
          category="autopilot"
          title={t('screens.ai.autopilotStatus')}
          subtitle={t('screens.ai.subtitle_autopilotStatus')}
          buttonText={t('screens.ai.button_viewAutopilotLog')}
          onButtonClick={noop}
          testID="card-autopilot-status"
          content={
            <View style={styles.list}>
              <Row title={t('screens.ai.rescheduledMeeting')} meta={t('screens.ai.text2hAgo')} body={t('screens.ai.protectedFocusTimeForWellnessTasks')} />
              <Row title={t('screens.ai.hydrationReminderSent')} meta={t('screens.ai.text45mAgo')} body={t('screens.ai.behindDailyWaterIntakeGoal')} />
            </View>
          }
        />
        <SmartSuggestions
          testID="card-memory-highlights"
          maxItems={3}
          suggestions={memoryHighlights.map((h) => ({ title: h.title, description: h.body, type: 'insight' as const, priority: 'medium' as const, action: t('screens.ai.actionLabel_seeDetails') }))}
        />
        <SmartCalendarCard />
        <ProgressStreaksCard />
        <LifestylePlanCard type="mental" />
        <MotivationCard quote={inspiration.title} author={inspiration.category} hasVideo />
      </CardStack>
    </CoachScaffold>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { padding: 8, borderRadius: 8, borderWidth: 1, gap: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  shrink: { flexShrink: 1 },
});
