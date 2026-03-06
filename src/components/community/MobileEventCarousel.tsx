import React, { useEffect, useRef, useState } from 'react';
import { NewsCard } from '@/components/crossover/NewsCard';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { EventKebabMenu } from '@/components/events/EventKebabMenu';

const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${time}`;
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
  onDelete?: (eventId: string) => void;
  onShare?: (event: any) => void;
  emptyState?: React.ReactNode;
  initialEventId?: string;
  onSlideChange?: (eventId: string, index: number) => void;
  onRefresh?: () => Promise<any>;
}

export function MobileEventCarousel({
  events,
  onCardClick,
  currentUserId,
  onEdit,
  onDelete,
  onShare,
  emptyState,
  initialEventId,
  onSlideChange,
  onRefresh,
}: MobileEventCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // IntersectionObserver to detect which card is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container || events.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index) && index !== currentIndex) {
              setCurrentIndex(index);
              if (events[index] && onSlideChange) {
                onSlideChange(events[index].id, index);
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
  }, [events, onSlideChange, currentIndex]);

  // Scroll to initial event on mount
  useEffect(() => {
    if (!containerRef.current || !initialEventId) return;
    const index = events.findIndex(e => e.id === initialEventId);
    if (index >= 0) {
      const target = containerRef.current.querySelector(`[data-index="${index}"]`);
      target?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [initialEventId, events]);

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


  // Transform event to NewsCard props
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
      currency: event.metadata?.display_currency || 'USD',
      eventId: event.id,
      eventType: event.event_type,
      showSmartAction: true,
      hasTickets,
      isPaidEvent,
      onBuyTicket: (hasTickets || isPaidEvent) ? () => onCardClick(event) : undefined,
      onClick: () => onCardClick(event),
      'data-event-id': event.id,
      utilityTopRight: (
        <EventKebabMenu
          event={event}
          currentUserId={currentUserId}
          onEdit={onEdit ? () => onEdit(event) : undefined}
          onDelete={onDelete}
          onShare={onShare}
          className="text-white hover:bg-white/20"
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
      {/* Vertical scroll container with snap */}
      <div 
        ref={containerRef}
        className="overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{
          height: 'calc(100dvh - 282px)',
        } as React.CSSProperties}
      >
        {events.map((event, index) => (
          <div
            key={event.id}
            data-index={index}
            className={cn(
              "snap-start transition-all duration-300 ease-out",
              index !== events.length - 1 && "border-b border-border/30"
            )}
            style={{
              height: 'calc(100dvh - 282px)',
              scrollSnapStop: 'normal',
              padding: '4px 0px',
              transform: currentIndex === index ? 'scale(1)' : 'scale(0.97)',
              opacity: currentIndex === index ? 1 : 0.7,
            } as React.CSSProperties}
            role="article"
            aria-label={`Event ${index + 1} of ${events.length}: ${event.title}`}
          >
            <NewsCard
              {...transformEventToCard(event)}
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
