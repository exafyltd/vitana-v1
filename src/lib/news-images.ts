/**
 * VTID-01900: Category-to-cover-photo mapping for longevity news feed.
 *
 * Multiple images per category for visual diversity.
 * Uses deterministic selection (hash of article ID) so the same article
 * always gets the same image, but different articles in the same category
 * get different photos.
 */

const CATEGORY_IMAGES: Record<string, string[]> = {
  supplements: [
    'https://images.unsplash.com/photo-1550572017-edd951b55104?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&h=600&fit=crop',
  ],
  nutrition: [
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800&h=600&fit=crop',
  ],
  hydration: [
    'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=800&h=600&fit=crop',
  ],
  sleep: [
    'https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1515894203077-7fe2d4e1a158?w=800&h=600&fit=crop',
  ],
  exercise: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&h=600&fit=crop',
  ],
  mental_health: [
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&h=600&fit=crop',
  ],
  functional: [
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&h=600&fit=crop',
  ],
  natural: [
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1471943311424-646960669fbc?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&h=600&fit=crop',
  ],
  longevity: [
    'https://images.unsplash.com/photo-1447005497901-b3e9ee359928?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=800&h=600&fit=crop',
  ],
  research: [
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=800&h=600&fit=crop',
  ],
  general: [
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1505576399279-0d309cb2bf73?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1486218119243-13883505764c?w=800&h=600&fit=crop',
  ],
  community_event: [
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
  ],
  media: [
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&h=600&fit=crop',
  ],
  member_spotlight: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop',
  ],
};

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1505576399279-0d309cb2bf73?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1486218119243-13883505764c?w=800&h=600&fit=crop',
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getNewsImage(tags: string[], articleId?: string): string {
  const seed = articleId || tags.join(',') + Math.random().toString();
  const hash = simpleHash(seed);
  for (const tag of tags) {
    const images = CATEGORY_IMAGES[tag];
    if (images && images.length > 0) return images[hash % images.length];
  }
  return DEFAULT_IMAGES[hash % DEFAULT_IMAGES.length];
}

export function mapTagToPillar(tags: string[]): string | undefined {
  const tagToPillar: Record<string, string> = {
    supplements: 'Nutrition', nutrition: 'Nutrition', hydration: 'Hydration',
    sleep: 'Sleep', exercise: 'Motion', mental_health: 'Mental',
    functional: 'Mental', natural: 'Nutrition', general: 'Community',
    community_event: 'Community', media: 'Community', member_spotlight: 'Community',
  };
  for (const tag of tags) { if (tagToPillar[tag]) return tagToPillar[tag]; }
  return undefined;
}
