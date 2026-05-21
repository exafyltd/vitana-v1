import SEO from "@/components/SEO";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import HealthCoachChat from "@/components/health/HealthCoachChat";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { CrossoverCard } from "@/components/crossover/CrossoverCard";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, Zap, Brain, Lightbulb } from "lucide-react";
import { chat } from "@/mocks/ai";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import { ProgressStreaksCard } from "@/components/crossover/ProgressStreaksCard";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { LifestylePlanCard } from "@/components/crossover/LifestylePlanCard";
import { MotivationCard } from "@/components/crossover/MotivationCard";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAutopilotComplete } from "@/hooks/useAutopilotComplete";
import { t } from '@/lib/i18n-toast';

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function Companion() {
  const navigate = useNavigate();
  const { completeBySourceRef } = useAutopilotComplete();
  useEffect(() => { completeBySourceRef('onboarding_maxina'); }, [completeBySourceRef]);
  
  const handleChatAction = (action: string) => {
    console.log("Analytics: cta_execute", {
      template_id: "CT-HS-003",
      system_card_id: "C-021",
      screen_route: "/ai/companion",
      action
    });
  };

  const handleAutopilotClick = (logId: string) => {
    console.log("Analytics: card_click", {
      template_id: "CT-CX-003",
      system_card_id: "C-022",
      screen_route: "/ai/companion",
      item_id: logId
    });
  };

  // Mock companion data
  const companionData = {
    vitanaIndex: 742,
    suggestions: [
      t('screens.ai.companionSugg_breathing'),
      t('screens.ai.companionSugg_water'),
      t('screens.ai.companionSugg_posture'),
      t('screens.ai.companionSugg_workout'),
    ]
  };

  const handleSendMessage = (message: string) => {
    console.log("Analytics: message_sent", {
      template_id: "CT-HS-003",
      system_card_id: "C-021",
      screen_route: "/ai/companion",
      message_length: message.length
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    console.log("Analytics: suggestion_clicked", {
      template_id: "CT-HS-003", 
      system_card_id: "C-021",
      screen_route: "/ai/companion",
      suggestion
    });
  };

  const handleMemoryClick = (memoryType: string) => {
    console.log("Analytics: card_click", {
      template_id: "CT-HS-001", 
      system_card_id: "C-023",
      screen_route: "/ai/companion",
      action: memoryType
    });
  };

  // Mock chat messages  
  const chatMessages: any[] = [];
  const suggestions = chat.suggestionChips;
  
  const smartSuggestions = companionData.suggestions.map((suggestion, index) => ({
    title: suggestion,
    description: "AI-generated wellness suggestion",
    type: "action" as const,
    priority: "medium" as const,
    action: "Do Now"
  }));

  return (
    <AppLayout>
      <SEO title={t('screens.ai.aiCompanionAiIntelligence')} description="Your personal AI wellness companion" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{t('screens.ai.aiCompanion')}</h1>
                <p className="text-muted-foreground">{t('screens.ai.yourPersonalAiWellnessCompanionFor')}</p>
              </div>
            </div>
            
            {/* Small Index Card - Only Circle with Score */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600"><VitanaIndexValue /></span>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Layout with Chat + Sidebar */}
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            {/* Chat Interface - Takes up 2/3 */}
            <div className="flex-1 lg:flex-[2]">
              <HealthCoachChat
                context="general"
                variant="card"
                onSendMessage={handleSendMessage}
                onStartVoiceCall={() => handleChatAction("voice_call")}
                onStartVideoCall={() => handleChatAction("video_call")}
              />
            </div>

            {/* Sidebar - Takes up 1/3 */}
            <div className="lg:flex-1 space-y-4">
              {/* Vitana Index Mini Widget - C-022 */}
              <div data-template-id="CT-HS-002" data-system-card-id="C-022">
                <VitanaIndexMini
                  score={companionData.vitanaIndex}
                  trend="up"
                />
              </div>

              {/* Smart Suggestions - C-023 */}
              <div data-template-id="CT-HS-001" data-system-card-id="C-023">
                <SmartSuggestions
                  suggestions={smartSuggestions}
                  variant="card"
                  maxItems={4}
                />
              </div>

              {/* Autopilot Widget - C-024 */}
              <div data-template-id="CT-HS-003" data-system-card-id="C-024">
                <AutopilotWidget
                  suggestions={["Schedule meditation break", "Hydration reminder in 15 min"]}
                  isEnabled={true}
                  onToggle={(enabled) => handleChatAction(`autopilot_${enabled ? 'on' : 'off'}`)}
                />
              </div>
            </div>
          </div>

          {/* Pinterest-style Masonry Grid for Additional Cards */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {/* AI Autopilot Log - C-022 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-003" data-system-card-id="C-022">
              <CrossoverCard
                icon={Zap}
                category="autopilot"
                title={t('screens.ai.autopilotActivityLog')}
                subtitle={t('screens.ai.subtitle_recentAiActions')}
                buttonText={t('screens.ai.button_viewFullLog')}
                onButtonClick={() => handleAutopilotClick('view-all')}
                content={
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {chat.autopilotLog.map((entry) => (
                      <div 
                        key={entry.id}
                        className="p-2 bg-background/50 rounded-lg border cursor-pointer hover:bg-background/80 transition-colors group"
                        onClick={() => handleAutopilotClick(entry.id)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-xs font-medium text-foreground group-hover:text-calendar-primary transition-colors">
                            {entry.action}
                          </h4>
                          <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{entry.reason}</p>
                        <div className="text-xs text-calendar-success">{t('screens.ai.impactImpact', { impact: entry.impact })}</div>
                      </div>
                    ))}
                  </div>
                }
              />
            </div>

            {/* Memory Recall Request - C-023 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-HS-001" data-system-card-id="C-023">
              <SmartSuggestions
                suggestions={chat.memoryPeek.map(memory => ({
                  title: memory.key,
                  description: memory.value,
                  type: "action" as const,
                  priority: "low" as const,
                  action: "Recall",
                  onAction: () => handleMemoryClick(memory.key.toLowerCase())
                }))}
                variant="card"
                maxItems={5}
              />
            </div>

            {/* Personalized Storytelling - C-024 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-HS-001" data-system-card-id="C-024">
              <SmartSuggestions
                suggestions={[
                  {
                    title: t('screens.ai.storyTitle_thisWeeksJourney'),
                    description: t('screens.ai.storyDesc_thisWeeksJourney'),
                    type: "insight" as const,
                    priority: "high" as const,
                    action: t('screens.ai.actionLabel_readFullStory'),
                    onAction: () => handleMemoryClick('weekly_story')
                  },
                  {
                    title: t('screens.ai.storyTitle_patternDiscovery'),
                    description: t('screens.ai.storyDesc_patternDiscovery'),
                    type: "insight" as const,
                    priority: "medium" as const,
                    action: t('screens.ai.actionLabel_explorePattern'),
                    onAction: () => handleMemoryClick('sleep_pattern')
                  }
                ]}
                variant="card"
                maxItems={2}
              />
            </div>

            {/* Progress Tracking - C-025 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-008" data-system-card-id="C-025">
              <ProgressStreaksCard />
            </div>

            {/* Smart Calendar - C-026 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-009" data-system-card-id="C-026">
              <SmartCalendarCard />
            </div>

            {/* Lifestyle Plan - C-027 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-006" data-system-card-id="C-027">
              <LifestylePlanCard type="nutrition" />
            </div>

            {/* Motivation Card - C-028 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-011" data-system-card-id="C-028">
              <MotivationCard />
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}