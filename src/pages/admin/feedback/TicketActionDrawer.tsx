// VTID-02660: actionable ticket drawer for the tenant admin Feedback page.
// VTID-02664: split into a 3-step supervisor flow — write instructions,
// generate spec via AI, then activate. The supervisor is the domain expert;
// their instructions are higher-priority than the user's report when the
// LLM drafts the spec/answer/resolution.
//
// Flow:
//   Step 1 — supervisor types optional instructions in a textarea
//   Step 2 — "Generate spec / answer / resolution" button → /draft-spec
//             (LLM call ~10-30s; markdown shown in preview)
//   Step 3 — supervisor reads the draft, optionally re-generates with
//             revised instructions, then clicks "Activate" → /activate
//             advances spec_ready → in_progress (or answer_ready → resolved)
//
// Once activated, the ticket transitions to a terminal/in-progress status
// and disappears from the active list.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { communityFetch } from "@/lib/community-gateway";

interface IntakeMessage {
  agent?: string;
  role: "user" | "assistant";
  content: string;
  ts?: string;
}

interface FullTicket {
  id: string;
  ticket_number: string;
  vitana_id: string | null;
  user_id: string;
  kind: string;
  status: string;
  priority: string;
  surface: string | null;
  raw_transcript: string | null;
  intake_messages: IntakeMessage[] | null;
  structured_fields: Record<string, unknown> | null;
  classifier_meta: Record<string, unknown> | null;
  spec_md: string | null;
  draft_answer_md: string | null;
  resolution_md: string | null;
  supervisor_notes: string | null;
  resolver_agent: string | null;
  screen_path: string | null;
  app_version: string | null;
  created_at: string;
  resolved_at: string | null;
  user_confirmed_at: string | null;
}

// VTID-02664: per-kind labels for the supervisor flow. Drives the
// Generate-button text + the draft preview heading + which field the
// drawer reads to know whether a draft already exists.
const RESOLVER_BY_KIND: Record<string, {
  resolver: string;
  draftField: "spec_md" | "draft_answer_md" | "resolution_md";
  generateLabel: string;
  draftLabel: string;
}> = {
  support_question:  { resolver: "sage",  draftField: "draft_answer_md", generateLabel: "Generate answer (Sage)",      draftLabel: "Sage's draft answer" },
  bug:               { resolver: "devon", draftField: "spec_md",         generateLabel: "Generate spec (Devon)",       draftLabel: "Devon's spec" },
  ux_issue:          { resolver: "devon", draftField: "spec_md",         generateLabel: "Generate spec (Devon)",       draftLabel: "Devon's spec" },
  marketplace_claim: { resolver: "atlas", draftField: "resolution_md",   generateLabel: "Generate resolution (Atlas)", draftLabel: "Atlas's resolution" },
  account_issue:     { resolver: "mira",  draftField: "resolution_md",   generateLabel: "Generate resolution (Mira)",  draftLabel: "Mira's resolution" },
};

interface Handoff {
  id: string;
  from_agent: string;
  to_agent: string;
  reason: string;
  matched_keyword: string | null;
  confidence: number | null;
  ts: string;
}

interface DetailResponse {
  ok: boolean;
  ticket: FullTicket;
  handoffs: Handoff[];
}

const STATUS_LABEL: Record<string, string> = {
  new: "Submitted",
  interviewing: "Interviewing",
  triaged: "Triaged",
  spec_pending: "Spec pending",
  spec_ready: "Spec ready",
  answer_pending: "Answer pending",
  answer_ready: "Answer ready",
  approved: "Approved",
  in_progress: "In progress",
  resolved: "Resolved",
  user_confirmed: "Confirmed",
  duplicate: "Duplicate",
  rejected: "Rejected",
  wont_fix: "Won't fix",
  needs_more_info: "Needs info",
  reopened: "Reopened",
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["resolved", "user_confirmed", "approved", "in_progress"].includes(status)) return "default";
  if (["rejected", "wont_fix", "duplicate"].includes(status)) return "outline";
  if (["reopened", "needs_more_info"].includes(status)) return "destructive";
  return "secondary";
}

const TERMINAL_STATUSES = new Set([
  "resolved", "user_confirmed", "rejected", "wont_fix", "duplicate",
]);

interface Props {
  tenantId: string;
  ticketId: string;
  ticketNumber: string;
  onClose: () => void;
}

export function TicketActionDrawer({ tenantId, ticketId, ticketNumber, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["admin-feedback-ticket-detail", tenantId, ticketId];

  const detailQuery = useQuery<DetailResponse>({
    queryKey,
    queryFn: async () => {
      const res = await communityFetch(`/api/v1/admin/tenants/${tenantId}/tickets/${ticketId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = (body as { error?: string }).error ?? `HTTP ${res.status}`;
        throw new Error(err);
      }
      return res.json();
    },
    enabled: !!tenantId && !!ticketId,
  });

  // VTID-02664: supervisor instructions — local state, seeded from the
  // ticket's existing supervisor_notes once the detail loads so the
  // supervisor can iterate on a previous draft.
  const [supervisorInstructions, setSupervisorInstructions] = useState("");
  useEffect(() => {
    const seed = detailQuery.data?.ticket?.supervisor_notes;
    if (seed && !supervisorInstructions) setSupervisorInstructions(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data?.ticket?.id]);

  const generateSpec = useMutation({
    mutationFn: async () => {
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/tickets/${ticketId}/draft-spec`,
        {
          method: "POST",
          body: JSON.stringify({ supervisor_instructions: supervisorInstructions.trim() || null }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      return body as { resolver_agent: string; status: string; provider: string };
    },
    onSuccess: async (r) => {
      toast({
        title: `${ticketNumber} drafted by ${r.resolver_agent}`,
        description: `Now ${r.status}. Review the draft below, then Activate to advance.${r.provider === "fallback" ? " (LLM unavailable — placeholder shown.)" : ""}`,
      });
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback-tickets"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "Generate spec failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    },
  });

  const activate = useMutation({
    mutationFn: async () => {
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/tickets/${ticketId}/activate`,
        { method: "POST" }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      return body as { from: string; to: string; action: string };
    },
    onSuccess: async (r) => {
      toast({
        title: `${ticketNumber} activated`,
        description: `${r.from} → ${r.to}${r.action ? ` (${r.action})` : ""}. The ticket leaves the active list.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback-tickets"] });
      onClose();
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : "Try again.";
      const friendly = raw === "DRAFT_REQUIRED"
        ? "Generate a draft first — write your instructions and click Generate."
        : raw;
      toast({
        title: "Activate failed",
        description: friendly,
        variant: "destructive",
      });
    },
  });

  const reject = useMutation({
    mutationFn: async (reason: string | null) => {
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/tickets/${ticketId}/reject`,
        { method: "POST", body: JSON.stringify({ reason }) }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      return body;
    },
    onSuccess: async () => {
      toast({ title: `${ticketNumber} rejected`, description: "Removed from the active list." });
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback-tickets"] });
      onClose();
    },
    onError: (err: unknown) => {
      toast({
        title: "Reject failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    },
  });

  const handleReject = () => {
    const reason = window.prompt(`Reason for rejecting ${ticketNumber}? (optional)`);
    if (reason === null) return; // user cancelled
    reject.mutate(reason || null);
  };

  // VTID-02659: block close while a mutation is in flight so the action
  // completes cleanly (LLM draft can take 10–30s — closing mid-flight
  // leaves the supervisor staring at a stale list while onSuccess fires
  // into thin air). Both backdrop click and the ✕ button respect this.
  const isBusy = activate.isPending || reject.isPending || generateSpec.isPending;
  const safeClose = () => {
    if (isBusy) return;
    onClose();
  };

  // Layout
  const renderShell = (body: React.ReactNode) => (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) safeClose(); }}
    >
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-mono text-lg font-bold">{ticketNumber}</h2>
          <button
            onClick={safeClose}
            disabled={isBusy}
            className="text-2xl text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
            title={isBusy ? "Working — please wait" : "Close"}
          >
            ×
          </button>
        </div>
        {body}
      </div>
    </div>
  );

  if (detailQuery.isLoading) {
    return renderShell(<p className="text-sm text-muted-foreground">Loading ticket…</p>);
  }
  if (detailQuery.error || !detailQuery.data) {
    const err = detailQuery.error instanceof Error ? detailQuery.error.message : "Couldn't load this ticket.";
    return renderShell(
      <div>
        <p className="text-sm text-destructive">{err}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={() => detailQuery.refetch()}>Retry</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const t = detailQuery.data.ticket;
  const handoffs = detailQuery.data.handoffs;
  const isTerminal = TERMINAL_STATUSES.has(t.status);

  return renderShell(
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={statusVariant(t.status)}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
        <span className="text-muted-foreground">{t.kind} · {(t.priority || "p2").toUpperCase()}</span>
        {t.resolver_agent && (
          <span className="text-muted-foreground">handled by {t.resolver_agent}</span>
        )}
        {t.vitana_id && (
          <span className="ml-auto font-mono text-xs text-muted-foreground">{t.vitana_id}</span>
        )}
      </div>

      {/* VTID-02664: 3-step supervisor action panel. Step 1 instructions
          (optional but encouraged), step 2 generate via the right resolver,
          step 3 activate once the supervisor approves the draft. */}
      {!isTerminal && (() => {
        const cfg = RESOLVER_BY_KIND[t.kind];
        const draftKindHasResolver = !!cfg;
        const existingDraft = cfg ? (t[cfg.draftField] ?? null) : null;
        const hasDraft = !!existingDraft;
        const draftReadyStatus = ["spec_ready", "answer_ready"].includes(t.status);
        const canActivate = draftReadyStatus || ["in_progress"].includes(t.status) || !draftKindHasResolver;
        return (
          <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5 p-3">
            <div>
              <div className="text-sm font-semibold">Process this ticket</div>
              <p className="text-xs text-muted-foreground">
                You're the domain expert. Add your instructions below — they take priority over the user's words when the AI drafts the {cfg ? cfg.draftLabel.toLowerCase().replace(/^[a-z]+'s /, "") : "work item"}. Then generate, review, and activate.
              </p>
            </div>

            {/* Step 1 — supervisor instructions */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                1. Your instructions <span className="font-normal normal-case opacity-70">(takes priority over the user's report)</span>
              </label>
              <Textarea
                value={supervisorInstructions}
                onChange={(e) => setSupervisorInstructions(e.target.value)}
                placeholder={
                  cfg?.resolver === "devon"
                    ? "e.g. The real bug is the SSE reconnect logic; user is seeing the symptom but the root cause is in orb-live.ts. Touch only the reconnect bucket. Add a unit test for the single-utterance case."
                    : cfg?.resolver === "sage"
                      ? "e.g. Answer should mention the new beta opt-in flow on /settings, not the legacy toggle."
                      : cfg?.resolver === "atlas"
                        ? "e.g. This claim is borderline-fraud — start with eligibility check, hold any refund pending operator review."
                        : cfg?.resolver === "mira"
                          ? "e.g. Verify the user's email first; the role corruption is likely a stale OAuth claim, not a DB issue."
                          : "Your direction for the work item."
                }
                rows={4}
                disabled={isBusy}
                className="text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Persisted as <code>supervisor_notes</code>. Saved with the next Generate.
              </p>
            </div>

            {/* Step 2 — generate via resolver */}
            {draftKindHasResolver && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  2. {hasDraft ? "Re-generate" : "Generate"} the draft
                </label>
                <Button
                  size="sm"
                  variant={hasDraft ? "outline" : "default"}
                  onClick={() => generateSpec.mutate()}
                  disabled={isBusy}
                >
                  {generateSpec.isPending
                    ? "Drafting…"
                    : hasDraft
                      ? `Re-generate with ${cfg!.resolver}`
                      : cfg!.generateLabel}
                </Button>
                {generateSpec.isPending && (
                  <div className="mt-2 flex items-center gap-2 rounded border border-primary/30 bg-background px-3 py-2 text-xs text-muted-foreground">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>
                      AI is drafting via {cfg!.resolver} — this can take up to 30 seconds. Safe to leave the drawer open.
                    </span>
                  </div>
                )}
                {hasDraft && !generateSpec.isPending && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    A draft already exists below. Edit your instructions and click Re-generate to replace it.
                  </p>
                )}
              </div>
            )}

            {/* Step 3 — activate (gated on draft existing for kinds with a resolver) */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {draftKindHasResolver ? "3. " : ""}Activate or reject
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => activate.mutate()}
                  disabled={isBusy || (draftKindHasResolver && !canActivate)}
                  title={
                    draftKindHasResolver && !canActivate
                      ? "Generate a draft first."
                      : "Advance the ticket to the next stage."
                  }
                >
                  {activate.isPending ? "Activating…" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={isBusy}
                >
                  Reject
                </Button>
              </div>
              {draftKindHasResolver && !canActivate && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Activate is disabled until the draft is generated.
                </p>
              )}
              {activate.isPending && (
                <div className="mt-2 flex items-center gap-2 rounded border border-primary/30 bg-background px-3 py-2 text-xs text-muted-foreground">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Advancing the ticket — almost done.</span>
                </div>
              )}
            </div>
          </Card>
        );
      })()}
      {isTerminal && (
        <Card className="bg-muted/30 p-3 text-xs text-muted-foreground">
          This ticket is in a terminal state ({STATUS_LABEL[t.status] ?? t.status}). No further action available.
        </Card>
      )}

      {/* Customer report — what they actually said */}
      {t.raw_transcript && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer report</h3>
          <Card className="whitespace-pre-wrap p-3 text-sm">{t.raw_transcript}</Card>
        </section>
      )}

      {/* Intake conversation — every turn */}
      {Array.isArray(t.intake_messages) && t.intake_messages.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Intake conversation ({t.intake_messages.length} turns)
          </h3>
          <div className="flex flex-col gap-2">
            {t.intake_messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${isUser ? "self-end bg-muted" : "self-start bg-primary text-primary-foreground"}`}
                >
                  <div className="text-[10px] font-semibold uppercase opacity-70">
                    {m.agent ?? (isUser ? "user" : "assistant")}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Handoff timeline — Vitana → specialist */}
      {handoffs.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Handoff timeline</h3>
          <div className="flex flex-col gap-1 text-xs">
            {handoffs.map(h => (
              <div key={h.id} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-muted-foreground">{new Date(h.ts).toLocaleTimeString()}</span>
                <strong>{h.from_agent}</strong> → <strong>{h.to_agent}</strong>
                <span className="text-muted-foreground">({h.reason}{h.matched_keyword ? ` · "${h.matched_keyword}"` : ""})</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Specialist drafts (when present — useful context for Activate decision) */}
      {t.spec_md && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Devon spec</h3>
          <Card className="whitespace-pre-wrap p-3 font-mono text-xs">{t.spec_md}</Card>
        </section>
      )}
      {t.draft_answer_md && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sage draft answer</h3>
          <Card className="whitespace-pre-wrap p-3 text-sm">{t.draft_answer_md}</Card>
        </section>
      )}
      {t.resolution_md && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resolution draft</h3>
          <Card className="whitespace-pre-wrap p-3 text-sm">{t.resolution_md}</Card>
        </section>
      )}

      {/* Structured fields the specialist captured during intake */}
      {t.structured_fields && Object.keys(t.structured_fields).length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Structured fields</h3>
          <Card className="overflow-x-auto p-3">
            <pre className="text-xs">{JSON.stringify(t.structured_fields, null, 2)}</pre>
          </Card>
        </section>
      )}

      {/* Context */}
      <section className="text-xs text-muted-foreground space-y-0.5">
        {t.screen_path && <div>Screen: {t.screen_path}</div>}
        {t.app_version && <div>App version: {t.app_version}</div>}
        <div>Created: {new Date(t.created_at).toLocaleString()}</div>
        {t.resolved_at && <div>Resolved: {new Date(t.resolved_at).toLocaleString()}</div>}
        {t.user_confirmed_at && <div>Confirmed: {new Date(t.user_confirmed_at).toLocaleString()}</div>}
      </section>
    </div>
  );
}
