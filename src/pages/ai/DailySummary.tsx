import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { StatCard } from "@/components/templates/StatCard";
import { EventCard } from "@/components/templates/EventCard";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { Heart, Users, Activity, Calendar } from "lucide-react";
import { summary } from "@/mocks/ai";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function DailySummary() {
  const handleSummaryClick = (cardId: string) => {
    console.log("Analytics: card_click", {
      template_id: "CT-CAL-001",
      system_card_id: cardId,
      screen_route: "/ai/daily-summary"
    });
  };

  const handleSendPlan = (enabled: boolean) => {
    console.log("Analytics: cta_execute", {
      template_id: "CT-CAL-002",
      system_card_id: "C-020",
      screen_route: "/ai/daily-summary",
      action: "send_plan_to_messages",
      enabled
    });
  };

  const handleEventClick = (event: any) => {
    console.log("Analytics: card_click", {
      template_id: "CT-CAL-002", 
      system_card_id: "C-020",
      screen_route: "/ai/daily-summary",
      item_id: event.id
    });
  };

  return (
    <AppLayout>
      <SEO title="Daily Summary | AI Intelligence" description="AI-generated daily wellness summary" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Recap Timeline - C-016 */}
        <div className="mb-8" data-template-id="CT-CX-005" data-system-card-id="C-016">
          <SmartCalendarCard
            title="Today's Recap"
            events={summary.recap.map((item, index) => ({
              id: `recap-${index}`,
              title: item,
              time: `${9 + index * 2}:00 AM`,
              type: "ai-suggestion" as const
            }))}
            variant="timeline"
          />
        </div>

        {/* Metrics Row - 3 Equal Tiles */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Mood & Energy - C-017 */}
          <div data-template-id="CT-CAL-001" data-system-card-id="C-017">
            <StatCard
              title="Mood & Energy"
              icon={Heart}
              stats={[
                {
                  label: "Current Mood",
                  value: summary.moodEnergy.mood,
                  trend: "stable"
                },
                {
                  label: "Energy Level", 
                  value: summary.moodEnergy.energy,
                  trend: "up",
                  delta: "+15%"
                },
                {
                  label: "Stress Level",
                  value: summary.moodEnergy.stress, 
                  trend: "down",
                  delta: "-23%"
                }
              ]}
              variant="detailed"
              onClick={() => handleSummaryClick("C-017")}
            />
          </div>

          {/* Health Score Snapshot - C-018 */}
          <div data-template-id="CT-CAL-001" data-system-card-id="C-018">
            <StatCard
              title="Health Score Snapshot"
              icon={Activity}
              stats={[
                {
                  label: "Vitana Index",
                  value: summary.vitanaScore.today,
                  unit: "/100",
                  trend: "up",
                  delta: `+${summary.vitanaScore.today - summary.vitanaScore.yesterday}`,
                  progress: summary.vitanaScore.today
                },
                {
                  label: "Top Pillar",
                  value: "Hydration",
                  unit: `${summary.vitanaScore.pillars.hydration}/100`
                },
                {
                  label: "Focus Area", 
                  value: "Exercise",
                  unit: `${summary.vitanaScore.pillars.exercise}/100`
                }
              ]}
              variant="detailed"
              onClick={() => handleSummaryClick("C-018")}
            />
          </div>

          {/* Social Pulse - C-019 */}
          <div data-template-id="CT-CAL-001" data-system-card-id="C-019">
            <StatCard
              title="Social Pulse"
              icon={Users}
              stats={[
                {
                  label: "Messages",
                  value: summary.socialPulse.messages,
                  trend: "up"
                },
                {
                  label: "Mentions",
                  value: summary.socialPulse.mentions,
                  trend: "stable"
                },
                {
                  label: "New Connections", 
                  value: summary.socialPulse.newConnections,
                  trend: "up",
                  delta: "+2"
                }
              ]}
              variant="compact"
              onClick={() => handleSummaryClick("C-019")}
            />
          </div>
        </div>

        {/* Tomorrow Section - C-020 */}
        <div data-template-id="CT-CAL-002" data-system-card-id="C-020">
          <EventCard
            title="Tomorrow's Wellness Plan"
            events={summary.tomorrow.map((task) => ({
              id: `tomorrow-${task.time}`,
              title: task.title,
              time: task.time,
              type: task.type,
              status: "upcoming" as const,
              description: `AI-scheduled ${task.type} optimization task`
            }))}
            variant="timeline"
            showActions={true}
            onEventClick={handleEventClick}
            onSendPlan={handleSendPlan}
            maxItems={3}
          />
        </div>
      </div>
    </AppLayout>
  );
}