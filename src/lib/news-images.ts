/**
 * VTID-01900: Cover photos for longevity news feed.
 *
 * Content-matched image selection:
 * 1. If article has its own RSS image_url → use that (real article image)
 * 2. Otherwise, pick a photo from the category pool that matches the
 *    article's tags — supplement articles get supplement photos,
 *    sleep articles get sleep photos, etc.
 *
 * Each category has 8-12 images for visual diversity within-category.
 * Article ID hash picks deterministically from the category pool.
 */

// Category-specific image pools. Keywords matched via tags or title/summary scan.
const CATEGORY_POOLS: Record<string, string[]> = {
  // Supplements, NMN, rapamycin, vitamins, pills
  supplements: [
    'https://images.unsplash.com/photo-1550572017-edd951b55104?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1626516499503-83876c2327e3?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584308074802-c0e09d7c8e4d?w=800&h=500&fit=crop&q=80',
  ],

  // Nutrition, food, healthy eating, diet
  nutrition: [
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&h=500&fit=crop&q=80',
  ],

  // Exercise, fitness, workout, running
  exercise: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=500&fit=crop&q=80',
  ],

  // Mental health, meditation, mindfulness, stress
  mental_health: [
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1474418397713-2f1091953b29?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593811167562-9cef47bfc4a7?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop&q=80',
  ],

  // Functional/cellular (mitochondria, autophagy, telomeres, senolytics)
  functional: [
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1554475901-4538ddfbccc2?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=800&h=500&fit=crop&q=80',
  ],

  // Natural/botanical (herbs, polyphenols, plants, tea)
  natural: [
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1471943311424-646960669fbc?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1612540943977-98e9e24013fd?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800&h=500&fit=crop&q=80',
  ],

  // Sleep, rest, relaxation
  sleep: [
    'https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515894203077-7fe2d4e1a158?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542728928-1413d1894ed1?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=500&fit=crop&q=80',
  ],

  // Water, hydration
  hydration: [
    'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&h=500&fit=crop&q=80',
  ],

  // Research, lab, science, medical
  research: [
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1631815587646-b85a1bb027e1?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&h=500&fit=crop&q=80',
  ],

  // Longevity, healthy aging, elderly vitality
  longevity: [
    'https://images.unsplash.com/photo-1447005497901-b3e9ee359928?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1478144592103-25e218a04891?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&h=500&fit=crop&q=80',
  ],

  // Community events
  community_event: [
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800&h=500&fit=crop&q=80',
  ],

  // Media / content
  media: [
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&h=500&fit=crop&q=80',
  ],

  // Member spotlight
  member_spotlight: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=500&fit=crop&q=80',
  ],

  // Fallback / general wellness
  general: [
    'https://images.unsplash.com/photo-1505576399279-0d309cb2bf73?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1486218119243-13883505764c?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&h=500&fit=crop&q=80',
    'https://images.unsplash.com/photo-1501261379837-c3b516327829?w=800&h=500&fit=crop&q=80',
  ],
};

// Keyword-based refinement: scan title/summary for specific words to pick
// a more precise category than the auto-tag gave us.
const KEYWORD_CATEGORIES: Array<[string[], string]> = [
  // Specific keywords override broad tags
  [['sleep', 'schlaf', 'insomnia', 'circadian', 'melatonin'], 'sleep'],
  [['water', 'wasser', 'hydration', 'hydrat'], 'hydration'],
  [['exercise', 'workout', 'running', 'lauf', 'sport', 'fitness', 'training', 'cardio', 'strength'], 'exercise'],
  [['meditation', 'mindfulness', 'achtsamkeit', 'stress', 'anxiety', 'depression', 'mental', 'psyche', 'therapy', 'therap'], 'mental_health'],
  [['mitochondria', 'autophagy', 'telomere', 'senolytic', 'sirtuin', 'mitochondrien', 'zellalterung'], 'functional'],
  [['nmn', 'nad', 'resveratrol', 'rapamycin', 'fisetin', 'quercetin', 'spermidine', 'berberine', 'metformin', 'supplement', 'nahrungsergänzung', 'vitamin'], 'supplements'],
  [['polyphenol', 'flavonoid', 'curcumin', 'egcg', 'herb', 'plant', 'heilpflanze', 'phyto', 'tea', 'tee'], 'natural'],
  [['nutrition', 'diet', 'ernährung', 'food', 'fasting', 'fasten', 'meal', 'eating'], 'nutrition'],
  [['longevity', 'aging', 'lifespan', 'healthspan', 'alter', 'langlebig'], 'longevity'],
  [['study', 'research', 'trial', 'studie', 'forschung', 'clinical', 'klinisch', 'dna', 'gene', 'genom'], 'research'],
];

/**
 * Pick the best content category for an article by scanning its text
 * for specific keywords. Falls back to first tag, then to 'general'.
 */
function pickCategory(tags: string[], title: string, summary: string | null): string {
  const text = `${title} ${summary || ''}`.toLowerCase();

  // First: check for specific keywords in title/summary
  for (const [keywords, category] of KEYWORD_CATEGORIES) {
    for (const kw of keywords) {
      if (text.includes(kw)) return category;
    }
  }

  // Second: use the first tag that has a pool
  for (const tag of tags) {
    if (CATEGORY_POOLS[tag]) return tag;
  }

  // Fallback
  return 'general';
}

/**
 * FNV-1a hash — well-distributed for UUID-like strings.
 */
function fnvHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Get a content-matched cover image for an article.
 *
 * Strategy:
 * 1. Extract the article's best content category from title/summary keywords
 * 2. Pick from that category's image pool via article ID hash
 *
 * This guarantees:
 * - Sleep articles get sleep photos
 * - Supplement articles get supplement photos
 * - Exercise articles get fitness photos
 * - etc.
 *
 * Within each category, different articles get different photos
 * (visual diversity without losing content relevance).
 */
export function getNewsImage(
  tags: string[],
  articleId?: string,
  title?: string,
  summary?: string | null
): string {
  const category = pickCategory(tags, title || '', summary || null);
  const pool = CATEGORY_POOLS[category] || CATEGORY_POOLS.general;
  const seed = articleId || tags.join(',') + String(Math.random());
  return pool[fnvHash(seed) % pool.length];
}

export type LongevityPillar = 'Nutrition' | 'Hydration' | 'Sleep' | 'Exercise' | 'Mental';

const CATEGORY_TO_PILLAR: Record<string, string> = {
  supplements: 'Nutrition', nutrition: 'Nutrition', natural: 'Nutrition',
  hydration: 'Hydration',
  sleep: 'Sleep',
  exercise: 'Exercise',
  mental_health: 'Mental', functional: 'Mental',
  longevity: 'Nutrition', research: 'Mental', general: 'Nutrition',
  community_event: 'Community', media: 'Community', member_spotlight: 'Community',
};

export function mapTagToPillar(tags: string[]): string | undefined {
  for (const tag of tags) { if (CATEGORY_TO_PILLAR[tag]) return CATEGORY_TO_PILLAR[tag]; }
  return undefined;
}

/**
 * Determine the correct longevity pillar by scanning the article's
 * title + summary for domain keywords (same logic as image selection).
 * Falls back to raw tag mapping if no keyword matches.
 */
export function getArticlePillar(
  tags: string[],
  title?: string,
  summary?: string | null
): string | undefined {
  const category = pickCategory(tags, title || '', summary || null);
  return CATEGORY_TO_PILLAR[category] || mapTagToPillar(tags);
}

export const LONGEVITY_PILLARS: LongevityPillar[] = [
  'Nutrition', 'Hydration', 'Sleep', 'Exercise', 'Mental',
];

