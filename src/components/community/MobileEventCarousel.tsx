import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NewsCard } from '@/components/crossover/NewsCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Edit, CalendarIcon } from 'lucide-react';
import SocialShareButton from '@/components/sharing/SocialShareButton';
import { getShareUrl } from '@/lib/shareUrl';

/**
 * Height consumed by mobile chrome: tenant header + search/calendar/create bar
 * + Today/Upcoming tabs + bottom nav.
 * Measured: ~56 + 48 + 44 + 64 = 212px  (round to 216 for breathing room)
 */
const CHROME_HEIGHT_PX = 216;

const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
};

const sanitizeUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  const s = String(url).trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();
  
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('about:') ||
    lower.includes('undefined') ||
    s.startsWith('/api/placeholder')
  ) {
    return undefined;
  }
  
  const isHttp = /^https?:\/\//i.test(s);
  const isAsset = s.startsWith('/assets/');
  const isSupabaseStorage = lower.includes('.supabase.co/storage/');
  const isDataImage = lower.startsWith('data:image/');
  const isBlob = lower.startsWith('blob:');
  
  if (isHttp || isAsset || isSupabaseStorage || isDataImage || isBlob) {
    return s;
  }
  
  return undefined;
};

const generateImageUrl = (title: string, description?: string): string => {
  const images = [
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop',
  ];
  const hash = (title + (description || '')).split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return images[Math.abs(hash) % images.length];
};

interface MobileEventCarouselProps {
  events: any[];
  onCardClick: (event: any) => void;
  currentUserId?: string;
  onEdit?: (event: any) => void;
  emptyState?: React.ReactNode;
  initialEventId?: string;
  onSlideChange?: (eventId: string, index: number) => void;
}

export function MobileEventCarousel({
  events,
  onCardClick,
  currentUserId,
  onEdit,
  emptyState,
  initialEventId,
  onSlideChange,
}: MobileEventCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set([0]));

  // IntersectionObserver — track active card + visible set for scale animation
  useEffect(() => {
    const container = containerRef.current;
    if (!container || events.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const nextVisible = new Set(visibleSet);
        for (const entry of entries) {
          const idx = Number(entry.target.getAttribute('data-index'));
          if (isNaN(idx)) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            nextVisible.add(idx);
            if (idx !== currentIndex) {
              setCurrentIndex(idx);
              if (events[idx] && onSlideChange) {
                onSlideChange(events[idx].id, idx);
              }
            }
          } else {
            nextVisible.delete(idx);
          }
        }
        setVisibleSet(nextVisible);
      },
      {
        root: container,
        threshold: [0.1, 0.6],
      }
    );

    const cards = container.querySelectorAll('[data-index]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [events, onSlideChange, currentIndex, visibleSet]);

  // Scroll to initial event on mount
  useEffect(() => {
    if (!containerRef.current || !initialEventId) return;
    const index = events.findIndex(e => e.id === initialEventId);
    if (index >= 0) {
      const target = containerRef.current.querySelector(`[data-index="${index}"]`);
      target?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [initialEventId, events]);

  // Keyboard navigation (ArrowUp / ArrowDown)
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

  // Transform event to NewsCard props (unchanged)
  const transformEventToCard = (event: any) => {
    const authorName = event.creator_display_name || event.author?.name || 'Community Host';
    const authorAvatar = event.creator_avatar_url || event.author?.avatar || '';
    
    const rawImage = event.image_url || event.imageUrl || event.metadata?.image_url || event.metadata?.cover_image_url;
    const safeImage = sanitizeUrl(rawImage);
    const imageUrl = safeImage ?? generateImageUrl(event.title, event.description);
    
    const hasTickets = event.metadata?.has_tickets === true;
    const isPaidEvent = event.metadata?.is_paid === true;
    const canEdit = !!currentUserId && 
      (event.created_by === currentUserId || event.is_co_creator === true) && 
      new Date(event.start_time) > new Date();

    return {
      title: event.title,
      description: event.description,
      imageUrl: imageUrl,
      category: 'event' as const,
      pillar: event.event_type === 'event' ? 'EVENT' : 'MEETUP',
      author: { name: authorName, avatar: authorAvatar },
      location: event.location,
      attendees: event.participant_count || 0,
      timestamp: formatEventTime(event.start_time),
      price: event.metadata?.is_paid ? Number(event.metadata?.price || 0) : ('free' as const),
      eventId: event.id,
      showSmartAction: true,
      hasTickets,
      isPaidEvent,
      onBuyTicket: (hasTickets || isPaidEvent) ? () => onCardClick(event) : undefined,
      onClick: () => onCardClick(event),
      'data-event-id': event.id,
      utilityTopRight: canEdit && onEdit ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(event);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
      ) : undefined,
      actionButton: (
        <SocialShareButton
          type="event"
          data={{
            id: event.id,
            title: event.title,
            description: event.description,
            image_url: imageUrl,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            link: getShareUrl('event', event.id, { 
              utm_source: 'event_card', 
              utm_medium: 'social',
              utm_campaign: 'events_meetups_v2',
              slug: event.slug
            })
          }}
          variant="icon"
          size="sm"
        />
      ),
    };
  };

  // Empty state
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        {emptyState || (
          <div className="text-center">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Events</h3>
            <p className="text-muted-foreground">Check back soon for upcoming events!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="relative w-full" 
      role="feed" 
      aria-label="Events feed"
    >
      {/* Vertical snap-scroll container — sole scrolling surface */}
      <div 
        ref={containerRef}
        className="overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{
          height: `calc(100dvh - ${CHROME_HEIGHT_PX}px)`,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {events.map((event, index) => {
          const isActive = visibleSet.has(index);
          const isLast = index === events.length - 1;

          return (
            <div
              key={event.id}
              data-index={index}
              className="flex items-center justify-center"
              style={{
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                minHeight: `calc(100dvh - ${CHROME_HEIGHT_PX}px)`,
                padding: `14px 14px calc(14px + env(safe-area-inset-bottom))`,
              }}
              role="article"
              aria-label={`Event ${index + 1} of ${events.length}: ${event.title}`}
            >
              <div
                className="w-full max-w-[520px] overflow-hidden transition-transform duration-300 ease-out"
                style={{
                  borderRadius: 24,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.10)',
                  background: 'hsl(var(--card))',
                  transform: isActive ? 'scale(1)' : 'scale(0.97)',
                }}
              >
                <NewsCard
                  {...transformEventToCard(event)}
                  className="h-full"
                />
              </div>

              {/* Pagination hint — shows a subtle line when more cards below */}
              {!isLast && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-muted-foreground/20" />
              )}
            </div>
          );
        })}
      </div>

      {/* Floating counter */}
      {events.length > 1 && (
        <div className="absolute bottom-3 right-4 bg-background/80 backdrop-blur-sm text-xs text-muted-foreground px-2.5 py-1 rounded-full border border-border/50 z-10">
          {currentIndex + 1} / {events.length}
        </div>
      )}

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
