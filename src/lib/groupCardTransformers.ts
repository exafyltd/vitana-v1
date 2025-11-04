import { UnifiedGroupCard } from "@/types/community";

// Wellness and community themed group images
const GROUP_IMAGES = [
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80", // Yoga community
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80", // Fitness group
  "https://images.unsplash.com/photo-1593811167562-9cef47bfc4a7?w=800&q=80", // Meditation group
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80", // Nutrition/cooking
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80", // Running group
  "https://images.unsplash.com/photo-1539622106114-e0df812097e6?w=800&q=80", // Pilates
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80", // Dance
  "https://images.unsplash.com/photo-1475274110913-480c45d0e873?w=800&q=80", // Hiking/nature
];

/**
 * Generate a fallback image URL for a group based on its ID
 */
export function generateGroupImage(groupId: string): string {
  const hash = groupId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % GROUP_IMAGES.length;
  return GROUP_IMAGES[index];
}

/**
 * Transform a database group record to UnifiedGroupCard
 */
export function transformDbGroupToCard(dbGroup: any): UnifiedGroupCard {
  return {
    id: dbGroup.id,
    name: dbGroup.name || dbGroup.title || "Untitled Group",
    description: dbGroup.description || "",
    category: dbGroup.category || "Community",
    image: dbGroup.image_url || generateGroupImage(dbGroup.id),
    match_score: undefined,
    member_count: dbGroup.member_count || 0,
    tags: dbGroup.tags || [],
  };
}

/**
 * Transform a group recommendation to UnifiedGroupCard
 */
export function transformGroupRecommendationToCard(recommendation: any): UnifiedGroupCard {
  const group = recommendation.group || recommendation;
  
  // Convert match_score from 0-1 to 0-100 percentage if needed
  let matchScore = recommendation.compatibility_score || recommendation.match_score;
  if (matchScore && matchScore <= 1) {
    matchScore = Math.round(matchScore * 100);
  }
  
  return {
    id: group.id,
    name: group.name || group.title || "Untitled Group",
    description: group.description || "",
    category: group.category || "Community",
    image: group.image_url || generateGroupImage(group.id),
    match_score: matchScore,
    member_count: group.member_count || 0,
    tags: group.tags || [],
  };
}
