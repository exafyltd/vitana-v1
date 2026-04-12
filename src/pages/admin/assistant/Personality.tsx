/**
 * Assistant > Personality tab
 *
 * Shows all 6 AI personality surfaces with global default (read-only, left)
 * vs tenant override (editable, right). Tenant admin can customize the system
 * prompt, save, and see the merge result.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAssistantSurfaces, useUpdateAssistantSurface, useDeleteAssistantOverride } from "@/hooks/useAdminAssistant";

const SURFACE_LABELS: Record<string, string> = {
  voice_live: "Voice Live (ORB)",
  text_chat: "Text Chat",
  unified_conversation: "Unified Conversation",
  operator_chat: "Operator Chat",
  dev_orb: "Dev ORB",
  developer_assistant: "Developer Assistant",
};

export default function AssistantPersonality() {
  const surfacesQuery = useAssistantSurfaces();
  const updateMutation = useUpdateAssistantSurface();
  const deleteMutation = useDeleteAssistantOverride();
  const [editingSurface, setEditingSurface] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState("");

  const surfaces = surfacesQuery.data || [];

  function startEdit(surface: any) {
    setEditingSurface(surface.surface_key);
    setPromptDraft(
      surface.tenant_override?.system_prompt_override ||
      (surface.effective_config?.base_identity as string) || ""
    );
  }

  async function saveOverride(surfaceKey: string) {
    try {
      await updateMutation.mutateAsync({
        surfaceKey,
        updates: { system_prompt_override: promptDraft },
      });
      toast.success(`${SURFACE_LABELS[surfaceKey] || surfaceKey} override saved`);
      setEditingSurface(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  }

  async function removeOverride(surfaceKey: string) {
    try {
      await deleteMutation.mutateAsync(surfaceKey);
      toast.success(`Override removed — using global config`);
      setEditingSurface(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="assistant" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="✨"
          title="Assistant Personality"
          description="Customize how Vitana speaks and behaves for your tenant. Overrides are layered on top of the global defaults."
        />

        {surfacesQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading surfaces...</p>
        )}

        {surfaces.map((surface) => (
          <Card key={surface.surface_key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {SURFACE_LABELS[surface.surface_key] || surface.surface_key}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {surface.has_tenant_override ? (
                    <AdminStatusBadge variant="active">Customized</AdminStatusBadge>
                  ) : (
                    <AdminStatusBadge variant="inactive">Using global</AdminStatusBadge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingSurface === surface.surface_key ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Global default (read-only)
                    </label>
                    <div className="text-xs font-mono bg-muted/50 rounded p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {(surface.global_config?.base_identity as string)?.slice(0, 500) || "—"}
                      {((surface.global_config?.base_identity as string)?.length || 0) > 500 && "..."}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Tenant override (editable)
                    </label>
                    <Textarea
                      value={promptDraft}
                      onChange={(e) => setPromptDraft(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                      placeholder="Enter your tenant-specific system prompt..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveOverride(surface.surface_key)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Override"}
                    </Button>
                    {surface.has_tenant_override && (
                      <Button size="sm" variant="outline" onClick={() => removeOverride(surface.surface_key)} disabled={deleteMutation.isPending}>
                        Remove Override
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditingSurface(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="text-xs font-mono text-muted-foreground max-w-xl truncate">
                    {(surface.effective_config?.base_identity as string)?.slice(0, 200) || "No config"}
                    {((surface.effective_config?.base_identity as string)?.length || 0) > 200 && "..."}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => startEdit(surface)}>
                    Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
