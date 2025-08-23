import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { StatCard } from "@/components/templates/StatCard";
import { EventCard } from "@/components/templates/EventCard";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { Heart, Users, Activity } from "lucide-react";
import { summary } from "@/mocks/ai";
import { useNavigate } from "react-router-dom";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function DailySummary() {
  const navigate = useNavigate();
  
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
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Daily Summary ✨</h1>
                <p className="text-muted-foreground">Your comprehensive daily wellness recap and tomorrow's plan.</p>
              </div>
            </div>
            
            {/* Small Index Card - Only Circle with Score */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">{summary.vitanaScore.today}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pinterest-style Masonry Grid Layout */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {/* Smart Calendar - Recap Timeline - C-016 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-009" data-system-card-id="C-016">
              <SmartCalendarCard
                events={summary.recap.map((item, index) => ({
                  title: item,
                  time: `${9 + index * 2}:00 AM`,
                  type: "ai-suggestion" as const
                }))}
              />
            </div>

            {/* Mood & Energy - C-017 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CAL-001" data-system-card-id="C-017">
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
            <div className="break-inside-avoid mb-4" data-template-id="CT-CAL-001" data-system-card-id="C-018">
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
            <div className="break-inside-avoid mb-4" data-template-id="CT-CAL-001" data-system-card-id="C-019">
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

            {/* Tomorrow Section - C-020 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CAL-002" data-system-card-id="C-020">
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
        </div>
      </div>
    </AppLayout>
  );
}