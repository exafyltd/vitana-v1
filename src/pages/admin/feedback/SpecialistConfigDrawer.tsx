// VTID-02656: Phase 6 — tenant admin Specialist Config drawer.
//
// Five sub-sections:
//   1. Enabled — toggle that writes agent_personas_tenant_overrides.enabled
//   2. Knowledge — multi-select of tenant kb_documents to attach to retrieval
//   3. Routing keywords — chip input for tenant-specific phrases
//   4. Intake additions — JSON editor for intake_schema_extras
//   5. Connections — list platform defaults (read-only) + add tenant-scoped
//
// Reads/writes /api/v1/admin/tenants/:tenantId/specialists/:key/* endpoints
// (gateway PR #1153).
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { communityFetch } from "@/lib/community-gateway";
import { X } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface Persona {
  id: string;
  key: string;
  display_name: string;
  role: string;
  voice_id: string | null;
  status: string;
  handles_kinds: string[];
  handoff_keywords: string[];
  greeting_templates: Record<string, string>;
}

interface Overlay {
  enabled: boolean;
  intake_schema_extras: Record<string, unknown>;
  custom_greeting_templates: Record<string, string>;
  notes: string | null;
}

interface OverridesResponse {
  ok: boolean;
  persona: Persona;
  overlay: Overlay;
  kb_bindings: Array<{ kb_scope: string; enabled: boolean }>;
  routing_keywords: Array<{ keyword: string; weight: number; enabled: boolean }>;
  connections: Array<{ id: string; provider: string; status: string; created_at: string }>;
}

interface Props {
  tenantId: string;
  personaKey: string;
  onClose: () => void;
}

export function SpecialistConfigDrawer({ tenantId, personaKey, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["tenant-specialist-overrides", tenantId, personaKey];

  const overridesQuery = useQuery<OverridesResponse>({
    queryKey,
    queryFn: async () => {
      const res = await communityFetch(`/api/v1/admin/tenants/${tenantId}/specialists/${personaKey}/overrides`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!tenantId && !!personaKey,
  });

  // Local state for edit-in-place fields
  const [enabled, setEnabled] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [intakeExtras, setIntakeExtras] = useState<string>("{}");
  const [keywords, setKeywords] = useState<Array<{ keyword: string; weight: number }>>([]);
  const [keywordDraft, setKeywordDraft] = useState<string>("");
  const [kbScopes, setKbScopes] = useState<string[]>([]);
  const [kbScopeDraft, setKbScopeDraft] = useState<string>("");

  useEffect(() => {
    const data = overridesQuery.data;
    if (!data) return;
    setEnabled(data.overlay.enabled);
    setNotes(data.overlay.notes ?? "");
    setIntakeExtras(JSON.stringify(data.overlay.intake_schema_extras ?? {}, null, 2));
    setKeywords(data.routing_keywords.map(k => ({ keyword: k.keyword, weight: k.weight })));
    setKbScopes(data.kb_bindings.map(b => b.kb_scope));
  }, [overridesQuery.data]);

  const overrideMutation = useMutation({
    mutationFn: async (patch: Partial<Overlay>) => {
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/specialists/${personaKey}/overrides`,
        { method: "PUT", body: JSON.stringify(patch) }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.details ?? body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const kbMutation = useMutation({
    mutationFn: async (scopes: string[]) => {
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/specialists/${personaKey}/kb-bindings`,
        { method: "PUT", body: JSON.stringify({ scopes }) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const keywordsMutation = useMutation({
    mutationFn: async (kws: Array<{ keyword: string; weight: number }>) => {
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/specialists/${personaKey}/keywords`,
        { method: "PUT", body: JSON.stringify({ keywords: kws }) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const platformDefaults = useMemo(() => {
    const d = overridesQuery.data;
    if (!d) return null;
    return {
      enabled: d.persona.status === "active",
      handoff_keywords: d.persona.handoff_keywords,
      voice: d.persona.voice_id,
    };
  }, [overridesQuery.data]);

  const saveOverlayBasics = async () => {
    let parsedExtras: Record<string, unknown> = {};
    try {
      parsedExtras = JSON.parse(intakeExtras || "{}");
    } catch {
      notifyError('toasts.admin.intakeSchemaMustValidJson');
      return;
    }
    try {
      await overrideMutation.mutateAsync({
        enabled,
        intake_schema_extras: parsedExtras,
        notes: notes || null,
      });
      notify('toasts.admin.saved');
    } catch (err) {
      notifyError('toasts.admin.saveFailed');
    }
  };

  const saveKb = async () => {
    try {
      await kbMutation.mutateAsync(kbScopes);
      notify('toasts.admin.kbBindingsSaved');
    } catch (err) {
      notifyError('toasts.admin.saveFailed');
    }
  };

  const saveKeywords = async () => {
    try {
      await keywordsMutation.mutateAsync(keywords);
      notify('toasts.admin.routingKeywordsSaved');
    } catch (err) {
      notifyError('toasts.admin.saveFailed');
    }
  };

  const addKeyword = () => {
    const k = keywordDraft.trim().toLowerCase();
    if (!k) return;
    if (keywords.some(x => x.keyword === k)) return;
    setKeywords([...keywords, { keyword: k, weight: 1.0 }]);
    setKeywordDraft("");
  };

  const removeKeyword = (k: string) => setKeywords(keywords.filter(x => x.keyword !== k));

  const addKbScope = () => {
    const s = kbScopeDraft.trim();
    if (!s) return;
    if (kbScopes.includes(s)) return;
    setKbScopes([...kbScopes, s]);
    setKbScopeDraft("");
  };

  const removeKbScope = (s: string) => setKbScopes(kbScopes.filter(x => x !== s));

  // VTID-02657 fix: every drawer state needs a working close button +
  // clickable backdrop. Earlier the error state trapped the user — they had
  // to refresh the whole page. Now loading + error + success all share the
  // same overlay/close pattern.
  if (overridesQuery.isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{t('screens.admin.loadingSpecialist')}</h2>
            </div>
            <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground" aria-label={t('screens.admin.close')}>×</button>
          </div>
        </div>
      </div>
    );
  }
  const data = overridesQuery.data;
  if (!data) {
    const errMsg = overridesQuery.error instanceof Error
      ? overridesQuery.error.message
      : "The overrides endpoint did not return data.";
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Couldn't load {personaKey}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{errMsg}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Possible causes: the gateway hasn't redeployed the tenant-overlay endpoint yet (PR #1153),
                your role isn't permitted on this tenant, or the persona key doesn't exist server-side.
              </p>
            </div>
            <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground" aria-label={t('screens.admin.close')}>×</button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => overridesQuery.refetch()}>Retry</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{data.persona.display_name}</h2>
            <p className="text-sm text-muted-foreground">{data.persona.role}</p>
            <div className="mt-2 flex gap-2 text-xs">
              <Badge variant="outline">key: {data.persona.key}</Badge>
              <Badge variant="outline">voice: {data.persona.voice_id || "(language default)"}</Badge>
              <Badge variant={data.persona.status === "active" ? "default" : "secondary"}>
                platform: {data.persona.status}
              </Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">×</button>
        </div>

        {/* 1. Enabled */}
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t('screens.admin.enabledForThisTenant')}</h3>
              <p className="text-xs text-muted-foreground">
                When off, your members never hear from {data.persona.display_name} on voice handoffs and the routing
                keywords below have no effect.
              </p>
              {platformDefaults && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Platform default: {platformDefaults.enabled ? "active" : "inactive"}
                </p>
              )}
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </Card>

        {/* 2. Knowledge */}
        <Card className="mb-4 p-4">
          <h3 className="font-semibold">{t('screens.admin.knowledgeBindings')}</h3>
          <p className="text-xs text-muted-foreground">
            KB scopes from your tenant that {data.persona.display_name} retrieves from. Add a scope key (e.g.{" "}
            <code>{t('screens.admin.tenant')}</code>, or a topic key like <code>{t('screens.admin.tenantrunbookbilling')}</code>).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {kbScopes.map(s => (
              <Badge key={s} variant="secondary" className="gap-1">
                {s}
                <button onClick={() => removeKbScope(s)} className="ml-1"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {kbScopes.length === 0 && <span className="text-xs text-muted-foreground">{t('screens.admin.none')}</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder={t('screens.admin.scopeKeyEGTenantTenantbilling')}
              value={kbScopeDraft}
              onChange={e => setKbScopeDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKbScope(); } }}
            />
            <Button variant="outline" onClick={addKbScope}>Add</Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveKb} disabled={kbMutation.isPending}>{t('screens.admin.saveKnowledge')}</Button>
          </div>
        </Card>

        {/* 3. Routing keywords */}
        <Card className="mb-4 p-4">
          <h3 className="font-semibold">{t('screens.admin.routingKeywords')}</h3>
          <p className="text-xs text-muted-foreground">
            Tenant-specific phrases that route the user to {data.persona.display_name} (in addition to the platform
            defaults). Examples: company jargon, internal acronyms, your domain-specific terms.
          </p>
          {platformDefaults?.handoff_keywords && platformDefaults.handoff_keywords.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Platform defaults: <code>{platformDefaults.handoff_keywords.slice(0, 6).join(", ")}
              {platformDefaults.handoff_keywords.length > 6 ? "…" : ""}</code>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {keywords.map(k => (
              <Badge key={k.keyword} variant="secondary" className="gap-1">
                {k.keyword}
                <button onClick={() => removeKeyword(k.keyword)} className="ml-1"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {keywords.length === 0 && <span className="text-xs text-muted-foreground">{t('screens.admin.none')}</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder={t('screens.admin.addKeywordPressEnter')}
              value={keywordDraft}
              onChange={e => setKeywordDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
            />
            <Button variant="outline" onClick={addKeyword}>Add</Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveKeywords} disabled={keywordsMutation.isPending}>{t('screens.admin.saveKeywords')}</Button>
          </div>
        </Card>

        {/* 4. Intake additions + notes */}
        <Card className="mb-4 p-4">
          <h3 className="font-semibold">{t('screens.admin.intakeAdditions')}</h3>
          <p className="text-xs text-muted-foreground">
            Extra fields {data.persona.display_name} should ask for during voice intake (JSON object). E.g. for Atlas
            in a finance-heavy tenant: <code>{`{"policy_number": "string"}`}</code>.
          </p>
          <Textarea
            value={intakeExtras}
            onChange={e => setIntakeExtras(e.target.value)}
            rows={6}
            className="mt-3 font-mono text-xs"
          />
          <h3 className="mt-4 font-semibold">{t('screens.admin.notesPrivate')}</h3>
          <p className="text-xs text-muted-foreground">{t('screens.admin.visibleOnlyYourTenantAdmins')}</p>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-2" />
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveOverlayBasics} disabled={overrideMutation.isPending}>
              Save enabled / intake / notes
            </Button>
          </div>
        </Card>

        {/* 5. Connections (read-only summary in v1) */}
        <Card className="mb-4 p-4">
          <h3 className="font-semibold">{t('screens.admin.text3rdpartyConnections')}</h3>
          <p className="text-xs text-muted-foreground">
            Tenant-scoped connections (your Stripe, your Auth0, etc). Adding new connections is supported via the API
            today; UI add-flow ships in a follow-up.
          </p>
          <div className="mt-3 space-y-1">
            {data.connections.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('screens.admin.none')}</p>
            )}
            {data.connections.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{c.provider}</Badge>
                <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                <span className="text-muted-foreground">added {new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
