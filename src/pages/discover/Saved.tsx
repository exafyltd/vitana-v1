import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const discoverSubItems = [
  { id: "overview", name: "Overview", path: "/discover" },
  { id: "trending", name: "Trending", path: "/discover/trending" },
  { id: "recommendations", name: "Recommendations", path: "/discover/recommendations" },
  { id: "saved", name: "Saved", path: "/discover/saved" },
];

export default function Saved() {
  return (
    <AppLayout>
      <SEO title="Saved | Discover" description="Your saved content" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Saved</h1>
          <p className="text-muted-foreground">Access all your saved content and bookmarks in one place.</p>
        </div>
      </div>
    </AppLayout>
  );
}