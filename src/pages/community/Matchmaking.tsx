import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Heart } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "matchmaking", name: "Matchmaking", path: "/community/matchmaking" },
  { id: "groups", name: "Groups", path: "/community/groups" },
  { id: "meetups", name: "Meetups", path: "/community/meetups" },
  { id: "live-rooms", name: "Live Rooms", path: "/community/live-rooms" },
  { id: "challenges", name: "Challenges", path: "/community/challenges" },
];

export default function Matchmaking() {
  return (
    <AppLayout>
      <SEO title="Matchmaking | Community" description="Find compatible community members" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Perfect matches for your journey! 💫"
            description="Discover compatible community members based on your interests and wellness goals."
            icon={Heart}
          />
        </div>
      </div>
    </AppLayout>
  );
}