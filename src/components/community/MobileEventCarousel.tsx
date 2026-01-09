import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { NewsCard } from '@/components/crossover/NewsCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Edit, CalendarIcon } from 'lucide-react';
import SocialShareButton from '@/components/sharing/SocialShareButton';
import { getShareUrl } from '@/lib/shareUrl';

// Helper functions duplicated from parent for isolation
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
    if (events[index] && onSlideChange) {
      onSlideChange(events[index].id, index);
    }
  }, [emblaApi, events, onSlideChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Scroll to initial event if specified
  useEffect(() => {
    if (!emblaApi || !initialEventId) return;
    const index = events.findIndex(e => e.id === initialEventId);
    if (index >= 0) {
      emblaApi.scrollTo(index, false);
    }
  }, [emblaApi, initialEventId, events]);

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
      role="region" 
      aria-roledescription="carousel"
      aria-label="Events carousel"
    >
      {/* Carousel Container - full width overflow */}
      <div 
        ref={emblaRef} 
        className="overflow-hidden -mx-6"
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        <div className="flex">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="flex-none w-screen px-4"
              role="group"
              aria-roledescription="slide"
              aria-label={`Event ${index + 1} of ${events.length}: ${event.title}`}
            >
              <NewsCard
                {...transformEventToCard(event)}
                className="h-[calc(100vh-280px)] min-h-[400px] max-h-[600px]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      {events.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-4 px-6">
          {events.map((_, index) => (
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
        {currentIndex + 1} of {events.length}
      </div>
    </div>
  );
}
