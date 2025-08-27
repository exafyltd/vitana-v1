export interface VitanaIndexTier {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

export const VITANA_INDEX_TIERS: VitanaIndexTier[] = [
  {
    min: 0,
    max: 99,
    label: "Very Poor",
    color: "#FEE2E2", // Pastel red
    description: "Significant wellness concerns across multiple areas"
  },
  {
    min: 100,
    max: 299,
    label: "Poor", 
    color: "#FDE68A", // Red-orange to yellow
    description: "Below optimal wellness with room for improvement"
  },
  {
    min: 300,
    max: 499,
    label: "Fair",
    color: "#FFEFB3", // Yellow to darker blue
    description: "Moderate wellness with some positive indicators"
  },
  {
    min: 500,
    max: 699,
    label: "Improving",
    color: "#D9F99D", // Yellow to darker blue (green tint)
    description: "Good progress toward optimal wellness"
  },
  {
    min: 700,
    max: 849,
    label: "Good",
    color: "#BBF7D0", // Blue + light green (turquoise)
    description: "Strong overall wellness across most areas"
  },
  {
    min: 850,
    max: 999,
    label: "Excellent", 
    color: "#BAE6FD", // Turquoise to purple (light blue)
    description: "Exceptional wellness optimization achieved"
  }
];

export function getVitanaIndexTier(score: number): VitanaIndexTier {
  return VITANA_INDEX_TIERS.find(tier => score >= tier.min && score <= tier.max) || VITANA_INDEX_TIERS[0];
}

export function getVitanaIndexPercentage(score: number): number {
  return Math.round((score / 999) * 100);
}

export function formatVitanaIndexScore(score: number): string {
  return score.toString().padStart(3, '0');
}