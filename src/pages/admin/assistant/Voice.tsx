/**
 * Assistant > Voice tab
 *
 * Shows voice configuration for the voice_live surface.
 * Allows tenant admin to override voice ID and language settings.
 */

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAssistantSurface, useUpdateAssistantSurface } from "@/hooks/useAdminAssistant";
import { notifySuccess } from '@/lib/i18n-toast';

const LANGUAGES = [
  { value: "de-DE", label: "Deutsch" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "fr-FR", label: "Francais" },
  { value: "es-ES", label: "Espanol" },
];

export default function AssistantVoice() {
  const surfaceQuery = useAssistantSurface("voice_live");
  const updateMutation = useUpdateAssistantSurface();

  const surface = surfaceQuery.data;
  const voiceConfig = (surface?.effective_config?.voice_config ?? {}) as Record<string, unknown>;
  const overrideConfig = (surface?.tenant_override?.voice_config_override ?? {}) as Record<string, unknown>;

  const [voiceId, setVoiceId] = useState("");
  const [language, setLanguage] = useState("de-DE");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (surface) {
      setVoiceId((overrideConfig.voice_id as string) || (voiceConfig.voice_id as string) || "");
      setLanguage((overrideConfig.language as string) || (voiceConfig.language as string) || "de-DE");
      setDirty(false);
    }
  }, [surface]);

  async function save() {
    try {
      await updateMutation.mutateAsync({
        surfaceKey: "voice_live",
        updates: { voice_config_override: { voice_id: voiceId, language } },
      });
      notifySuccess('toasts.admin.voiceConfigurationSaved');
      setDirty(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="assistant" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🎙️"
          title="Voice Configuration"
          description="Configure voice settings for the ORB live assistant surface."
        />

        {surfaceQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading voice config...</p>
        )}

        {surface && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Voice Live (ORB)</CardTitle>
                {surface.has_tenant_override ? (
                  <AdminStatusBadge variant="active">Customized</AdminStatusBadge>
                ) : (
                  <AdminStatusBadge variant="inactive">Using global</AdminStatusBadge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Current voice config (effective)
                  </label>
                  <pre className="text-xs font-mono bg-muted/50 rounded p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(voiceConfig, null, 2) || "—"}
                  </pre>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Voice ID</label>
                    <Input
                      value={voiceId}
                      onChange={(e) => { setVoiceId(e.target.value); setDirty(true); }}
                      placeholder="e.g. Aoede, Charon, Puck..."
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Language</label>
                    <Select value={language} onValueChange={(v) => { setLanguage(v); setDirty(true); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={save} disabled={!dirty || updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Override"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
