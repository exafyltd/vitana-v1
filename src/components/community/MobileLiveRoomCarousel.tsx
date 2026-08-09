import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Radio } from 'lucide-react';
import { type LiveRoom } from '@/components/liverooms/LiveRoomCard';
import { formatDuration } from '@/components/liverooms/liveRoomFormat';
import { NewsCard } from '@/components/crossover/NewsCard';
import { Button } from '@/components/ui/button';
import { Bell, Pencil, Trash2 } from 'lucide-react';
import SocialShareButton from '@/components/sharing/SocialShareButton';
import { KebabMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu-kebab';
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
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

// Wellness-themed fallback images
const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&h=600&fit=crop',
];

const generateRoomImage = (title: string): string => {
  const hash = title.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return ROOM_IMAGES[Math.abs(hash) % ROOM_IMAGES.length];
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Relative "when" label for a scheduled session. Rules:
 *   - today            → "Heute 20.00h"
 *   - tomorrow         → "Morgen 20.00h"
 *   - within 7 days    → "Di 09 Aug 20.00h"   (weekday + day + month)
 *   - more than 7 days → "27 Aug 20.00h"      (day + month, no weekday)
 * Weekday/month names and the locale come from formatDate; the literal "h"
 * time suffix matches the requested "20.00h" style.
 */
function formatRoomWhen(scheduledISO: string): string {
  const d = new Date(scheduledISO);
  const time = `${formatDate(d, 'HH.mm')}h`;
  const dayDiff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86_400_000);

  if (dayDiff <= 0) return t('screens.liverooms.whenToday', { time });
  if (dayDiff === 1) return t('screens.liverooms.whenTomorrow', { time });
  const date = dayDiff <= 7 ? formatDate(d, 'EEE dd MMM') : formatDate(d, 'dd MMM');
  return t('screens.liverooms.whenDated', { date, time });
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // Transform room to NewsCard props
  const transformRoomToCard = (room: LiveRoom) => {
    const isCreator = room.host.id === currentUserId;
    const imageUrl = room.imageUrl || generateRoomImage(room.title);
    // Time + duration shown at the BOTTOM of the card. Scheduled cards show a
    // relative date/time (e.g. "Heute 20.00h"); live cards show when the
    // session started. Both append the planned duration when it's known.
    const durationLabel = formatDuration(room.durationMinutes);
    let whenLabel: string | undefined;
    if (room.isLive) {
      const startIso = room.startedAt || room.scheduledTime;
      const startLabel = startIso
        ? t('screens.liverooms.timeChip', { time: formatDate(new Date(startIso), 'HH:mm') })
        : undefined;
      whenLabel = [startLabel, durationLabel].filter(Boolean).join(' · ') || undefined;
    } else if (room.scheduledTime) {
      const base = formatRoomWhen(room.scheduledTime);
      whenLabel = durationLabel ? `${base} · ${durationLabel}` : base;
    }

    const actionButton = room.isLive ? (
      <Button
        size="sm"
        className="rounded-full bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] text-white border-0 hover:shadow-lg font-bold"
        onClick={(e) => {
          e.stopPropagation();
          onJoinRoom(room.id);
        }}
      >
        {isCreator ? t('screens.liverooms.manage') : t('screens.liverooms.join')}
      </Button>
    ) : room.scheduledTime ? (
      <Button
        size="sm"
        variant={notifyingRooms.has(room.id) ? 'secondary' : 'ghost'}
        className={cn(
          'rounded-full gap-1.5 font-bold',
          !notifyingRooms.has(room.id) && 'text-white hover:bg-white/20 hover:text-white'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onNotifyClick(room.id);
        }}
      >
        <Bell className={cn('w-4 h-4', notifyingRooms.has(room.id) && 'fill-current')} />
        {notifyingRooms.has(room.id) ? t('screens.liverooms.notifying') : t('screens.liverooms.notifyMe')}
      </Button>
    ) : undefined;

    return {
      title: room.title,
      description: room.description,
      imageUrl,
      category: 'community' as const,
      pillar: room.isLive ? t('screens.liverooms.live') : undefined,
      author: { name: room.host.name, avatar: room.host.avatar },
      location: room.location ? t('screens.liverooms.virtual') : undefined,
      // Scheduled cards count people who tapped Notify ("going"); live cards show viewers.
      attendees: room.isLive ? room.participants : (room.interestedCount ?? 0),
      whenLabel,
      price: room.isPremium ? (room.isPremium as any) : ('free' as const),
      onClick: () => onCardClick(room.id),
      actionButton,
      utilityTopRight: (
        <div className="flex items-center gap-1">
          <SocialShareButton
            type="live_room"
            data={{
              title: room.title,
              description: room.description || `Join ${room.host.name}'s live session`,
              link: `${window.location.origin}/comm/live-rooms?live=${encodeURIComponent(room.id)}`
            }}
            variant="icon"
            size="sm"
          />
          {isCreator && (
            <KebabMenu className="bg-transparent hover:bg-white/20 text-white">
              <DropdownMenuItem
                onSelect={(e) => {
                  onEdit?.(e as any, room.id);
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                {t('screens.community.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  onDelete?.(e as any, room.id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('screens.community.delete')}
              </DropdownMenuItem>
            </KebabMenu>
          )}
        </div>
      ),
    };
  };

  // Empty state
  if (rooms.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        {emptyState || (
          <div className="text-center">
            <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t('screens.community.noLiveRooms')}</h3>
            <p className="text-muted-foreground">{t('screens.community.checkBackSoonGoLiveYourself')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="relative w-full" 
      role="feed" 
      aria-label={t('screens.community.liveRoomsFeed')}
    >
      {/* Vertical scroll container with snap */}
      <div 
        ref={containerRef}
        className="overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{
          height: 'calc(100dvh - 190px)',
        } as React.CSSProperties}
      >
        {rooms.map((room, index) => (
          <div
            key={room.id}
            data-index={index}
            className={cn(
              "snap-start transition-all duration-300 ease-out",
              index < rooms.length - 1 && "border-b border-border/30"
            )}
            style={{
              height: 'calc(100dvh - 190px)',
              scrollSnapStop: 'normal',
              padding: '4px 0px',
              transform: currentIndex === index ? 'scale(1)' : 'scale(0.97)',
              opacity: currentIndex === index ? 1 : 0.7,
            } as React.CSSProperties}
            role="article"
            aria-label={`Room ${index + 1} of ${rooms.length}: ${room.title}`}
          >
            <NewsCard
              {...transformRoomToCard(room)}
              className="h-full rounded-[26px] ring-1 ring-black/5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
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
