import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { RecommendationCard } from "@/components/templates/RecommendationCard";
import { OfferCard } from "@/components/templates/OfferCard";
import LabTestCard from "@/components/LabTestCard";
import { recommendations } from "@/mocks/ai";
import { ProgressStreaksCard } from "@/components/crossover/ProgressStreaksCard";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { useNavigate } from "react-router-dom";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function AIRecommendations() {
  const navigate = useNavigate();
  
  const handleRecommendationClick = (item: any, type: string) => {
    console.log("Analytics: card_click", {
      template_id: "CT-DO-002",
      system_card_id: type,
      screen_route: "/ai/recommendations",
      item_id: item.id,
      sku: item.sku
    });
  };

  const handleOfferClaim = (cardId: string) => {
    console.log("Analytics: cta_execute", {
      template_id: "CT-WS-001",
      system_card_id: cardId,
      screen_route: "/ai/recommendations",
      action: "claim_offer"
    });
  };

  const handleLabTest = (cardId: string) => {
    console.log("Analytics: cta_execute", {
      template_id: "CT-LT-001",
      system_card_id: cardId,
      screen_route: "/ai/recommendations",
      action: "order_lab_test"
    });
  };

  // Organize recommendations by category
  const healthRecommendations = recommendations.healthTodos.map((item, index) => ({
    id: `health-${index}`,
    title: item.title,
    description: `ETA: ${item.etaMins} minutes`,
    priority: item.priority as "low" | "medium" | "high",
    category: "health",
    action: "Complete Task"
  }));

  const lifestyleSuggestions = recommendations.content.slice(0, 3).map((item, index) => ({
    id: `lifestyle-${index}`,
    title: item.title,
    description: `${item.type} content - ${item.duration}`,
    priority: "medium" as const,
    category: "lifestyle",
    action: "Watch Now"
  }));

  const personalizationInsights = [
    {
      id: "insight-1",
      title: "Sleep Pattern Optimization",
      description: "Your optimal bedtime is 10:30 PM based on energy patterns",
      priority: "high" as const,
      category: "insight",
      action: "Apply Insight"
    },
    {
      id: "insight-2",
      title: "Nutrition Timing",
      description: "Post-workout nutrition window analysis shows 20% improvement potential",
      priority: "medium" as const,
      category: "insight", 
      action: "Learn More"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Recommendations | AI Intelligence" description="Personalized AI recommendations for wellness" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">AI Recommendations ✨</h1>
                <p className="text-muted-foreground">Personalized suggestions to enhance your wellness journey.</p>
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

          {/* Pinterest-style Masonry Grid Layout */}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {/* Progress Tracking - C-012 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-008" data-system-card-id="C-012">
              <ProgressStreaksCard />
            </div>

            {/* Health Recommendations - C-010 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-007" data-system-card-id="C-010">
              <RecommendationCard
                title="Health Recommendations"
                items={healthRecommendations}
                onItemClick={(item) => handleRecommendationClick(item, "C-010")}
                maxItems={3}
              />
            </div>

            {/* Lifestyle Suggestions - C-011 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-007" data-system-card-id="C-011">
              <RecommendationCard
                title="Lifestyle"
                items={lifestyleSuggestions}
                onItemClick={(item) => handleRecommendationClick(item, "C-011")}
                maxItems={3}
              />
            </div>

            {/* Smart Calendar - matching Dashboard sizing */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-009" data-system-card-id="C-016">
              <SmartCalendarCard />
            </div>

            {/* Wellness Services - C-013 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-WS-001" data-system-card-id="C-013">
              <OfferCard
                title="Wellness Services"
                offers={[{
                  id: "wellness-001",
                  title: "Comprehensive Wellness Assessment", 
                  provider: "VITANA Partners",
                  price: 199,
                  description: "Personalized nutrition and fitness plan",
                  category: "wellness",
                  type: "service" as const
                }]}
                variant="grid"
                showPricing={true}
                onOfferClick={() => handleOfferClaim("C-013")}
                maxItems={1}
              />
            </div>

            {/* Lab Test Recommendations - C-014 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-LT-001" data-system-card-id="C-014">
              <LabTestCard
                labTest={{
                  id: "lab-001",
                  name: "Comprehensive Health Panel",
                  description: "Complete biomarker analysis",
                  category: "blood_markers",
                  biomarkers: ["Cholesterol", "Glucose", "Vitamins"],
                  price: 89,
                  turnaround_days: 2,
                  sample_type: "Blood",
                  provider_name: "LabCorp"
                }}
                onOrder={() => handleLabTest("C-014")}
              />
            </div>

            {/* Personalization Insights - C-015 */}
            <div className="break-inside-avoid mb-4" data-template-id="CT-CX-007" data-system-card-id="C-015">
              <RecommendationCard
                title="Personalization Insights"
                items={personalizationInsights}
                onItemClick={(item) => handleRecommendationClick(item, "C-015")}
                maxItems={2}
              />
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}