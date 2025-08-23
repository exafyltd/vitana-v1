import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import HealthCoachChat from "@/components/health/HealthCoachChat";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { CrossoverCard } from "@/components/crossover/CrossoverCard";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, Zap, Brain, Lightbulb } from "lucide-react";
import { chat } from "@/mocks/ai";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function Companion() {
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

  const handleMemoryClick = (memoryType: string) => {
    console.log("Analytics: card_click", {
      template_id: "CT-HS-001", 
      system_card_id: "C-023",
      screen_route: "/ai/companion",
      action: memoryType
    });
  };

  return (
    <AppLayout>
      <SEO title="AI Companion | AI Intelligence" description="Your personal AI wellness companion" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
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
    </AppLayout>
  );
}