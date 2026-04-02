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
import { MotivationalBanner } from "@/components/MotivationalBanner";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from "@/components/ui/responsive-confirm-dialog";
import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLiveRoomCarousel } from "@/components/community/MobileLiveRoomCarousel";
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
import SocialShareButton from "@/components/sharing/SocialShareButton";
import { useScheduledStreams, useLiveStreams, useStartStream, useCancelStream, useDeleteStream, useUpdateStream } from "@/hooks/useLiveStreams";
import type { LiveStream } from "@/hooks/useLiveStreams";

import { useAuth } from "@/context/AuthProvider";
import { useProfilesByIds } from "@/hooks/useProfiles";
import { useMyRoom } from "@/hooks/useMyRoom";
import { useTranslation } from "@/hooks/useTranslation";

import { supabase } from "@/integrations/supabase/client";

export default function LiveRooms() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pendingCount, getLatestActions } = useAutopilot();
  const { user } = useAuth();
  const myRoomQuery = useMyRoom();
  const myRoom = myRoomQuery.data?.room;
  const isMobile = useIsMobile();
  const { translate } = useTranslation();
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [notifyingRooms, setNotifyingRooms] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('live');
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch live streams data
  const { data: liveStreams = [], isLoading: isLoadingLive } = useLiveStreams();
  const { data: scheduledStreams = [], isLoading: isLoadingScheduled } = useScheduledStreams();
  const { mutateAsync: startStream } = useStartStream();
  const { mutateAsync: cancelStream } = useCancelStream();
  const { mutateAsync: deleteStream } = useDeleteStream();
  const { mutateAsync: updateStream } = useUpdateStream();
  
  // Fetch profiles for all creators
  const creatorIds = useMemo(() => {
    return Array.from(new Set([...liveStreams, ...scheduledStreams].map(s => s.created_by))).filter(Boolean);
  }, [liveStreams, scheduledStreams]);
  
  const { data: profiles = [] } = useProfilesByIds(creatorIds);
  
  // Build profile lookup map
  const profilesMap = useMemo(
    () => Object.fromEntries(profiles.map(p => [p.user_id, p] as const)),
    [profiles]
  );
  
  const latestActions = getLatestActions(2);
  
  // Transform stream to room with profile hydration
  const transformStreamToRoom = (stream: LiveStream): LiveRoom => {
    const profile = profilesMap[stream.created_by];
    const isYou = user?.id === stream.created_by;

    // Map stream status to room-card-compatible status
    const statusMap: Record<string, LiveRoom['status']> = {
      'pending': 'scheduled',
      'live': 'live',
      'ended': 'ended',
      'cancelled': 'cancelled',
    };

    return {
      id: stream.id,
      title: stream.title,
      description: stream.description || undefined,
      host: {
        id: stream.created_by,
        name: profile?.display_name || (isYou ? 'You' : 'Anonymous Host'),
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.created_by}`,
      },
      isLive: stream.status === 'live',
      scheduledTime: stream.scheduled_for || undefined,
      participants: stream.viewer_count,
      maxParticipants: 100,
      tags: stream.tags,
      type: stream.stream_type as "audio" | "video",
      isPremium: stream.access_level === 'group',
      imageUrl: stream.cover_image_url || undefined,
      category: stream.tags[0] || "general",
      location: "Virtual",
      status: statusMap[stream.status] || undefined,
    };
  };
  
  // Use only real data — no mock rooms
  const liveRooms = liveStreams.map(transformStreamToRoom);
  const scheduledRooms = scheduledStreams.map(transformStreamToRoom);

  // Filter rooms by search query
  const filteredLiveRooms = useMemo(() => {
    if (!searchQuery.trim()) return liveRooms;
    const query = searchQuery.toLowerCase();
    return liveRooms.filter(room =>
      room.title.toLowerCase().includes(query) ||
      room.description?.toLowerCase().includes(query) ||
      room.host.name.toLowerCase().includes(query) ||
      room.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      room.category?.toLowerCase().includes(query)
    );
  }, [liveRooms, searchQuery]);

  const filteredScheduledRooms = useMemo(() => {
    if (!searchQuery.trim()) return scheduledRooms;
    const query = searchQuery.toLowerCase();
    return scheduledRooms.filter(room =>
      room.title.toLowerCase().includes(query) ||
      room.description?.toLowerCase().includes(query) ||
      room.host.name.toLowerCase().includes(query) ||
      room.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      room.category?.toLowerCase().includes(query)
    );
  }, [scheduledRooms, searchQuery]);


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
    // Check if it's a mock room
    if (roomId.startsWith('mock-')) {
      toast({
        title: "Demo Room",
        description: "This is an example room. Create your own to go live!",
        action: (
          <Button 
            size="sm" 
            onClick={() => setIsGoLiveOpen(true)}
          >
            Create Room
          </Button>
        ),
      });
      return;
    }
    
    // Real room - proceed normally
    setSelectedRoomId(roomId);
    setSearchParams({ live: roomId });
  };

  const handleDrawerClose = () => {
    setSelectedRoomId(null);
    setSearchParams({});
  };

  const handleNavigatePrev = () => {
    const allRooms = [...liveRooms, ...scheduledRooms];
    const currentIndex = allRooms.findIndex((r) => r.id === selectedRoomId);
    if (currentIndex > 0) {
      const prevRoom = allRooms[currentIndex - 1];
      setSelectedRoomId(prevRoom.id);
      setSearchParams({ live: prevRoom.id });
    }
  };

  const handleNavigateNext = () => {
    const allRooms = [...liveRooms, ...scheduledRooms];
    const currentIndex = allRooms.findIndex((r) => r.id === selectedRoomId);
    if (currentIndex < allRooms.length - 1) {
      const nextRoom = allRooms[currentIndex + 1];
      setSelectedRoomId(nextRoom.id);
      setSearchParams({ live: nextRoom.id });
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to join live rooms",
        variant: "destructive",
      });
      return;
    }

    // Find the room data
    const room = [...liveRooms, ...scheduledRooms].find(r => r.id === roomId);
    
    if (!room) {
      toast({
        title: "Room not found",
        description: "This live room no longer exists",
        variant: "destructive",
      });
      return;
    }

    // Navigate to the viewer with WebRTC integration
    navigate(`/comm/live-rooms/${roomId}/view`, {
      state: {
        roomId,
        userId: user.id,
        userName: profilesMap[user.id]?.display_name || user.email?.split('@')[0] || 'Guest',
        userAvatar: profilesMap[user.id]?.avatar_url,
        room: room,
      }
    });
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

  const handleEditRoom = async () => {
    // Edit mode removed in session-based architecture
    toast({
      title: "Not yet supported",
      description: "Editing sessions will be available soon",
    });
  };

  const handleDeleteRoom = async (roomId?: string) => {
    const idToDelete = roomId || selectedRoomId;
    if (!idToDelete) return;
    
    try {
      console.log('Attempting to delete stream:', idToDelete);
      await deleteStream(idToDelete);
      toast({
        title: "Stream deleted",
        description: "Your live stream has been deleted",
      });
      setDeleteConfirmRoomId(null);
      if (selectedRoomId === idToDelete) {
        handleDrawerClose();
      }
    } catch (error) {
      console.error('Delete stream error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete stream",
        variant: "destructive",
      });
    }
  };

  const handleCardEdit = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    toast({
      title: "Not yet supported",
      description: "Editing sessions will be available soon",
    });
  };

  const handleCardDelete = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    setDeleteConfirmRoomId(roomId);
  };


  const allRooms = [...liveRooms, ...scheduledRooms];
  const selectedRoom = allRooms.find((r) => r.id === selectedRoomId);
  const currentIndex = allRooms.findIndex((r) => r.id === selectedRoomId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allRooms.length - 1;

  // Helper to chunk rooms into groups of 6 (2 rows of 3)
  const chunkRooms = (rooms: LiveRoom[], chunkSize = 6) => {
    const chunks = [];
    for (let i = 0; i < rooms.length; i += chunkSize) {
      chunks.push(rooms.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Render mosaic grid with alternating 1+2 / 2+1 layout
  const renderMosaicGrid = (rooms: LiveRoom[]) => {
    const rows = [];
    for (let i = 0; i < rooms.length; i += 3) {
      const rowRooms = rooms.slice(i, i + 3);
      const rowIndex = Math.floor(i / 3);
      const isEvenRow = rowIndex % 2 === 0;

      rows.push(
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 mb-6 items-stretch">
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
                    isNotifying={notifyingRooms.has(rowRooms[0].id)}
                    isCreator={rowRooms[0].host.id === user?.id}
                    onEdit={(e) => handleCardEdit(e, rowRooms[0].id)}
                    onDelete={(e) => handleCardDelete(e, rowRooms[0].id)}
                    shareButton={
                      <SocialShareButton
                        type="live_room"
                        data={{
                          title: rowRooms[0].title,
                          description: rowRooms[0].description || `Join ${rowRooms[0].host.name}'s live session`,
                          link: `${window.location.origin}/community/liverooms?room=${encodeURIComponent(rowRooms[0].id)}`
                        }}
                        variant="icon"
                        size="sm"
                        className="text-white hover:bg-white/20 hover:text-white"
                      />
                    }
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
                    isNotifying={notifyingRooms.has(rowRooms[1].id)}
                    isCreator={rowRooms[1].host.id === user?.id}
                    onEdit={(e) => handleCardEdit(e, rowRooms[1].id)}
                    onDelete={(e) => handleCardDelete(e, rowRooms[1].id)}
                    shareButton={
                      <SocialShareButton
                        type="live_room"
                        data={{
                          title: rowRooms[1].title,
                          description: rowRooms[1].description || `Join ${rowRooms[1].host.name}'s live session`,
                          link: `${window.location.origin}/community/liverooms?room=${encodeURIComponent(rowRooms[1].id)}`
                        }}
                        variant="icon"
                        size="sm"
                        className="text-white hover:bg-white/20 hover:text-white"
                      />
                    }
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
                    isNotifying={notifyingRooms.has(rowRooms[2].id)}
                    isCreator={rowRooms[2].host.id === user?.id}
                    onEdit={(e) => handleCardEdit(e, rowRooms[2].id)}
                    onDelete={(e) => handleCardDelete(e, rowRooms[2].id)}
                    shareButton={
                      <SocialShareButton
                        type="live_room"
                        data={{
                          title: rowRooms[2].title,
                          description: rowRooms[2].description || `Join ${rowRooms[2].host.name}'s live session`,
                          link: `${window.location.origin}/community/liverooms?room=${encodeURIComponent(rowRooms[2].id)}`
                        }}
                        variant="icon"
                        size="sm"
                        className="text-white hover:bg-white/20 hover:text-white"
                      />
                    }
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
                    isNotifying={notifyingRooms.has(rowRooms[0].id)}
                    isCreator={rowRooms[0].host.id === user?.id}
                    onEdit={(e) => handleCardEdit(e, rowRooms[0].id)}
                    onDelete={(e) => handleCardDelete(e, rowRooms[0].id)}
                    shareButton={
                      <SocialShareButton
                        type="live_room"
                        data={{
                          title: rowRooms[0].title,
                          description: rowRooms[0].description || `Join ${rowRooms[0].host.name}'s live session`,
                          link: `${window.location.origin}/community/liverooms?room=${encodeURIComponent(rowRooms[0].id)}`
                        }}
                        variant="icon"
                        size="sm"
                        className="text-white hover:bg-white/20 hover:text-white"
                      />
                    }
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
                    isNotifying={notifyingRooms.has(rowRooms[1].id)}
                    isCreator={rowRooms[1].host.id === user?.id}
                    onEdit={(e) => handleCardEdit(e, rowRooms[1].id)}
                    onDelete={(e) => handleCardDelete(e, rowRooms[1].id)}
                    shareButton={
                      <SocialShareButton
                        type="live_room"
                        data={{
                          title: rowRooms[1].title,
                          description: rowRooms[1].description || `Join ${rowRooms[1].host.name}'s live session`,
                          link: `${window.location.origin}/community/liverooms?room=${encodeURIComponent(rowRooms[1].id)}`
                        }}
                        variant="icon"
                        size="sm"
                        className="text-white hover:bg-white/20 hover:text-white"
                      />
                    }
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
                    isNotifying={notifyingRooms.has(rowRooms[2].id)}
                    isCreator={rowRooms[2].host.id === user?.id}
                    onEdit={(e) => handleCardEdit(e, rowRooms[2].id)}
                    onDelete={(e) => handleCardDelete(e, rowRooms[2].id)}
                    shareButton={
                      <SocialShareButton
                        type="live_room"
                        data={{
                          title: rowRooms[2].title,
                          description: rowRooms[2].description || `Join ${rowRooms[2].host.name}'s live session`,
                          link: `${window.location.origin}/community/liverooms?room=${encodeURIComponent(rowRooms[2].id)}`
                        }}
                        variant="icon"
                        size="sm"
                        className="text-white hover:bg-white/20 hover:text-white"
                      />
                    }
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
      {/* Hide SubNavigation on mobile for this specific route - users navigate via /comm */}
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className={isMobile ? "px-2 pt-2 pb-0 h-[100dvh] overflow-hidden" : "p-6 pb-24 md:pb-32 scroll-smooth"} style={isMobile ? undefined : { scrollPaddingBottom: "96px" }}>
        <StandardHeader
          title={translate('liveRooms.title', 'Live Rooms')}
          description={translate('liveRooms.description', 'Join live audio and video discussions with community members.')}
        />

        {/* Utility Action Button */}
        <UtilityActionButton compact={isMobile} 
          className="min-w-0"
          afterGiftVoucherChildren={isMobile && (
            <>
              {/* Vitana Index - pill with emoji + text */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/health')}
                className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
              >
                <span className="text-xs opacity-60">🧬</span>
                <span className="text-sm font-medium text-primary">742</span>
              </Button>
              
              {/* Autopilot - pill with icon + text */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAutopilotOpen(true)}
                className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0"
              >
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{translate('actionBar.autopilot', 'Autopilot')}</span>
                {pendingCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            </>
          )}
        >
          <div className="flex items-center gap-2 min-w-max">
            <ExpandableSearchButton
              placeholder="Search Live Rooms…"
              onSearch={(query) => setSearchQuery(query)}
            />
            <UniversalCalendarButton />
            
            {/* Go Live - PRIMARY ACTION */}
            <Button 
              onClick={() => setIsGoLiveOpen(true)}
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">{translate('liveRooms.goLive', 'Go Live')}</span>
            </Button>
          </div>
        </UtilityActionButton>

        {/* Split Bar for Live/Scheduled/Past */}
        <SplitBar value={activeTab} onValueChange={setActiveTab} className={isMobile ? "mt-1" : "mt-6"}>
          <SplitBarList className={isMobile ? "mb-1" : undefined}>
            <SplitBarTrigger value="live">
              📡 {translate('liveRooms.tabs.live', 'Live Now')}
              {filteredLiveRooms.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {filteredLiveRooms.length}
                  {liveStreams.length === 0 && (
                    <span className="ml-1 text-[10px] opacity-70">(demo)</span>
                  )}
                </Badge>
              )}
            </SplitBarTrigger>
            <SplitBarTrigger value="scheduled">
              📅 {translate('liveRooms.tabs.scheduled', 'Scheduled')}
              {filteredScheduledRooms.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {filteredScheduledRooms.length}
                  {scheduledStreams.length === 0 && (
                    <span className="ml-1 text-[10px] opacity-70">(demo)</span>
                  )}
                </Badge>
              )}
            </SplitBarTrigger>
            <SplitBarTrigger value="past">
              📋 {translate('liveRooms.tabs.past', 'Past')}
            </SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="live" className={isMobile ? "mt-0" : "mt-6"}>
            {isLoadingLive ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading live rooms...</p>
              </div>
            ) : filteredLiveRooms.length > 0 ? (
              isMobile ? (
                <MobileLiveRoomCarousel
                  rooms={filteredLiveRooms}
                  onCardClick={handleCardClick}
                  onJoinRoom={handleJoinRoom}
                  onNotifyClick={handleNotifyClick}
                  notifyingRooms={notifyingRooms}
                  currentUserId={user?.id}
                  onEdit={handleCardEdit}
                  onDelete={handleCardDelete}
                />
              ) : (
                <>
                  {chunkRooms(filteredLiveRooms).map((chunk, chunkIndex) => (
                    <div key={`live-chunk-${chunkIndex}`}>
                      {renderMosaicGrid(chunk)}
                      {chunkIndex < chunkRooms(filteredLiveRooms).length - 1 && (
                        <div className="mb-8 mt-2">
                          <MotivationalBanner variant="encouragement" />
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredLiveRooms.length > 0 && (
                    <div className="mb-8 mt-2">
                      <MotivationalBanner variant="partnership" />
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">{translate('liveRooms.noRooms', 'No live rooms at the moment')}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setIsGoLiveOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {translate('liveRooms.beFirst', 'Be the first to go live')}
                </Button>
              </div>
            )}
          </SplitBarContent>

          <SplitBarContent value="scheduled" className={isMobile ? "mt-0" : "mt-6"}>
            {isLoadingScheduled ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading scheduled rooms...</p>
              </div>
            ) : filteredScheduledRooms.length > 0 ? (
              isMobile ? (
                <MobileLiveRoomCarousel
                  rooms={filteredScheduledRooms}
                  onCardClick={handleCardClick}
                  onJoinRoom={handleJoinRoom}
                  onNotifyClick={handleNotifyClick}
                  notifyingRooms={notifyingRooms}
                  currentUserId={user?.id}
                  onEdit={handleCardEdit}
                  onDelete={handleCardDelete}
                />
              ) : (
                <>
                  {chunkRooms(filteredScheduledRooms).map((chunk, chunkIndex) => (
                    <div key={`scheduled-chunk-${chunkIndex}`}>
                      {renderMosaicGrid(chunk)}
                      {chunkIndex < chunkRooms(filteredScheduledRooms).length - 1 && (
                        <div className="mb-8 mt-2">
                          <MotivationalBanner variant="achievement" />
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredScheduledRooms.length > 0 && (
                    <div className="mb-8 mt-2">
                      <MotivationalBanner variant="guidance" />
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No scheduled rooms</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setIsGoLiveOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule a live room
                </Button>
              </div>
            )}
          </SplitBarContent>

          <SplitBarContent value="past" className={isMobile ? "mt-1" : "mt-6"}>
            <div className="text-center py-12">
              <p className="text-muted-foreground">Past sessions will appear here once rooms end.</p>
              <p className="text-sm text-muted-foreground mt-2">
                View summaries, highlights, and recordings from completed sessions.
              </p>
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>

      <GoLivePopup
        open={isGoLiveOpen}
        onOpenChange={(open) => {
          setIsGoLiveOpen(open);
        }}
        defaultTitle="Live Community Discussion"
        permanentRoomId={myRoom?.id}
        onCreated={(roomId) => {
          setActiveTab('scheduled');
          setSelectedRoomId(roomId);
          setSearchParams({ live: roomId });
        }}
      />
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
          isCreator={selectedRoom.host.id === user?.id}
          onEdit={handleEditRoom}
          onDelete={() => setDeleteConfirmRoomId(selectedRoomId)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ResponsiveConfirmDialog open={!!deleteConfirmRoomId} onOpenChange={(open) => !open && setDeleteConfirmRoomId(null)}>
        <ResponsiveConfirmDialogContent>
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>Delete Live Room</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>
              Are you sure you want to delete this live room? This action cannot be undone.
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel>Cancel</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction
              onClick={() => deleteConfirmRoomId && handleDeleteRoom(deleteConfirmRoomId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>

    </AppLayout>
  );
}