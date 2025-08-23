import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { ProgressStreaksCard } from "@/components/crossover/ProgressStreaksCard";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { TrendingUp, Users, Target, Brain, BarChart3 } from "lucide-react";
import { lifestylePatterns, indexMovement, socialEngagement, productivity, correlations } from "@/mocks/ai";
import { useNavigate } from "react-router-dom";

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
      <SEO title="Insights | AI Intelligence" description="AI-powered health and wellness insights" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">AI Insights & Patterns ✨</h1>
                <p className="text-muted-foreground">Discover meaningful patterns and trends in your wellness journey.</p>
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

          {/* Hero Strip - Progress Streaks with Index Movement */}
          <div className="mb-8" data-template-id="CT-CX-008" data-system-card-id="C-007">
            <ProgressStreaksCard
              streaks={[
                { type: "Meditation", count: 8, emoji: "🧘" },
                { type: "Hydration", count: 12, emoji: "💧" },
                { type: "Exercise", count: 5, emoji: "🏃" }
              ]}
            />
          </div>

          {/* Insights Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Lifestyle Patterns - C-006 */}
            <div data-template-id="CT-HS-001" data-system-card-id="C-006">
              <SmartSuggestions
                title="Lifestyle Patterns"
                suggestions={lifestylePatterns.map(pattern => ({
                  title: pattern,
                  description: "Detected improvement pattern",
                  type: "insight" as const,
                  priority: "medium" as const,
                  action: "See Details",
                  onAction: () => handleInsightClick("C-006")
                }))}
                variant="card"
                maxItems={3}
              />
            </div>

            {/* Health Index Movement - C-007 */}
            <div data-template-id="CT-HS-001" data-system-card-id="C-007">
              <SmartSuggestions
                title="Health Index Movement"
                suggestions={[
                  {
                    title: `Vitana Index: ${indexMovement.vitanaIndex} (+${indexMovement.delta})`,
                    description: "Significant improvement this week",
                    type: "insight" as const,
                    priority: "high" as const,
                    action: "View Breakdown",
                    onAction: () => handleInsightClick("C-007")
                  },
                  {
                    title: `Sleep Quality: ${indexMovement.pillars.sleep.score} (+${indexMovement.pillars.sleep.delta})`,
                    description: "Best improvement driver",
                    type: "insight" as const,
                    priority: "medium" as const,
                    action: "Optimize",
                    onAction: () => handleInsightClick("C-007")
                  },
                  {
                    title: `Exercise Consistency: ${indexMovement.pillars.exercise.score} (+${indexMovement.pillars.exercise.delta})`,
                    description: "Strong momentum building",
                    type: "insight" as const,
                    priority: "medium" as const,
                    action: "Keep Going",
                    onAction: () => handleInsightClick("C-007")
                  }
                ]}
                variant="card"
                maxItems={3}
              />
            </div>

            {/* Social Engagement - C-008 */}
            <div data-template-id="CT-HS-001" data-system-card-id="C-008">
              <SmartSuggestions
                title="Social Engagement"
                suggestions={[
                  {
                    title: `${socialEngagement.newFollowers} new followers this week`,
                    description: "Growing community connection",
                    type: "insight" as const,
                    priority: "low" as const,
                    action: "Connect",
                    onAction: () => handleInsightClick("C-008")
                  },
                  {
                    title: `Joined ${socialEngagement.groupsJoined} new wellness groups`,
                    description: "Expanding support network",
                    type: "insight" as const,
                    priority: "medium" as const,
                    action: "Explore Groups",
                    onAction: () => handleInsightClick("C-008")
                  },
                  {
                    title: `${socialEngagement.messagesReceived} messages received`,
                    description: "Active community participation",
                    type: "insight" as const,
                    priority: "low" as const,
                    action: "Reply",
                    onAction: () => handleInsightClick("C-008")
                  }
                ]}
                variant="card"
                maxItems={3}
              />
            </div>

            {/* Productivity Trends - C-009 */}
            <div data-template-id="CT-HS-001" data-system-card-id="C-009">
              <SmartSuggestions
                title="Productivity Trends"
                suggestions={[
                  {
                    title: `${productivity.tasksDone}/${productivity.tasksPlanned} wellness tasks completed`,
                    description: "Strong completion rate this week",
                    type: "insight" as const,
                    priority: "high" as const,
                    action: "Review Tasks",
                    onAction: () => handleInsightClick("C-009")
                  },
                  {
                    title: `${productivity.focusMinutes} minutes in deep focus`,
                    description: "Excellent concentration sessions",
                    type: "insight" as const,
                    priority: "medium" as const,
                    action: "Schedule More",
                    onAction: () => handleInsightClick("C-009")
                  },
                  {
                    title: `${productivity.skipped} tasks postponed`,
                    description: "Consider optimizing schedule",
                    type: "recommendation" as const,
                    priority: "medium" as const,
                    action: "Optimize",
                    onAction: () => handleInsightClick("C-009")
                  }
                ]}
                variant="card"
                maxItems={3}
              />
            </div>

            {/* Smart Correlations - C-010 */}
            <div className="md:col-span-2 lg:col-span-1" data-template-id="CT-HS-001" data-system-card-id="C-010">
              <SmartSuggestions
                title="Smart Correlations"
                suggestions={correlations.map(correlation => ({
                  title: correlation,
                  description: "AI-discovered behavioral pattern",
                  type: "insight" as const,
                  priority: "high" as const,
                  action: "Learn More",
                  onAction: () => handleInsightClick("C-010")
                }))}
                variant="card"
                maxItems={5}
              />
            </div>

          </div>

        </div>
      </div>
    </AppLayout>
  );
}