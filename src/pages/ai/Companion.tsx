import SEO from "@/components/SEO";
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

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function Companion() {
  const navigate = useNavigate();
  
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
      "Take a 5-minute breathing break",
      "Drink a glass of water",
      "Check your posture",
      "Plan tomorrow's workout"
    ]
  };

  const chatMessages = chat.messages;
  const suggestions = chat.suggestionChips;
  
  const smartSuggestions = companionData.suggestions.map((suggestion, index) => ({
    title: suggestion,
    description: "AI-generated wellness suggestion",
    type: "action" as const,
    priority: "medium" as const,
    action: "Do Now"
  }));

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

  return (
    <AppLayout>
      <SEO title="AI Companion | AI Intelligence" description="Your personal AI wellness companion" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">AI Companion ✨</h1>
                <p className="text-muted-foreground">Your personal AI wellness companion for guidance and support.</p>
              </div>
            </div>
            
            {/* Small Index Card - Only Circle with Score */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Chat Interface - Left 8 columns */}
            <div className="lg:col-span-8 space-y-6">
              {/* Chat with AI + Smart Suggestions Live - C-021 & C-025 */}
              <div data-template-id="CT-HS-003" data-system-card-id="C-021">
                <HealthCoachChat
                  context="general"
                  variant="card"
                  onSendMessage={(message) => handleChatAction(message)}
                  onStartVoiceCall={() => handleChatAction("voice_call")}
                  onStartVideoCall={() => handleChatAction("video_call")}
                />
              </div>

            {/* Suggestion Chips Row */}
            <div className="flex flex-wrap gap-2">
              {chat.suggestionChips.map((chip, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="rounded-2xl bg-calendar-primary/5 border-calendar-primary/20 text-calendar-primary hover:bg-calendar-primary/10 cursor-pointer transition-colors"
                  onClick={() => handleChatAction(chip.toLowerCase().replace(' ', '_'))}
                >
                  {chip}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sidebar - Right 4 columns */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI Autopilot Log - C-022 */}
            <div data-template-id="CT-CX-003" data-system-card-id="C-022">
              <CrossoverCard
                icon={Zap}
                category="autopilot"
                title="Autopilot Activity Log"
                subtitle="Recent AI actions on your behalf"
                size="lg"
                buttonText="View Full Log"
                onButtonClick={() => handleAutopilotClick('view-all')}
                content={
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {chat.autopilotLog.map((entry) => (
                      <div 
                        key={entry.id}
                        className="p-3 bg-background/50 rounded-lg border cursor-pointer hover:bg-background/80 transition-colors group"
                        onClick={() => handleAutopilotClick(entry.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-foreground group-hover:text-calendar-primary transition-colors">
                            {entry.action}
                          </h4>
                          <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{entry.reason}</p>
                        <div className="text-xs text-calendar-success">Impact: {entry.impact}</div>
                      </div>
                    ))}
                  </div>
                }
              />
            </div>

            {/* Memory Recall Request - C-023 */}
            <div data-template-id="CT-HS-001" data-system-card-id="C-023">
              <SmartSuggestions
                title="Memory Shortcuts"
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
            <div data-template-id="CT-HS-001" data-system-card-id="C-024">
              <SmartSuggestions
                title="Your Wellness Story"
                suggestions={[
                  {
                    title: "This Week's Journey",
                    description: "You've made remarkable progress in hydration and sleep quality. Your dedication to the morning meditation routine has created a positive cascade effect across all wellness pillars.",
                    type: "insight" as const,
                    priority: "high" as const,
                    action: "Read Full Story",
                    onAction: () => handleMemoryClick('weekly_story')
                  },
                  {
                    title: "Pattern Discovery",
                    description: "AI noticed that your evening walks correlate with 18% better sleep quality. This insight emerged from analyzing 3 weeks of your wellness data.",
                    type: "insight" as const,
                    priority: "medium" as const,
                    action: "Explore Pattern",
                    onAction: () => handleMemoryClick('sleep_pattern')
                  }
                ]}
                variant="card"
                maxItems={2}
              />
            </div>
          </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}