import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useState } from "react";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import { CrossoverCard } from "@/components/crossover/CrossoverCard";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { MotivationCard } from "@/components/crossover/MotivationCard";
import { LifestylePlanCard } from "@/components/crossover/LifestylePlanCard";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { ProgressStreaksCard } from "@/components/crossover/ProgressStreaksCard";
import { CheckCircle, Play, Zap, Clock, MapPin, Thermometer } from "lucide-react";
import { todayActions, memoryHighlights, contextPulse, inspiration, indexMovement } from "@/mocks/ai";
import { useNavigate } from "react-router-dom";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function AI() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);
  
  const handleConfirmAll = () => {
    console.log("Analytics: cta_execute", {
      template_id: "CT-UI-001",
      system_card_id: "C-001",
      screen_route: "/ai",
      slot_id: "header-actions",
      action: "confirm_all"
    });
  };

  const handleActionClick = (actionId: string) => {
    console.log("Analytics: card_click", {
      template_id: "CT-CX-003",
      system_card_id: "C-001",
      screen_route: "/ai",
      item_id: actionId
    });
  };

  const contextChips = [
    { icon: Clock, label: contextPulse.timeOfDay, color: "bg-calendar-primary/10 text-calendar-primary" },
    { icon: MapPin, label: contextPulse.location, color: "bg-calendar-accent/10 text-calendar-accent" },
    { icon: Zap, label: `${contextPulse.energy} energy`, color: "bg-calendar-success/10 text-calendar-success" },
    { icon: Thermometer, label: contextPulse.weather, color: "bg-calendar-secondary/10 text-calendar-secondary" }
  ];

  return (
    <AppLayout>
      <SEO title="AI Intelligence" description="Access AI-powered insights, recommendations, and personalized assistance" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">AI Intelligence Overview ✨</h1>
                <p className="text-muted-foreground">Your personalized AI insights and recommendations for optimal wellness.</p>
              </div>
            </div>
            
            {/* Autopilot Card with Live Badge Counter */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onClick={() => setAutopilotOpen(true)}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                  {latestActions.map((action, index) => (
                    <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>
                  ))}
                  {pendingCount > 2 && (
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      +{pendingCount - 2} more actions
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Vitana Index Card - Circle with Score */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">{indexMovement.vitanaIndex}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pinterest-style Masonry Grid Layout */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4 px-6">
            {/* Priority Actions - C-001 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-003" data-system-card-id="C-001">
              <CrossoverCard
                icon={CheckCircle}
                category="ai"
                title="Today's Priority Actions"
                subtitle="AI-curated tasks for maximum wellness impact"
                buttonText="View All Tasks"
                onButtonClick={() => handleActionClick('view-all')}
                content={
                  <div className="space-y-2">
                    {todayActions.slice(0, 3).map((action) => (
                      <div key={action.id} className="p-2 bg-background/50 rounded-lg border">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-xs font-medium text-foreground">{action.label}</h4>
                          <Badge variant={action.priority === 'high' ? 'destructive' : 'default'} className="text-xs">
                            {action.etaMins}m
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{action.reason}</p>
                      </div>
                    ))}
                  </div>
                }
              />
            </div>

            {/* Autopilot Status - C-002 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-003" data-system-card-id="C-002">
              <CrossoverCard
                icon={Zap}
                category="autopilot"
                title="Autopilot Status"
                subtitle="AI is actively managing your wellness"
                buttonText="View Autopilot Log"
                onButtonClick={() => handleActionClick('autopilot-log')}
                content={
                  <div className="space-y-2">
                    <div className="p-2 bg-background/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">Rescheduled meeting</span>
                        <span className="text-xs text-muted-foreground">2h ago</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Protected focus time for wellness tasks</p>
                    </div>
                    <div className="p-2 bg-background/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">Hydration reminder sent</span>
                        <span className="text-xs text-muted-foreground">45m ago</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Behind on daily water intake goal</p>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Memory Highlights - C-003 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-HS-001" data-system-card-id="C-003">
              <SmartSuggestions
                suggestions={memoryHighlights.map(highlight => ({
                  title: highlight.title,
                  description: highlight.body,
                  type: "insight" as const,
                  priority: "medium" as const,
                  action: "See Details"
                }))}
                variant="card"
                maxItems={3}
              />
            </div>

            {/* Smart Calendar - C-006 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-009" data-system-card-id="C-006">
              <SmartCalendarCard />
            </div>

            {/* Progress Tracking - C-007 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-008" data-system-card-id="C-007">
              <ProgressStreaksCard />
            </div>

            {/* Context Pulse - C-004 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-006" data-system-card-id="C-004">
              <LifestylePlanCard type="mental" />
            </div>

            {/* Inspiration Spark - C-005 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-011" data-system-card-id="C-005">
              <MotivationCard
                quote={inspiration.title}
                author={inspiration.category}
                hasVideo={true}
              />
            </div>
          </div>

      </div>
      
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}