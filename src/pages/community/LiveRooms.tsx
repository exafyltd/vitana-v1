import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import LiveRoomDirectory from "@/components/community/LiveRoomDirectory";
import LiveRoomViewer from "@/components/community/LiveRoomViewer";
import { GoLivePopup } from "@/components/GoLivePopup";
import { useState } from "react";
import { Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);

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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Join the conversation live! 🎙️</h1>
                <p className="text-muted-foreground">Join live audio and video discussions with community members.</p>
              </div>
              <Button 
                onClick={() => setIsGoLiveOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-primary-foreground shadow-elegant"
              >
                <Plus className="mr-2 h-5 w-5" />
                Go Live
              </Button>
            </div>
          </div>
          <LiveRoomDirectory onJoinRoom={handleJoinRoom} />
        </div>
      </div>
      
      <GoLivePopup 
        open={isGoLiveOpen} 
        onOpenChange={setIsGoLiveOpen}
        defaultTitle="Live Community Discussion"
      />
    </AppLayout>
  );
}