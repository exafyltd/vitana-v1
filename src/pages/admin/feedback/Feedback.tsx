// VTID-02047: Tenant Admin Feedback page — tenant-scoped tickets + read-only
// specialist roster. Mirrors the data shown in the Command Hub but scoped
// to the admin's active tenant.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Inbox } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { communityFetch } from "@/lib/community-gateway";
// VTID-02656 Phase 6: tenant SpecialistConfig drawer (enable/disable, KB
// bindings, routing keywords, intake extras, connections).
import { SpecialistConfigDrawer } from "./SpecialistConfigDrawer";
// VTID-02660: actionable ticket drawer — full transcript + Activate/Reject.
import { TicketActionDrawer } from "./TicketActionDrawer";
// Forwarding-rules feature (VTID-02661): Vitana-specific drawer that edits
// the global Gate A phrase lists + a test sandbox.
import { VitanaConfigDrawer } from "./VitanaConfigDrawer";
import { Switch } from "@/components/ui/switch";
import { notifyError, t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
const TABS = [
  { key: "tickets", label: "Tickets", path: "/admin/feedback/tickets" },
  { key: "specialists", label: "Specialists", path: "/admin/feedback/specialists" },
];

interface Ticket {
  id: string;
  ticket_number: string;
  vitana_id: string | null;
  kind: string;
  status: string;
  priority: string;
  surface: string | null;
  resolver_agent: string | null;
  created_at: string;
  resolved_at: string | null;
  user_confirmed_at: string | null;
  // VTID-02659: profile join from gateway PR #1161 — single batch profiles
  // query keyed by unique vitana_ids, merged into each ticket row.
  avatar_url?: string | null;
  display_name?: string | null;
  // VTID-02659: short transcript preview from gateway so the supervisor
  // can read the gist of a claim inline and prioritise without opening
  // the actionable drawer.
  raw_transcript_excerpt?: string | null;
}

interface Persona {
  key: string;
  display_name: string;
  role: string;
  voice_id: string | null;
  handles_kinds: string[];
  status: string;
  version: number;
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

// VTID-02658: helpers for the customer-grouped tickets view.

interface CustomerGroup {
  customer_key: string;        // vitana_id when set, else "(anonymous)" sentinel
  vitana_id: string | null;
  avatar_url: string | null;     // VTID-02659: from profiles join
  display_name: string | null;   // VTID-02659: from profiles join
  total: number;               // total tickets from this customer
  open: number;                // unresolved (anything except resolved/user_confirmed/rejected/wont_fix/duplicate)
  actionable: number;          // VTID-02659: spec_ready or answer_ready — Approve-All targets
  latest: Ticket;              // most recent ticket — used as the header
  tickets: Ticket[];           // chronological, latest first
}

const TERMINAL_STATUSES = new Set([
  "resolved", "user_confirmed", "rejected", "wont_fix", "duplicate",
]);
// VTID-02659: status set the Approve-All endpoint can advance.
const ACTIONABLE_STATUSES = new Set(["spec_ready", "answer_ready"]);

function groupTicketsByCustomer(tickets: Ticket[]): CustomerGroup[] {
  const groups = new Map<string, CustomerGroup>();
  for (const t of tickets) {
    const key = t.vitana_id ?? "(anonymous)";
    let g = groups.get(key);
    if (!g) {
      g = {
        customer_key: key,
        vitana_id: t.vitana_id,
        avatar_url: t.avatar_url ?? null,
        display_name: t.display_name ?? null,
        total: 0,
        open: 0,
        actionable: 0,
        latest: t,
        tickets: [],
      };
      groups.set(key, g);
    }
    // Profile fields may arrive on any ticket from the same customer; keep
    // the first non-null we see (gateway returns the same value per
    // vitana_id so order doesn't matter).
    if (!g.avatar_url && t.avatar_url) g.avatar_url = t.avatar_url;
    if (!g.display_name && t.display_name) g.display_name = t.display_name;
    g.tickets.push(t);
    g.total++;
    if (!TERMINAL_STATUSES.has(t.status)) g.open++;
    if (ACTIONABLE_STATUSES.has(t.status)) g.actionable++;
    // Keep latest as the most recent created_at
    if (new Date(t.created_at).getTime() > new Date(g.latest.created_at).getTime()) {
      g.latest = t;
    }
  }
  // Each group's tickets in latest-first order
  for (const g of groups.values()) {
    g.tickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  // Group ordering: customer with the most-recent ticket first
  return [...groups.values()].sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );
}

function customerInitials(key: string): string {
  // Strip leading @ if vitana_id, take first two letters that are alphanumeric.
  const stripped = key.replace(/^@/, "").replace(/[^A-Za-z0-9]/g, "");
  if (stripped.length === 0) return "??";
  return stripped.slice(0, 2).toUpperCase();
}

function customerColor(key: string): string {
  // Deterministic pastel from a tiny hash so the avatar is visually
  // distinguishable per customer at a glance.
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

interface CustomerGroupedTicketsProps {
  tickets: Ticket[];
  isLoading: boolean;
  error: unknown;
  onSelectTicket: (t: Ticket) => void;
  tenantId: string | null;
}

function CustomerGroupedTickets({ tickets, isLoading, error, onSelectTicket, tenantId }: CustomerGroupedTicketsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // VTID-02659: per-customer Approve-All. Calls
  // POST /api/v1/admin/tenants/:tenantId/customers/:vitanaId/approve-all
  // (gateway PR #1161). Spec_ready → in_progress (autopilot picks up);
  // answer_ready → resolved (Sage's drafted answer goes out). Single
  // confirm step then optimistic UI; refetch invalidates the tickets
  // query so the latest state lands.
  const handleApproveAll = async (g: CustomerGroup) => {
    if (!tenantId || !g.vitana_id) return;
    if (g.actionable === 0) return;
    const confirmText = `Approve all ${g.actionable} actionable ticket${g.actionable === 1 ? "" : "s"} from ${g.vitana_id}?`;
    if (!window.confirm(confirmText)) return;
    setApproving(s => ({ ...s, [g.customer_key]: true }));
    try {
      const res = await communityFetch(
        `/api/v1/admin/tenants/${tenantId}/customers/${encodeURIComponent(g.vitana_id)}/approve-all`,
        { method: "POST" }
      );
      const json = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        throw new Error(((json as { error?: string }).error) || `HTTP ${res.status}`);
      }
      const r = json as { approved?: number; sent?: number; skipped?: number; total?: number };
      const parts: string[] = [];
      if ((r.approved ?? 0) > 0) parts.push(`${r.approved} approved`);
      if ((r.sent ?? 0) > 0) parts.push(`${r.sent} answers sent`);
      if ((r.skipped ?? 0) > 0) parts.push(`${r.skipped} skipped`);
      toast({
        title: `Batch action complete for ${g.vitana_id}`,
        description: parts.length > 0 ? parts.join(" · ") : "Nothing to action.",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback-tickets"] });
    } catch (err) {
      notifyError('toasts.admin.approveAllFailed');
    } finally {
      setApproving(s => ({ ...s, [g.customer_key]: false }));
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('screens.admin.loading2')}</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{t('screens.admin.failedLoadTickets')}</p>;
  }
  if (tickets.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <Inbox className="mx-auto mb-2 h-8 w-8 opacity-50" />
        {t('screens.admin.noTicketsYetYourMembersSubmissions')}
      </Card>
    );
  }
  const groups = groupTicketsByCustomer(tickets);

  return (
    <div className="space-y-2">
      {groups.map(g => {
        const isOpen = expanded[g.customer_key] ?? false;
        const initials = customerInitials(g.customer_key);
        const color = customerColor(g.customer_key);
        const headerAccent = statusAccent(g.latest.status);
        return (
          <Card key={g.customer_key} className={`overflow-hidden ${headerAccent.border}`}>
            {/* Customer header — click anywhere outside the Approve button
                to expand/collapse the ticket list. */}
            <div className="flex w-full items-center gap-3 p-3 hover:bg-accent">
              <button
                type="button"
                onClick={() => setExpanded(s => ({ ...s, [g.customer_key]: !isOpen }))}
                className="flex flex-1 min-w-0 items-center gap-3 text-left"
              >
                {/* VTID-02659: real avatar (profiles.avatar_url) when present;
                    otherwise initials on deterministic pastel. */}
                {g.avatar_url ? (
                  <img
                    src={g.avatar_url}
                    alt={`Avatar for ${g.display_name ?? g.customer_key}`}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if the image 404s — common when
                      // a tenant member uploaded then deleted their avatar.
                      const img = e.currentTarget;
                      img.style.display = "none";
                      const sibling = img.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white ${g.avatar_url ? "hidden" : "flex"}`}
                  style={{ background: color }}
                  aria-label={`Avatar for ${g.customer_key}`}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {g.display_name && (
                      <span className="text-sm font-semibold">{g.display_name}</span>
                    )}
                    <span className="font-mono text-xs text-muted-foreground">{g.vitana_id ?? "(anonymous)"}</span>
                    {g.open > 0 && (
                      <Badge variant="destructive" className="text-[10px]">{t('screens.admin.openOpen', { open: g.open })}</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">{t('screens.admin.totalTotal', { total: g.total })}</Badge>
                    {g.actionable > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{t('screens.admin.actionableReady', { actionable: g.actionable })}</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{g.latest.ticket_number}</span>
                    <Badge
                      className={`text-[10px] ${headerAccent.pill}`}
                      variant={headerAccent.pill ? undefined : statusVariant(g.latest.status)}
                    >
                      {STATUS_LABEL[g.latest.status] ?? g.latest.status}
                    </Badge>
                    <span>{g.latest.kind}</span>
                    {g.latest.resolver_agent && (
                      <span>{t('screens.admin.handledByResolver_agent', { resolver_agent: g.latest.resolver_agent })}</span>
                    )}
                    <span className="ml-auto">{fmtDateTime(new Date(g.latest.created_at))}</span>
                  </div>
                </div>
                <span className="ml-2 text-xs text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
              </button>
              {/* VTID-02659: per-customer Approve-All. Visible only when this
                  customer has at least one ticket waiting in spec_ready or
                  answer_ready. Single click batches every actionable ticket
                  for that customer through the autopilot pipeline. */}
              {g.actionable > 0 && tenantId && g.vitana_id && (
                <Button
                  size="sm"
                  variant="default"
                  className="shrink-0"
                  disabled={approving[g.customer_key] === true}
                  onClick={() => handleApproveAll(g)}
                >
                  {approving[g.customer_key] ? "Approving…" : `Approve all (${g.actionable})`}
                </Button>
              )}
            </div>

            {/* Expanded list of all of this customer's tickets */}
            {/* VTID-02659: row numbers + inline excerpt so the supervisor
                can scan and prioritise without opening every drawer.
                VTID-02666: status-tinted left border + pill matching the
                Command Hub Tasks palette (amber=in progress, green=
                completed/resolved, blue=scheduled/new, red=needs attention,
                muted=closed without fix). */}
            {isOpen && (
              <div className="border-t border-border bg-background">
                {g.tickets.map((t, idx) => {
                  const accent = statusAccent(t.status);
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => onSelectTicket(t)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left text-sm border-t border-border/60 hover:bg-accent ${accent.border} ${accent.tint}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground/70">
                          {idx + 1}.
                        </span>
                        <span className="font-mono text-xs">{t.ticket_number}</span>
                        <Badge className={`text-[10px] ${accent.pill}`} variant={accent.pill ? undefined : statusVariant(t.status)}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                        <span className="text-muted-foreground">{t.kind}</span>
                        <span className="text-muted-foreground">{(t.priority || "p2").toUpperCase()}</span>
                        {t.resolver_agent && (
                          <span className="text-xs text-muted-foreground">{t.resolver_agent}</span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {fmtDateTime(new Date(t.created_at))}
                        </span>
                      </div>
                      {t.raw_transcript_excerpt && (
                        <p className="ml-9 line-clamp-2 text-xs text-foreground/80">
                          {t.raw_transcript_excerpt}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["resolved", "user_confirmed", "approved", "in_progress"].includes(status)) return "default";
  if (["rejected", "wont_fix", "duplicate"].includes(status)) return "outline";
  if (["reopened", "needs_more_info"].includes(status)) return "destructive";
  return "secondary";
}

// VTID-02666: status-tinted row + pill, mirroring the Command Hub Tasks
// board palette so the supervisor reads a row's state at a glance instead
// of parsing the badge text.
//   in_progress / spec_ready / answer_ready / approved → amber  (active work)
//   resolved / user_confirmed                          → green  (completed)
//   new / triaged / spec_pending / answer_pending      → blue   (scheduled)
//   needs_more_info / reopened                         → red    (attention)
//   rejected / wont_fix / duplicate                    → muted  (closed-no-fix)
//   anything else (interviewing etc.)                  → neutral
function statusAccent(status: string): {
  // 4px left border in the bright accent colour.
  border: string;
  // Faint background tint so the row pops without screaming.
  tint: string;
  // Pill colour for the status badge — vivid version of the same family.
  pill: string;
} {
  if (["in_progress", "spec_ready", "answer_ready", "approved"].includes(status)) {
    return {
      border: "border-l-4 border-l-amber-500",
      tint: "bg-amber-500/10",
      pill: "bg-amber-500 text-white border-transparent",
    };
  }
  if (["resolved", "user_confirmed"].includes(status)) {
    return {
      border: "border-l-4 border-l-emerald-500",
      tint: "bg-emerald-500/10",
      pill: "bg-emerald-500 text-white border-transparent",
    };
  }
  if (["new", "triaged", "spec_pending", "answer_pending"].includes(status)) {
    return {
      border: "border-l-4 border-l-sky-500",
      tint: "bg-sky-500/10",
      pill: "bg-sky-500 text-white border-transparent",
    };
  }
  if (["needs_more_info", "reopened"].includes(status)) {
    return {
      border: "border-l-4 border-l-red-500",
      tint: "bg-red-500/10",
      pill: "bg-red-500 text-white border-transparent",
    };
  }
  if (["rejected", "wont_fix", "duplicate"].includes(status)) {
    return {
      border: "border-l-4 border-l-muted-foreground/40",
      tint: "bg-muted/30",
      pill: "bg-muted text-muted-foreground border-transparent",
    };
  }
  return {
    border: "border-l-4 border-l-transparent",
    tint: "",
    pill: "",
  };
}

// Vitana renders first on the Specialists tab (with the "Always on" affordance);
// the remaining personas keep their alphabetical / server order. Without this,
// the receptionist would scroll-mix with her own colleagues.
function sortedPersonasWithVitanaFirst(personas: Persona[]): Persona[] {
  const vitana = personas.find(p => p.key === "vitana");
  const rest = personas.filter(p => p.key !== "vitana");
  return vitana ? [vitana, ...rest] : rest;
}

// Per-card enable/disable for Devon/Sage/Atlas/Mira. Calls the platform-level
// PATCH /:key/status endpoint (rejects vitana server-side). Stops click
// propagation so toggling doesn't open the drawer.
function SpecialistEnableToggle({
  personaKey,
  status,
  onChanged,
}: {
  personaKey: string;
  status: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const enabled = status === "active";

  const toggle = async (next: boolean) => {
    setPending(true);
    try {
      const res = await communityFetch(`/api/v1/admin/specialists/${personaKey}/status`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast({
        title: next ? `${personaKey} enabled` : `${personaKey} disabled`,
        description: next
          ? "Vitana can now route eligible requests to this specialist."
          : "Vitana will not route to this specialist (gate=unrouted on a match).",
      });
      onChanged();
    } catch (err) {
      notifyError('toasts.admin.toggleFailed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div onClick={e => e.stopPropagation()} className="flex items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {enabled ? "On" : "Off"}
      </span>
      <Switch
        checked={enabled}
        disabled={pending}
        onCheckedChange={toggle}
        aria-label={`Toggle ${personaKey} ${enabled ? "off" : "on"}`}
      />
    </div>
  );
}

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = tab && TABS.find(t => t.key === tab) ? tab : "tickets";
  const { activeTenantId } = useTenant();
  const [selected, setSelected] = useState<Ticket | null>(null);
  // VTID-02660: filter view. 'active' = exclude terminal-status tickets so
  // the supervisor's main board only shows what needs work. Resolved /
  // rejected / duplicate / wont_fix go to Archive.
  const [ticketView, setTicketView] = useState<"active" | "archive" | "all">("active");
  // VTID-02656: open SpecialistConfigDrawer when a tenant admin clicks a card
  const [selectedSpecialist, setSelectedSpecialist] = useState<string | null>(null);

  const ticketsQuery = useQuery<Ticket[]>({
    queryKey: ["admin-feedback-tickets", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const res = await communityFetch(`/api/v1/admin/feedback/tenants/${activeTenantId}/tickets?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.tickets ?? [];
    },
    enabled: !!activeTenantId,
  });

  const personasQuery = useQuery<Persona[]>({
    queryKey: ["admin-feedback-personas", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const res = await communityFetch(`/api/v1/admin/feedback/tenants/${activeTenantId}/personas`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.personas ?? [];
    },
    enabled: !!activeTenantId,
  });

  const counts = useMemo(() => {
    const tickets = ticketsQuery.data ?? [];
    return {
      total: tickets.length,
      open: tickets.filter(t => !["resolved", "user_confirmed", "rejected", "wont_fix", "duplicate"].includes(t.status)).length,
      resolved: tickets.filter(t => ["resolved", "user_confirmed"].includes(t.status)).length,
    };
  }, [ticketsQuery.data]);

  // VTID-02660: derive the list shown in the customer-grouped view from
  // ticketView. Active = non-terminal only (default). Archive = everything
  // that's already been actioned. All = no filter.
  const filteredTickets = useMemo(() => {
    const tickets = ticketsQuery.data ?? [];
    const TERMINAL = new Set([
      "resolved", "user_confirmed", "rejected", "wont_fix", "duplicate",
    ]);
    if (ticketView === "active") return tickets.filter(t => !TERMINAL.has(t.status));
    if (ticketView === "archive") return tickets.filter(t => TERMINAL.has(t.status));
    return tickets;
  }, [ticketsQuery.data, ticketView]);

  if (!tab) {
    return <Navigate to="/admin/feedback/tickets" replace />;
  }

  return (
    <AppLayout>
      <SEO title={t('screens.admin.feedbackAdmin')} description="Tenant feedback tickets and the AI specialist team" />
      <StandardHeader
        title={t('screens.admin.feedback')}
        description="Tickets your members submitted to Vitana. AI specialists handle them — humans approve before any action applies."
      />

      <div className="border-b border-border">
        <div className="flex gap-1 px-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => navigate(t.path)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "tickets" && (
          <>
            <div className="flex gap-2 text-xs items-center flex-wrap">
              <Badge variant="outline">{t('screens.admin.totalTotal2', { total: counts.total })}</Badge>
              <Badge variant="secondary">{t('screens.admin.openOpen2', { open: counts.open })}</Badge>
              <Badge variant="default">{t('screens.admin.resolvedResolved', { resolved: counts.resolved })}</Badge>
              {/* VTID-02660: Active / Archive filter. Default = active so
                  resolved/rejected tickets disappear from the supervisor's
                  view immediately after they're acted on. Switch to Archive
                  to read past decisions without cluttering the live work. */}
              <div className="ml-auto flex gap-1 rounded-md bg-muted p-0.5">
                <button
                  className={`px-2 py-0.5 text-xs rounded ${ticketView === "active" ? "bg-background shadow" : "text-muted-foreground"}`}
                  onClick={() => setTicketView("active")}
                >{t('screens.admin.activeOpen', { open: counts.open })}
                </button>
                <button
                  className={`px-2 py-0.5 text-xs rounded ${ticketView === "archive" ? "bg-background shadow" : "text-muted-foreground"}`}
                  onClick={() => setTicketView("archive")}
                >{t('screens.admin.archiveValue0', { value0: counts.total - counts.open })}
                </button>
                <button
                  className={`px-2 py-0.5 text-xs rounded ${ticketView === "all" ? "bg-background shadow" : "text-muted-foreground"}`}
                  onClick={() => setTicketView("all")}
                >{t('screens.admin.allTotal', { total: counts.total })}
                </button>
              </div>
            </div>

            {/* VTID-02658: tickets grouped by customer (vitana_id) so a single
                customer with many open tickets doesn't crowd out other
                customers. Each card = one customer. Header shows latest
                ticket; click to expand and see the rest. Inspired by
                Zendesk's Requester view + Intercom's conversation grouping —
                one row per person, badges show open/total counts.
                VTID-02660: filtered by ticketView so resolved/rejected
                drop out of the supervisor's view by default. */}
            <CustomerGroupedTickets
              tickets={filteredTickets}
              isLoading={ticketsQuery.isLoading}
              error={ticketsQuery.error}
              onSelectTicket={setSelected}
              tenantId={activeTenantId}
            />

            {/* VTID-02660: actionable ticket drawer — replaces the legacy
                summary-only drawer. Full transcript + intake messages +
                Activate/Reject buttons that drive the autopilot pipeline.
                When the action succeeds the drawer closes and the ticket
                drops out of the Active list (terminal status filter). */}
            {selected && activeTenantId && (
              <TicketActionDrawer
                tenantId={activeTenantId}
                ticketId={selected.id}
                ticketNumber={selected.ticket_number}
                onClose={() => setSelected(null)}
              />
            )}
          </>
        )}

        {activeTab === "specialists" && (
          <>
            <p className="text-sm text-muted-foreground">
              <strong>{t('screens.admin.vitanaYourMembersLifeCompanion')}</strong>{t('screens.admin.almostEveryConversationStaysWithHer')}
            </p>
            {personasQuery.isLoading && <p className="text-sm text-muted-foreground">{t('screens.admin.loading2')}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {sortedPersonasWithVitanaFirst(personasQuery.data ?? []).map(p => {
                const isVitana = p.key === "vitana";
                const isActive = p.status === "active";
                return (
                  <Card
                    key={p.key}
                    className={`cursor-pointer p-4 transition-colors hover:bg-accent ${
                      !isActive && !isVitana ? "opacity-60" : ""
                    }`}
                    onClick={() => setSelectedSpecialist(p.key)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold">{p.display_name}</h3>
                          {isVitana && (
                            <Badge variant="default" className="text-[9px]">{t('screens.admin.receptionist')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.role}</p>
                      </div>
                      {isVitana ? (
                        <span className="whitespace-nowrap rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {t('screens.admin.always')}
                        </span>
                      ) : (
                        <SpecialistEnableToggle
                          personaKey={p.key}
                          status={p.status}
                          onChanged={() => personasQuery.refetch()}
                        />
                      )}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <div>{t('screens.admin.handlesValue0', { value0: isVitana
                          ? "everything except customer-support handoffs"
                          : (p.handles_kinds.join(", ") || "—") })}</div>
                      <div>{t('screens.admin.voiceValue0', { value0: p.voice_id || "(not set)" })}</div>
                      <div>{t('screens.admin.versionVVersion', { version: p.version })}</div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Vitana → global Forwarding Rules drawer (Gate A phrases + test sandbox).
                Specialist → existing tenant-scoped config drawer (enable, KB, keywords). */}
            {selectedSpecialist === "vitana" && (
              <VitanaConfigDrawer onClose={() => setSelectedSpecialist(null)} />
            )}
            {selectedSpecialist && selectedSpecialist !== "vitana" && activeTenantId && (
              <SpecialistConfigDrawer
                tenantId={activeTenantId}
                personaKey={selectedSpecialist}
                onClose={() => setSelectedSpecialist(null)}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
