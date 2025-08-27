import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import LiveRoomDirectory from "@/components/community/LiveRoomDirectory";
import LiveRoomViewer from "@/components/community/LiveRoomViewer";
import { useState } from "react";
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
  const [viewingRoom, setViewingRoom] = useState<string | null>(null);

  const handleJoinRoom = (room: any) => {
    console.log("Joining room:", room.id);
    setViewingRoom(room.id);
  };

  const handleLeaveRoom = () => {
    setViewingRoom(null);
  };

  if (viewingRoom) {
    return <LiveRoomViewer roomId={viewingRoom} onLeave={handleLeaveRoom} />;
  }

  return (
    <AppLayout>
      <SEO title="Live Rooms | Community" description="Join live conversations and discussions" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 bg-gradient-to-br from-domain-community-tint via-background to-domain-community-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
            <h1 className="text-3xl font-bold text-foreground mb-2">Join the conversation live! 🎙️</h1>
            <p className="text-muted-foreground">Join live audio and video discussions with community members.</p>
          </div>
          <LiveRoomDirectory onJoinRoom={handleJoinRoom} />
        </div>
      </div>
    </AppLayout>
  );
}