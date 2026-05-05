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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { communityFetch } from "@/lib/community-gateway";
import { lookup, notifyError, t } from '@/lib/i18n-toast';

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
  // VTID-02665: set by /activate when bug/ux_issue is dispatched through
  // the dev autopilot. Drives "Already running in autopilot" UI hint.
  linked_finding_id: string | null;
  // VTID-02669: stamped by feedback-completion-reconciler when the
  // post-deploy visual verification (Playwright/screenshot) ran clean.
  playwright_verified?: boolean | null;
  screen_path: string | null;
  app_version: string | null;
  created_at: string;
  resolved_at: string | null;
  user_confirmed_at: string | null;
}

// VTID-02665: kinds the supervisor can pick from the reclassify dropdown.
const KIND_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: "bug",               label: "Bug",                 description: "Code defect — runs Devon spec → dev autopilot" },
  { value: "ux_issue",          label: "UX issue",            description: "Visual / interaction defect — runs Devon → dev autopilot" },
  { value: "support_question",  label: "Support question",    description: "User wants information — Sage drafts answer" },
  { value: "marketplace_claim", label: "Marketplace claim",   description: "Refund / dispute — Atlas drafts resolution" },
  { value: "account_issue",     label: "Account issue",       description: "Login / role / data — Mira drafts resolution" },
  { value: "feedback",          label: "Feedback (no draft)", description: "Opinion / nice-to-have — straight to in_progress" },
  { value: "feature_request",   label: "Feature request",     description: "New capability — straight to in_progress" },
];

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

// VTID-02666: dev autopilot execution stage as returned by the gateway
// when the ticket has been dispatched (linked_finding_id set).
interface DevAutopilotExecution {
  id: string;
  status: string; // cooling | running | ci | merging | deploying | verifying | completed | failed
  pr_url: string | null;
  pr_number: number | null;
  branch: string | null;
  failure_stage: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface DetailResponse {
  ok: boolean;
  ticket: FullTicket;
  handoffs: Handoff[];
  execution: DevAutopilotExecution | null;
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

// VTID-02666: dev autopilot pipeline stages, in order. The bar shows one
// segment per stage; the segment is "complete" if the current execution
// status is at or past it, "active" if it matches, "pending" otherwise.
// On `failed`, the failed_stage segment turns red and the trailing
// segments stay pending.
const PIPELINE_STAGES: Array<{ key: string; label: string; pct: number }> = [
  { key: "cooling",   label: "Queued",    pct: 10 },
  { key: "running",   label: "Coding",    pct: 30 },
  { key: "ci",        label: "CI",        pct: 55 },
  { key: "merging",   label: "Merging",   pct: 75 },
  { key: "deploying", label: "Deploying", pct: 90 },
  { key: "verifying", label: "Verifying", pct: 97 },
  { key: "completed", label: "Completed", pct: 100 },
];

function stageIndex(status: string): number {
  const idx = PIPELINE_STAGES.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
}

interface PipelineProgressProps {
  execution: import('react').ReactNode extends never ? never : ({
    id: string;
    status: string;
    pr_url: string | null;
    pr_number: number | null;
    branch: string | null;
    failure_stage: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  } | null);
  findingId: string;
  // VTID-02669: when feedback-completion-reconciler stamped the ticket
  // playwright_verified=true (visual verification ran clean post-deploy),
  // the Completed chip gets a green "✓ Visually verified" suffix.
  playwrightVerified?: boolean;
}

function PipelineProgress({ execution, findingId, playwrightVerified }: PipelineProgressProps) {
  // Pre-execution state — the autopilot finding exists but the execution
  // row hasn't been claimed yet (typically <30s after Activate). Show a
  // queued indicator so the supervisor knows we're waiting.
  if (!execution) {
    return (
      <Card className="flex flex-col gap-3 border-amber-500/40 bg-amber-500/5 p-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{t('screens.admin.dispatchedDevAutopilot')}</div>
            <div className="text-xs text-muted-foreground">
              {t('screens.admin.recommendation')} <code className="text-[10px]">{findingId.slice(0, 8)}</code> — waiting for the executor tick to claim the run (≤30s).
            </div>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[5%] animate-pulse rounded-full bg-amber-500" />
        </div>
      </Card>
    );
  }

  const status = execution.status;
  // VTID-02678: 'failed' and 'failed_escalated' are both terminal-failure
  // states. Treat them the same in the UI.
  const isFailed = status === "failed" || status === "failed_escalated";
  const isCompleted = status === "completed";
  const failedAt = execution.failure_stage ?? null;
  // Don't index against PIPELINE_STAGES with a non-stage value like "failed"
  // — fall back to the deepest stage we've seen evidence of.
  const failedStageIdx = failedAt ? PIPELINE_STAGES.findIndex(s => s.key === failedAt) : -1;
  const idxNow = isFailed
    ? (failedStageIdx >= 0 ? failedStageIdx : 1) // assume at least past Queued
    : stageIndex(status);
  const pctNow = isFailed
    ? (failedStageIdx >= 0 ? PIPELINE_STAGES[failedStageIdx].pct : 30)
    : PIPELINE_STAGES[idxNow].pct;
  // Human-readable label for where the run died.
  const STAGE_FAIL_LABEL: Record<string, string> = {
    cooling: 'before it could start',
    running: 'while writing the code',
    ci: 'in CI (tests / typecheck)',
    merging: 'while merging',
    deploying: 'during deploy',
    verifying: 'during post-deploy verification',
    plan_gen: 'while generating the plan',
    approve_safety: 'at the safety gate',
  };
  const failureCopy = isFailed
    ? (failedAt && STAGE_FAIL_LABEL[failedAt])
      || (failedAt && failedAt !== 'failed' ? `at ${failedAt}` : '')
    : '';

  const barClass = isFailed
    ? "bg-red-500"
    : isCompleted
      ? "bg-emerald-500"
      : "bg-amber-500";

  const stalledMs = Date.now() - new Date(execution.updated_at).getTime();
  const isStalled = !isCompleted && !isFailed && stalledMs > 5 * 60 * 1000;

  return (
    <Card
      className={`flex flex-col gap-3 p-3 text-sm ${
        isFailed
          ? "border-red-500/40 bg-red-500/5"
          : isCompleted
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">
          {isFailed ? "⚠️" : isCompleted ? "✅" : "⚙️"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2 flex-wrap">
            <span>
              {isFailed
                ? (failureCopy ? `Run failed ${failureCopy}` : 'Run failed')
                : isCompleted
                  ? "Completed — deployed to production"
                  : `Running in dev autopilot — ${PIPELINE_STAGES[idxNow]?.label ?? status}`}
            </span>
            {isFailed && (
              <span className="rounded-full bg-red-500/10 text-red-700 dark:text-red-300 text-[10px] px-2 py-0.5 font-normal border border-red-500/30">
                {t('screens.admin.clickActivateRetry')}
              </span>
            )}
            {isCompleted && playwrightVerified && (
              <span className="rounded-full bg-emerald-500 text-white text-[10px] px-2 py-0.5 font-normal">
                {t('screens.admin.visuallyVerified')}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('screens.admin.execution')} <code className="text-[10px]">{execution.id.slice(0, 8)}</code>
            {execution.pr_url && (
              <> · <a className="text-primary underline" href={execution.pr_url} target="_blank" rel="noreferrer">PR #{execution.pr_number ?? "?"}</a></>
            )}
            {isStalled && <> · <span className="text-amber-600 font-semibold">stalled {Math.round(stalledMs / 60000)} min</span></>}
            {execution.completed_at && <> · finished {new Date(execution.completed_at).toLocaleTimeString()}</>}
          </div>
        </div>
      </div>

      {/* Solid coloured bar showing overall % through the pipeline. */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: `${Math.max(5, Math.min(100, pctNow))}%` }}
        />
      </div>

      {/* Stage row — each stage is a small chip. Completed stages get a
          checkmark, the active stage gets a dot, failed gets an X. */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {PIPELINE_STAGES.map((stage, i) => {
          const passed = i < idxNow;
          const active = i === idxNow && !isFailed;
          // VTID-02678: when failedAt isn't a known stage key (e.g. "failed"),
          // mark the deepest known stage as the failure point so the chip
          // row isn't all-empty-circles.
          const failedHere = isFailed && (
            (failedAt && stage.key === failedAt) ||
            (!failedAt && i === idxNow) ||
            (failedAt && failedStageIdx === -1 && i === idxNow)
          );
          const tone = failedHere
            ? "bg-red-500 text-white border-transparent"
            : passed || (isCompleted && i <= idxNow)
              ? "bg-emerald-500 text-white border-transparent"
              : active
                ? "bg-amber-500 text-white border-transparent animate-pulse"
                : "bg-background text-muted-foreground border-border";
          const symbol = failedHere ? "✕" : passed || (isCompleted && i <= idxNow) ? "✓" : active ? "●" : "○";
          return (
            <span
              key={stage.key}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${tone}`}
              title={stage.label}
            >
              <span>{symbol}</span>
              <span>{stage.label}</span>
            </span>
          );
        })}
      </div>

      {isStalled && !isFailed && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          No update for {Math.round(stalledMs / 60000)} minutes — the executor reaper will reclaim stuck runs every few minutes. Come back later.
        </p>
      )}
    </Card>
  );
}

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
    // VTID-02666: poll while the autopilot execution is in flight so the
    // supervisor's progress bar updates live without manual refresh. Stop
    // once the run lands in a terminal state.
    refetchInterval: (q) => {
      const data = q.state.data as DetailResponse | undefined;
      const ex = data?.execution;
      if (!ex) return false;
      const inflight = ["cooling","running","ci","merging","deploying","verifying"].includes(ex.status);
      return inflight ? 5000 : false;
    },
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

  // VTID-02665: re-classify a misclassified ticket. Lets the supervisor
  // change kind (e.g. support_question → bug) which clears any existing
  // draft and resets the ticket to triaged so /draft-spec runs against
  // the correct resolver next.
  const reclassify = useMutation({
    mutationFn: async (kind: string) => {
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/tickets/${ticketId}/reclassify`,
        { method: "PUT", body: JSON.stringify({ kind }) }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      return body as { kind: string; status: string };
    },
    onSuccess: async (r) => {
      toast({
        title: `${ticketNumber} reclassified`,
        description: `Kind is now ${r.kind}. Generate the new draft when ready.`,
      });
      // Clear local instructions textarea so the supervisor starts fresh.
      setSupervisorInstructions("");
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback-tickets"] });
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : "Try again.";
      const friendly = raw === "ALREADY_DISPATCHED"
        ? "This ticket is already running in dev autopilot. Reclassify is locked once dispatched."
        : raw;
      notifyError('toasts.admin.reclassifyFailed');
    },
  });

  // VTID-02669: standalone Dispatch removed. Activate is the last human
  // touch — the backend dispatches atomically inside /activate; if the
  // safety gate rejects, /activate returns 409 with violations[] and the
  // ticket stays at spec_ready (no stranded state to recover from).

  // VTID-02669: violations surfaced inline when /activate is rejected by
  // the dispatch pre-flight or safety gate. Cleared on next user action.
  const [activateViolations, setActivateViolations] = useState<Array<{ code: string; message: string }> | null>(null);

  const generateSpec = useMutation({
    mutationFn: async () => {
      setActivateViolations(null);
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
      notifyError('toasts.admin.generateSpecFailed');
    },
  });

  // VTID-02669: Activate is the last human touch. The backend dispatches
  // atomically inside /activate. On 409 with violations, we surface them
  // inline (not as a toast) so the supervisor can read & revise.
  const activate = useMutation({
    mutationFn: async () => {
      setActivateViolations(null);
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/tickets/${ticketId}/activate`,
        { method: "POST" }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const e = body as { error?: string; message?: string; violations?: Array<{ code: string; message: string }> };
        const err: Error & { violations?: typeof e.violations } = new Error(e.error ?? `HTTP ${res.status}`);
        err.violations = e.violations ?? undefined;
        throw err;
      }
      return body as {
        from: string;
        to: string;
        action: string;
        dispatch?: {
          recommendation_id?: string;
          execution_id?: string;
          skipped?: string;
        } | null;
      };
    },
    onSuccess: async (r) => {
      const dispatched = r.dispatch?.execution_id
        ? ` Dev autopilot is running execution ${r.dispatch.execution_id.slice(0, 8)} — autonomous from here.`
        : "";
      toast({
        title: `${ticketNumber} activated`,
        description: `${r.from} → ${r.to}.${dispatched}`,
      });
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback-tickets"] });
      // Don't auto-close — the drawer should now show the live progress
      // bar so the supervisor can watch the run kick off.
    },
    onError: (err: unknown) => {
      const e = err as Error & { violations?: Array<{ code: string; message: string }> };
      if (e.violations && e.violations.length > 0) {
        // Show structured violations inline; no toast spam.
        setActivateViolations(e.violations);
        return;
      }
      const raw = e.message ?? "Try again.";
      const friendly = raw === "DRAFT_REQUIRED"
        ? "Generate a draft first — write your instructions and click Generate."
        : raw === "ALREADY_IN_PROGRESS"
          ? "This ticket is already running. The autopilot will close it when done."
          : raw;
      notifyError('toasts.admin.activateFailed');
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
      toast({ title: `${ticketNumber} rejected`, description: lookup('toasts.admin.removedFromActiveList') });
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback-tickets"] });
      onClose();
    },
    onError: (err: unknown) => {
      notifyError('toasts.admin.rejectFailed');
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
  const isBusy = activate.isPending || reject.isPending || generateSpec.isPending || reclassify.isPending;
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
    return renderShell(<p className="text-sm text-muted-foreground">{t('screens.admin.loadingTicket')}</p>);
  }
  if (detailQuery.error || !detailQuery.data) {
    const err = detailQuery.error instanceof Error ? detailQuery.error.message : "Couldn't load this ticket.";
    return renderShell(
      <div>
        <p className="text-sm text-destructive">{err}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={() => detailQuery.refetch()}>{t('screens.admin.retry')}</Button>
          <Button variant="ghost" onClick={onClose}>{t('screens.admin.close')}</Button>
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

      {/* VTID-02665 / VTID-02666: dispatch indicator + pipeline progress bar.
          When the ticket has been handed to the dev autopilot, render a
          colored, stage-by-stage progress bar so the supervisor can see at
          a glance whether the run is healthy or stuck without clicking
          into anything. Polls every 5s while in flight (refetchInterval
          on detailQuery). */}
      {t.linked_finding_id && (
        <PipelineProgress
          execution={detailQuery.data?.execution ?? null}
          findingId={t.linked_finding_id}
          playwrightVerified={!!t.playwright_verified}
        />
      )}

      {/* VTID-02669: stranded-ticket recovery card REMOVED. Activate is
          now atomic — a ticket cannot land at in_progress without
          linked_finding_id. Recovery for any pre-Phase-7 stranded ticket
          is via the one-off SQL fixup that resets it to spec_ready. */}

      {/* VTID-02665 / VTID-02669: kind reclassify dropdown. Visible only
          when the supervisor still has a meaningful choice — i.e. before
          the ticket has been activated. Hidden on in_progress (activate
          is the last touch) and on dispatched (linked_finding_id set). */}
      {!isTerminal && !t.linked_finding_id && t.status !== "in_progress" && (
        <Card className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('screens.admin.kind')}</div>
              <div className="text-sm">{KIND_OPTIONS.find(k => k.value === t.kind)?.label ?? t.kind}</div>
            </div>
            <Select
              disabled={isBusy}
              value={t.kind}
              onValueChange={(value) => {
                if (value !== t.kind) reclassify.mutate(value);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('screens.admin.reclassify')} />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-[11px] text-muted-foreground">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reclassify.isPending && (
            <p className="text-xs text-muted-foreground">{t('screens.admin.reclassifyingThisClearsAnyExistingDraft')}</p>
          )}
        </Card>
      )}

      {/* VTID-02664 / VTID-02669: 3-step supervisor action panel. Step 1
          instructions, step 2 Generate, step 3 Activate. Hidden once the
          ticket is in_progress or terminal — Activate is the last human
          touch, the rest is autonomous. */}
      {!isTerminal && t.status !== "in_progress" && (() => {
        const cfg = RESOLVER_BY_KIND[t.kind];
        const draftKindHasResolver = !!cfg;
        const existingDraft = cfg ? (t[cfg.draftField] ?? null) : null;
        const hasDraft = !!existingDraft;
        const draftReadyStatus = ["spec_ready", "answer_ready"].includes(t.status);
        // VTID-02678: enable Activate from needs_more_info / reopened too —
        // the spec already exists from the prior failed run; this is a
        // one-click retry path without forcing a re-generate.
        const isRetryable = ["needs_more_info", "reopened"].includes(t.status) && hasDraft;
        const canActivate = draftReadyStatus || isRetryable || !draftKindHasResolver;
        return (
          <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5 p-3">
            <div>
              <div className="text-sm font-semibold">{t('screens.admin.processThisTicket')}</div>
              <p className="text-xs text-muted-foreground">
                You're the domain expert. Add your instructions below — they take priority over the user's words when the AI drafts the {cfg ? cfg.draftLabel.toLowerCase().replace(/^[a-z]+'s /, "") : "work item"}. Then generate, review, and activate.
              </p>
            </div>

            {/* Step 1 — supervisor instructions */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('screens.admin.text1YourInstructions')} <span className="font-normal normal-case opacity-70">{t('screens.admin.takesPriorityOverUserSReport')}</span>
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
                {t('screens.admin.persistedAs')} <code>{t('screens.admin.supervisor_notes')}</code>. Saved with the next Generate.
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
                  {activate.isPending
                    ? "Activating…"
                    : isRetryable
                      ? "Retry autopilot"
                      : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={isBusy}
                >
                  {t('screens.admin.reject')}
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
                  <span>{t('screens.admin.activatingDispatchingDevAutopilotAtomicTakes')}</span>
                </div>
              )}
              {/* VTID-02669: violations from /activate 409. Surfaces pre-flight
                  scope hits, safety-gate rejections, etc. inline so the
                  supervisor can revise + Re-generate without leaving Step 3. */}
              {activateViolations && activateViolations.length > 0 && (
                <div className="mt-3 rounded border border-red-500/40 bg-red-500/5 p-3 text-xs">
                  <div className="mb-1 font-semibold text-red-700 dark:text-red-300">
                    {t('screens.admin.activateBlockedReviseSpecRegenerate')}
                  </div>
                  <ul className="ml-4 list-disc space-y-1 text-foreground/80">
                    {activateViolations.map((v, i) => (
                      <li key={i}>
                        <span className="font-mono text-[10px] uppercase opacity-70">{v.code}</span>{" "}
                        {v.message}
                      </li>
                    ))}
                  </ul>
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
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('screens.admin.customerReport')}</h3>
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
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('screens.admin.handoffTimeline')}</h3>
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
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('screens.admin.devonSpec')}</h3>
          <Card className="whitespace-pre-wrap p-3 font-mono text-xs">{t.spec_md}</Card>
        </section>
      )}
      {t.draft_answer_md && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('screens.admin.sageDraftAnswer')}</h3>
          <Card className="whitespace-pre-wrap p-3 text-sm">{t.draft_answer_md}</Card>
        </section>
      )}
      {t.resolution_md && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('screens.admin.resolutionDraft')}</h3>
          <Card className="whitespace-pre-wrap p-3 text-sm">{t.resolution_md}</Card>
        </section>
      )}

      {/* Structured fields the specialist captured during intake */}
      {t.structured_fields && Object.keys(t.structured_fields).length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('screens.admin.structuredFields')}</h3>
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
