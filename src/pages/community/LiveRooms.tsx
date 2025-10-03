import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Plus, Plane } from "lucide-react";
import { useState, useEffect } from "react";
import { GoLivePopup } from "@/components/GoLivePopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { LiveRoomCard } from "@/components/liverooms/LiveRoomCard";
import { LiveRoomDrawer } from "@/components/liverooms/LiveRoomDrawer";
import type { LiveRoom } from "@/components/liverooms/LiveRoomCard";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { communityNavigation } from "@/config/navigation";
import { toast } from "@/hooks/use-toast";

// Mock data for live rooms
const mockLiveRooms: LiveRoom[] = [
  {
    id: "live-1",
    title: "Morning Wellness Chat ☀️",
    description: "Join us for a casual conversation about wellness, health tips, and community support",
    host: {
      id: "host-1",
      name: "Dr. Sarah Johnson",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    },
    isLive: true,
    participants: 24,
    maxParticipants: 50,
    tags: ["Wellness", "Community", "Health"],
    type: "audio",
    isPremium: false,
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "wellness",
    location: "Virtual",
  },
  {
    id: "live-2",
    title: "Fitness Q&A with Coach Mike",
    description: "Ask anything about fitness, nutrition, and building healthy habits",
    host: {
      id: "host-2",
      name: "Coach Mike",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    },
    isLive: true,
    participants: 18,
    maxParticipants: 30,
    tags: ["Fitness", "Q&A", "Coaching"],
    type: "video",
    isPremium: true,
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop",
    category: "fitness",
    location: "Virtual",
  },
  {
    id: "live-3",
    title: "Mental Health Support Circle",
    description: "A safe space to share experiences and support each other",
    host: {
      id: "host-3",
      name: "Emma Thompson",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    },
    isLive: true,
    participants: 12,
    maxParticipants: 20,
    tags: ["Mental Health", "Support", "Community"],
    type: "audio",
    isPremium: false,
    imageUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&h=600&fit=crop",
    category: "wellness",
    location: "Virtual",
  },
];

const mockScheduledRooms: LiveRoom[] = [
  {
    id: "scheduled-1",
    title: "Evening Meditation Session",
    description: "Guided meditation to wind down your day and prepare for restful sleep",
    host: {
      id: "host-4",
      name: "Zen Master Li",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    },
    isLive: false,
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    participants: 0,
    maxParticipants: 100,
    tags: ["Meditation", "Wellness", "Sleep"],
    type: "audio",
    isPremium: false,
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "meditation",
    location: "Virtual",
  },
  {
    id: "scheduled-2",
    title: "Nutrition Workshop: Meal Prep 101",
    description: "Learn how to prepare healthy meals for the week ahead",
    host: {
      id: "host-5",
      name: "Chef Maria",
      avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=100",
    },
    isLive: false,
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    participants: 8,
    maxParticipants: 25,
    tags: ["Nutrition", "Cooking", "Workshop"],
    type: "video",
    isPremium: true,
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "health",
    location: "Virtual",
  },
];

export default function LiveRooms() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [notifyingRooms, setNotifyingRooms] = useState<Set<string>>(new Set());
  
  const latestActions = getLatestActions(2);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle deep linking
  useEffect(() => {
    const liveId = searchParams.get("live");
    if (liveId) {
      setSelectedRoomId(liveId);
    } else {
      setSelectedRoomId(null);
    }
  }, [searchParams]);

  const handleCardClick = (roomId: string) => {
    setSelectedRoomId(roomId);
    setSearchParams({ live: roomId });
  };

  const handleDrawerClose = () => {
    setSelectedRoomId(null);
    setSearchParams({});
  };

  const handleNavigatePrev = () => {
    const allRooms = [...mockLiveRooms, ...mockScheduledRooms];
    const currentIndex = allRooms.findIndex((r) => r.id === selectedRoomId);
    if (currentIndex > 0) {
      const prevRoom = allRooms[currentIndex - 1];
      setSelectedRoomId(prevRoom.id);
      setSearchParams({ live: prevRoom.id });
    }
  };

  const handleNavigateNext = () => {
    const allRooms = [...mockLiveRooms, ...mockScheduledRooms];
    const currentIndex = allRooms.findIndex((r) => r.id === selectedRoomId);
    if (currentIndex < allRooms.length - 1) {
      const nextRoom = allRooms[currentIndex + 1];
      setSelectedRoomId(nextRoom.id);
      setSearchParams({ live: nextRoom.id });
    }
  };

  const handleJoinRoom = (roomId: string) => {
    toast({
      title: "Joining room...",
      description: "Preparing audio/video connection",
    });
    // In real implementation, this would navigate to the LiveRoomViewer
  };

  const handleNotifyClick = (roomId: string) => {
    setNotifyingRooms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
    toast({
      title: notifyingRooms.has(roomId) ? "Notifications off" : "You'll be notified!",
      description: notifyingRooms.has(roomId)
        ? "You won't receive notifications for this room"
        : "We'll notify you when the room goes live",
    });
  };

  const handleShareClick = (roomId: string) => {
    const url = `${window.location.origin}/comm/live-rooms?live=${roomId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Room link copied to clipboard",
    });
  };

  const allRooms = [...mockLiveRooms, ...mockScheduledRooms];
  const selectedRoom = allRooms.find((r) => r.id === selectedRoomId);
  const currentIndex = allRooms.findIndex((r) => r.id === selectedRoomId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allRooms.length - 1;

  // Render mosaic grid with alternating 1+2 / 2+1 layout
  const renderMosaicGrid = (rooms: LiveRoom[]) => {
    const rows = [];
    for (let i = 0; i < rooms.length; i += 3) {
      const rowRooms = rooms.slice(i, i + 3);
      const rowIndex = Math.floor(i / 3);
      const isEvenRow = rowIndex % 2 === 0;

      rows.push(
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 mb-6">
          {isEvenRow ? (
            // Pattern: Featured + Small + Small (1+2)
            <>
              {rowRooms[0] && (
                <div className="md:col-span-2 xl:col-span-6">
                  <LiveRoomCard
                    room={rowRooms[0]}
                    isFeatured
                    onClick={() => handleCardClick(rowRooms[0].id)}
                    onJoinClick={(e) => {
                      e.stopPropagation();
                      rowRooms[0].isLive && handleJoinRoom(rowRooms[0].id);
                    }}
                    onNotifyClick={(e) => {
                      e.stopPropagation();
                      !rowRooms[0].isLive && handleNotifyClick(rowRooms[0].id);
                    }}
                    onShareClick={(e) => {
                      e.stopPropagation();
                      handleShareClick(rowRooms[0].id);
                    }}
                    isNotifying={notifyingRooms.has(rowRooms[0].id)}
                  />
                </div>
              )}
              {rowRooms[1] && (
                <div className="xl:col-span-3">
                  <LiveRoomCard
                    room={rowRooms[1]}
                    onClick={() => handleCardClick(rowRooms[1].id)}
                    onJoinClick={(e) => {
                      e.stopPropagation();
                      rowRooms[1].isLive && handleJoinRoom(rowRooms[1].id);
                    }}
                    onNotifyClick={(e) => {
                      e.stopPropagation();
                      !rowRooms[1].isLive && handleNotifyClick(rowRooms[1].id);
                    }}
                    onShareClick={(e) => {
                      e.stopPropagation();
                      handleShareClick(rowRooms[1].id);
                    }}
                    isNotifying={notifyingRooms.has(rowRooms[1].id)}
                  />
                </div>
              )}
              {rowRooms[2] && (
                <div className="xl:col-span-3">
                  <LiveRoomCard
                    room={rowRooms[2]}
                    onClick={() => handleCardClick(rowRooms[2].id)}
                    onJoinClick={(e) => {
                      e.stopPropagation();
                      rowRooms[2].isLive && handleJoinRoom(rowRooms[2].id);
                    }}
                    onNotifyClick={(e) => {
                      e.stopPropagation();
                      !rowRooms[2].isLive && handleNotifyClick(rowRooms[2].id);
                    }}
                    onShareClick={(e) => {
                      e.stopPropagation();
                      handleShareClick(rowRooms[2].id);
                    }}
                    isNotifying={notifyingRooms.has(rowRooms[2].id)}
                  />
                </div>
              )}
            </>
          ) : (
            // Pattern: Small + Small + Featured (2+1)
            <>
              {rowRooms[0] && (
                <div className="xl:col-span-3">
                  <LiveRoomCard
                    room={rowRooms[0]}
                    onClick={() => handleCardClick(rowRooms[0].id)}
                    onJoinClick={(e) => {
                      e.stopPropagation();
                      rowRooms[0].isLive && handleJoinRoom(rowRooms[0].id);
                    }}
                    onNotifyClick={(e) => {
                      e.stopPropagation();
                      !rowRooms[0].isLive && handleNotifyClick(rowRooms[0].id);
                    }}
                    onShareClick={(e) => {
                      e.stopPropagation();
                      handleShareClick(rowRooms[0].id);
                    }}
                    isNotifying={notifyingRooms.has(rowRooms[0].id)}
                  />
                </div>
              )}
              {rowRooms[1] && (
                <div className="xl:col-span-3">
                  <LiveRoomCard
                    room={rowRooms[1]}
                    onClick={() => handleCardClick(rowRooms[1].id)}
                    onJoinClick={(e) => {
                      e.stopPropagation();
                      rowRooms[1].isLive && handleJoinRoom(rowRooms[1].id);
                    }}
                    onNotifyClick={(e) => {
                      e.stopPropagation();
                      !rowRooms[1].isLive && handleNotifyClick(rowRooms[1].id);
                    }}
                    onShareClick={(e) => {
                      e.stopPropagation();
                      handleShareClick(rowRooms[1].id);
                    }}
                    isNotifying={notifyingRooms.has(rowRooms[1].id)}
                  />
                </div>
              )}
              {rowRooms[2] && (
                <div className="md:col-span-2 xl:col-span-6">
                  <LiveRoomCard
                    room={rowRooms[2]}
                    isFeatured
                    onClick={() => handleCardClick(rowRooms[2].id)}
                    onJoinClick={(e) => {
                      e.stopPropagation();
                      rowRooms[2].isLive && handleJoinRoom(rowRooms[2].id);
                    }}
                    onNotifyClick={(e) => {
                      e.stopPropagation();
                      !rowRooms[2].isLive && handleNotifyClick(rowRooms[2].id);
                    }}
                    onShareClick={(e) => {
                      e.stopPropagation();
                      handleShareClick(rowRooms[2].id);
                    }}
                    isNotifying={notifyingRooms.has(rowRooms[2].id)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    return rows;
  };

  return (
    <AppLayout>
      <SEO
        title="Live Rooms | Community"
        description="Join live conversations and discussions"
        canonical={window.location.href}
      />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Live Rooms"
          description="Join live audio and video discussions with community members."
          emoji="🎙️"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <ExpandableSearchButton
            placeholder="Search Live Rooms…"
            onSearch={(query) => console.log("Search Live Rooms:", query)}
          />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setIsGoLiveOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Go Live
          </Button>
        </UtilityActionButton>

        {/* Split Bar for Live/Scheduled */}
        <SplitBar defaultValue="live" className="mt-6">
          <SplitBarList className="grid w-full grid-cols-2">
            <SplitBarTrigger value="live">
              Live
              {mockLiveRooms.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {mockLiveRooms.length}
                </Badge>
              )}
            </SplitBarTrigger>
            <SplitBarTrigger value="scheduled">
              Scheduled
              {mockScheduledRooms.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {mockScheduledRooms.length}
                </Badge>
              )}
            </SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="live" className="mt-6">
            {mockLiveRooms.length > 0 ? (
              renderMosaicGrid(mockLiveRooms)
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No live rooms at the moment</p>
              </div>
            )}
          </SplitBarContent>

          <SplitBarContent value="scheduled" className="mt-6">
            {mockScheduledRooms.length > 0 ? (
              renderMosaicGrid(mockScheduledRooms)
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No scheduled rooms</p>
              </div>
            )}
          </SplitBarContent>
        </SplitBar>

        {/* Autopilot & Vitana Cards */}
        <div className="flex gap-4 mt-6">
          <div
            className="w-32 bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
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
              <Plane className="w-10 h-10 text-red-400" />
              <span className="text-sm font-medium text-red-400">Autopilot</span>
            </div>

            {showPreview && pendingCount > 0 && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-card/95 backdrop-blur-sm border rounded-lg shadow-xl p-3 z-10">
                <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                {latestActions.map((action) => (
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

          <div
            className="w-32 bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border cursor-pointer group transition-all duration-300 hover:shadow-xl"
            onClick={() => navigate("/health-tracker/vitana-index")}
          >
            <div className="flex items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                <span className="text-xl font-bold text-green-600">742</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GoLivePopup open={isGoLiveOpen} onOpenChange={setIsGoLiveOpen} defaultTitle="Live Community Discussion" />
      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />

      {/* Live Room Drawer */}
      {selectedRoom && (
        <LiveRoomDrawer
          room={selectedRoom}
          open={!!selectedRoomId}
          onOpenChange={(open) => {
            if (!open) {
              handleDrawerClose();
            }
          }}
          onNavigatePrev={hasPrev ? handleNavigatePrev : undefined}
          onNavigateNext={hasNext ? handleNavigateNext : undefined}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isMobile={isMobile}
          onJoin={handleJoinRoom}
        />
      )}
    </AppLayout>
  );
}