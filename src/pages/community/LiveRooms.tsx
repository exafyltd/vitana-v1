import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Search, Plus, Plane } from "lucide-react";
import { useState } from "react";
import { GoLivePopup } from "@/components/GoLivePopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import LiveRoomDirectory from "@/components/community/LiveRoomDirectory";
import LiveRoomViewer from "@/components/community/LiveRoomViewer";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

import { communityNavigation } from "@/config/navigation";

export default function LiveRooms() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [viewingRoom, setViewingRoom] = useState<string | null>(null);
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

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
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-domain-community-tint via-background to-domain-community-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Join the conversation live! 🎙️</h1>
                <p className="text-muted-foreground">Join live audio and video discussions with community members.</p>
              </div>
            </div>
            
            {/* Autopilot Card with Live Badge Counter */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onClick={() => setAutopilotOpen(true)}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                  {latestActions.map((action, index) => (
                    <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>
                  ))}
                  {pendingCount > 2 && (
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      +{pendingCount - 2} more actions
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Vitana Index Card - Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
          </div>
        </div>

        {/* Action Buttons Utility Bar */}
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder="Search Live Rooms…"
            onSearch={(query) => console.log('Search Live Rooms:', query)}
          />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setIsGoLiveOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Go Live
          </Button>
        </UtilityActionButton>

        <LiveRoomDirectory onJoinRoom={handleJoinRoom} />
        </div>
      </div>
      
      <GoLivePopup 
        open={isGoLiveOpen} 
        onOpenChange={setIsGoLiveOpen}
        defaultTitle="Live Community Discussion"
      />
      
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}