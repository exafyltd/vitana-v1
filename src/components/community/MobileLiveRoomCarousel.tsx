import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { Radio } from 'lucide-react';
import { LiveRoomCard, type LiveRoom } from '@/components/liverooms/LiveRoomCard';
import SocialShareButton from '@/components/sharing/SocialShareButton';

interface MobileLiveRoomCarouselProps {
  rooms: LiveRoom[];
  onCardClick: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onNotifyClick: (roomId: string) => void;
  notifyingRooms: Set<string>;
  currentUserId?: string;
  onEdit?: (e: React.MouseEvent, roomId: string) => void;
  onDelete?: (e: React.MouseEvent, roomId: string) => void;
  emptyState?: React.ReactNode;
  initialRoomId?: string;
  onSlideChange?: (roomId: string, index: number) => void;
}

export function MobileLiveRoomCarousel({
  rooms,
  onCardClick,
  onJoinRoom,
  onNotifyClick,
  notifyingRooms,
  currentUserId,
  onEdit,
  onDelete,
  emptyState,
  initialRoomId,
  onSlideChange,
}: MobileLiveRoomCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  // Handle slide changes
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setCurrentIndex(index);
    if (rooms[index] && onSlideChange) {
      onSlideChange(rooms[index].id, index);
    }
  }, [emblaApi, rooms, onSlideChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Scroll to initial room if specified
  useEffect(() => {
    if (!emblaApi || !initialRoomId) return;
    const index = rooms.findIndex(r => r.id === initialRoomId);
    if (index >= 0) {
      emblaApi.scrollTo(index, false);
    }
  }, [emblaApi, initialRoomId, rooms]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!emblaApi) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        emblaApi.scrollPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        emblaApi.scrollNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emblaApi]);

  // Empty state
  if (rooms.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        {emptyState || (
          <div className="text-center">
            <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Live Rooms</h3>
            <p className="text-muted-foreground">Check back soon or go live yourself!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="relative w-full" 
      role="region" 
      aria-roledescription="carousel"
      aria-label="Live rooms carousel"
    >
      {/* Carousel Container - full width overflow */}
      <div 
        ref={emblaRef} 
        className="overflow-hidden -mx-6"
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        <div className="flex">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="flex-none w-screen px-4"
              role="group"
              aria-roledescription="slide"
              aria-label={`Room ${index + 1} of ${rooms.length}: ${room.title}`}
            >
              <LiveRoomCard
                room={room}
                onClick={() => onCardClick(room.id)}
                onJoinClick={(e) => {
                  e.stopPropagation();
                  if (room.isLive) onJoinRoom(room.id);
                }}
                onNotifyClick={(e) => {
                  e.stopPropagation();
                  if (!room.isLive) onNotifyClick(room.id);
                }}
                isNotifying={notifyingRooms.has(room.id)}
                isCreator={room.host.id === currentUserId}
                onEdit={onEdit ? (e) => onEdit(e, room.id) : undefined}
                onDelete={onDelete ? (e) => onDelete(e, room.id) : undefined}
                className="h-[calc(100vh-280px)] min-h-[400px] max-h-[600px]"
                shareButton={
                  <SocialShareButton
                    type="live_room"
                    data={{
                      title: room.title,
                      description: room.description || `Join ${room.host.name}'s live session`,
                      link: `${window.location.origin}/comm/live-rooms?live=${encodeURIComponent(room.id)}`
                    }}
                    variant="icon"
                    size="sm"
                    className="text-white hover:bg-white/20 hover:text-white"
                  />
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      {rooms.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-4 px-6">
          {rooms.map((_, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "rounded-full transition-all duration-200",
                index === currentIndex 
                  ? "w-6 h-2 bg-primary" 
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="text-center text-sm text-muted-foreground mt-2">
        {currentIndex + 1} of {rooms.length}
      </div>
    </div>
  );
}
