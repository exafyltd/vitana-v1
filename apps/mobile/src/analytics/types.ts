/**
 * VTID-05648 (native-wave2-fix-forward-r2/analytics) — the product analytics event envelope, field for field the web's
 * `src/lib/product-analytics/types.ts` (itself a mirror of the gateway's zod schema,
 * vitana-platform `services/gateway/src/routes/product-analytics.ts`). Native sends `source` `ios` / `android`.
 */
export type AnalyticsEventType = 'journey' | 'assistant' | 'feature' | 'interest' | 'friction' | 'performance' | 'content';
export type AnalyticsSource = 'web' | 'ios' | 'android' | 'gateway' | 'assistant' | 'orb';
export type AnalyticsDeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';
export type AnalyticsConsentState = 'granted' | 'anonymous' | 'denied';

export interface AnalyticsEvent {
  event_id: string;
  event_name: string;
  event_type: AnalyticsEventType;
  tenant_id: string;
  user_id_hash: string | null;
  session_id: string;
  journey_id: string | null;
  conversation_id: string | null;
  screen_route: string;
  screen_id: string | null;
  feature_key: string | null;
  source: AnalyticsSource;
  app_version: string | null;
  language: string | null;
  device_type: AnalyticsDeviceType;
  consent_state: AnalyticsConsentState;
  properties: Record<string, unknown>;
  occurred_at: string;
}

/** What call sites pass to track() — everything else is filled by the client. */
export interface TrackOptions {
  event_type?: AnalyticsEventType;
  feature_key?: string | null;
  screen_id?: string | null;
  conversation_id?: string | null;
  properties?: Record<string, unknown>;
}

/** properties keys that could carry raw conversation or health text; the client never sends them. */
export const FORBIDDEN_PROPERTY_KEYS = ['message', 'prompt', 'raw_text', 'transcript', 'answer'] as const;
