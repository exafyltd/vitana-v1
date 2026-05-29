/**
 * VTID-02000: Maxina admin — Marketplace Overview
 *
 * Live view of what the autonomous marketplace system has done in the last
 * 24h / 30d. Admins do not pick products — they monitor what the analyzers
 * + scraping runs did, and step in only on the anomaly queue.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { adminMarketplaceCatalogNavigation } from "@/config/navigation";
import { ShoppingBag, Store, Activity, AlertTriangle, Zap, RefreshCw, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { notifyError, t } from '@/lib/i18n-toast';

import { fmtNumber } from '@/lib/locale-format';
const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || import.meta.env.VITE_GATEWAY_BASE || "").replace(/\/+$/, "");

interface OverviewStats {
  merchants_active: number;
  products_active: number;
  products_pending_review: number;
  clicks_24h: number;
  conversions_30d: number;
  commission_30d_cents: number;
}

interface IngestionRun {
  run_id: string;
  source_network: string;
  started_at: string;
  finished_at: string | null;
  products_inserted: number;
  products_updated: number;
  errors: number;
}

interface OverviewResponse {
  ok: boolean;
  stats?: OverviewStats;
  recent_runs?: IngestionRun[];
  error?: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatCents(cents: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MarketplaceOverview() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ stats: OverviewStats; runs: IngestionRun[] } | null>(null);

  async function load() {
    setLoading(true);
    try {
      if (!GATEWAY_URL) throw new Error("VITE_GATEWAY_URL not configured");
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/marketplace/overview`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as OverviewResponse;
      if (!json.ok || !json.stats) throw new Error(json.error || "No data");
      setData({ stats: json.stats, runs: json.recent_runs ?? [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notifyError('toasts.admin.loadFailed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <SubNavigation items={adminMarketplaceCatalogNavigation} />
        <div className="p-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('screens.admin.loadingMarketplaceOverview')}
        </div>
      </AppLayout>
    );
  }

  const s = data?.stats;
  const runs = data?.runs ?? [];

  return (
    <AppLayout>
      <SEO title={t('screens.admin.marketplaceOverviewAdmin')} description="Live view of the autonomous marketplace system." canonical={typeof window !== "undefined" ? window.location.href : ""} />
      <SubNavigation items={adminMarketplaceCatalogNavigation} />
      <div className="p-6 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <StandardHeader
              title={t('screens.admin.marketplaceOverview')}
              description="Live view of what the autonomous marketplace system has done. You tune the rules here — the system picks the products."
            />
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('screens.admin.refresh')}
            </Button>
          </div>

          {/* Stats grid */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={Store} label="Merchants active" value={s?.merchants_active ?? 0} />
            <StatCard icon={ShoppingBag} label="Products active" value={s?.products_active ?? 0} />
            <StatCard
              icon={AlertTriangle}
              label="Pending review"
              value={s?.products_pending_review ?? 0}
              tone={s?.products_pending_review ? "warn" : "neutral"}
              href="/admin/marketplace/products?requires_admin_review=true"
            />
            <StatCard icon={Zap} label="Clicks 24h" value={s?.clicks_24h ?? 0} />
            <StatCard icon={Activity} label="Conversions 30d" value={s?.conversions_30d ?? 0} />
            <StatCard
              icon={Activity}
              label="Commission 30d"
              value={formatCents(s?.commission_30d_cents ?? 0)}
            />
          </div>

          {/* Recent runs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('screens.admin.recentIngestionRuns')}</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('screens.admin.noRunsYetHandCatalogScraping')} <code>{t('screens.admin.postapiv1catalogingeststart')}</code> {t('screens.admin.begin')}</p>
              ) : (
                <div className="space-y-2">
                  {runs.map((r) => (
                    <div key={r.run_id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant={r.errors > 0 ? "destructive" : r.finished_at ? "default" : "secondary"}>
                          {r.finished_at ? (r.errors > 0 ? "errors" : "done") : "running"}
                        </Badge>
                        <span className="font-medium">{r.source_network}</span>
                        <span className="text-muted-foreground">
                          +{r.products_inserted} / ~{r.products_updated}
                          {r.errors > 0 && <span className="text-red-600">{t('screens.admin.ErrorsErr', { errors: r.errors })}</span>}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{timeAgo(r.started_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: "neutral" | "warn";
  href?: string;
}) {
  const inner = (
    <Card className={tone === "warn" && typeof value === "number" && value > 0 ? "border-amber-300 bg-amber-50/50" : ""}>
      <CardContent className="pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-semibold mt-1">
              {typeof value === "number" ? fmtNumber(value) : value}
            </div>
          </div>
          <Icon className={`w-6 h-6 ${tone === "warn" && typeof value === "number" && value > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}
