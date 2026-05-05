import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { StatCard } from "@/components/templates/StatCard";
import { EventCard } from "@/components/templates/EventCard";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { Heart, Users, Activity } from "lucide-react";
import { summary } from "@/mocks/ai";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

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
      <SEO title={t('screens.ai.dailySummaryAiIntelligence')} description="AI-generated daily wellness summary" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{t('screens.ai.dailySummary')}</h1>
                <p className="text-muted-foreground">{t('screens.ai.yourComprehensiveDailyWellnessRecapTomorrow')}</p>
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
        </div>

      </div>
    </AppLayout>
  );
}