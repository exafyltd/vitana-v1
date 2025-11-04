export interface UnifiedEventCard {
  id: string;
  title: string;
  category: string;
  datetime: string;
  location: string;
  image: string;
  match_score?: number;
  attendees: number;
  tags: string[];
  event_type: string;
  description?: string;
  creator_display_name?: string;
  creator_avatar_url?: string;
}

export interface UnifiedGroupCard {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  match_score?: number;
  member_count: number;
  tags: string[];
}
