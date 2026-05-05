/**
 * Assistant > Speeches tab
 *
 * Tenant admins manage what Vitana says at each phase of the user journey
 * (pre-login intro, onboarding, proactive guidance). Each speech has a global
 * default and an optional tenant override layered on top.
 *
 * Cards are grouped by journey_stage so admins can scan the user-facing
 * narrative arc top-to-bottom.
 */

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  useAssistantSpeeches,
  useUpdateAssistantSpeech,
  useDeleteAssistantSpeechOverride,
  type SpeechDto,
  type SpeechJourneyStage,
} from "@/hooks/useAdminAssistantSpeeches";
import { t } from '@/lib/i18n-toast';

const STAGE_ORDER: SpeechJourneyStage[] = ["pre_login", "onboarding", "proactive"];

const STAGE_LABELS: Record<SpeechJourneyStage, string> = {
  pre_login: "Pre-login",
  onboarding: "Onboarding",
  proactive: "Proactive",
};

interface SpeechCardProps {
  speech: SpeechDto;
  onSave: (speech: SpeechDto, text: string) => Promise<void>;
  onReset: (speech: SpeechDto) => Promise<void>;
  saving: boolean;
  resetting: boolean;
}

function SpeechCard({ speech, onSave, onReset, saving, resetting }: SpeechCardProps) {
  const [draft, setDraft] = useState<string>(speech.current_text || "");

  const dirty = draft !== (speech.current_text || "");
  const trimmed = draft.trim();
  const canSave = dirty && trimmed.length > 0 && !saving;

  function handleCancel() {
    setDraft(speech.current_text || "");
  }

  async function handleSave() {
    await onSave(speech, draft);
    // After successful save the query invalidates and current_text refreshes;
    // sync local draft so the dirty state clears.
    setDraft(draft);
  }

  async function handleReset() {
    await onReset(speech);
    setDraft(speech.default_text || "");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base">{speech.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{speech.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {speech.has_override ? (
              <AdminStatusBadge variant="active">Customized</AdminStatusBadge>
            ) : (
              <AdminStatusBadge variant="inactive">Default</AdminStatusBadge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {speech.plays_prerecorded_audio && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            This speech is currently played from a pre-recorded audio file. Editing the text here updates the
            storage, but end users will continue to hear the existing recording until audio regeneration is
            wired up.
          </div>
        )}

        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          className="text-sm resize-y"
          placeholder="Enter the text Vitana should say..."
        />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
          {speech.has_override && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? "Resetting..." : "Reset to default"}
            </Button>
          )}
          {dirty && (
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          )}
        </div>

        {speech.has_override && (speech.updated_at || speech.updated_by) && (
          <p className="text-xs text-muted-foreground">
            {speech.updated_at && (
              <>Updated {formatDistanceToNow(new Date(speech.updated_at), { addSuffix: true })}</>
            )}
            {speech.updated_at && speech.updated_by && " · "}
            {speech.updated_by && <>by {speech.updated_by}</>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AssistantSpeeches() {
  const speechesQuery = useAssistantSpeeches();
  const updateMutation = useUpdateAssistantSpeech();
  const deleteMutation = useDeleteAssistantSpeechOverride();

  const speeches = speechesQuery.data || [];

  const grouped = useMemo(() => {
    const map = new Map<SpeechJourneyStage, SpeechDto[]>();
    for (const stage of STAGE_ORDER) map.set(stage, []);
    for (const speech of speeches) {
      const bucket = map.get(speech.journey_stage);
      if (bucket) bucket.push(speech);
    }
    return map;
  }, [speeches]);

  async function saveSpeech(speech: SpeechDto, text: string) {
    try {
      await updateMutation.mutateAsync({ speechKey: speech.key, text });
      toast.success(`${speech.label} saved`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  }

  async function resetSpeech(speech: SpeechDto) {
    try {
      await deleteMutation.mutateAsync(speech.key);
      toast.success(`${speech.label} reset to default`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset");
    }
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="assistant" />
      <div className="p-6 space-y-4">
        <AdminHeader
          title={t('screens.admin.assistantSpeeches')}
          description="Manage what Vitana says at each phase of the user journey. Overrides layer on top of global defaults."
        />

        {speechesQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingSpeeches')}</p>
        )}

        {speechesQuery.isError && !speechesQuery.isLoading && (
          <p className="text-sm text-destructive py-8 text-center">
            {(speechesQuery.error as Error)?.message || "Failed to load speeches"}
          </p>
        )}

        {!speechesQuery.isLoading && !speechesQuery.isError && speeches.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.noSpeechesConfigured')}</p>
        )}

        {STAGE_ORDER.map((stage) => {
          const stageSpeeches = grouped.get(stage) || [];
          if (stageSpeeches.length === 0) return null;
          return (
            <section key={stage} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {STAGE_LABELS[stage]}
              </h2>
              <div className="space-y-3">
                {stageSpeeches.map((speech) => (
                  <SpeechCard
                    key={speech.key}
                    speech={speech}
                    onSave={saveSpeech}
                    onReset={resetSpeech}
                    saving={updateMutation.isPending && updateMutation.variables?.speechKey === speech.key}
                    resetting={deleteMutation.isPending && deleteMutation.variables === speech.key}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppLayout>
  );
}
