import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const discoverSubItems = [
  { id: "explore", name: "Explore", path: "/discover" },
  { id: "trending", name: "Trending", path: "/discover/trending" },
  { id: "recommendations", name: "Recommendations", path: "/discover/recommendations" },
  { id: "saved", name: "Saved", path: "/discover/saved" },
];

export default function Discover() {
  return (
    <AppLayout>
      <SEO title="Discover | VITANA" description="Discover new content, trends, and recommendations on VITANA" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Discover</h1>
          <p className="text-muted-foreground">Explore new content, trends, and personalized recommendations. Navigate using the tabs above to access different discovery sections.</p>
        </div>
      </div>
    </AppLayout>
  );
}