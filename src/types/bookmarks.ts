export type BookmarkItemType = 
  | 'supplement' 
  | 'wellness_service' 
  | 'provider' 
  | 'deal' 
  | 'lab_test' 
  | 'course' 
  | 'event' 
  | 'live_room'
  | 'music';

export interface BookmarkedItem {
  id: string;
  user_id: string;
  item_type: BookmarkItemType;
  item_id: string;
  item_name: string;
  item_image_url?: string;
  item_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BookmarkButtonItem {
  item_type: BookmarkItemType;
  item_id: string;
  item_name: string;
  item_image_url?: string;
  item_metadata?: Record<string, any>;
}
