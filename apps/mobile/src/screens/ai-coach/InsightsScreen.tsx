/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — `/ai/insights`
 * (AI.INSIGHTS), twin of the web `src/pages/ai/Insights.tsx` phone branch:
 * the AI sub-navigation, the header card (title + description) and the
 * Index circle card (`indexMovement.vitanaIndex`, opens the Index), then the
 * cards in the web order — Progress tracking with the page's three streaks
 * (C-010), Pattern recognition / Behavioral trends / Correlation analysis /
 * Prediction models (C-006…C-009), Smart calendar (C-011), Lifestyle
 * patterns (C-012), Health Index movement (C-013), Social engagement (C-014)
 * and Smart correlations (C-015). The web streak names are English literals;
 * the native card reads the pillar titles and a catalog "Meditation".
 */
import type { ReactElement } from 'react';
import { correlations, indexMovement, lifestylePatterns, socialEngagement } from '../../ports/ai-coach';
import { CardStack, CoachScaffold } from './components';
import { useCoachText } from './text';
import { SmartSuggestions, StandardCard } from './cards/templates';
import { ProgressStreaksCard, SmartCalendarCard } from './cards/crossover';

/** The web click handler only logs analytics. */
const noop = () => undefined;

const STANDARD: ReadonlyArray<{ id: string; title: string; subtitle: string; content: string }> = [
  { id: 'C-006', title: 'patternRecognition', subtitle: 'subtitle_aiInsights', content: 'insightContent_energyPeak' },
  { id: 'C-007', title: 'behavioralTrends', subtitle: 'subtitle_weeklyTrends', content: 'insightContent_hydrationWeekly' },
  { id: 'C-008', title: 'correlationAnalysis', subtitle: 'subtitle_correlations', content: 'insightContent_sleepMood' },
  { id: 'C-009', title: 'predictionModels', subtitle: 'subtitle_aiForecasts', content: 'insightContent_fitnessGoal' },
];

export function InsightsScreen(): ReactElement {
  const { t, fmtNumber } = useCoachText();
  const ai = (k: string, p?: Record<string, string>) => t(`screens.ai.${k}`, p);
  return (
    <CoachScaffold
      active="insights"
      header="card"
      title={ai('aiInsightsPatterns')}
      description={ai('discoverMeaningfulPatternsTrendsYourWellness')}
      indexValue={fmtNumber(indexMovement.vitanaIndex)}
      testID="screen-ai-insights"
    >
      <CardStack testID="ai-insights-cards">
        <ProgressStreaksCard
          streaks={[
            { type: t('screens.health.pillar_exercise_title'), count: 12, emoji: '🏃' },
            { type: t('aiCoachNative.streak.meditation'), count: 8, emoji: '🧘' },
            { type: t('screens.health.pillar_hydration_title'), count: 15, emoji: '💧' },
          ]}
        />
        {STANDARD.map((c) => (
          <StandardCard key={c.id} title={ai(c.title)} subtitle={ai(c.subtitle)} content={ai(c.content)} onPress={noop} testID={`card-insight-${c.id}`} />
        ))}
        <SmartCalendarCard />
        <SmartSuggestions
          testID="card-lifestyle-patterns"
          maxItems={3}
          suggestions={lifestylePatterns.map((pattern) => ({ title: pattern, description: ai('insightDesc_detectedImprovement'), type: 'insight' as const, priority: 'medium' as const, action: ai('actionLabel_seeDetails') }))}
        />
        <SmartSuggestions
          testID="card-index-movement"
          maxItems={2}
          suggestions={[
            {
              title: t('screens.health.vitanaIndexValue0', { value0: `${fmtNumber(indexMovement.vitanaIndex)} (+${fmtNumber(indexMovement.delta)})` }),
              description: ai('insightDesc_weeklyImprovement'),
              type: 'insight',
              priority: 'high',
              action: ai('actionLabel_viewBreakdown'),
            },
            {
              title: `${t('screens.health.pillar_sleep_title')}: ${fmtNumber(indexMovement.pillars.sleep.score)} (+${fmtNumber(indexMovement.pillars.sleep.delta)})`,
              description: ai('insightDesc_bestImprovementDriver'),
              type: 'insight',
              priority: 'medium',
              action: ai('actionLabel_optimize'),
            },
          ]}
        />
        <SmartSuggestions
          testID="card-social-engagement"
          maxItems={2}
          suggestions={[
            { title: ai('insightTitle_newFollowers', { n: String(socialEngagement.newFollowers) }), description: ai('insightDesc_growingConnection'), type: 'insight', priority: 'low', action: ai('actionLabel_connect') },
            { title: ai('insightTitle_newGroups', { n: String(socialEngagement.groupsJoined) }), description: ai('insightDesc_expandingNetwork'), type: 'insight', priority: 'medium', action: ai('actionLabel_exploreGroups') },
          ]}
        />
        <SmartSuggestions
          testID="card-smart-correlations"
          maxItems={3}
          suggestions={correlations.map((c) => ({ title: c, description: ai('insightDesc_aiDiscoveredPattern'), type: 'insight' as const, priority: 'high' as const, action: ai('actionLabel_learnMore') }))}
        />
      </CardStack>
    </CoachScaffold>
  );
}
