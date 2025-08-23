import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import { CrossoverCard } from "@/components/crossover/CrossoverCard";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { MotivationCard } from "@/components/crossover/MotivationCard";
import { LifestylePlanCard } from "@/components/crossover/LifestylePlanCard";
import { CheckCircle, Play, Zap, Clock, MapPin, Thermometer } from "lucide-react";
import { todayActions, memoryHighlights, contextPulse, inspiration } from "@/mocks/ai";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function AI() {
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
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/50 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                data-template-id="CT-VI-001" 
                data-system-card-id="C-018"
              >
                <VitanaIndexMini 
                  score={72} 
                  trend="up" 
                  variant="compact" 
                  showDetails={false} 
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Context chips */}
              <div className="hidden md:flex items-center gap-2">
                {contextChips.map((chip, index) => (
                  <Badge key={index} variant="outline" className={`rounded-2xl ${chip.color} border-0 text-xs`}>
                    <chip.icon className="w-3 h-3 mr-1" />
                    {chip.label}
                  </Badge>
                ))}
              </div>
              
              <Button 
                onClick={handleConfirmAll}
                className="bg-calendar-primary hover:bg-calendar-primary/90 text-white rounded-2xl px-6"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm All
              </Button>
            </div>
          </div>
        </div>

        {/* Masonry Layout */}
        <div className="grid lg:grid-cols-12 gap-4">
          {/* Today's Priority Actions - C-001 */}
          <div className="lg:col-span-4" data-template-id="CT-CX-003" data-system-card-id="C-001">
            <CrossoverCard
              icon={CheckCircle}
              category="ai"
              title="Today's Priority Actions"
              subtitle="AI-curated tasks for maximum wellness impact"
              size="md"
              buttonText="View All Tasks"
              onButtonClick={() => handleActionClick('view-all')}
              content={
                <div className="space-y-3">
                  {todayActions.slice(0, 3).map((action) => (
                    <div key={action.id} className="p-3 bg-background/50 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-foreground">{action.label}</h4>
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
          <div className="lg:col-span-4" data-template-id="CT-CX-003" data-system-card-id="C-002">
            <CrossoverCard
              icon={Zap}
              category="autopilot"
              title="Autopilot Status"
              subtitle="AI is actively managing your wellness"
              size="md"
              buttonText="View Autopilot Log"
              onButtonClick={() => handleActionClick('autopilot-log')}
              content={
                <div className="space-y-3">
                  <div className="p-3 bg-background/50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Rescheduled meeting</span>
                      <span className="text-xs text-muted-foreground">2h ago</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Protected focus time for wellness tasks</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Hydration reminder sent</span>
                      <span className="text-xs text-muted-foreground">45m ago</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Behind on daily water intake goal</p>
                  </div>
                </div>
              }
            />
          </div>

          {/* Memory Highlights - C-003 */}
          <div className="lg:col-span-4" data-template-id="CT-HS-001" data-system-card-id="C-003">
            <SmartSuggestions
              title="Memory Highlights"
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

          {/* Context Pulse - C-004 */}
          <div className="lg:col-span-6" data-template-id="CT-CX-006" data-system-card-id="C-004">
            <LifestylePlanCard
              type="mental"
            />
          </div>

          {/* Inspiration Spark - C-005 */}
          <div className="lg:col-span-6" data-template-id="CT-CX-011" data-system-card-id="C-005">
            <MotivationCard
              quote={inspiration.title}
              author={inspiration.category}
              hasVideo={true}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}