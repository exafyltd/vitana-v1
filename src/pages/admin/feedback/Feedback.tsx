// VTID-02047: Tenant Admin Feedback page — tenant-scoped tickets + read-only
// specialist roster. Mirrors the data shown in the Command Hub but scoped
// to the admin's active tenant.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Inbox } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/useTenant";
import { communityFetch } from "@/lib/community-gateway";
// VTID-02656 Phase 6: tenant SpecialistConfig drawer (enable/disable, KB
// bindings, routing keywords, intake extras, connections).
import { SpecialistConfigDrawer } from "./SpecialistConfigDrawer";

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
  total: number;               // total tickets from this customer
  open: number;                // unresolved (anything except resolved/user_confirmed/rejected/wont_fix/duplicate)
  latest: Ticket;              // most recent ticket — used as the header
  tickets: Ticket[];           // chronological, latest first
}

const TERMINAL_STATUSES = new Set([
  "resolved", "user_confirmed", "rejected", "wont_fix", "duplicate",
]);

function groupTicketsByCustomer(tickets: Ticket[]): CustomerGroup[] {
  const groups = new Map<string, CustomerGroup>();
  for (const t of tickets) {
    const key = t.vitana_id ?? "(anonymous)";
    let g = groups.get(key);
    if (!g) {
      g = {
        customer_key: key,
        vitana_id: t.vitana_id,
        total: 0,
        open: 0,
        latest: t,
        tickets: [],
      };
      groups.set(key, g);
    }
    g.tickets.push(t);
    g.total++;
    if (!TERMINAL_STATUSES.has(t.status)) g.open++;
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
}

function CustomerGroupedTickets({ tickets, isLoading, error, onSelectTicket }: CustomerGroupedTicketsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">Failed to load tickets.</p>;
  }
  if (tickets.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <Inbox className="mx-auto mb-2 h-8 w-8 opacity-50" />
        No tickets yet. Your members' submissions via "Talk to Vitana" will land here.
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
        const pillVariant = statusVariant(g.latest.status);
        return (
          <Card key={g.customer_key} className="overflow-hidden">
            {/* Customer header — click to expand/collapse */}
            <button
              type="button"
              onClick={() => setExpanded(s => ({ ...s, [g.customer_key]: !isOpen }))}
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white"
                style={{ background: color }}
                aria-label={`Avatar for ${g.customer_key}`}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold">{g.vitana_id ?? "(anonymous)"}</span>
                  {g.open > 0 && (
                    <Badge variant="destructive" className="text-[10px]">{g.open} open</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{g.total} total</Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{g.latest.ticket_number}</span>
                  <Badge variant={pillVariant} className="text-[10px]">
                    {STATUS_LABEL[g.latest.status] ?? g.latest.status}
                  </Badge>
                  <span>{g.latest.kind}</span>
                  {g.latest.resolver_agent && (
                    <span>· handled by {g.latest.resolver_agent}</span>
                  )}
                  <span className="ml-auto">{new Date(g.latest.created_at).toLocaleString()}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
            </button>

            {/* Expanded list of all of this customer's tickets */}
            {isOpen && (
              <div className="border-t bg-muted/30">
                {g.tickets.map(t => {
                  const tVariant = statusVariant(t.status);
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => onSelectTicket(t)}
                      className="flex w-full items-center gap-3 px-12 py-2 text-left text-sm hover:bg-accent border-t border-border/50"
                    >
                      <span className="font-mono text-xs">{t.ticket_number}</span>
                      <Badge variant={tVariant} className="text-[10px]">
                        {STATUS_LABEL[t.status] ?? t.status}
                      </Badge>
                      <span className="text-muted-foreground">{t.kind}</span>
                      <span className="text-muted-foreground">{(t.priority || "p2").toUpperCase()}</span>
                      {t.resolver_agent && (
                        <span className="text-xs text-muted-foreground">{t.resolver_agent}</span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                      </span>
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

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = tab && TABS.find(t => t.key === tab) ? tab : "tickets";
  const { activeTenantId } = useTenant();
  const [selected, setSelected] = useState<Ticket | null>(null);
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

  if (!tab) {
    return <Navigate to="/admin/feedback/tickets" replace />;
  }

  return (
    <AppLayout>
      <SEO title="Feedback — Admin" description="Tenant feedback tickets and the AI specialist team" />
      <StandardHeader
        title="Feedback"
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
            <div className="flex gap-2 text-xs">
              <Badge variant="outline">Total: {counts.total}</Badge>
              <Badge variant="secondary">Open: {counts.open}</Badge>
              <Badge variant="default">Resolved: {counts.resolved}</Badge>
            </div>

            {/* VTID-02658: tickets grouped by customer (vitana_id) so a single
                customer with many open tickets doesn't crowd out other
                customers. Each card = one customer. Header shows latest
                ticket; click to expand and see the rest. Inspired by
                Zendesk's Requester view + Intercom's conversation grouping —
                one row per person, badges show open/total counts. */}
            <CustomerGroupedTickets
              tickets={ticketsQuery.data ?? []}
              isLoading={ticketsQuery.isLoading}
              error={ticketsQuery.error}
              onSelectTicket={setSelected}
            />

            {selected && (
              <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
                <div className="h-full w-full max-w-xl overflow-y-auto bg-background p-6 shadow-2xl">
                  <button
                    onClick={() => setSelected(null)}
                    className="float-right text-2xl text-muted-foreground"
                  >
                    ×
                  </button>
                  <h2 className="mb-2 font-mono text-lg font-bold">{selected.ticket_number}</h2>
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={statusVariant(selected.status)}>
                      {STATUS_LABEL[selected.status] ?? selected.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {selected.kind} · {(selected.priority || "p2").toUpperCase()}
                    </span>
                    {selected.resolver_agent && (
                      <span className="text-muted-foreground">handled by {selected.resolver_agent}</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    {selected.vitana_id && (
                      <div>
                        <span className="text-muted-foreground">Reporter:</span> {selected.vitana_id}
                      </div>
                    )}
                    {selected.surface && (
                      <div>
                        <span className="text-muted-foreground">Surface:</span> {selected.surface}
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Created:</span>{" "}
                      {new Date(selected.created_at).toLocaleString()}
                    </div>
                    {selected.resolved_at && (
                      <div>
                        <span className="text-muted-foreground">Resolved:</span>{" "}
                        {new Date(selected.resolved_at).toLocaleString()}
                      </div>
                    )}
                    {selected.user_confirmed_at && (
                      <div>
                        <span className="text-muted-foreground">Confirmed:</span>{" "}
                        {new Date(selected.user_confirmed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <p className="mt-6 text-xs text-muted-foreground">
                    Full transcript and intake messages are visible in the Command Hub Feedback Inbox.
                    This admin view is summary-only by design — operator approves resolutions there.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "specialists" && (
          <>
            <p className="text-sm text-muted-foreground">
              These are AI specialists. Vitana hands off to them when a member's question is outside her domain.
              <strong> Click any card to customize them for your tenant</strong> — enable/disable, attach your knowledge base,
              add routing keywords, configure intake.
            </p>
            {personasQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {personasQuery.data?.map(p => (
                <Card
                  key={p.key}
                  className="cursor-pointer p-4 transition-colors hover:bg-accent"
                  onClick={() => setSelectedSpecialist(p.key)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{p.display_name}</h3>
                      <p className="text-xs text-muted-foreground">{p.role}</p>
                    </div>
                    <Badge variant={p.status === "active" ? "default" : "outline"} className="text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>Handles: {p.handles_kinds.join(", ") || "—"}</div>
                    <div>Voice: {p.voice_id || "(not set)"}</div>
                    <div>Version: v{p.version}</div>
                  </div>
                </Card>
              ))}
            </div>

            {/* VTID-02656 Phase 6 — tenant-side configuration drawer */}
            {selectedSpecialist && activeTenantId && (
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
