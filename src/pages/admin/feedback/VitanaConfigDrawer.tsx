// Vitana drawer — edits the GLOBAL forwarding rules on the `vitana` row of
// `agent_personas`. Two phrase lists (Gate A: forward-request, Gate A
// override: stay-inline) plus a test sandbox that hits the gateway's
// /handoff-detect endpoint so admins can verify a rule change before saving.
//
// This is platform-wide config — it affects every tenant, not just the
// active one. Tenant-scoped specialist config lives in SpecialistConfigDrawer.
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { communityFetch } from "@/lib/community-gateway";
import { X } from "lucide-react";
import { notify, notifyError } from '@/lib/i18n-toast';

interface VitanaPersona {
  id: string;
  key: string;
  display_name: string;
  role: string;
  status: string;
  version: number;
  forward_request_phrases: string[];
  stay_inline_phrases: string[];
}

interface PersonaResponse {
  ok: boolean;
  persona: VitanaPersona;
}

interface DetectResponse {
  ok: boolean;
  handoff: boolean;
  persona_key: string;
  decision?: string;
  gate?: string;
  matched_phrase?: string | null;
  matched_keyword?: string | null;
  confidence?: number;
}

interface Props {
  onClose: () => void;
}

const RULEBOOK_HEADER = `Vitana is the community user's life companion. Almost every conversation stays with her — health, longevity, matchmaking, community, business creation, daily emotional support. Forwarding to a customer-support colleague is a RARE exception, only when the user explicitly asks to be connected for a corporate / organizational problem (bug, refund, account, support escalation).`;

export function VitanaConfigDrawer({ onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["admin-specialist", "vitana"];

  const personaQuery = useQuery<PersonaResponse>({
    queryKey,
    queryFn: async () => {
      const res = await communityFetch("/api/v1/admin/specialists/vitana");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const [forwardPhrases, setForwardPhrases] = useState<string[]>([]);
  const [stayInlinePhrases, setStayInlinePhrases] = useState<string[]>([]);
  const [forwardDraft, setForwardDraft] = useState("");
  const [stayDraft, setStayDraft] = useState("");
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<DetectResponse | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  useEffect(() => {
    const p = personaQuery.data?.persona;
    if (!p) return;
    setForwardPhrases(p.forward_request_phrases ?? []);
    setStayInlinePhrases(p.stay_inline_phrases ?? []);
  }, [personaQuery.data]);

  const forwardMutation = useMutation({
    mutationFn: async (phrases: string[]) => {
      const res = await communityFetch("/api/v1/admin/specialists/vitana/forward-phrases", {
        method: "PUT",
        body: JSON.stringify({ phrases }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const stayInlineMutation = useMutation({
    mutationFn: async (phrases: string[]) => {
      const res = await communityFetch("/api/v1/admin/specialists/vitana/stay-inline-phrases", {
        method: "PUT",
        body: JSON.stringify({ phrases }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const addPhrase = (value: string, current: string[], setter: (p: string[]) => void, clear: () => void) => {
    const v = value.trim().toLowerCase();
    if (!v) return;
    if (current.includes(v)) return;
    setter([...current, v]);
    clear();
  };
  const removePhrase = (phrase: string, current: string[], setter: (p: string[]) => void) => {
    setter(current.filter(p => p !== phrase));
  };

  const saveForward = async () => {
    try {
      await forwardMutation.mutateAsync(forwardPhrases);
      notify('toasts.admin.forwardTriggersSaved');
    } catch (err) {
      notifyError('toasts.admin.saveFailed');
    }
  };
  const saveStayInline = async () => {
    try {
      await stayInlineMutation.mutateAsync(stayInlinePhrases);
      notify('toasts.admin.stayinlineOverridesSaved');
    } catch (err) {
      notifyError('toasts.admin.saveFailed');
    }
  };

  const runTest = async () => {
    const text = testText.trim();
    if (!text) return;
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await communityFetch("/api/v1/feedback/intake/handoff-detect", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      setTestResult(body);
    } catch (err) {
      notifyError('toasts.admin.testFailed');
    } finally {
      setTestRunning(false);
    }
  };

  if (personaQuery.isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-xl font-bold">Loading Vitana…</h2>
            <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground" aria-label="Close">×</button>
          </div>
        </div>
      </div>
    );
  }

  if (!personaQuery.data) {
    const errMsg = personaQuery.error instanceof Error
      ? personaQuery.error.message
      : "Couldn't reach the admin endpoint.";
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Couldn't load Vitana</h2>
              <p className="mt-1 text-sm text-muted-foreground">{errMsg}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Possible causes: the gateway hasn't redeployed the new admin endpoints (PR forwarding-rules-gateway-VTID-02660),
                your role isn't permitted, or the migration that adds the phrase columns hasn't applied yet.
              </p>
            </div>
            <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground" aria-label="Close">×</button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => personaQuery.refetch()}>Retry</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  const p = personaQuery.data.persona;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{p.display_name} — Forwarding Rules</h2>
            <p className="text-sm text-muted-foreground">{p.role}</p>
            <div className="mt-2 flex gap-2 text-xs">
              <Badge variant="outline">always on</Badge>
              <Badge variant="outline">v{p.version}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground" aria-label="Close">×</button>
        </div>

        {/* Rulebook header — frames the rules so admins read the philosophy first. */}
        <Card className="mb-4 border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-primary">Rulebook</h3>
          <p className="text-sm leading-relaxed">{RULEBOOK_HEADER}</p>
        </Card>

        {/* Gate A — forward triggers */}
        <Card className="mb-4 p-4">
          <h3 className="font-semibold">Forward triggers</h3>
          <p className="text-xs text-muted-foreground">
            Phrases that signal the user EXPLICITLY wants to be connected to a customer-support colleague.
            Without one of these, Vitana stays inline. Lowercase, partial-match — "talk to support" matches
            "I'd like to talk to support, please".
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {forwardPhrases.map(ph => (
              <Badge key={ph} variant="secondary" className="gap-1">
                {ph}
                <button
                  onClick={() => removePhrase(ph, forwardPhrases, setForwardPhrases)}
                  className="ml-1"
                  aria-label={`Remove ${ph}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {forwardPhrases.length === 0 && <span className="text-xs text-muted-foreground">(none — Vitana will never forward)</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder='Add a phrase (e.g. "I have a complaint")'
              value={forwardDraft}
              onChange={e => setForwardDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPhrase(forwardDraft, forwardPhrases, setForwardPhrases, () => setForwardDraft(""));
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => addPhrase(forwardDraft, forwardPhrases, setForwardPhrases, () => setForwardDraft(""))}
            >
              Add
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveForward} disabled={forwardMutation.isPending}>
              Save forward triggers
            </Button>
          </div>
        </Card>

        {/* Gate A override — stay-inline */}
        <Card className="mb-4 p-4">
          <h3 className="font-semibold">Stay-inline overrides</h3>
          <p className="text-xs text-muted-foreground">
            Phrases that force the conversation to stay with Vitana even if a forward trigger would otherwise fire.
            Covers life-companion question patterns ("I have a question", "how does this work?",
            "tell me about X") so general curiosity never turns into a customer-support handoff.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stayInlinePhrases.map(ph => (
              <Badge key={ph} variant="secondary" className="gap-1">
                {ph}
                <button
                  onClick={() => removePhrase(ph, stayInlinePhrases, setStayInlinePhrases)}
                  className="ml-1"
                  aria-label={`Remove ${ph}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {stayInlinePhrases.length === 0 && <span className="text-xs text-muted-foreground">(none — every forward trigger fires)</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder='Add a phrase (e.g. "tell me about")'
              value={stayDraft}
              onChange={e => setStayDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPhrase(stayDraft, stayInlinePhrases, setStayInlinePhrases, () => setStayDraft(""));
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => addPhrase(stayDraft, stayInlinePhrases, setStayInlinePhrases, () => setStayDraft(""))}
            >
              Add
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveStayInline} disabled={stayInlineMutation.isPending}>
              Save stay-inline overrides
            </Button>
          </div>
        </Card>

        {/* Test sandbox */}
        <Card className="mb-4 p-4">
          <h3 className="font-semibold">Test sandbox</h3>
          <p className="text-xs text-muted-foreground">
            Paste a sentence the user might say. The router runs both gates and shows the decision so you can
            verify a rule change before it goes live.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder='e.g. "I have a question, how does this work?"'
              value={testText}
              onChange={e => setTestText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); runTest(); } }}
            />
            <Button onClick={runTest} disabled={testRunning || !testText.trim()}>
              {testRunning ? "Running…" : "Simulate"}
            </Button>
          </div>
          {testResult && (
            <div className="mt-3 rounded border border-border bg-muted/30 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={testResult.handoff ? "destructive" : "default"}>
                  {testResult.handoff ? `forward → ${testResult.persona_key}` : "answer inline (Vitana)"}
                </Badge>
                {testResult.gate && (
                  <Badge variant="outline">gate: {testResult.gate}</Badge>
                )}
                {testResult.decision && (
                  <Badge variant="outline">decision: {testResult.decision}</Badge>
                )}
              </div>
              {(testResult.matched_phrase || testResult.matched_keyword) && (
                <div className="mt-2 text-muted-foreground">
                  Matched phrase: <code className="rounded bg-background px-1">{testResult.matched_phrase ?? testResult.matched_keyword}</code>
                </div>
              )}
              {typeof testResult.confidence === "number" && (
                <div className="mt-1 text-muted-foreground">
                  Confidence: {(testResult.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
