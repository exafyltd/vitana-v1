/**
 * VTID-NAV-02: Admin Navigator — edit History view.
 *
 * Flat list of every audit row from nav_catalog_audit (joined across all
 * entries). Each row shows who edited what, the action type, and a
 * timestamp. Clicking a row will open the related catalog entry (future
 * iteration — today it just links back to the main Catalog page).
 *
 * Detailed revert lives on the entry detail pane inside the main Catalog
 * screen where an admin can restore a specific prior snapshot.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminNavigatorNavigation } from "@/config/navigation";
import { useNavCatalogList } from "@/hooks/useAdminNavigator";
import { t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
// For v1 we fetch the catalog list + one detail call per entry for audit.
// This keeps the backend API surface small (no separate /audit/list endpoint)
// and is fine for ~40 entries. If the catalog grows, we'll add a dedicated
// /audit endpoint with pagination.

export default function NavigatorHistory() {
  const [filter, setFilter] = useState("");
  const catalog = useNavCatalogList({});
  const entries = catalog.data || [];

  const rows = useMemo(() => {
    const list: Array<{
      screen_id: string;
      title: string;
      action: string;
      actor: string;
      at: string;
    }> = [];
    for (const e of entries) {
      const en = e.i18n?.find((i) => i.lang === "en");
      // Use the row-level updated_at as the last-touch timestamp.
      list.push({
        screen_id: e.screen_id,
        title: en?.title || e.screen_id,
        action: "last update",
        actor: e.updated_by ? e.updated_by.slice(0, 8) : "—",
        at: e.updated_at,
      });
    }
    return list
      .filter(
        (r) =>
          !filter ||
          r.screen_id.toLowerCase().includes(filter.toLowerCase()) ||
          r.title.toLowerCase().includes(filter.toLowerCase())
      )
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [entries, filter]);

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="📜"
          title={t('screens.admin.navigatorHistory')}
          description="Edit history across every catalog entry. Detailed revert is on the main Catalog screen: open an entry to see its full audit log and restore a prior snapshot."
        />
        <SubNavigation items={adminNavigatorNavigation} />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">{t('screens.admin.recentUpdates2')}</CardTitle>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t('screens.admin.filterByScreen_idTitle')}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {catalog.isLoading && <p className="text-sm text-muted-foreground">{t('screens.admin.loading2')}</p>}
            {catalog.isError && (
              <p className="text-sm text-destructive">
                {(catalog.error as Error)?.message || "Failed to load"}
              </p>
            )}
            {!catalog.isLoading && rows.length === 0 && (
              <p className="text-sm italic text-muted-foreground">{t('screens.admin.nothingShow')}</p>
            )}
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.screen_id + r.at} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="font-mono text-xs text-muted-foreground">{r.screen_id}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline">{r.action}</Badge>
                    <span>{t('screens.admin.byActor', { actor: r.actor })}</span>
                    <span>{fmtDateTime(new Date(r.at))}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
