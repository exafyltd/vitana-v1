import { useState } from "react";
import { Network, Users, ArrowRightLeft, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminIntelligenceNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

const NODE_TYPE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  person: "default",
  group: "secondary",
  event: "outline",
  live_room: "outline",
  location: "secondary",
  service: "outline",
  product: "outline",
};

const nodeColumns = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (val: string) => <span className="font-medium">{val}</span>,
  },
  {
    key: "node_type",
    label: "Type",
    render: (val: string) => <Badge variant={NODE_TYPE_VARIANT[val] || "outline"}>{val}</Badge>,
  },
  {
    key: "domain",
    label: "Domain",
    render: (val: string) => <Badge variant="outline">{val || "community"}</Badge>,
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleDateString() : "-",
  },
];

const edgeColumns = [
  {
    key: "relationship_type",
    label: "Type",
    sortable: true,
    render: (val: string) => <Badge variant="default">{val}</Badge>,
  },
  {
    key: "strength",
    label: "Strength",
    sortable: true,
    render: (val: number) => <span className="font-mono text-xs">{val ?? 10}/100</span>,
  },
  {
    key: "origin",
    label: "Origin",
    render: (val: string) => <Badge variant="outline">{val}</Badge>,
  },
  {
    key: "first_seen",
    label: "First Seen",
    sortable: true,
    render: (val: string) => val || "-",
  },
  {
    key: "last_seen",
    label: "Last Seen",
    render: (val: string) => val || "-",
  },
];

export default function IntelligenceRelationships() {
  const [tab, setTab] = useState<"nodes" | "edges">("nodes");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const nodesQuery = useQuery({
    queryKey: ["admin-rel-nodes", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("relationship_nodes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    enabled: tab === "nodes",
  });

  const edgesQuery = useQuery({
    queryKey: ["admin-rel-edges", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("relationship_edges")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    enabled: tab === "edges",
  });

  const activeQuery = tab === "nodes" ? nodesQuery : edgesQuery;
  const records = activeQuery.data?.data || [];
  const total = activeQuery.data?.total || 0;

  return (
    <AppLayout>
      <SubNavigation items={adminIntelligenceNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.relationshipGraph')} description="Nodes and edges in the relationship memory graph" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalNodes')} value={nodesQuery.data?.total ?? "..."} icon={Network} loading={nodesQuery.isLoading} />
          <AdminStatsCard title={t('screens.admin.totalEdges')} value={edgesQuery.data?.total ?? "..."} icon={ArrowRightLeft} loading={edgesQuery.isLoading} />
          <AdminStatsCard title={t('screens.admin.personNodes')} value={tab === "nodes" ? records.filter((n: any) => n.node_type === "person").length : "..."} icon={Users} loading={activeQuery.isLoading} />
          <AdminStatsCard title={t('screens.admin.domains')} value={tab === "nodes" ? new Set(records.map((n: any) => n.domain)).size : "..."} icon={Globe} loading={activeQuery.isLoading} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setTab("nodes"); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "nodes" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Nodes ({nodesQuery.data?.total ?? "..."})
          </button>
          <button
            onClick={() => { setTab("edges"); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "edges" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Edges ({edgesQuery.data?.total ?? "..."})
          </button>
        </div>

        <AdminTable
          data={records}
          columns={tab === "nodes" ? nodeColumns : edgeColumns}
          loading={activeQuery.isLoading}
          searchable
          searchPlaceholder={tab === "nodes" ? "Search node titles..." : "Search relationship types..."}
          emptyMessage={tab === "nodes" ? "No relationship nodes found" : "No edges found"}
          paginated
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </AppLayout>
  );
}
