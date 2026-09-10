import { Database, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { adminIntelligenceNavigation } from "@/config/navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

export default function IntelligenceEmbeddings() {
  // Count memory items (total and those with embeddings)
  const totalQuery = useQuery({
    queryKey: ["admin-embeddings-total"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("memory_items")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Count facts (total and active)
  const factsQuery = useQuery({
    queryKey: ["admin-embeddings-facts"],
    queryFn: async () => {
      const { count: total, error: totalError } = await (supabase as any)
        .from("memory_facts")
        .select("id", { count: "exact", head: true });
      if (totalError) throw totalError;
      const { count: active, error: activeError } = await (supabase as any)
        .from("memory_facts")
        .select("id", { count: "exact", head: true })
        .is("superseded_at", null);
      if (activeError) throw activeError;
      return { total: total || 0, active: active || 0 };
    },
  });

  // Count by category
  const categoriesQuery = useQuery({
    queryKey: ["admin-embeddings-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("memory_items")
        .select("category_key");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((item: any) => {
        const key = item.category_key || "uncategorized";
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    },
  });

  const totalItems = totalQuery.data || 0;
  const facts = factsQuery.data || { total: 0, active: 0 };
  const categories = categoriesQuery.data || {};
  const isLoading = totalQuery.isLoading || factsQuery.isLoading;
  const sortedCategories = Object.entries(categories).sort(([, a], [, b]) => (b as number) - (a as number));

  return (
    <AppLayout>
      <SubNavigation items={adminIntelligenceNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader title={t('screens.admin.embeddings')} description="Embedding pipeline status and memory distribution" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title={t('screens.admin.totalMemoryItems')} value={totalItems} icon={Database} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.totalFacts')} value={facts.total} icon={Layers} loading={isLoading} />
          <AdminStatsCard title={t('screens.admin.activeFacts')} value={facts.active} icon={CheckCircle2} loading={isLoading} variant="success" />
          <AdminStatsCard title={t('screens.admin.superseded')} value={facts.total - facts.active} icon={AlertCircle} loading={isLoading} variant={facts.total - facts.active > 0 ? "warning" : "default"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('screens.admin.memoryItemsByCategory')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoriesQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-full bg-muted animate-pulse rounded" />
                  </div>
                ))
              ) : sortedCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('screens.admin.noMemoryItemsYet')}</p>
              ) : (
                sortedCategories.map(([key, count]) => {
                  const pct = totalItems > 0 ? Math.round(((count as number) / totalItems) * 100) : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{key.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">{count as number} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Fact supersession stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('screens.admin.factLifecycle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">{facts.active}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.activeFacts')}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-bold">{facts.total - facts.active}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.superseded')}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{t('screens.admin.activeRate')}</span>
                  <span className="font-medium">
                    {facts.total > 0 ? Math.round((facts.active / facts.total) * 100) : 0}%
                  </span>
                </div>
                <Progress
                  value={facts.total > 0 ? (facts.active / facts.total) * 100 : 0}
                  className="h-3"
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('screens.admin.factsAutomaticallySupersededWhenNewerInformation')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
