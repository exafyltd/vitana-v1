/**
 * Companion Fields Section — Phase B admin UI (VTID-01931/VTID-01940-UI)
 *
 * Renders the 7 companion-personality fields that back the proactive opener
 * behavior (companion phases A-G). Shows effective values read from the
 * voice_live personality config and allows admins to override any of them
 * via an extra_config JSON editor.
 *
 * Currently displayed (editable via extra_config JSON only for complex nested
 * fields; future iteration can add dedicated editors per field type):
 *   - forbidden_openings
 *   - tenure_opening_shapes (day0..day30plus)
 *   - last_interaction_acknowledgements (per bucket)
 *   - silent_honor (max_acknowledgement, forbidden_responses, pivot_rule)
 *   - companion_behaviors (toggles)
 *   - awareness_emphasis (which signals prompt always includes)
 *   - tone_rules (string)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { notifySuccess, t } from '@/lib/i18n-toast';

interface Props {
  effectiveConfig: Record<string, unknown>;
  tenantOverride: Record<string, unknown> | null;
  hasTenantOverride: boolean;
  onSave: (extraConfig: Record<string, unknown>) => Promise<void>;
  isSaving?: boolean;
}

const COMPANION_FIELD_KEYS = [
  "forbidden_openings",
  "tenure_opening_shapes",
  "last_interaction_acknowledgements",
  "silent_honor",
  "companion_behaviors",
  "awareness_emphasis",
  "tone_rules",
] as const;

const FIELD_DOCS: Record<string, string> = {
  forbidden_openings:
    "Phrases Vitana must NEVER use as a first utterance (e.g., 'What can I do for you?'). Overrides the default greeting baseline.",
  tenure_opening_shapes:
    "Per-tenure opening shape (day0 through day30plus). Controls sentence count + whether brevity rule applies during the opener.",
  last_interaction_acknowledgements:
    "Per-bucket (reconnect/recent/same_day/today/yesterday/week/long_short/long_long/first) acknowledgement template for time-since-last-session.",
  silent_honor:
    "Dismissal-honor behavior: max acknowledgement phrase, forbidden apology phrases, pivot rule after a user says 'skip it'.",
  companion_behaviors:
    "Toggle switches for companion behaviors: reference_prior_sessions, surface_routines_in_opener, apply_taste_signals, re_engagement_first_for_absent, announce_feature_introductions.",
  awareness_emphasis:
    "Which awareness signals the brain prompt always includes vs. only when present (tenure, goal, recent_activity, etc.).",
  tone_rules:
    "Warmth + tone guidance applied across all voice turns. Currently defined as a single string; future iteration may split into rule items.",
};

export default function CompanionFieldsSection({
  effectiveConfig,
  tenantOverride,
  hasTenantOverride,
  onSave,
  isSaving,
}: Props) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const existingExtra = (tenantOverride?.extra_config as Record<string, unknown>) || {};
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(existingExtra, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  async function saveExtra() {
    setJsonError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonDraft);
    } catch (err: any) {
      setJsonError(`Invalid JSON: ${err.message}`);
      return;
    }
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      setJsonError("extra_config must be a JSON object.");
      return;
    }
    try {
      await onSave(parsed);
      notifySuccess('toasts.admin.companionOverridesSavedVoiceCacheRefreshes');
      setJsonOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    }
  }

  return (
    <Card className="mt-4 border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            Companion Fields (Phase B)
            {hasTenantOverride && (effectiveConfig as any)?._has_extra_override ? (
              <Badge variant="default" className="text-xs">Overridden</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">{t('screens.admin.usingDefaults')}</Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant={jsonOpen ? "ghost" : "outline"}
            onClick={() => setJsonOpen(!jsonOpen)}
          >
            {jsonOpen ? "Close" : "Edit as JSON"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {COMPANION_FIELD_KEYS.map((key) => (
          <CompanionFieldRow
            key={key}
            fieldKey={key}
            doc={FIELD_DOCS[key]}
            value={effectiveConfig?.[key]}
            overridden={(existingExtra as any)[key] !== undefined}
          />
        ))}

        {jsonOpen && (
          <div className="border-t pt-4 mt-4 space-y-2">
            <label className="text-xs font-medium text-muted-foreground block">
              Tenant <code>{t('screens.admin.extra_config')}</code> override (JSON object). Keys listed above will
              override the defaults; unlisted keys fall back to global defaults.
            </label>
            <Textarea
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              rows={14}
              className="font-mono text-xs"
              placeholder='{\n  "forbidden_openings": ["What can I do for you?"]\n}'
            />
            {jsonError && (
              <p className="text-xs text-destructive">{jsonError}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveExtra} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Companion Overrides"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setJsonDraft(JSON.stringify(existingExtra, null, 2));
                  setJsonError(null);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompanionFieldRow({
  fieldKey,
  doc,
  value,
  overridden,
}: {
  fieldKey: string;
  doc: string;
  value: unknown;
  overridden: boolean;
}) {
  return (
    <div className="border-l-2 border-muted pl-3 py-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-mono font-medium">{fieldKey}</span>
        {overridden && <Badge variant="default" className="text-[10px] h-4 px-1">{t('screens.admin.custom')}</Badge>}
      </div>
      <p className="text-[11px] text-muted-foreground mb-1">{doc}</p>
      <div className="text-xs font-mono bg-muted/40 rounded p-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
        {formatValue(value)}
      </div>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return "(not set — using hardcoded fallback)";
  if (typeof v === "string") {
    if (v.length > 600) return v.slice(0, 600) + "…";
    return v;
  }
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
