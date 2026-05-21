import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { ProgressStreaksCard } from "@/components/crossover/ProgressStreaksCard";
import { StandardCard } from "@/components/templates/StandardCard";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { TrendingUp, Users, Target, Brain, BarChart3 } from "lucide-react";
import { lifestylePatterns, indexMovement, socialEngagement, productivity, correlations } from "@/mocks/ai";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function Insights() {
  const navigate = useNavigate();
  
  const handleInsightClick = (insightType: string) => {
    console.log("Analytics: card_click", {
      template_id: "CT-HS-001",
      system_card_id: insightType,
      screen_route: "/ai/insights"
    });
  };

  return (
    <AppLayout>
      <SEO title={t('screens.ai.insightsAiIntelligence')} description="AI-powered health and wellness insights" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{t('screens.ai.aiInsightsPatterns')}</h1>
                <p className="text-muted-foreground">{t('screens.ai.discoverMeaningfulPatternsTrendsYourWellness')}</p>
              </div>
            </div>
            
            {/* Small Index Card - Only Circle with Score */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">{indexMovement.vitanaIndex}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pinterest-style Masonry Grid Layout */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {/* Progress Tracking - C-010 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-008" data-system-card-id="C-010">
              <ProgressStreaksCard
                streaks={[
                  { type: "Exercise", count: 12, emoji: "🏃" },
                  { type: "Meditation", count: 8, emoji: "🧘" },
                  { type: "Hydration", count: 15, emoji: "💧" }
                ]}
              />
            </div>

            {/* Pattern Recognition - C-006 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-010" data-system-card-id="C-006">
              <StandardCard
                title={t('screens.ai.patternRecognition')}
                subtitle={t('screens.ai.subtitle_aiInsights')}
                content={t('screens.ai.insightContent_energyPeak')}
                variant="default"
                onClick={() => handleInsightClick("C-006")}
              />
            </div>

            {/* Behavioral Trends - C-007 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-010" data-system-card-id="C-007">
              <StandardCard
                title={t('screens.ai.behavioralTrends')}
                subtitle={t('screens.ai.subtitle_weeklyTrends')}
                content={t('screens.ai.insightContent_hydrationWeekly')}
                variant="default"
                onClick={() => handleInsightClick("C-007")}
              />
            </div>

            {/* Correlation Analysis - C-008 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-010" data-system-card-id="C-008">
              <StandardCard
                title={t('screens.ai.correlationAnalysis')}
                subtitle={t('screens.ai.subtitle_correlations')}
                content={t('screens.ai.insightContent_sleepMood')}
                variant="default"
                onClick={() => handleInsightClick("C-008")}
              />
            </div>

            {/* Prediction Models - C-009 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-010" data-system-card-id="C-009">
              <StandardCard
                title={t('screens.ai.predictionModels')}
                subtitle={t('screens.ai.subtitle_aiForecasts')}
                content={t('screens.ai.insightContent_fitnessGoal')}
                variant="default"
                onClick={() => handleInsightClick("C-009")}
              />
            </div>

            {/* Smart Calendar - matching Dashboard sizing */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-009" data-system-card-id="C-011">
              <SmartCalendarCard />
            </div>

            {/* Lifestyle Patterns - C-012 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-HS-001" data-system-card-id="C-012">
              <SmartSuggestions
                suggestions={lifestylePatterns.map(pattern => ({
                  title: pattern,
                  description: t('screens.ai.insightDesc_detectedImprovement'),
                  type: "insight" as const,
                  priority: "medium" as const,
                  action: t('screens.ai.actionLabel_seeDetails')
                }))}
                variant="card"
                maxItems={3}
              />
            </div>

            {/* Health Index Movement - C-013 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-HS-001" data-system-card-id="C-013">
              <SmartSuggestions
                suggestions={[
                  {
                    title: `Vitana Index: ${indexMovement.vitanaIndex} (+${indexMovement.delta})`,
                    description: t('screens.ai.insightDesc_weeklyImprovement'),
                    type: "insight" as const,
                    priority: "high" as const,
                    action: t('screens.ai.actionLabel_viewBreakdown')
                  },
                  {
                    title: `${t('screens.health.pillar_sleep_title')}: ${indexMovement.pillars.sleep.score} (+${indexMovement.pillars.sleep.delta})`,
                    description: t('screens.ai.insightDesc_bestImprovementDriver'),
                    type: "insight" as const,
                    priority: "medium" as const,
                    action: t('screens.ai.actionLabel_optimize')
                  }
                ]}
                variant="card"
                maxItems={2}
              />
            </div>

            {/* Social Engagement - C-014 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-HS-001" data-system-card-id="C-014">
              <SmartSuggestions
                suggestions={[
                  {
                    title: t('screens.ai.insightTitle_newFollowers', { n: String(socialEngagement.newFollowers) }),
                    description: t('screens.ai.insightDesc_growingConnection'),
                    type: "insight" as const,
                    priority: "low" as const,
                    action: t('screens.ai.actionLabel_connect')
                  },
                  {
                    title: t('screens.ai.insightTitle_newGroups', { n: String(socialEngagement.groupsJoined) }),
                    description: t('screens.ai.insightDesc_expandingNetwork'),
                    type: "insight" as const,
                    priority: "medium" as const,
                    action: t('screens.ai.actionLabel_exploreGroups')
                  }
                ]}
                variant="card"
                maxItems={2}
              />
            </div>

            {/* Smart Correlations - C-015 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-HS-001" data-system-card-id="C-015">
              <SmartSuggestions
                suggestions={correlations.map(correlation => ({
                  title: correlation,
                  description: t('screens.ai.insightDesc_aiDiscoveredPattern'),
                  type: "insight" as const,
                  priority: "high" as const,
                  action: t('screens.ai.actionLabel_learnMore')
                }))}
                variant="card"
                maxItems={3}
              />
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}