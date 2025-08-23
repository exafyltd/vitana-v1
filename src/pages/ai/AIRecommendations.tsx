import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { RecommendationCard } from "@/components/templates/RecommendationCard";
import { OfferCard } from "@/components/templates/OfferCard";
import LabTestCard from "@/components/LabTestCard";
import { recommendations } from "@/mocks/ai";
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

  const handleViewAll = (type: string) => {
    console.log("Analytics: cta_execute", {
      template_id: "CT-DO-002", 
      system_card_id: type,
      screen_route: "/ai/recommendations",
      action: "view_all"
    });
  };

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

          {/* Hero Strip - Health To-Do */}
          <div className="mb-8" data-template-id="CT-DO-002" data-system-card-id="C-011">
            <RecommendationCard
              title="Health To-Do List"
              items={recommendations.healthTodos}
              variant="horizontal"
              onItemClick={(item) => handleRecommendationClick(item, "C-011")}
              onViewAll={() => handleViewAll("C-011")}
            />
          </div>

          {/* Grid Layout - 12 Column Responsive */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Meetup Recommendations - C-012 */}
            <div className="lg:col-span-6" data-template-id="CT-DO-003" data-system-card-id="C-012">
              <div className="bg-gradient-to-br from-calendar-primary/5 to-calendar-accent/5 border border-calendar-primary/20 rounded-2xl p-6">
                <h3 className="text-sm font-semibold tracking-wide text-foreground mb-4">Social Meetups</h3>
                <div className="space-y-4">
                  {recommendations.meetups.map((meetup) => (
                    <div 
                      key={meetup.id}
                      className="p-4 bg-background/80 backdrop-blur-sm rounded-lg border cursor-pointer hover:shadow-md hover:border-calendar-primary/30 transition-all group"
                      onClick={() => handleRecommendationClick(meetup, "C-012")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm text-foreground group-hover:text-calendar-primary transition-colors">
                          {meetup.title}
                        </h4>
                        <span className="text-xs text-calendar-primary font-medium">{meetup.when}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{meetup.with}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{meetup.location}</span>
                        <span className="text-xs text-calendar-success">{meetup.spots} spots left</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Recommendations - C-013 */}
            <div className="lg:col-span-6" data-template-id="CT-VC-001" data-system-card-id="C-013">
              <OfferCard
                title="Content Feed Picks"
                offers={recommendations.content.map(item => ({
                  id: item.id,
                  title: item.title,
                  duration: item.duration,
                  category: item.type,
                  imageUrl: item.mediaThumbUrl,
                  rating: item.rating,
                  type: "content" as const
                }))}
                variant="list"
                showPricing={false}
                onOfferClick={(offer) => handleRecommendationClick(offer, "C-013")}
                maxItems={3}
              />
            </div>

            {/* Service Recommendations - C-014 */}
            <div className="lg:col-span-6" data-template-id="CT-DO-001" data-system-card-id="C-014">
              <OfferCard
                title="Service Recommendations"
                offers={recommendations.services.map(service => ({
                  id: service.item_id,
                  title: service.title,
                  provider: service.provider,
                  price: service.price,
                  rating: service.rating,
                  availability: service.availability,
                  type: "service" as const
                }))}
                variant="list"
                showPricing={true}
                onOfferClick={(offer) => handleRecommendationClick(offer, "C-014")}
                maxItems={2}
              />
            </div>

            {/* Lab Test Recommendations */}
            <div className="lg:col-span-6" data-template-id="CT-LT-001" data-system-card-id="C-014">
              <div className="bg-gradient-to-br from-calendar-primary/5 to-calendar-accent/5 border border-calendar-primary/20 rounded-2xl p-6">
                <h3 className="text-sm font-semibold tracking-wide text-foreground mb-4">Lab Test Recommendations</h3>
                <div className="space-y-3">
                  {recommendations.labs.map((lab) => (
                    <LabTestCard
                      key={lab.item_id}
                      labTest={{
                        id: lab.item_id,
                        name: lab.title,
                        description: `Professional ${lab.title.toLowerCase()} testing`,
                        category: "blood_markers",
                        biomarkers: ["Primary Markers", "Secondary Indicators"],
                        price: lab.price,
                        turnaround_days: parseInt(lab.turnaround.split('-')[0]) || 2,
                        sample_type: "Blood",
                        provider_name: lab.provider
                      }}
                      onOrder={() => handleRecommendationClick(lab, "C-014")}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* AI Challenge - C-015 */}
            <div className="lg:col-span-12 mb-6" data-template-id="CT-DO-002" data-system-card-id="C-015">
              <div className="bg-gradient-to-r from-calendar-primary/10 to-calendar-accent/10 border border-calendar-primary/30 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Weekly AI Challenge: Hydration Mastery</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Join 2,847 others in optimizing hydration patterns this week. AI will track your progress and adjust goals dynamically.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>🎯 Goal: 8 glasses daily</span>
                      <span>⏱️ Duration: 7 days</span>
                      <span>🏆 Reward: Wellness insights unlock</span>
                    </div>
                  </div>
                  <button 
                    className="bg-calendar-primary hover:bg-calendar-primary/90 text-white px-6 py-3 rounded-2xl font-medium transition-colors"
                    onClick={() => handleRecommendationClick({ id: "challenge-hydration" }, "C-015")}
                  >
                    Join Challenge
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}