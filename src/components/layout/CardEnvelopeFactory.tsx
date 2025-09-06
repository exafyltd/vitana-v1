import { CardEnvelope, CardType, PillarType } from '@/types/unified-layout';

/**
 * Card Envelope Factory - Creates standardized card envelopes from legacy data
 * 
 * Bridges existing card data structures to new unified envelope format.
 * Implements CTO-approved card envelope schema for consistent data flow.
 */

interface LegacyCardData {
  id?: string;
  type?: string;
  pillar?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  author?: any;
  location?: string;
  attendees?: number;
  timestamp?: string;
  priority?: number;
}

export class CardEnvelopeFactory {
  
  /**
   * Create News Card Envelope
   */
  static createNewsCardEnvelope(data: LegacyCardData): CardEnvelope {
    return {
      id: data.id || `news-${Date.now()}-${Math.random()}`,
      type: "news",
      pillar: mapPillar(data.pillar),
      size_hint: {
        cols: 4,
        height: "lg"
      },
      aspect_hint: "16:9",
      priority: data.priority || 50,
      freshness_ts: new Date().toISOString(),
      interactive: {
        cta: "open",
        autopilot: false
      },
      permissions: {
        role: ["community", "patient", "professional", "staff", "admin"],
        consent: []
      },
      tenant_theme_key: "maxina", // Default - should come from tenant context
      a11y: {
        alt: data.description || data.title,
        aria: `News card: ${data.title}`
      },
      tracking: {
        impression_key: `news-impression-${data.id}`,
        experiment: "unified_layout_v1"
      },
      content_ref: {
        kind: "event",
        id: data.id || "unknown"
      }
    };
  }
  
  /**
   * Create Action Card Envelope
   */
  static createActionCardEnvelope(data: Partial<LegacyCardData> = {}): CardEnvelope {
    return {
      id: data.id || `action-${Date.now()}-${Math.random()}`,
      type: "action",
      pillar: mapPillar(data.pillar),
      size_hint: {
        cols: 2,
        height: "sm"
      },
      aspect_hint: "1:1",
      priority: data.priority || 80,
      freshness_ts: new Date().toISOString(),
      interactive: {
        cta: "complete",
        autopilot: true
      },
      permissions: {
        role: ["patient", "community"],
        consent: ["share_health"]
      },
      tenant_theme_key: "maxina",
      a11y: {
        alt: "AutoPilot action card",
        aria: "Interactive health action recommendation"
      },
      tracking: {
        impression_key: `action-impression-${data.id}`,
        experiment: "unified_layout_v1"
      },
      content_ref: {
        kind: "autopilot-action",
        id: data.id || "default-action"
      }
    };
  }
  
  /**
   * Create Lifestyle Plan Card Envelope
   */
  static createLifestylePlanCardEnvelope(pillar: PillarType): CardEnvelope {
    return {
      id: `lifestyle-${pillar}-${Date.now()}`,
      type: "info",
      pillar: pillar,
      size_hint: {
        cols: 3,
        height: "md"
      },
      aspect_hint: "3:4",
      priority: 60,
      freshness_ts: new Date().toISOString(),
      interactive: {
        cta: "track",
        autopilot: true
      },
      permissions: {
        role: ["patient", "community"],
        consent: ["share_health"]
      },
      tenant_theme_key: "maxina",
      a11y: {
        alt: `${pillar} lifestyle plan card`,
        aria: `Health tracking card for ${pillar}`
      },
      tracking: {
        impression_key: `lifestyle-${pillar}-impression`,
        experiment: "unified_layout_v1"
      },
      content_ref: {
        kind: "lifestyle-plan",
        id: pillar || "general"
      }
    };
  }
  
  /**
   * Create Media Card Envelope (Podcast, Music, Video)
   */
  static createMediaCardEnvelope(mediaType: "podcast" | "music" | "video", data: Partial<LegacyCardData> = {}): CardEnvelope {
    return {
      id: data.id || `media-${mediaType}-${Date.now()}`,
      type: "media",
      pillar: mapPillar(data.pillar) || "mental", // Default media to mental health
      size_hint: {
        cols: mediaType === "video" ? 4 : 2,
        height: mediaType === "video" ? "lg" : "md"
      },
      aspect_hint: mediaType === "video" ? "16:9" : "1:1",
      priority: data.priority || 40,
      freshness_ts: new Date().toISOString(),
      interactive: {
        cta: mediaType === "podcast" ? "listen" : mediaType === "music" ? "listen" : "watch",
        autopilot: false
      },
      permissions: {
        role: ["community", "patient", "professional", "staff", "admin"],
        consent: []
      },
      tenant_theme_key: "maxina",
      a11y: {
        alt: `${mediaType} card`,
        aria: `${mediaType} content for wellness`
      },
      tracking: {
        impression_key: `media-${mediaType}-impression`,
        experiment: "unified_layout_v1"
      },
      content_ref: {
        kind: mediaType,
        id: data.id || `default-${mediaType}`
      }
    };
  }
  
  /**
   * Create System Card Envelope (Vitana Index, Calendar, etc.)
   */
  static createSystemCardEnvelope(systemType: string, data: Partial<LegacyCardData> = {}): CardEnvelope {
    const sizeMap: Record<string, any> = {
      'vitana-index': { cols: 3, height: 'lg' },
      'calendar': { cols: 4, height: 'md' },
      'community-pulse': { cols: 3, height: 'md' },
      'progress-streaks': { cols: 2, height: 'sm' },
      'data-wallet': { cols: 3, height: 'md' },
      'discover-picks': { cols: 4, height: 'lg' },
      'motivation': { cols: 2, height: 'sm' }
    };
    
    return {
      id: data.id || `system-${systemType}-${Date.now()}`,
      type: "info",
      pillar: null, // System cards are pillar-neutral
      size_hint: sizeMap[systemType] || { cols: 3, height: 'md' },
      aspect_hint: "1:1",
      priority: data.priority || 70,
      freshness_ts: new Date().toISOString(),
      interactive: {
        cta: "open",
        autopilot: systemType === 'vitana-index'
      },
      permissions: {
        role: ["community", "patient", "professional", "staff", "admin"],
        consent: systemType === 'vitana-index' ? ["share_health"] : []
      },
      tenant_theme_key: "maxina",
      a11y: {
        alt: `${systemType} system card`,
        aria: `System information: ${systemType}`
      },
      tracking: {
        impression_key: `system-${systemType}-impression`,
        experiment: "unified_layout_v1"
      },
      content_ref: {
        kind: systemType,
        id: data.id || `default-${systemType}`
      }
    };
  }
  
  /**
   * Generate Placement Seed - Deterministic seed for SSR consistency
   */
  static generatePlacementSeed(pageId: string, userId?: string, timeWindow?: string): string {
    const now = timeWindow || new Date().toISOString().slice(0, 16); // 15-min buckets
    return `${pageId}-${userId || 'anonymous'}-${now}`.replace(/[^a-zA-Z0-9-]/g, '');
  }
}

/**
 * Map legacy pillar strings to typed pillar values
 */
function mapPillar(pillar?: string): PillarType {
  if (!pillar) return null;
  
  const lowerPillar = pillar.toLowerCase();
  const pillarMap: Record<string, PillarType> = {
    'mental': 'mental',
    'exercise': 'exercise', 
    'nutrition': 'nutrition',
    'hydration': 'hydration',
    'sleep': 'sleep'
  };
  
  return pillarMap[lowerPillar] || null;
}