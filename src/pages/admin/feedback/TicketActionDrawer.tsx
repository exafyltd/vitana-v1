// VTID-02660: actionable ticket drawer for the tenant admin Feedback page.
//
// Replaces the previous summary-only drawer. Shows the full transcript,
// per-turn intake messages with agent attribution, classifier metadata,
// handoff timeline, and — critically — Activate / Reject buttons that
// drive the ticket through the autopilot pipeline.
//
// Once acted upon, the ticket transitions to a terminal status and
// disappears from the active list (the parent's filter excludes terminal
// statuses by default), so the supervisor's view stays clean.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  resolver_agent: string | null;
  screen_path: string | null;
  app_version: string | null;
  created_at: string;
  resolved_at: string | null;
  user_confirmed_at: string | null;
}

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
      toast({
        title: "Activate failed",
        description: err instanceof Error ? err.message : "Try again.",
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
  const isBusy = activate.isPending || reject.isPending;
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

      {/* Action bar — the whole point of this drawer */}
      {!isTerminal && (
        <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5 p-3">
          <div>
            <div className="text-sm font-semibold">What do you want to do with this ticket?</div>
            <p className="text-xs text-muted-foreground">
              <strong>Activate</strong> drafts a fix spec / answer / resolution if not yet drafted, then advances to{" "}
              <em>in progress</em> (or <em>resolved</em> for support questions). Autopilot picks up from there.{" "}
              <strong>Reject</strong> closes the ticket without action.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => activate.mutate()}
              disabled={activate.isPending || reject.isPending}
            >
              {activate.isPending ? "Activating…" : "Activate"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={activate.isPending || reject.isPending}
            >
              Reject
            </Button>
          </div>
          {/* VTID-02659: visible progress strip — Activate calls the LLM
              router to draft a fix spec / answer / resolution, which can
              take 10–30s. Without this hint the button looks frozen. */}
          {activate.isPending && (
            <div className="flex items-center gap-2 rounded border border-primary/30 bg-background px-3 py-2 text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>
                Drafting via specialist resolver — this can take up to 30 seconds.
                Safe to leave the drawer open.
              </span>
            </div>
          )}
        </Card>
      )}
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
