import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const aiSubItems = [
  { id: "chat", name: "AI Chat", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function Insights() {
  return (
    <AppLayout>
      <SEO title="Insights | AI Intelligence" description="AI-powered health and wellness insights" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">AI Insights</h1>
          <p className="text-muted-foreground">Get personalized insights from AI analysis of your health and wellness data.</p>
        </div>
      </div>
    </AppLayout>
  );
}