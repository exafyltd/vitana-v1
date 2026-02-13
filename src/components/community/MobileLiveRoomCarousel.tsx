import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Radio, Loader2 } from 'lucide-react';
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
  onRefresh?: () => Promise<any>;
}

const PULL_THRESHOLD = 60;
const MAX_PULL = 80;
const RESISTANCE = 0.45;

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
  onRefresh,
}: MobileLiveRoomCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  // IntersectionObserver to detect which card is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container || rooms.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index !== currentIndex) {
              setCurrentIndex(index);
              if (rooms[index] && onSlideChange) {
                onSlideChange(rooms[index].id, index);
              }
            }
          }
        }
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    const cards = container.querySelectorAll('[data-index]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [rooms, onSlideChange, currentIndex]);

  // Scroll to initial room on mount
  useEffect(() => {
    if (!containerRef.current || !initialRoomId) return;
    const index = rooms.findIndex(r => r.id === initialRoomId);
    if (index >= 0) {
      const target = containerRef.current.querySelector(`[data-index="${index}"]`);
      target?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [initialRoomId, rooms]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        containerRef.current.scrollBy({ top: -containerRef.current.clientHeight, behavior: 'smooth' });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        containerRef.current.scrollBy({ top: containerRef.current.clientHeight, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing || !containerRef.current) return;
    if (containerRef.current.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || isRefreshing || !containerRef.current) return;
    if (containerRef.current.scrollTop > 0) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      e.preventDefault();
      const distance = Math.min(deltaY * RESISTANCE, MAX_PULL);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } catch (err) {
        console.error('Pull-to-refresh failed:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  // Attach native listeners with { passive: false } for touchmove
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

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
      role="feed" 
      aria-label="Live rooms feed"
    >
      {/* Pull-to-refresh indicator */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-background/80 backdrop-blur-xl shadow-lg border border-border/50",
          "transition-all duration-300 ease-out pointer-events-none"
        )}
        style={{
          top: 8,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
          transform: `translateX(-50%) scale(${pullDistance > 10 || isRefreshing ? 1 : 0.8})`,
        }}
      >
        <Loader2 className={cn(
          "h-4 w-4 text-primary",
          isRefreshing ? "animate-spin" : ""
        )} 
          style={{
            transform: !isRefreshing ? `rotate(${pullDistance * 4}deg)` : undefined
          }}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {isRefreshing ? 'Refreshing…' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>

      {/* Vertical scroll container with snap */}
      <div 
        ref={containerRef}
        className="overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{
          height: 'calc(100dvh - 280px)',
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isPullingRef.current ? 'none' : 'transform 0.3s ease-out',
        } as React.CSSProperties}
      >
        {rooms.map((room, index) => (
          <div
            key={room.id}
            data-index={index}
            className="snap-start transition-all duration-300 ease-out"
            style={{
              height: 'calc(100dvh - 280px)',
              scrollSnapStop: 'always',
              transform: currentIndex === index ? 'scale(1)' : 'scale(0.97)',
              opacity: currentIndex === index ? 1 : 0.7,
            } as React.CSSProperties}
            role="article"
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
              className="h-full rounded-none"
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

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
