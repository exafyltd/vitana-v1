export interface ShareableContent {
  type: "group" | "event" | "meetup" | "live_room" | "profile" | "post" | "service" | "music";
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  url?: string;
  slug?: string;
}
