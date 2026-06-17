/**
 * Product analytics event envelope (BOOTSTRAP-PRODUCT-ANALYTICS).
 *
 * Mirrors the gateway's zod schema in
 * vitana-platform/services/gateway/src/routes/product-analytics.ts —
 * keep the two in sync when adding fields.
 */

export type AnalyticsEventType =
  | "journey"
  | "assistant"
  | "feature"
  | "interest"
  | "friction"
  | "performance"
  | "content";

export type AnalyticsSource = "web" | "ios" | "android" | "gateway" | "assistant" | "orb";

export type AnalyticsDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type AnalyticsConsentState = "granted" | "anonymous" | "denied";

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

/**
 * properties keys that could carry raw conversation/health text. The client
 * refuses to send them (the gateway strips them again, defense in depth).
 */
export const FORBIDDEN_PROPERTY_KEYS = [
  "message",
  "prompt",
  "raw_text",
  "transcript",
  "answer",
] as const;
