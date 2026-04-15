/**
 * VTID-01900: Category-to-cover-photo mapping for longevity news feed.
 *
 * RSS feeds don't always include images. This maps article tags to curated
 * high-quality Unsplash photos so every news card has a cover image.
 */

export const NEWS_CATEGORY_IMAGES: Record<string, string> = {
  supplements:
    'https://images.unsplash.com/photo-1550572017-edd951b55104?w=800&h=600&fit=crop',
  nutrition:
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop',
  hydration:
    'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&h=600&fit=crop',
  sleep:
    'https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop',
  exercise:
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop',
  functional:
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=600&fit=crop',
  natural:
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=600&fit=crop',
  longevity:
    'https://images.unsplash.com/photo-1447005497901-b3e9ee359928?w=800&h=600&fit=crop',
  research:
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop',
  general:
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
  community_event:
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
  media:
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=600&fit=crop',
  member_spotlight:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop',
  default:
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
};

/**
 * Get the best cover image URL for an article based on its tags.
 * Falls through the tag list and returns the first match, or the default.
 */
export function getNewsImage(tags: string[]): string {
  for (const tag of tags) {
    if (NEWS_CATEGORY_IMAGES[tag]) return NEWS_CATEGORY_IMAGES[tag];
  }
  return NEWS_CATEGORY_IMAGES.default;
}

/**
 * Map a tag group to a NewsCard-compatible pillar string.
 */
export function mapTagToPillar(tags: string[]): string | undefined {
  const tagToPillar: Record<string, string> = {
    supplements: 'Nutrition',
    nutrition: 'Nutrition',
    hydration: 'Hydration',
    sleep: 'Sleep',
    exercise: 'Motion',
    functional: 'Mental',
    natural: 'Nutrition',
    general: 'Community',
    community_event: 'Community',
    media: 'Community',
    member_spotlight: 'Community',
  };

  for (const tag of tags) {
    if (tagToPillar[tag]) return tagToPillar[tag];
  }
  return undefined;
}
