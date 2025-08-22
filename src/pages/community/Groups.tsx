import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Users } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "my-business", name: "My Business", path: "/community/my-business" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "LIVE Hub", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function Groups() {
  return (
    <AppLayout>
      <SEO title="Groups | Community" description="Join and manage community groups" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Find your wellness tribe! 👥"
            description="Join groups with shared interests or create your own community groups."
            icon={Users}
          />
        </div>
      </div>
    </AppLayout>
  );
}