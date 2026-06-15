/**
 * BOOTSTRAP-PRODUCT-ANALYTICS: React Query hooks for the admin product
 * analytics dashboards (/admin/insights/*).
 *
 * Calls /api/v1/admin/tenants/:tenantId/analytics/* on the gateway.
 * Follows the useAdminAssistant/useAdminOverview pattern: activeTenantId
 * from the tenant context, adminFetch helper, enabled only with a tenant.
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface AnalyticsSummary {
  days: number;
  active_users: number;
  sessions: number;
  screen_views: number;
  assistant_conversations: number;
  assistant_messages: number;
  feature_opens: number;
  feature_completions: number;
  recommendation_clicks: number;
  unresolved_conversations: number;
  top_routes: Array<{ screen_route: string; count: number }>;
  top_features: Array<{ feature_key: string; count: number }>;
  top_interests: Array<{ topic: string; count: number }>;
}

export interface AssistantAnalytics {
  days: number;
  conversations: number;
  messages: number;
  users: number;
  avg_messages_per_conversation: number;
  resolution_rate: number;
  abandonment_rate: number;
  positive_feedback: number;
  negative_feedback: number;
  p95_response_ms: number | null;
  tool_failure_rate: number;
  top_intents: Array<{ intent: string; count: number }>;
  top_topics: Array<{ topic: string; count: number }>;
  top_tools: Array<{ tool_name: string; calls: number; failures: number }>;
  recent_unresolved: Array<{
    conversation_id: string;
    last_event_at: string;
    topic: string | null;
    intent: string | null;
    message_count: number;
  }>;
}

export interface JourneyAnalytics {
  days: number;
  sessions: number;
  screen_views: number;
  avg_screens_per_session: number;
  top_entry_routes: Array<{ screen_route: string; sessions: number }>;
  top_exit_routes: Array<{ screen_route: string; sessions: number }>;
  top_paths: Array<{ path: string[]; sessions: number }>;
  dropoffs: Array<{ screen_route: string; exits: number; exit_rate: number }>;
  assistant_to_feature: Array<{
    feature_key: string;
    assisted_opens: number;
    direct_opens: number;
  }>;
}

export interface FeatureAnalytics {
  days: number;
  top_features: Array<{
    feature_key: string;
    opens: number;
    completions: number;
    completion_rate: number;
    repeat_users: number;
    assisted_opens: number;
  }>;
  feature_trends: Array<{
    date: string;
    feature_key: string;
    opens: number;
    completions: number;
  }>;
}

export interface InterestAnalytics {
  days: number;
  top_topics: Array<{
    topic: string;
    users: number;
    events: number;
    repeated_users: number;
  }>;
  topic_sources: Array<{ topic: string; source: string; events: number }>;
}

export interface AnalyticsEventRow {
  event_name: string;
  event_type: string;
  user_id_hash: string | null;
  session_id: string;
  conversation_id: string | null;
  screen_route: string;
  feature_key: string | null;
  source: string;
  properties: Record<string, unknown>;
  occurred_at: string;
}

function useAnalyticsQuery<T>(segment: string, days: number) {
  const { activeTenantId } = useTenant();
  return useQuery<T>({
    queryKey: ["admin-product-analytics", segment, activeTenantId, days],
    queryFn: async () =>
      adminFetch(`/api/v1/admin/tenants/${activeTenantId}/analytics/${segment}?days=${days}`) as Promise<T>,
    enabled: !!activeTenantId,
  });
}

export function useAdminAnalyticsSummary(days = 30) {
  return useAnalyticsQuery<AnalyticsSummary>("summary", days);
}

export function useAdminAssistantAnalytics(days = 30) {
  return useAnalyticsQuery<AssistantAnalytics>("assistant", days);
}

export function useAdminJourneyAnalytics(days = 30) {
  return useAnalyticsQuery<JourneyAnalytics>("journeys", days);
}

export function useAdminFeatureAnalytics(days = 30) {
  return useAnalyticsQuery<FeatureAnalytics>("features", days);
}

export function useAdminInterestAnalytics(days = 30) {
  return useAnalyticsQuery<InterestAnalytics>("interests", days);
}

export function useAdminAnalyticsEvents(filters: { event_name?: string; event_type?: string; limit?: number } = {}) {
  const { activeTenantId } = useTenant();
  const params = new URLSearchParams();
  if (filters.event_name) params.set("event_name", filters.event_name);
  if (filters.event_type) params.set("event_type", filters.event_type);
  params.set("limit", String(filters.limit ?? 100));
  return useQuery<{ count: number; events: AnalyticsEventRow[] }>({
    queryKey: ["admin-product-analytics", "events", activeTenantId, params.toString()],
    queryFn: async () =>
      adminFetch(`/api/v1/admin/tenants/${activeTenantId}/analytics/events?${params.toString()}`),
    enabled: !!activeTenantId,
  });
}
