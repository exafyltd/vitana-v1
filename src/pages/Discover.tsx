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
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dear Jovana, discover something amazing today! 🌟</h1>
            <p className="text-muted-foreground">Explore new wellness content, trends, and personalized recommendations just for you. Navigate using the tabs above to access different discovery sections.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}