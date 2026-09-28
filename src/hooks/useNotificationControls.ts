/**
 * VTID-04675: Admin › Notifications — the on/off switch per notification type.
 * Calls /api/v1/admin/tenants/:tenantId/notification-controls (VTID-04674).
 *
 * A counter the gateway could not read comes back as `stats: null` plus
 * `stats_error` — the screen shows that error, never a 0.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export type NotificationAudience = "member" | "admin" | "developer" | "staff";
export type TextReadiness = "ready" | "not_localized" | "unverified";

export interface ControlStats {
  sent: number;
  pushed: number;
  read: number;
  blocked_admin: number;
  blocked_member: number;
  last_sent_at: string | null;
}

export interface AutomationSwitch {
  source_key: string;
  name: string | null;
  enabled: boolean;
  auto_registered: boolean;
  text: TextReadiness;
  can_enable: boolean;
  updated_at: string | null;
  updated_by_email: string | null;
}

export interface NotificationControl {
  type: string;
  audience: NotificationAudience;
  group: string;
  trigger: "member_activity" | "scheduled" | "automation" | "system";
  text: TextReadiness;
  label: { en: string; de: string };
  description: { en: string; de: string };
  in_catalog: boolean;
  enabled: boolean;
  auto_registered: boolean;
  registered: boolean;
  reason: string | null;
  updated_at: string | null;
  updated_by_email: string | null;
  can_enable: boolean;
  category: { id: string; slug: string | null; name: string | null; member_can_disable: boolean } | null;
  automations: AutomationSwitch[];
  stats: ControlStats | null;
}

export interface NotificationControlsResponse {
  ok: boolean;
  days: number;
  controls: NotificationControl[];
  stats_error: string | null;
  categories_error: string | null;
  audience: Record<NotificationAudience, number | null>;
}

export interface ControlAuditRow {
  source_key: string;
  old_enabled: boolean | null;
  new_enabled: boolean;
  reason: string | null;
  actor_email: string | null;
  created_at: string;
}

export interface ActivityRow {
  day: string;
  type: string;
  sent: number;
  pushed: number;
  read: number;
  blocked_admin: number;
  blocked_member: number;
}

const base = (tenantId: string) => `/api/v1/admin/tenants/${tenantId}/notification-controls`;

export function useNotificationControls(days = 7) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["notification-controls", activeTenantId, days],
    enabled: !!activeTenantId,
    queryFn: async () =>
      (await adminFetch(`${base(activeTenantId!)}?days=${days}`)) as NotificationControlsResponse,
  });
}

export function useNotificationControlAudit(type: string | null) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["notification-control-audit", activeTenantId, type],
    enabled: !!activeTenantId && !!type,
    queryFn: async () => {
      const json = await adminFetch(`${base(activeTenantId!)}/${encodeURIComponent(type!)}/audit`);
      return (json.rows || []) as ControlAuditRow[];
    },
  });
}

export function useNotificationActivity(days = 30) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["notification-activity", activeTenantId, days],
    enabled: !!activeTenantId,
    queryFn: async () => {
      const json = await adminFetch(`${base(activeTenantId!)}/activity?days=${days}`);
      return (json.rows || []) as ActivityRow[];
    },
  });
}

export interface SetControlInput {
  type: string;
  enabled: boolean;
  reason?: string;
  source_key?: string;
}

export function useSetNotificationControl() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetControlInput) =>
      adminFetch(`${base(activeTenantId!)}/${encodeURIComponent(input.type)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: input.enabled, reason: input.reason, source_key: input.source_key }),
      }),
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["notification-controls", activeTenantId] });
      qc.invalidateQueries({ queryKey: ["notification-control-audit", activeTenantId, input.type] });
    },
  });
}

/** Label/description in the admin's language: de for German, English otherwise. */
export function localized(text: { en: string; de: string }, locale: string): string {
  return locale.toLowerCase().startsWith("de") ? text.de : text.en;
}
