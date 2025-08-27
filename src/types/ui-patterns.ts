/**
 * Type definitions for UI pattern enforcement
 */

export interface CommunityHeaderPattern {
  /** Page title displayed in welcome card */
  title: string;
  /** Page description displayed in welcome card */
  description: string;
  /** Optional emoji for the title */
  emoji?: string;
}

export interface PatternValidation {
  /** Pattern identifier */
  patternId: string;
  /** Whether the pattern is correctly implemented */
  isValid: boolean;
  /** Validation errors if any */
  errors?: string[];
  /** Suggestions for fixes */
  suggestions?: string[];
}

// Enforce Community header pattern at compile time
export type CommunityPageProps = {
  /** Must include header pattern props */
  headerPattern: CommunityHeaderPattern;
  /** Additional page-specific props */
  [key: string]: any;
};

// Pattern registry for documentation
export const UI_PATTERNS = {
  COMMUNITY_HEADER_3_CARD: 'community-header-3-card',
  CROSSOVER_CARD_LAYOUT: 'crossover-card-layout',
  AUTOPILOT_INTEGRATION: 'autopilot-integration'
} as const;

export type UIPatternId = typeof UI_PATTERNS[keyof typeof UI_PATTERNS];