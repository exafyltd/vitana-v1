import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Mic } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "matchmaking", name: "Matchmaking", path: "/community/matchmaking" },
  { id: "groups", name: "Groups", path: "/community/groups" },
  { id: "meetups", name: "Meetups", path: "/community/meetups" },
  { id: "live-rooms", name: "LIVE Hub", path: "/community/live-rooms" },
  { id: "challenges", name: "Challenges", path: "/community/challenges" },
];

export default function LiveRooms() {
  return (
    <AppLayout>
      <SEO title="Live Rooms | Community" description="Join live conversations and discussions" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Join the conversation live! 🎙️"
            description="Join live audio and video discussions with community members."
            icon={Mic}
          />
        </div>
      </div>
    </AppLayout>
  );
}