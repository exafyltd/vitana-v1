/**
 * Unified Layout System Types - CTO Approved Schema
 * Implements card envelope contract for deterministic, multi-tenant layout
 */

export type CardType = "news" | "action" | "info" | "media" | "stat" | "session" | "profile" | "advisory";
export type PillarType = "nutrition" | "hydration" | "exercise" | "sleep" | "mental" | null;
export type CardSizeHint = { cols: 1 | 2 | 3 | 4 | 6 | 12; height: "sm" | "md" | "lg" | "xl" };
export type AspectHint = "16:9" | "1:1" | "3:4" | "auto";
export type CTAType = "join" | "book" | "listen" | "watch" | "open" | "complete" | "track";

export interface CardEnvelope {
  /** Unique identifier for this card instance */
  id: string;
  
  /** Card type determines rendering logic and behavior */
  type: CardType;
  
  /** Health pillar categorization (null for non-health cards) */
  pillar: PillarType;
  
  /** Layout sizing hints (can be overridden by row balancer) */
  size_hint: CardSizeHint;
  
  /** Aspect ratio hint for media content */
  aspect_hint: AspectHint;
  
  /** Priority affects placement order (0-100, higher = more prominent) */
  priority: number;
  
  /** Freshness timestamp for ordering and caching */
  freshness_ts: string;
  
  /** Interactive behavior configuration */
  interactive: {
    /** Primary call-to-action type */
    cta: CTAType;
    /** Whether this card should show autopilot integration */
    autopilot: boolean;
  };
  
  /** RBAC and consent permissions */
  permissions: {
    /** Required user roles */
    role: string[];
    /** Required consent flags for HIPAA/GDPR compliance */
    consent: string[];
  };
  
  /** Multi-tenant theming key */
  tenant_theme_key: string;
  
  /** Accessibility metadata */
  a11y: {
    alt?: string;
    aria?: string;
  };
  
  /** Analytics and A/B testing metadata */
  tracking: {
    impression_key: string;
    experiment?: string;
  };
  
  /** Reference to actual content */
  content_ref: {
    kind: string;
    id: string;
  };
}

export interface LayoutConfig {
  /** Deterministic placement seed for SSR consistency */
  placement_seed: string;
  
  /** Maximum cards per row (responsive breakpoint dependent) */
  max_cards_per_row: number;
  
  /** Pillar distribution constraint (ensure all pillars appear within N rows) */
  pillar_cycle_rows: number;
  
  /** Enable content type alternation (prevent adjacent media cards) */
  type_alternation: boolean;
}

export interface RowPattern {
  /** Pattern identifier for analytics */
  pattern_id: string;
  
  /** Card arrangements in this row */
  cards: Array<{
    /** Column span (1-12) */
    cols: number;
    /** Row span in row-units */
    rows: number;
    /** Card envelope data */
    envelope: CardEnvelope;
  }>;
}

export interface UnifiedLayoutProps {
  /** Array of card envelopes to render */
  cards: CardEnvelope[];
  
  /** Layout configuration */
  config: LayoutConfig;
  
  /** Responsive breakpoint override */
  breakpoint?: "sm" | "md" | "lg" | "xl";
  
  /** Custom className for container */
  className?: string;
  
  /** Row windowing for performance (virtual scrolling) */
  windowConfig?: {
    enabled: boolean;
    rows_per_window: number;
    buffer_rows: number;
  };
}

// Row-unit height system for consistent sizing
export const ROW_HEIGHTS = {
  sm: 2, // 2 row units (~200px)
  md: 3, // 3 row units (~280px) 
  lg: 4, // 4 row units (~360px)
  xl: 5  // 5 row units (~440px)
} as const;

// Responsive column mapping
export const RESPONSIVE_COLS = {
  sm: { 12: 12, 6: 12, 4: 12, 3: 12, 2: 12, 1: 12 }, // Single column on mobile
  md: { 12: 6, 6: 6, 4: 6, 3: 6, 2: 6, 1: 6 },        // 6-col system on tablet  
  lg: { 12: 12, 6: 6, 4: 4, 3: 3, 2: 2, 1: 1 },       // Native 12-col on desktop
  xl: { 12: 12, 6: 6, 4: 4, 3: 3, 2: 2, 1: 1 }        // Native 12-col on wide
} as const;

// Card type constraints for layout balancing
export const CARD_CONSTRAINTS = {
  news: { min_cols: 2, max_cols: 6, preferred_height: "lg" },
  action: { min_cols: 1, max_cols: 3, preferred_height: "sm" },
  info: { min_cols: 2, max_cols: 4, preferred_height: "md" },
  media: { min_cols: 2, max_cols: 4, preferred_height: "lg" },
  stat: { min_cols: 1, max_cols: 2, preferred_height: "sm" },
  session: { min_cols: 2, max_cols: 6, preferred_height: "lg" },
  profile: { min_cols: 3, max_cols: 6, preferred_height: "xl" },
  advisory: { min_cols: 2, max_cols: 4, preferred_height: "md" }
} as const;