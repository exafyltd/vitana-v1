/**
 * VTID-02000: Maxina admin — Products review queue.
 *
 * Not a "pick products" UI — the analyzer picks. This is the small queue of
 * items the analyzer flagged for admin review (low confidence, missing fields,
 * contradictory tags, quality issues).
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { adminMarketplaceCatalogNavigation } from "@/config/navigation";
import { Search, Loader2, EyeOff, CheckCircle, Flag, RefreshCw } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || import.meta.env.VITE_GATEWAY_BASE || "").replace(/\/+$/, "");

interface Product {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  price_cents: number | null;
  currency: string | null;
  origin_country: string | null;
  origin_region: string | null;
  source_network: string;
  source_product_id: string;
  rating: number | null;
  availability: string;
  requires_admin_review: boolean;
  admin_review_reason: string | null;
  analyzer_confidence: number | null;
  is_active: boolean;
  ingested_at: string;
  last_seen_at: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatCents(cents: number | null, currency: string | null): string {
  if (cents === null || !currency) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export default function MarketplaceProducts() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const reviewOnly = searchParams.get("requires_admin_review") === "true";
  const inactiveOnly = searchParams.get("is_active") === "false";

  const load = useCallback(async () => {
    if (!GATEWAY_URL) {
      notifyError('toasts.admin.gatewayUrlNotConfigured');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (reviewOnly) params.set("requires_admin_review", "true");
      if (inactiveOnly) params.set("is_active", "false");
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "50");
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/marketplace/products?${params.toString()}`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      setSelected(new Set());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notifyError('toasts.admin.loadFailed');
    } finally {
      setLoading(false);
    }
  }, [reviewOnly, inactiveOnly, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function bulkAction(action: "hide" | "clear_review" | "flag_review" | "deactivate" | "reactivate") {
    if (selected.size === 0) {
      notify('toasts.admin.noProductsSelected');
      return;
    }
    if (!GATEWAY_URL) return;
    setBusy(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/marketplace/products/bulk-action`, {
        method: "POST",
        headers,
        body: JSON.stringify({ product_ids: Array.from(selected), action }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      toast({ title: `Applied ${action} to ${json.updated} products` });
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notifyError('toasts.admin.bulkActionFailed');
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  function setFilter(key: string, value: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    });
  }

  return (
    <AppLayout>
      <SEO title={t('screens.admin.productsMarketplaceAdmin')} description="Review queue for products flagged by the autonomous analyzer." canonical={typeof window !== "undefined" ? window.location.href : ""} />
      <SubNavigation items={adminMarketplaceCatalogNavigation} />
      <div className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">
          <StandardHeader
            title={t('screens.admin.products')}
            description="Review queue for products the analyzer flagged. Catalog ingestion is handled by Claude Code scraping — you tune the rules and clear the anomaly queue."
          />

          {/* Filter bar */}
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('screens.admin.searchTitle')}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") load();
                  }}
                />
              </div>
              <Button
                size="sm"
                variant={reviewOnly ? "default" : "outline"}
                onClick={() => setFilter("requires_admin_review", reviewOnly ? null : "true")}
              >{t('screens.admin.needsReview')}
              </Button>
              <Button
                size="sm"
                variant={inactiveOnly ? "default" : "outline"}
                onClick={() => setFilter("is_active", inactiveOnly ? null : "false")}
              >
                {t('screens.admin.inactive')}
              </Button>
              <Button size="sm" variant="outline" onClick={load}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">{t('screens.admin.value0Total', { value0: total.toLocaleString() })}</span>
            </CardContent>
          </Card>

          {/* Bulk action bar — only visible when selection is active */}
          {selected.size > 0 && (
            <div className="flex gap-2 items-center bg-slate-100 border rounded-md p-3">
              <span className="text-sm font-medium">{t('screens.admin.sizeSelected', { size: selected.size })}</span>
              <Button size="sm" variant="outline" onClick={() => bulkAction("clear_review")} disabled={busy}>
                <CheckCircle className="w-4 h-4 mr-1" /> {t('screens.admin.clearReview')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("flag_review")} disabled={busy}>
                <Flag className="w-4 h-4 mr-1" /> {t('screens.admin.flagForReview')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("hide")} disabled={busy}>
                <EyeOff className="w-4 h-4 mr-1" /> {t('screens.admin.hide')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
                {t('screens.admin.cancel')}
              </Button>
            </div>
          )}

          {/* Products list */}
          {loading ? (
            <div className="p-8 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('screens.admin.loading')}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="font-medium">{t('screens.admin.noProductsValue0', { value0: reviewOnly ? "in the review queue" : "yet" })}</p>
                <p className="text-sm mt-1">
                  {reviewOnly
                    ? "All clear — nothing flagged for review right now."
                    : "Hand catalog scraping to Claude Code. It calls /api/v1/catalog/ingest/* to populate this list."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="p-3 w-10">
                        <Checkbox
                          checked={selected.size === items.length && items.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </th>
                      <th className="p-3 text-left font-medium">{t('screens.admin.product')}</th>
                      <th className="p-3 text-left font-medium">{t('screens.admin.brand')}</th>
                      <th className="p-3 text-left font-medium">{t('screens.admin.category')}</th>
                      <th className="p-3 text-right font-medium">{t('screens.admin.price')}</th>
                      <th className="p-3 text-left font-medium">{t('screens.admin.origin')}</th>
                      <th className="p-3 text-left font-medium">{t('screens.admin.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr
                        key={p.id}
                        className={`border-b last:border-b-0 ${p.requires_admin_review ? "bg-amber-50/40" : ""} ${!p.is_active ? "opacity-60" : ""}`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selected.has(p.id)}
                            onCheckedChange={() => toggle(p.id)}
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.source_network} · {p.source_product_id}
                            {p.analyzer_confidence !== null && (
                              <>{t('screens.admin.confidenceValue02', { value0: (p.analyzer_confidence * 100).toFixed(0) })}</>
                            )}
                          </div>
                          {p.requires_admin_review && p.admin_review_reason && (
                            <div className="text-xs text-amber-700 mt-0.5">⚠ {p.admin_review_reason}</div>
                          )}
                        </td>
                        <td className="p-3">{p.brand ?? "—"}</td>
                        <td className="p-3">
                          {p.category ?? "—"}
                          {p.subcategory && <span className="text-muted-foreground"> · {p.subcategory}</span>}
                        </td>
                        <td className="p-3 text-right font-mono">{formatCents(p.price_cents, p.currency)}</td>
                        <td className="p-3">
                          {p.origin_country ?? "—"}
                          {p.origin_region && <span className="text-muted-foreground"> · {p.origin_region}</span>}
                        </td>
                        <td className="p-3">
                          {!p.is_active && <Badge variant="secondary">{t('screens.admin.inactive')}</Badge>}
                          {p.is_active && p.requires_admin_review && <Badge className="bg-amber-500">{t('screens.admin.review')}</Badge>}
                          {p.is_active && !p.requires_admin_review && <Badge variant="outline">{t('screens.admin.live')}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
