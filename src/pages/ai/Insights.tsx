import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { ProgressStreaksCard } from "@/components/crossover/ProgressStreaksCard";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { TrendingUp, Users, Target, Brain, BarChart3 } from "lucide-react";
import { lifestylePatterns, indexMovement, socialEngagement, productivity, correlations } from "@/mocks/ai";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function Insights() {
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
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Hero Strip */}
        <div className="mb-8" data-template-id="CT-CX-008" data-system-card-id="C-007">
          <ProgressStreaksCard
            streaks={[
              { title: "Meditation", current: 8, target: 10, category: "mental" },
              { title: "Hydration", current: 12, target: 14, category: "hydration" },
              { title: "Exercise", current: 5, target: 7, category: "exercise" }
            ]}
            vitanaIndex={{
              current: indexMovement.vitanaIndex,
              delta: indexMovement.delta,
              trend: indexMovement.trend
            }}
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

        {/* Loading skeletons would go here in a real implementation */}
        {/* Empty state would show friendly message if mocks are missing */}
      </div>
    </AppLayout>
  );
}