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

            {ticketsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {ticketsQuery.error && (
              <p className="text-sm text-destructive">Failed to load tickets.</p>
            )}
            {ticketsQuery.data?.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                <Inbox className="mx-auto mb-2 h-8 w-8 opacity-50" />
                No tickets yet. Your members' submissions via "Talk to Vitana" will land here.
              </Card>
            )}

            <div className="space-y-1">
              {ticketsQuery.data?.map(t => (
                <Card
                  key={t.id}
                  className="cursor-pointer p-3 hover:bg-accent"
                  onClick={() => setSelected(t)}
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono font-semibold">{t.ticket_number}</span>
                    <Badge variant={statusVariant(t.status)} className="text-[10px]">
                      {STATUS_LABEL[t.status] ?? t.status}
                    </Badge>
                    <span className="text-muted-foreground">{t.kind}</span>
                    <span className="text-muted-foreground">{(t.priority || "p2").toUpperCase()}</span>
                    {t.resolver_agent && (
                      <span className="text-xs text-muted-foreground">handled by {t.resolver_agent}</span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                  {t.vitana_id && (
                    <div className="text-xs text-muted-foreground">{t.vitana_id}</div>
                  )}
                </Card>
              ))}
            </div>

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
