import { useState } from "react";
import { Brain, BookOpen, Sparkles, Layers } from "lucide-react";
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

const SOURCE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  orb_text: "default",
  orb_voice: "default",
  diary: "secondary",
  system: "outline",
  upload: "outline",
};

const itemColumns = [
  {
    key: "category_key",
    label: "Category",
    render: (val: string) => <Badge variant="outline">{val?.replace(/_/g, " ") || "uncategorized"}</Badge>,
  },
  {
    key: "source",
    label: "Source",
    render: (val: string) => <Badge variant={SOURCE_VARIANT[val] || "outline"}>{val || "unknown"}</Badge>,
  },
  {
    key: "content",
    label: "Content",
    render: (val: string) => (
      <span className="text-sm line-clamp-2 max-w-[400px]">{val || "-"}</span>
    ),
  },
  {
    key: "importance",
    label: "Importance",
    sortable: true,
    render: (val: number) => <span className="font-mono text-xs">{val ?? 10}/100</span>,
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleDateString() : "-",
  },
];

const factColumns = [
  {
    key: "fact_key",
    label: "Key",
    sortable: true,
    render: (val: string) => <span className="font-mono text-sm">{val}</span>,
  },
  {
    key: "fact_value",
    label: "Value",
    render: (val: string) => <span className="text-sm max-w-[300px] truncate block">{val}</span>,
  },
  {
    key: "entity",
    label: "Entity",
    render: (val: string) => <Badge variant={val === "self" ? "default" : "secondary"}>{val}</Badge>,
  },
  {
    key: "provenance_source",
    label: "Source",
    render: (val: string) => <Badge variant="outline">{val?.replace(/_/g, " ")}</Badge>,
  },
  {
    key: "provenance_confidence",
    label: "Confidence",
    render: (val: number) => <span className="font-mono text-xs">{val != null ? `${Math.round(val * 100)}%` : "-"}</span>,
  },
  {
    key: "extracted_at",
    label: "Extracted",
    sortable: true,
    render: (val: string) => val ? new Date(val).toLocaleDateString() : "-",
  },
];

export default function IntelligenceMemory() {
  const [tab, setTab] = useState<"items" | "facts">("items");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const itemsQuery = useQuery({
    queryKey: ["admin-memory-items", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("memory_items")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    enabled: tab === "items",
  });

  const factsQuery = useQuery({
    queryKey: ["admin-memory-facts", page],
    queryFn: async () => {
      const { data, error, count } = await (supabase as any)
        .from("memory_facts")
        .select("*", { count: "exact" })
        .is("superseded_at", null)
        .order("extracted_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    enabled: tab === "facts",
  });

  const activeQuery = tab === "items" ? itemsQuery : factsQuery;
  const records = activeQuery.data?.data || [];
  const total = activeQuery.data?.total || 0;

  return (
    <AppLayout>
      <SubNavigation items={adminIntelligenceNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.memoryGarden')} description="Browse memory items and extracted facts across all users" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.memoryItems')} value={itemsQuery.data?.total ?? "..."} icon={Brain} loading={itemsQuery.isLoading} />
          <AdminStatsCard title={t('screens.admin.activeFacts')} value={factsQuery.data?.total ?? "..."} icon={BookOpen} loading={factsQuery.isLoading} />
          <AdminStatsCard title={t('screens.admin.thisPage')} value={records.length} icon={Layers} loading={activeQuery.isLoading} />
          <AdminStatsCard title={t('screens.admin.view')} value={tab === "items" ? "Items" : "Facts"} icon={Sparkles} />
        </div>

        {/* Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setTab("items"); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "items" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >{t('screens.admin.memoryItems')}
          </button>
          <button
            onClick={() => { setTab("facts"); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "facts" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >{t('screens.admin.extractedFacts')}
          </button>
        </div>

        <AdminTable
          data={records}
          columns={tab === "items" ? itemColumns : factColumns}
          loading={activeQuery.isLoading}
          searchable
          searchPlaceholder={tab === "items" ? "Search memory content..." : "Search fact keys..."}
          emptyMessage={tab === "items" ? "No memory items found" : "No facts extracted yet"}
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
