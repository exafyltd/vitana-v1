/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — `/ai/recommendations`
 * (AI.RECOMMENDATIONS), twin of the web `src/pages/ai/AIRecommendations.tsx`
 * phone branch: the AI sub-navigation, the header card and the Index circle
 * card (the member's live Vitana Index, `VitanaIndexValue`: "…" while
 * loading), then the cards in the web order — Progress tracking (C-012),
 * Health recommendations (C-010, `recommendations.healthTodos`), Lifestyle
 * (C-011, the first three `recommendations.content`), Smart calendar (C-016),
 * Wellness services (C-013, one offer), the lab test (C-014) and
 * Personalization insights (C-015). The offer / order / item presses only
 * log analytics on the web (no cart, no checkout), so they do nothing here.
 */
import type { ReactElement } from 'react';
import { recommendations } from '../../ports/ai-coach';
import { CardStack, CoachScaffold } from './components';
import { useCoachText } from './text';
import { useVitanaIndex } from './data/hooks';
import { LabTestCard, OfferCard, RecommendationCard, type RecommendationItem } from './cards/templates';
import { ProgressStreaksCard, SmartCalendarCard } from './cards/crossover';

const noop = () => undefined;

export function RecommendationsScreen(): ReactElement {
  const { t, fmtNumber } = useCoachText();
  const ai = (k: string, p?: Record<string, string>) => t(`screens.ai.${k}`, p);
  const { index, isLoading } = useVitanaIndex();

  const health: RecommendationItem[] = recommendations.healthTodos.map((item, i) => ({
    id: `health-${i}`,
    title: item.title,
    description: ai('recoDesc_eta', { mins: String(item.etaMins) }),
    priority: item.priority,
  }));
  const lifestyle: RecommendationItem[] = recommendations.content.slice(0, 3).map((item, i) => ({
    id: `lifestyle-${i}`,
    title: item.title,
    description: ai('recoDesc_contentDuration', { type: item.type, duration: item.duration }),
    priority: 'medium',
  }));
  const personalization: RecommendationItem[] = [
    { id: 'insight-1', title: ai('recoTitle_sleepPattern'), description: ai('recoDesc_sleepPattern'), priority: 'high' },
    { id: 'insight-2', title: ai('recoTitle_nutritionTiming'), description: ai('recoDesc_nutritionTiming'), priority: 'medium' },
  ];

  return (
    <CoachScaffold
      active="recommendations"
      header="card"
      title={ai('aiRecommendations')}
      description={ai('personalizedSuggestionsEnhanceYourWellnessJourney')}
      indexValue={isLoading || !index ? '…' : fmtNumber(index.total)}
      testID="screen-ai-recommendations"
    >
      <CardStack testID="ai-recommendations-cards">
        <ProgressStreaksCard />
        <RecommendationCard title={ai('healthRecommendations')} items={health} onItemClick={noop} maxItems={3} testID="card-health-recommendations" />
        <RecommendationCard title={ai('lifestyle')} items={lifestyle} onItemClick={noop} maxItems={3} testID="card-lifestyle-suggestions" />
        <SmartCalendarCard />
        <OfferCard
          title={ai('wellnessServices')}
          offers={[
            {
              id: 'wellness-001',
              title: ai('offerTitle_wellnessAssessment'),
              provider: t('aiCoachNative.offer.provider'),
              price: 199,
              description: ai('offerDesc_wellnessAssessment'),
              category: t('aiCoachNative.offer.categoryWellness'),
            },
          ]}
          onOfferClick={noop}
          maxItems={1}
          testID="card-wellness-services"
        />
        <LabTestCard
          labTest={{
            id: 'lab-001',
            name: ai('labName_healthPanel'),
            description: ai('labDesc_healthPanel'),
            categoryLabel: t('aiCoachNative.lab.categoryBloodMarkers'),
            biomarkers: [ai('biomarker_cholesterol'), ai('biomarker_glucose'), ai('biomarker_vitamins')],
            price: 89,
            turnaround_days: 2,
            sample_type: ai('sampleType_blood'),
            provider_name: t('aiCoachNative.lab.provider'),
          }}
          onOrder={noop}
        />
        <RecommendationCard title={ai('personalizationInsights')} items={personalization} onItemClick={noop} maxItems={2} testID="card-personalization-insights" />
      </CardStack>
    </CoachScaffold>
  );
}
