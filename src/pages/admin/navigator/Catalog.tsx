/**
 * VTID-NAV-02: Admin Navigator — Catalog screen.
 *
 * 3-pane layout:
 *   Left   — filterable list of catalog entries grouped by category
 *   Middle — TriggerEditor for the selected (or new) entry
 *   Right  — live SimulatorPanel
 *
 * This is the main workspace for managing Vitana's voice-driven redirect
 * rules. Admins add/edit a screen's trigger phrases + override triggers on
 * the left/middle and verify the result on the right before saving.
 */

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminNavigatorNavigation } from "@/config/navigation";
import {
  useNavCatalogList,
  useNavCoverage,
  NavCatalogRow,
} from "@/hooks/useAdminNavigator";
import { TriggerEditor } from "./components/TriggerEditor";
import { SimulatorPanel } from "./components/SimulatorPanel";
import { t } from '@/lib/i18n-toast';

const CATEGORY_LABELS: Record<string, string> = {
  public: "Public",
  auth: "Auth",
  community: "Community",
  business: "Business",
  wallet: "Wallet",
  health: "Health",
  discover: "Discover",
  home: "Home",
  memory: "Memory",
  ai: "AI",
  inbox: "Inbox",
  settings: "Settings",
};

type TenantSelection = "shared" | "all" | string;

export default function NavigatorCatalog() {
  const [tenantFilter, setTenantFilter] = useState<TenantSelection>("shared");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const tenantQuery = tenantFilter === "all" ? undefined : tenantFilter === "shared" ? null : tenantFilter;

  const catalogQuery = useNavCatalogList({ tenantId: tenantQuery, q: query.trim() });
  const coverageQuery = useNavCoverage(tenantQuery || null);

  const entries = catalogQuery.data || [];
  const selectedEntry = useMemo(
    () => (selectedId ? entries.find((e) => e.id === selectedId) || null : null),
    [entries, selectedId]
  );

  // Build health map from coverage report: green = catalog entry fires in
  // real telemetry, amber = exists but never fires, red = points at a
  // non-existent SPA route.
  const coverage = coverageQuery.data;
  const brokenSet = new Set((coverage?.broken_catalog_routes || []).map((r) => r.screen_id));
  const deadSet = new Set((coverage?.dead_triggers || []).map((r) => r.screen_id));

  // Group entries by category for the left pane.
  const grouped = useMemo(() => {
    const m: Record<string, NavCatalogRow[]> = {};
    for (const e of entries) {
      (m[e.category] ||= []).push(e);
    }
    return m;
  }, [entries]);

  function openNew() {
    setSelectedId(null);
    setCreating(true);
  }

  function select(e: NavCatalogRow) {
    setSelectedId(e.id);
    setCreating(false);
  }

  function onSaved() {
    setCreating(false);
    catalogQuery.refetch();
    coverageQuery.refetch();
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="🧭"
          title={t('screens.admin.vitanaNavigator')}
          description="Manage the catalog of screens and trigger phrases that drive Vitana's in-conversation redirects. Edit a screen's when-to-visit text, add override phrases for exact matches, and test your changes in the live simulator before saving."
          rightAction={
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              {t('screens.admin.newScreen')}
            </Button>
          }
        />

        <SubNavigation items={adminNavigatorNavigation} />

        {/* Summary strip */}
        {coverage && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.catalogEntries')}</div>
                <div className="text-2xl font-bold">{coverage.summary.catalog_size}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.spaRoutes')}</div>
                <div className="text-2xl font-bold">{coverage.summary.spa_route_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.uncoveredRoutes')}</div>
                <div className="text-2xl font-bold text-amber-600">{coverage.summary.missing_in_catalog}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.brokenCatalogRoutes')}</div>
                <div className="text-2xl font-bold text-destructive">{coverage.summary.broken_catalog_routes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.deadTriggers30d')}</div>
                <div className="text-2xl font-bold">{coverage.summary.dead_triggers}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 3-pane workspace */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,380px)]">
          {/* ── Left: list ─────────────────────────────────────────────── */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                {t('screens.admin.catalog')}
                <Button size="icon" variant="ghost" onClick={() => catalogQuery.refetch()}>
                  <RefreshCw className={`h-4 w-4 ${catalogQuery.isFetching ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search screens…"
                    className="pl-8"
                  />
                </div>
                <Select value={tenantFilter} onValueChange={(v) => setTenantFilter(v as TenantSelection)}>
                  <SelectTrigger>
                    <Globe className="mr-1 h-3.5 w-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">{t('screens.admin.sharedAllTenants')}</SelectItem>
                    <SelectItem value="all">{t('screens.admin.allTenantsSharedPertenant')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-400px)] overflow-y-auto p-2">
              {catalogQuery.isLoading && (
                <p className="p-4 text-sm text-muted-foreground">{t('screens.admin.loadingCatalog')}</p>
              )}
              {catalogQuery.isError && (
                <p className="p-4 text-sm text-destructive">
                  {(catalogQuery.error as Error)?.message || "Failed to load catalog"}
                </p>
              )}
              {!catalogQuery.isLoading && entries.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground italic">{t('screens.admin.noEntriesMatch')}</p>
              )}
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat} className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    {CATEGORY_LABELS[cat] || cat} · {list.length}
                  </div>
                  {list.map((e) => {
                    const isSelected = e.id === selectedId;
                    const broken = brokenSet.has(e.screen_id);
                    const dead = deadSet.has(e.screen_id);
                    const dot = broken ? "bg-red-500" : dead ? "bg-amber-500" : "bg-green-500";
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => select(e)}
                        className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                          isSelected ? "bg-muted" : ""
                        }`}
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate font-medium">
                              {e.i18n?.find((i) => i.lang === "en")?.title || e.screen_id}
                            </div>
                            {e.priority > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                P{e.priority}
                              </Badge>
                            )}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {e.route}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Middle: editor ───────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>
                {creating ? "New screen" : selectedEntry ? selectedEntry.screen_id : "Select a screen"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {creating || selectedEntry ? (
                <TriggerEditor
                  entry={creating ? null : selectedEntry}
                  onSaved={() => onSaved()}
                  onClose={() => {
                    setCreating(false);
                    setSelectedId(null);
                  }}
                />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Pick a screen from the list or click <strong>{t('screens.admin.newScreen')}</strong> to create one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Right: simulator ─────────────────────────────────────────── */}
          <SimulatorPanel
            tenantId={tenantQuery === null ? null : tenantQuery}
            defaultUtterance=""
          />
        </div>
      </div>
    </AppLayout>
  );
}
