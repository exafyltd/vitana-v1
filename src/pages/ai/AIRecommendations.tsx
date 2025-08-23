import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { RecommendationCard } from "@/components/templates/RecommendationCard";
import { OfferCard } from "@/components/templates/OfferCard";
import LabTestCard from "@/components/LabTestCard";
import { recommendations } from "@/mocks/ai";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function AIRecommendations() {
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
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
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

          {/* Lab Test Recommendations - using existing component */}
          <div className="lg:col-span-6" data-template-id="CT-LT-001" data-system-card-id="C-014">
            <div className="bg-gradient-to-br from-calendar-primary/5 to-calendar-accent/5 border border-calendar-primary/20 rounded-2xl p-6">
              <h3 className="text-sm font-semibold tracking-wide text-foreground mb-4">Lab Test Recommendations</h3>
              <div className="space-y-3">
                {recommendations.labs.map((lab) => (
                  <LabTestCard
                    key={lab.item_id}
                    testName={lab.title}
                    price={lab.price}
                    provider={lab.provider}
                    turnaroundTime={lab.turnaround}
                    onOrderClick={() => handleRecommendationClick(lab, "C-014")}
                    compact={true}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* AI Challenge - C-015 */}
          <div className="lg:col-span-12" data-template-id="CT-DO-002" data-system-card-id="C-015">
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
    </AppLayout>
  );
}