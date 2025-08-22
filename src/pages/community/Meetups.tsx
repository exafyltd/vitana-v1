import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "my-business", name: "My Business", path: "/community/my-business" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "LIVE Hub", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function Meetups() {
  return (
    <AppLayout>
      <SEO title="Meetups | Community" description="Discover and join local meetups and events" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Meetups</h1>
          <p className="text-muted-foreground">Find and attend local wellness meetups and community events.</p>
        </div>
      </div>
    </AppLayout>
  );
}