import { formatDate } from '@/lib/locale-format';
export interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  virtual_link: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  participant_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  is_co_creator?: boolean;
  creator_display_name?: string;
  creator_avatar_url?: string;
}

export interface UIEvent {
  id: string;
  title: string;
  time: string;
  date?: string;
  location?: string;
  attendees?: number;
  type?: string;
  pillar?: string;
  imageUrl?: string;
  description?: string;
}

// Map event types to wellness pillars
export const eventTypeToPillar = (eventType: string): string => {
  const mapping: Record<string, string> = {
    'event': 'Mental',
    'meetup': 'Mental',
    'fitness': 'Movement',
    'meditation': 'Mental',
    'yoga': 'Movement',
    'nutrition': 'Nutrition',
    'sleep': 'Sleep',
    'social': 'Mental',
    'wellness': 'Mental',
  };
  return mapping[eventType.toLowerCase()] || 'Mental';
};

// Transform database event to UI format
export const transformCommunityEvent = (event: CommunityEvent): UIEvent => {
  return {
    id: event.id,
    title: event.title,
    time: formatDate(new Date(event.start_time), 'HH:mm'),
    date: formatDate(new Date(event.start_time), 'MMM dd'),
    location: event.location || 'Virtual',
    attendees: event.participant_count,
    type: event.event_type,
    pillar: eventTypeToPillar(event.event_type),
    imageUrl: event.image_url,
    description: event.description || undefined,
  };
};

// Blend real events with mock fallbacks
export const blendEventsWithFallback = (
  realEvents: UIEvent[],
  mockEvents: UIEvent[],
  maxCount: number
): UIEvent[] => {
  const blended = [...realEvents];
  
  // Fill with mock events if we don't have enough real ones
  if (blended.length < maxCount) {
    const needed = maxCount - blended.length;
    blended.push(...mockEvents.slice(0, needed));
  }
  
  return blended.slice(0, maxCount);
};
