/**
 * React Query hooks for the Assistant > Speeches admin tab.
 *
 * Calls /api/v1/admin/tenants/:tenantId/assistant/speeches[/:speechKey] on the gateway.
 * Mirrors the patterns in useAdminAssistant.ts so query keys, invalidation, and
 * error handling stay consistent across the Assistant section.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export type SpeechKey =
  | "pre_login_intro"
  | "post_login_onboarding"
  | "general_onboarding"
  | "proactive_guidance_character";

export type SpeechJourneyStage = "pre_login" | "onboarding" | "proactive";

export interface SpeechDto {
  key: SpeechKey;
  label: string;
  description: string;
  journey_stage: SpeechJourneyStage;
  default_text: string;
  current_text: string;
  has_override: boolean;
  plays_prerecorded_audio?: boolean;
  updated_at?: string;
  updated_by?: string;
}

export function useAssistantSpeeches() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-assistant-speeches", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [] as SpeechDto[];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/assistant/speeches`);
      return (json.speeches || []) as SpeechDto[];
    },
    enabled: !!activeTenantId,
  });
}

export function useUpdateAssistantSpeech() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ speechKey, text }: { speechKey: SpeechKey | string; text: string }) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/assistant/speeches/${speechKey}`, {
        method: "PUT",
        body: JSON.stringify({ text }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assistant-speeches"] });
    },
  });
}

export function useDeleteAssistantSpeechOverride() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (speechKey: SpeechKey | string) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/assistant/speeches/${speechKey}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assistant-speeches"] });
    },
  });
}
