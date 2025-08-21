import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Lightbulb } from "lucide-react";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function AIRecommendations() {
  return (
    <AppLayout>
      <SEO title="Recommendations | AI Intelligence" description="Personalized AI recommendations for wellness" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Smart suggestions, smarter you! 💡"
            description="Receive personalized recommendations based on your wellness journey and goals."
            icon={Lightbulb}
          />
        </div>
      </div>
    </AppLayout>
  );
}