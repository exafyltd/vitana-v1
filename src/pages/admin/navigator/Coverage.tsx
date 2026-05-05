/**
 * VTID-NAV-02: Admin Navigator — Coverage view.
 *
 * Cross-references the Navigator catalog with the real React Router tree
 * from src/generated/spa-routes.json and real telemetry. Three lists:
 *   1. SPA routes with no catalog entry  (candidate for Create)
 *   2. Catalog entries pointing at non-existent routes (fix)
 *   3. Catalog entries that have never scored > 0 in the last 30 days
 *      (dead triggers — candidate for edit or delete)
 */

import { Link } from "react-router-dom";
import { AlertTriangle, Ghost, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminNavigatorNavigation } from "@/config/navigation";
import { useNavCoverage } from "@/hooks/useAdminNavigator";
import { t } from '@/lib/i18n-toast';

export default function NavigatorCoverage() {
  const { data, isLoading, error } = useNavCoverage(null);

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="📋"
          title={t('screens.admin.navigatorCoverage')}
          description="Every SPA route that isn't covered by the catalog, every catalog entry that points at a non-existent route, and every trigger that hasn't fired in the last 30 days."
        />
        <SubNavigation items={adminNavigatorNavigation} />

        {isLoading && <p className="text-sm text-muted-foreground">{t('screens.admin.loadingCoverageReport')}</p>}
        {error && (
          <p className="text-sm text-destructive">{(error as Error)?.message || "Failed to load"}</p>
        )}

        {data && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {/* 1. Uncovered SPA routes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4" /> {t('screens.admin.uncoveredRoutes')}
                  <Badge variant="outline" className="ml-auto">
                    {data.summary.missing_in_catalog}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto">
                {data.missing_in_catalog.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Every SPA route has a catalog entry. Nice.
                  </p>
                ) : (
                  data.missing_in_catalog.map((r) => (
                    <div
                      key={r.route}
                      className="flex items-center justify-between rounded border px-2 py-1.5 text-sm"
                    >
                      <span className="truncate font-mono">{r.route}</span>
                      {r.requires_auth && (
                        <Badge variant="secondary" className="text-[10px]">
                          auth
                        </Badge>
                      )}
                    </div>
                  ))
                )}
                {data.missing_in_catalog.length > 0 && (
                  <div className="pt-3">
                    <Link to="/admin/navigator">
                      <Button variant="outline" size="sm" className="w-full">
                        {t('screens.admin.goCatalogAddEntries')}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Broken catalog routes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" /> {t('screens.admin.brokenCatalogRoutes')}
                  <Badge variant="outline" className="ml-auto">
                    {data.summary.broken_catalog_routes}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto">
                {data.broken_catalog_routes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">{t('screens.admin.allCatalogRoutesMapRealSpa')}</p>
                ) : (
                  data.broken_catalog_routes.map((e) => (
                    <div key={e.screen_id} className="rounded border bg-destructive/5 px-2 py-1.5 text-sm">
                      <div className="font-medium">{e.title}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {e.screen_id} → {e.route}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 3. Dead triggers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Ghost className="h-4 w-4 text-amber-600" /> {t('screens.admin.deadTriggers30d')}
                  <Badge variant="outline" className="ml-auto">
                    {data.summary.dead_triggers}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto">
                {data.dead_triggers.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Every catalog entry has fired at least once.
                  </p>
                ) : (
                  data.dead_triggers.map((e) => (
                    <div key={e.screen_id} className="rounded border bg-amber-500/5 px-2 py-1.5 text-sm">
                      <div className="font-medium">{e.title}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {e.screen_id} · {e.route}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
