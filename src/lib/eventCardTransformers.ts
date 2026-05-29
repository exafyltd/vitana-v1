import { UnifiedEventCard } from "@/types/community";
import { NewsCardProps } from "@/components/crossover/NewsCard";
import { formatDate } from '@/lib/locale-format';
// Wellness-themed images from Unsplash
const WELLNESS_IMAGES = [
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop', // Yoga
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop', // Yoga outdoors
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop', // Fitness group
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop', // Healthy food
  'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&h=600&fit=crop', // Meditation
  'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=800&h=600&fit=crop', // Running
  'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&h=600&fit=crop', // Pilates
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop', // Beach yoga
];

// Generate consistent fallback image based on event title
const generateEventImage = (title: string, description?: string): string => {
  const hash = (title + (description || '')).split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return WELLNESS_IMAGES[Math.abs(hash) % WELLNESS_IMAGES.length];
};

// Transform database event to unified card format
export const transformDbEventToCard = (dbEvent: any): UnifiedEventCard => {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    category: dbEvent.event_type || 'event',
    datetime: dbEvent.start_time,
    location: dbEvent.location || 'Virtual',
    image: dbEvent.image_url || generateEventImage(dbEvent.title, dbEvent.description),
    attendees: dbEvent.participant_count || 0,
    tags: dbEvent.tags || [],
    event_type: dbEvent.event_type || 'event',
    description: dbEvent.description,
    creator_display_name: dbEvent.creator_display_name,
    creator_avatar_url: dbEvent.creator_avatar_url,
  };
};

// Transform recommendation to unified card format
export const transformRecommendationToCard = (recommendation: any): UnifiedEventCard => {
  const event = recommendation.global_community_events || recommendation;
  
  return {
    id: event.id || recommendation.id,
    title: event.title || recommendation.title,
    category: event.event_type || recommendation.event_type || 'event',
    datetime: event.start_time || recommendation.start_time,
    location: event.location || recommendation.location || 'Virtual',
    image: event.image_url || recommendation.image_url || generateEventImage(event.title || recommendation.title),
    match_score: recommendation.match_score,
    attendees: event.participant_count || recommendation.participant_count || 0,
    tags: recommendation.tags || [],
    event_type: event.event_type || recommendation.event_type || 'event',
    description: event.description || recommendation.description,
    creator_display_name: event.creator_display_name || recommendation.creator_display_name,
    creator_avatar_url: event.creator_avatar_url || recommendation.creator_avatar_url,
  };
};

// Convert unified event card to NewsCard props
export const eventCardToNewsCardProps = (
  event: UnifiedEventCard,
  variant: 'full' | 'compact' | 'mini' = 'full',
  onClick?: () => void
): NewsCardProps => {
  const eventDate = new Date(event.datetime);
  const timestamp = formatDate(eventDate, 'EEE, MMM d · HH:mm');
  
  return {
    title: event.title,
    description: variant === 'full' ? event.description : undefined,
    imageUrl: event.image,
    category: 'event',
    pillar: event.event_type.toUpperCase(),
    author: event.creator_display_name ? {
      name: event.creator_display_name,
      avatar: event.creator_avatar_url,
    } : undefined,
    location: event.location,
    attendees: event.attendees,
    timestamp,
    eventId: event.id,
    eventType: event.event_type,
    showSmartAction: true,
    currency: (event as any).currency || 'USD',
    onClick,
    'data-event-id': event.id,
  };
};
